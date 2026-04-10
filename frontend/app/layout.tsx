import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "arCircle",
  description: "Onchain rotating savings, powered by Arc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
