import { NextResponse } from "next/server";
import { createServerPb } from "../../../lib/pocketbase";

function generateRewardCode(length = 8): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * characters.length);
    result += characters[index];
  }

  return result;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && (error as { status?: number }).status === 400;
}

async function createUniqueRewardCode(pb: ReturnType<typeof createServerPb>) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRewardCode(8);

    try {
      await pb.collection("reward_codes").create({
        code,
        is_used: false,
      });

      return code;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique reward code");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    const pb = createServerPb();

    let tokenRecord;
    try {
      tokenRecord = await pb
        .collection("access_tokens")
        .getFirstListItem(`token = "${token}"`);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    if (!tokenRecord || tokenRecord.is_used) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    const code = await createUniqueRewardCode(pb);

    await pb.collection("access_tokens").update(tokenRecord.id, {
      is_used: true,
    });

    return NextResponse.json({ code });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
