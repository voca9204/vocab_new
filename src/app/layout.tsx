import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { CacheProvider } from "@/contexts/cache-context";
import { VocabularyProvider } from "@/contexts/vocabulary-context";
import { AppLayout } from "@/components/layout/app-layout";
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
  title: "VocaPhile - SAT 어휘 학습",
  description: "실전 SAT 어휘를 효과적으로 학습하는 스마트 플랫폼",
  manifest: "/manifest.json",
  themeColor: "#3B82F6",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VocaPhile",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "VocaPhile",
    title: "VocaPhile - SAT 어휘 학습",
    description: "실전 SAT 어휘를 효과적으로 학습하는 스마트 플랫폼",
  },
  twitter: {
    card: "summary",
    title: "VocaPhile - SAT 어휘 학습",
    description: "실전 SAT 어휘를 효과적으로 학습하는 스마트 플랫폼",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SettingsProvider>
            <CacheProvider>
              <VocabularyProvider>
                <AppLayout>
                  {children}
                </AppLayout>
              </VocabularyProvider>
            </CacheProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}