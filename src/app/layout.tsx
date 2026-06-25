import type { Metadata, Viewport } from "next";
import { Heebo, Kaushan_Script } from "next/font/google";
import { BottomNav, Header } from "@/components/Header";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SerwistRegister } from "@/components/SerwistRegister";
import { getSetting } from "@/lib/settings";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

const brand = Kaushan_Script({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Aviel Naim | קביעת תורים",
  description: "מספרת יוקרה — קביעת תורים online",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aviel Naim",
  },
};

export async function generateViewport(): Promise<Viewport> {
  const theme = await getSetting("theme", "dark");
  return {
    themeColor: theme === "light" ? "#ffffff" : "#000000",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getSetting("theme", "dark");

  return (
    <html lang="he" dir="rtl" data-theme={theme}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${heebo.variable} ${brand.variable} antialiased`}>
        <Header />
        <main className="page-shell">{children}</main>
        <BottomNav />
        <InstallPrompt />
        <SerwistRegister />
      </body>
    </html>
  );
}
