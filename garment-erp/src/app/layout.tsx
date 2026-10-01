import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import { PwaInit } from "@/components/ui/pwa-init";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
  preload: false,  // don't block startup waiting for Google Fonts
});

const notoSansEthiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  variable: "--font-noto-sans-ethiopic",
  weight: ["400", "700"],
  display: "swap",
  preload: false,  // don't block startup waiting for Google Fonts
});

export const metadata: Metadata = {
  title: "AHA GARMENT ERP",
  description: "AHA Garment Factory — Production and Incentive Management System",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/ahagarment.ico", sizes: "any" },
      { url: "/ahalogo.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/ahagarment.ico",
    apple: "/ahalogo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AHA GARMENT",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: "cover",  // iPhone notch support
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="am" dir="ltr">
      <body
        className={`${notoSans.variable} ${notoSansEthiopic.variable} font-sans antialiased`}
      >
        {children}
        <PwaInit />
      </body>
    </html>
  );
}
