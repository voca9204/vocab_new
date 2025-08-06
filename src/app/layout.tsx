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
  title: "SAT Vocabulary Learning Platform V2",
  description: "Next.js + Firebase SAT vocabulary learning with news-based contextual learning",
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