import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Code Carf",
  description: "Learning and coding contests",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
