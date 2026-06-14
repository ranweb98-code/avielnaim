import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { BottomNav, Header } from "@/components/Header";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SerwistRegister } from "@/components/SerwistRegister";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Barber Noir | קביעת תורים",
  description: "מספרת יוקרה — קביעת תורים online",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Barber Noir",
  },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${heebo.variable} antialiased`}>
        <Header />
        <main className="page-shell">{children}</main>
        <BottomNav />
        <InstallPrompt />
        <SerwistRegister />
      </body>
    </html>
  );
}
