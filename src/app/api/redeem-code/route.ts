import { NextResponse } from "next/server";
import { getSsrPb } from "../../../lib/pocketbase";

export async function POST(request: Request) {
  try {
    const pb = getSsrPb(request);

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { code?: string };
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!code) {
      return NextResponse.json(
        { error: "Invalid or already used code" },
        { status: 400 },
      );
    }

    let rewardCode;
    try {
      rewardCode = await pb
        .collection("reward_codes")
        .getFirstListItem(`code = "${code}"`);
    } catch {
      return NextResponse.json(
        { error: "Invalid or already used code" },
        { status: 400 },
      );
    }

    if (!rewardCode || rewardCode.is_used) {
      return NextResponse.json(
        { error: "Invalid or already used code" },
        { status: 400 },
      );
    }

    const userId = pb.authStore.model?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await pb.collection("reward_codes").update(rewardCode.id, {
        is_used: true,
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid or already used code" },
        { status: 400 },
      );
    }

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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
