import type { Metadata } from "next";
import "./globals.css";
import Providers from "../components/SessionProvider";

export const metadata: Metadata = {
  title: "Financial Calculators Suite",
  description: "Comprehensive financial calculators for daily interest, compound interest, loan amortization, and RESP planning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
