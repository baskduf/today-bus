import type { Metadata } from "next";
import { Gaegu, Geist_Mono } from "next/font/google";
import { RoughSvgFilters } from "@/components/ui/rough-svg-filters";
import "./globals.css";

const gaegu = Gaegu({
  display: "swap",
  fallback: [
    "Comic Sans MS",
    "Apple SD Gothic Neo",
    "Malgun Gothic",
    "system-ui",
    "sans-serif",
  ],
  subsets: ["latin"],
  variable: "--font-gaegu",
  weight: ["300", "400", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "구미역으로 가자",
  description: "구미역 기차 시간에 맞춰 오늘 나가야 할 시간을 알려주는 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${gaegu.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RoughSvgFilters />
        {children}
      </body>
    </html>
  );
}
