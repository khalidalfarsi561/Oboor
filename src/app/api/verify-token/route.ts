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

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: number }).status === 400
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

export async function POST(request: Request) {
  try {
    const pb = getSsrPb(request);

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { token?: string };
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    const userId = pb.authStore.model?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let tokenRecord: AccessTokenRecord;

    try {
      tokenRecord = (await pb
        .collection("access_tokens")
        .getFirstListItem(
          pb.filter("token = {:token} && user_id = {:userId}", {
            token,
            userId,
          }),
        )) as AccessTokenRecord;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status?: number }).status === 404
      ) {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 403 },
        );
      }

      throw error;
    }

    if (tokenRecord.is_used) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
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

            await transactionPb.collection("access_tokens").update(
              tokenRecord.id,
              {
                is_used: true,
              },
            );

            return code;
          },
        );

        return NextResponse.json({ code: createdCode });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new Error("Unable to generate a unique reward code");
  } catch (error) {
    console.error("verify-token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
