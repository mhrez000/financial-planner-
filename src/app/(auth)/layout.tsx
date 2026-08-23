import { Leaf } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-white">
          <Leaf size={20} strokeWidth={2.4} aria-hidden />
        </span>
        <span className="text-2xl font-bold tracking-tight">Sage</span>
      </div>
      <div className="w-full max-w-sm animate-fade-up">{children}</div>
      <p className="mt-8 max-w-sm text-center text-[11px] leading-relaxed text-faint">
        Privacy-first: read-only bank access, no data selling, export or delete everything any time.
      </p>
    </div>
  );
}
