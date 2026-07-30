import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sage — Money, mastered", template: "%s · Sage" },
  description:
    "A premium personal finance platform that helps you spend smarter, save more, and build lasting wealth.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
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
      <body>{children}</body>
    </html>
  );
}
