import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Data-Driven Dashboard",
  description: "21-day single-goal tracking with adaptive energy logic."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceMono.variable} antialiased`}
        style={{ fontFamily: "var(--font-mono), monospace" }}
      >
        {children}
      </body>
    </html>
  );
}
