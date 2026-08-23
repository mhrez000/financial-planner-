import Link from "next/link";
import { Sparkles } from "lucide-react";
import { loginAsDemo } from "@/lib/authActions";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <h1 className="text-lg font-bold tracking-tight">Welcome back</h1>
      <p className="mb-5 mt-1 text-xs text-muted">Sign in to keep your streaks alive.</p>
      <LoginForm />
      <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-faint">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <form action={loginAsDemo}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
        >
          <Sparkles size={14} aria-hidden /> Explore the demo (Alex&rsquo;s data)
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-muted">
        New here?{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
