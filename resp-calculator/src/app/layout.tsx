import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RESP Calculator",
  description: "Calculate your RESP savings and plan for your child's education with TD's RESP calculator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
