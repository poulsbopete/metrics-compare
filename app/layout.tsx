import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metrics Cost Comparison Tool",
  description: "Compare costs across different observability platforms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

