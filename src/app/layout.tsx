import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/shell/Sidebar";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export const metadata: Metadata = {
  title: { default: "Sage — Money, mastered", template: "%s · Sage" },
  description:
    "A premium personal finance platform that helps you spend smarter, save more, and build lasting wealth.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1210" },
  ],
};

// Apply persisted/system theme before first paint to avoid a flash.
const themeScript = `
try {
  var t = localStorage.getItem('sage-theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Sidebar />
        <div className="lg:pl-60">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/85 px-4 py-3 backdrop-blur sm:px-8">
            <div>
              <p className="text-xs text-faint">
                {new Date().toLocaleDateString("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <p className="text-sm font-semibold">G&rsquo;day, Alex</p>
            </div>
            <ThemeToggle />
          </header>
          <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-8 lg:pb-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
