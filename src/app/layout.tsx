import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RoughSvgFilters } from "@/components/ui/rough-svg-filters";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "오늘버스",
  description: "버스 시간이 아니라 오늘 나가야 할 시간을 알려주는 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RoughSvgFilters />
        {children}
      </body>
    </html>
  );
}
