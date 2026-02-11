import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel"
});

export const metadata: Metadata = {
  title: "YearOfHorse",
  description: "Single-goal pixel-style habit builder."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${pressStart2P.variable} antialiased`}
        style={{ fontFamily: "var(--font-pixel), monospace" }}
      >
        {children}
      </body>
    </html>
  );
}
