export type RewardClaimResult =
  | {
      ok: true;
      message: string;
      coins: number;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      needsSignIn: boolean;
    };

type RewardResponse = {
  message?: string;
  coins?: number;
  error?: string;
};

export function getFriendlyRewardErrorMessage(error?: string, status?: number) {
  const normalized = (error ?? "").toLowerCase();

  if (status === 401 || normalized.includes("sign in")) {
    return "Please sign in to continue.";
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("has expired") ||
    normalized.includes("link expired")
  ) {
    return "This reward link has expired.";
  }

  if (
    normalized.includes("already claimed") ||
    normalized.includes("already used")
  ) {
    return "This reward was already claimed.";
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("not found") ||
    normalized.includes("missing")
  ) {
    return "This reward link is invalid.";
  }

  return "We couldn’t claim this reward right now.";
}

export async function claimReward(token: string): Promise<RewardClaimResult> {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return {
      ok: false,
      error: "This reward link is invalid.",
      needsSignIn: false,
      status: 400,
    };
  }

  try {
    const response = await fetch("/api/verify-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: trimmedToken }),
    });

    const data = (await response.json().catch(() => null)) as
      | RewardResponse
      | null;

    if (!response.ok) {
      const friendlyError = getFriendlyRewardErrorMessage(
        data?.error,
        response.status,
      );

      return {
        ok: false,
        error: friendlyError,
        needsSignIn: response.status === 401,
        status: response.status,
      };
    }

    return {
      ok: true,
      message: data?.message ?? "Reward claimed successfully.",
      coins: typeof data?.coins === "number" ? data.coins : 0,
    };
  } catch (error) {
    console.error("rewardService claimReward error:", error);

    return {
      ok: false,
      error: "We couldn’t claim this reward right now.",
      needsSignIn: false,
    };
  }
}
