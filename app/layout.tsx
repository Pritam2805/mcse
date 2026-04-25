import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/lib/AuthContext";
import { TradingProvider } from "@/lib/TradingContext";
import { AdminProvider } from "@/lib/AdminContext";
import { PreferencesProvider } from "@/lib/PreferencesContext";
import { WebSocketProvider } from "@/lib/WebSocketContext";

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MCSE",
  description: "Mock Capital Stock Exchange trading dashboard",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    title: "MCSE",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${anton.variable} ${inter.variable} antialiased`} suppressHydrationWarning>
      <body className="bg-bg text-white overflow-hidden h-dvh" style={{ overflowX: 'clip' }}>
        <PreferencesProvider>
          <AuthProvider>
            <WebSocketProvider>
              <TradingProvider>
                <AdminProvider>
                  <AppShell>{children}</AppShell>
                </AdminProvider>
              </TradingProvider>
            </WebSocketProvider>
          </AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
