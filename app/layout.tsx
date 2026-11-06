import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
  title: { default: "App Central", template: "%s · App Central" },
  description: "Self-hosted analytics and monitoring for all your apps.",
  applicationName: "App Central",
  openGraph: {
    type: "website",
    siteName: "App Central",
    title: "App Central — Every app. One clear picture.",
    description: "Self-hosted analytics and monitoring for every app you ship. Your data. Your infrastructure.",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "App Central — Every app. One clear picture. Self-hosted analytics and monitoring." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "App Central — Every app. One clear picture.",
    description: "Self-hosted analytics and monitoring for every app you ship.",
    images: [{ url: "/brand/og-image.png", alt: "App Central — Every app. One clear picture. Self-hosted analytics and monitoring." }],
  },
};

// Applies the saved theme before first paint so dark mode doesn't flash.
const themeScript = `try{var t=localStorage.theme;var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
