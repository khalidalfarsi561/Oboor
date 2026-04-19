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
    const { token } = (await request.json()) as { token?: string };

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const tokenRecord = await pb
      .collection("access_tokens")
      .getFirstListItem(`token = "${token}"`);

    if (!tokenRecord || tokenRecord.is_used) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
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
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 400 }
    );
  }
}
