import PocketBase from "pocketbase";
import { NextResponse } from "next/server";
import { getSsrPb, runPocketBaseTransaction } from "../../../lib/pocketbase";

const CODE_REGEX = /^[A-Z0-9]{8}$/;

type RewardCodeRecord = {
  id: string;
  is_used?: boolean;
};

class RedeemCodeUnavailableError extends Error {
  constructor() {
    super("Invalid or already used code");
    this.name = "RedeemCodeUnavailableError";
  }
}

function getPocketBaseStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function isRedeemCodeUnavailableError(error: unknown) {
  const status = getPocketBaseStatus(error);

  return status === 400 || status === 404 || status === 409;
}

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "";
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message.toLowerCase() : "";
}

function isLikelyPocketBaseRecordUnavailableError(error: unknown) {
  if (isRedeemCodeUnavailableError(error)) {
    return true;
  }

  const message = getErrorMessage(error);

  return (
    message.includes("not found") ||
    message.includes("doesn't exist") ||
    message.includes("already used") ||
    message.includes("validation") ||
    message.includes("unique")
  );
}

function toInvalidOrAlreadyUsedResponse() {
  return NextResponse.json(
    { error: "Invalid or already used code" },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {
    const pb = getSsrPb(request);

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const code =
      typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!CODE_REGEX.test(code)) {
      return NextResponse.json({ error: "Invalid code format" }, { status: 400 });
    }

    const userId = pb.authStore.record?.id ?? pb.authStore.model?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rewardCode = (await pb
      .collection("reward_codes")
      .getFirstListItem(pb.filter("code = {:code}", { code }), {
        requestKey: null,
      })
      .catch((error: unknown) => {
        if (isLikelyPocketBaseRecordUnavailableError(error)) {
          return null;
        }

        throw error;
      })) as RewardCodeRecord | null;

    if (!rewardCode || rewardCode.is_used) {
      return toInvalidOrAlreadyUsedResponse();
    }

    try {
      await runPocketBaseTransaction(pb, async (transactionPb: PocketBase) => {
        const currentRewardCode = (await transactionPb
          .collection("reward_codes")
          .getOne(rewardCode.id, {
            requestKey: null,
          })
          .catch((error: unknown) => {
            if (isLikelyPocketBaseRecordUnavailableError(error)) {
              return null;
            }

            throw error;
          })) as RewardCodeRecord | null;

        if (!currentRewardCode || currentRewardCode.is_used) {
          throw new RedeemCodeUnavailableError();
        }

        try {
          await transactionPb.collection("reward_codes").update(rewardCode.id, {
            is_used: true,
          });

          await transactionPb.collection("users").update(userId, {
            "coins+": 1,
          });
        } catch (error: unknown) {
          if (isLikelyPocketBaseRecordUnavailableError(error)) {
            throw new RedeemCodeUnavailableError();
          }

          throw error;
        }
      });
    } catch (error: unknown) {
      if (
        error instanceof RedeemCodeUnavailableError ||
        isLikelyPocketBaseRecordUnavailableError(error)
      ) {
        return toInvalidOrAlreadyUsedResponse();
      }

      throw error;
    }

    const updatedUser = await pb.collection("users").getOne(userId, {
      requestKey: null,
    });

    return NextResponse.json({
      message: "Code redeemed successfully",
      coins: typeof updatedUser.coins === "number" ? updatedUser.coins : 0,
    });
  } catch (error: unknown) {
    console.error("redeem-code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
