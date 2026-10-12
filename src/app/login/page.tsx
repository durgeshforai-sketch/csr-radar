import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE, passwordMatches, sessionToken } from "@/lib/auth";
import { IRadar } from "@/components/icons";

async function login(formData: FormData) {
  "use server";
  const next = String(formData.get("next") || "/");
  if (!passwordMatches(String(formData.get("password") ?? ""))) redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  (await cookies()).set(COOKIE, sessionToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  redirect(next.startsWith("/") ? next : "/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="login">
      <form action={login} className="card login-card">
        <div className="row" style={{ gap: 12 }}>
          <span className="brand-mark"><IRadar /></span>
          <div>
            <div className="brand-name">CSR Radar</div>
            <div className="brand-sub">Partnership intelligence for Ananya</div>
          </div>
        </div>
        <p className="muted small" style={{ margin: 0 }}>Every CSR move in education and skilling, read and ranked each morning. Sign in to see this week.</p>
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <label className="field">
          Password
          <input type="password" name="password" autoFocus required />
        </label>
        {sp.error && <p className="error">That password didn&apos;t match.</p>}
        <button type="submit" className="btn primary">Sign in</button>
      </form>
    </main>
  );
}
