import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Navigation } from "@/components/navigation"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "SMM Architect",
    template: "%s | SMM Architect",
  },
  description: "Autonomous Social Media Marketing Platform",
  keywords: ["social media", "marketing", "automation", "AI", "content creation"],
  authors: [{ name: "SMM Architect Team" }],
  creator: "SMM Architect",
  metadataBase: new URL("https://smm-architect.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://smm-architect.com",
    siteName: "SMM Architect",
    title: "SMM Architect - Autonomous Social Media Marketing",
    description: "Transform your social media strategy with AI-powered automation, campaign simulation, and intelligent content creation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SMM Architect",
    description: "Autonomous Social Media Marketing Platform",
    creator: "@smmarchitect",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <div className="relative min-h-screen flex flex-col">
          <Navigation />
          <main className="flex-1">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  )
}
