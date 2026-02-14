import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";
import { AuthProvider } from "@/lib/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RoboData - Crowdsourced Robotics Training",
  description: "Crowdsourced platform for collecting human motion training data for robotics companies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <Sidebar />
          <MainContent>
            {children}
          </MainContent>
        </AuthProvider>
      </body>
    </html>
  );
}
