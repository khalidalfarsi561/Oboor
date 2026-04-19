import { NextResponse } from "next/server";
import { getSsrPb, runPocketBaseTransaction } from "../../../lib/pocketbase";

type AccessTokenRecord = {
  id: string;
  is_used?: boolean;
  expires?: string | null;
};

function getPocketBaseStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

function getErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return "";
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message.toLowerCase() : "";
}

function isPocketBaseUnavailableError(error: unknown) {
  const status = getPocketBaseStatus(error);
  const message = getErrorMessage(error);

  return (
    status === 404 ||
    status === 400 ||
    message.includes("not found") ||
    message.includes("doesn't exist") ||
    message.includes("validation")
  );
}

function isExpired(expires: string | null | undefined) {
  if (!expires) {
    return false;
  }

  const expiresAt = new Date(expires).getTime();
  if (Number.isNaN(expiresAt)) {
    return false;
  }

  return Date.now() > expiresAt;
}

function invalidLinkResponse() {
  return NextResponse.json(
    { error: "This reward link is invalid." },
    { status: 400 },
  );
}

function expiredLinkResponse() {
  return NextResponse.json(
    { error: "This reward link has expired." },
    { status: 400 },
  );
}

function alreadyClaimedResponse() {
  return NextResponse.json(
    { error: "This reward was already claimed." },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {
    const pb = getSsrPb(request);

    if (!pb.authStore.isValid) {
      return NextResponse.json(
        { error: "Please sign in to continue." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      token?: string;
    } | null;

    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) {
      return invalidLinkResponse();
    }

    const userId = pb.authStore.record?.id ?? pb.authStore.model?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to continue." },
        { status: 401 },
      );
    }

    const tokenRecord = (await pb
      .collection("access_tokens")
      .getFirstListItem(
        pb.filter("token = {:token} && user_id = {:userId}", {
          token,
          userId,
        }),
        { requestKey: null },
      )
      .catch((error: unknown) => {
        if (isPocketBaseUnavailableError(error)) {
          return null;
        }

        throw error;
      })) as AccessTokenRecord | null;

    if (!tokenRecord) {
      return invalidLinkResponse();
    }

    if (tokenRecord.is_used) {
      return alreadyClaimedResponse();
    }

    if (isExpired(tokenRecord.expires)) {
      return expiredLinkResponse();
    }

    try {
      await runPocketBaseTransaction(pb, async (transactionPb) => {
        const currentToken = (await transactionPb
          .collection("access_tokens")
          .getOne(tokenRecord.id, { requestKey: null })
          .catch((error: unknown) => {
            if (isPocketBaseUnavailableError(error)) {
              return null;
            }

            throw error;
          })) as AccessTokenRecord | null;

        if (!currentToken) {
          throw new Error("TOKEN_MISSING");
        }

        if (currentToken.is_used) {
          throw new Error("TOKEN_ALREADY_USED");
        }

        if (isExpired(currentToken.expires)) {
          throw new Error("TOKEN_EXPIRED");
        }

        await transactionPb.collection("access_tokens").update(tokenRecord.id, {
          is_used: true,
        });

        await transactionPb.collection("users").update(userId, {
          "coins+": 1,
        });
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === "TOKEN_MISSING") {
          return invalidLinkResponse();
        }

        if (error.message === "TOKEN_ALREADY_USED") {
          return alreadyClaimedResponse();
        }

        if (error.message === "TOKEN_EXPIRED") {
          return expiredLinkResponse();
        }
      }

      if (isPocketBaseUnavailableError(error)) {
        return invalidLinkResponse();
      }

      throw error;
    }

    const updatedUser = await pb.collection("users").getOne(userId, {
      requestKey: null,
    });

    return NextResponse.json({
      message: "Reward claimed successfully",
      coins: typeof updatedUser.coins === "number" ? updatedUser.coins : 0,
    });
  } catch (error: unknown) {
    console.error("verify-token error:", error);
    return NextResponse.json(
      { error: "Something went wrong while claiming the reward." },
      { status: 500 },
    );
  }
}
