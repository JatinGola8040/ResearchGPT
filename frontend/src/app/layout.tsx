import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResearchGPT Studio - AI Academic Research Assistant",
  description: "Advanced multi-paper synthesis and grounded literature intelligence powered by Gemini 3.5 Flash (free tier, OpenRouter fallback).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased bg-[#F4EFEC] text-[#251F21] min-h-screen selection:bg-[#397F70]/20 selection:text-[#251F21]"
      >
        {children}
      </body>
    </html>
  );
}
