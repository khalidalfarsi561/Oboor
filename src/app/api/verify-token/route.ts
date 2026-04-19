import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSsrPb, runPocketBaseTransaction } from "../../../lib/pocketbase";

function generateRewardCode(length = 8): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += characters[bytes[i] % characters.length];
  }

  return result;
}

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

function isUniqueConstraintError(error: unknown) {
  const status = getPocketBaseStatus(error);
  const message = getErrorMessage(error);

  return (
    status === 400 &&
    (message.includes("unique") ||
      message.includes("already exists") ||
      message.includes("duplicate"))
  );
}

function isLikelyTokenUnavailableError(error: unknown) {
  const status = getPocketBaseStatus(error);
  const message = getErrorMessage(error);

  return (
    status === 404 ||
    (status === 400 &&
      (message.includes("not found") ||
        message.includes("doesn't exist") ||
        message.includes("already used") ||
        message.includes("invalid") ||
        message.includes("validation")))
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

type AccessTokenRecord = {
  id: string;
  is_used?: boolean;
  expires?: string | null;
};

function invalidTokenResponse() {
  return NextResponse.json({ error: "Invalid token" }, { status: 400 });
}

function invalidOrExpiredTokenResponse() {
  return NextResponse.json(
    { error: "Invalid or expired token" },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  try {
    const pb = getSsrPb(request);

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      token?: string;
    } | null;
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return invalidTokenResponse();
    }

    const userId = pb.authStore.record?.id ?? pb.authStore.model?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokenRecord = (await pb
      .collection("access_tokens")
      .getFirstListItem(
        pb.filter("token = {:token} && user_id = {:userId}", {
          token,
          userId,
        }),
        {
          requestKey: null,
        },
      )
      .catch((error: unknown) => {
        if (isLikelyTokenUnavailableError(error)) {
          return null;
        }

        throw error;
      })) as AccessTokenRecord | null;

    if (!tokenRecord) {
      return invalidOrExpiredTokenResponse();
    }

    if (tokenRecord.is_used) {
      return invalidOrExpiredTokenResponse();
    }

    if (isExpired(tokenRecord.expires)) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateRewardCode(8);

      try {
        const createdCode = await runPocketBaseTransaction(
          pb,
          async (transactionPb) => {
            await transactionPb.collection("reward_codes").create({
              code,
              is_used: false,
            });

            try {
              await transactionPb.collection("access_tokens").update(
                tokenRecord.id,
                {
                  is_used: true,
                },
              );
            } catch (error: unknown) {
              if (isLikelyTokenUnavailableError(error)) {
                throw new Error("TOKEN_UNAVAILABLE");
              }

              throw error;
            }

            return code;
          },
        );

        return NextResponse.json({ code: createdCode });
      } catch (error: unknown) {
        if (isUniqueConstraintError(error)) {
          continue;
        }

        if (
          error instanceof Error &&
          error.message === "TOKEN_UNAVAILABLE"
        ) {
          return invalidOrExpiredTokenResponse();
        }

        if (isLikelyTokenUnavailableError(error)) {
          return invalidOrExpiredTokenResponse();
        }

        throw error;
      }
    }

    throw new Error("Unable to generate a unique reward code");
  } catch (error: unknown) {
    console.error("verify-token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
