import { createHmac, timingSafeEqual } from "node:crypto";

// One shared login for Ananya's team. The cookie holds an HMAC, never the password.
export const COOKIE = "csr_radar_session";

export function sessionToken(password = process.env.DASHBOARD_PASSWORD ?? "") {
  return createHmac("sha256", password).update("csr-radar-v1").digest("hex");
}

const eq = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function validSession(cookie: string | undefined) {
  return !!process.env.DASHBOARD_PASSWORD && !!cookie && eq(cookie, sessionToken());
}

export function passwordMatches(input: string) {
  const want = process.env.DASHBOARD_PASSWORD ?? "";
  return !!want && eq(sessionToken(input), sessionToken(want));
}

// Signed links for the email snapshot image, so it loads in Gmail without a login
export function signRun(runId: string) {
  return createHmac("sha256", process.env.CRON_SECRET ?? "dev").update(`snapshot:${runId}`).digest("hex").slice(0, 32);
}
export function validRunSig(runId: string, sig: string | null) {
  return !!sig && eq(sig, signRun(runId));
}

export function validCron(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  return !!secret && eq(got, secret);
}
