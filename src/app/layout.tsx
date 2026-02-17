import type { Metadata } from "next";
import { Outfit, Noto_Sans_JP, Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import { Toaster } from "react-hot-toast";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const notoJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-jp",
});

const notoTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-tc",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFC1CC",
};

export const metadata: Metadata = {
  title: "台湾甜蜜MAP",
  description: "台湾の菓子店巡りを楽しむための地図アプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "台湾甜蜜MAP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${outfit.variable} ${notoJP.variable} ${notoTC.variable} antialiased`}
      >
        <GoogleMapsProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: '1rem',
                background: '#5D4037',
                color: '#fff',
                fontWeight: 'bold',
              },
            }}
          />
        </GoogleMapsProvider>
      </body>
    </html>
  );
}
