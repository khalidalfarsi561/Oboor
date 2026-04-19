import PocketBase from "pocketbase";

const pbUrl = process.env.NEXT_PUBLIC_PB_URL;

if (!pbUrl) {
  throw new Error("NEXT_PUBLIC_PB_URL is not set");
}

export const pb = new PocketBase(pbUrl);

type TransactionCallback<T> = (transactionPb: PocketBase) => Promise<T>;

type TransactionCapablePocketBase = PocketBase & {
  createTransaction?: <T>(callback: TransactionCallback<T>) => Promise<T>;
  transaction?: <T>(callback: TransactionCallback<T>) => Promise<T>;
};

type BatchCapablePocketBase = PocketBase & {
  createBatch?: () => unknown;
  send?: () => Promise<unknown>;
};

function getAuthCookieOptions(isServer: boolean) {
  return {
    httpOnly: isServer,
    path: "/",
    secure: true,
  };
}

export function syncBrowserAuthCookie() {
  const isServer = typeof document === "undefined";

  if (isServer) {
    return pb.authStore.exportToCookie(getAuthCookieOptions(true));
  }

  document.cookie = pb.authStore.exportToCookie(getAuthCookieOptions(false));
}

export function loadBrowserAuthCookie() {
  if (typeof document === "undefined") {
    return;
  }

  pb.authStore.loadFromCookie(document.cookie);
}

export function createServerPb() {
  return new PocketBase(pbUrl);
}

export function getSsrPb(req: Request) {
  const ssrPb = createServerPb();
  ssrPb.authStore.loadFromCookie(req.headers.get("cookie") || "");
  return ssrPb;
}

export function getSsrPbFromCookieHeader(cookieHeader: string) {
  const ssrPb = createServerPb();
  ssrPb.authStore.loadFromCookie(cookieHeader);
  return ssrPb;
}

export async function runPocketBaseTransaction<T>(
  client: PocketBase,
  callback: TransactionCallback<T>,
): Promise<T> {
  const transactionClient = client as TransactionCapablePocketBase &
    BatchCapablePocketBase;

  if (typeof transactionClient.createTransaction === "function") {
    return transactionClient.createTransaction(callback);
  }

  if (typeof transactionClient.transaction === "function") {
    return transactionClient.transaction(callback);
  }

  if (typeof transactionClient.createBatch === "function") {
    const batchClient =
      transactionClient.createBatch() as unknown as PocketBase;
    const result = await callback(batchClient);

    if (typeof transactionClient.send === "function") {
      await transactionClient.send();
    }

    return result;
  }

  const result = await callback(client);

  if (typeof transactionClient.send === "function") {
    await transactionClient.send();
  }

  return result;
}
