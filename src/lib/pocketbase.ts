import PocketBase from "pocketbase";

const pbUrl = process.env.NEXT_PUBLIC_PB_URL;

if (!pbUrl) {
  throw new Error("NEXT_PUBLIC_PB_URL is not set");
}

export const pb = new PocketBase(pbUrl);

export function syncBrowserAuthCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = pb.authStore.exportToCookie({
    httpOnly: false,
    path: "/",
  });
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
