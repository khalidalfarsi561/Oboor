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
  createBatch?: () => BatchServiceLike;
};

type BatchCollectionServiceLike = {
  create: (body: unknown, options?: unknown) => void;
  update: (id: string, body: unknown, options?: unknown) => void;
  upsert: (body: unknown, options?: unknown) => void;
  delete: (id: string, options?: unknown) => void;
};

type BatchServiceLike = {
  collection: (name: string) => BatchCollectionServiceLike;
  send: (options?: unknown) => Promise<unknown>;
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
  const transactionClient = client as TransactionCapablePocketBase;

  if (typeof transactionClient.createBatch === "function") {
    const batch = transactionClient.createBatch();
    const result = await callback(batch as unknown as PocketBase);
    await batch.send();
    return result;
  }

  if (typeof transactionClient.createTransaction === "function") {
    return transactionClient.createTransaction(callback);
  }

  if (typeof transactionClient.transaction === "function") {
    return transactionClient.transaction(callback);
  }

  return callback(client);
}
