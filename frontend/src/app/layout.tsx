import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResearchGPT Studio - AI Academic Research Assistant",
  description: "Advanced multi-paper synthesis and grounded literature intelligence powered by gpt-oss-120b.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased bg-[#030304] text-white min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200"
      >
        {children}
      </body>
    </html>
  );
}
