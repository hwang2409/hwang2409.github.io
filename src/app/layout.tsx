import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ParticleCanvas from "@/components/ParticleCanvas";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "henry wang",
    template: "%s | henry wang",
  },
  description: "software engineering student at the university of waterloo exploring ML, computer graphics, and digital logic design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ParticleCanvas />
        {children}
      </body>
    </html>
  );
}
