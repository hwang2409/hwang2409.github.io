import type { Metadata } from "next";
import "./globals.css";
import ParticleCanvas from "@/components/ParticleCanvas";

export const metadata: Metadata = {
  title: {
    default: "Henry Wang",
    template: "%s | Henry Wang",
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
      <body className="antialiased">
        <ParticleCanvas />
        {children}
      </body>
    </html>
  );
}
