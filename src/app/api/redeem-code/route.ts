import { NextResponse } from "next/server";
import { pb } from "../../../lib/pocketbase";

export async function POST(request: Request) {
  try {
    const { code, userId } = (await request.json()) as {
      code?: string;
      userId?: string;
    };

    if (!code || !userId || typeof code !== "string" || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Invalid or already used code" },
        { status: 400 }
      );
    }

    const rewardCode = await pb
      .collection("reward_codes")
      .getFirstListItem(`code = "${code}"`);

    if (!rewardCode || rewardCode.is_used) {
      return NextResponse.json(
        { error: "Invalid or already used code" },
        { status: 400 }
      );
    }

    await pb.collection("reward_codes").update(rewardCode.id, {
      is_used: true,
    });

    const user = await pb.collection("users").getOne(userId);

    const currentCoins = typeof user.coins === "number" ? user.coins : 0;
    const newCoinBalance = currentCoins + 1;

    await pb.collection("users").update(user.id, {
      coins: newCoinBalance,
    });

    return NextResponse.json({
      message: "Code redeemed successfully",
      coins: newCoinBalance,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid or already used code" },
      { status: 400 }
    );
  }
}
