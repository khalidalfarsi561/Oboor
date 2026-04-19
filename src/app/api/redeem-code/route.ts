import { NextResponse } from "next/server";
import { getSsrPb, runPocketBaseTransaction } from "../../../lib/pocketbase";

export async function POST(request: Request) {
  try {
    const pb = getSsrPb(request);

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { code?: string };
    const code =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!/^[A-Z0-9]{8}$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid or already used code" },
        { status: 400 },
      );
    }

    const userId = pb.authStore.model?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rewardCode = await pb
      .collection("reward_codes")
      .getFirstListItem(pb.filter("code = {:code}", { code }));

    if (!rewardCode || rewardCode.is_used) {
      return NextResponse.json(
        { error: "Invalid or already used code" },
        { status: 400 },
      );
    }

    const updatedUser = await runPocketBaseTransaction(
      pb,
      async (transactionPb) => {
        await transactionPb.collection("reward_codes").update(rewardCode.id, {
          is_used: true,
        });

        // PocketBase API rules: keep the coins field read-only for clients.
        // Only server-side code should mutate it via atomic operators.
        return transactionPb.collection("users").update(userId, {
          "coins+": 1,
        });
      },
    );

    return NextResponse.json({
      message: "Code redeemed successfully",
      coins: typeof updatedUser.coins === "number" ? updatedUser.coins : 0,
    });
  } catch (error) {
    console.error("redeem-code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
