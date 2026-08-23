import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <h1 className="text-lg font-bold tracking-tight">Start mastering your money</h1>
      <p className="mb-5 mt-1 text-xs text-muted">
        Free to start. Your data stays yours — always exportable, always deletable.
      </p>
      <RegisterForm />
      <p className="mt-5 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
