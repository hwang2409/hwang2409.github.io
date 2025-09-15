import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "henry wang",
  description: "software engineering student at the university of waterloo exploring ML, computer graphics, and digital logic design.",
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
