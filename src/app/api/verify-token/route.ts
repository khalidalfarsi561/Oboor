import { NextResponse } from "next/server";
import { pb } from "../../../lib/pocketbase";

function generateRewardCode(length = 8): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * characters.length);
    result += characters[index];
  }

  return result;
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

    await pb.collection("access_tokens").update(tokenRecord.id, {
      is_used: true,
    });

    const code = generateRewardCode(8);

    await pb.collection("reward_codes").create({
      code,
      is_used: false,
    });

    return NextResponse.json({ code });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
