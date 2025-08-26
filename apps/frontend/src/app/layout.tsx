import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../design-system/tokens.css"
import "./globals.css"
import { Navigation } from "@/components/navigation"
import { Toaster } from "@/components/ui/toaster"
import { ErrorBoundary } from "@/components/error-boundary"
import { TooltipProvider } from "@/components/ui/tooltip"
import { I18nProvider } from "@/lib/i18n"
import PerformanceMonitoring from "@/components/core-web-vitals"

// Inter Variable font with optimized loading strategy
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap", // Ensures text remains visible during font load
  preload: true,
  fallback: [
    // System font stack fallbacks for better CLS
    "-apple-system",
    "BlinkMacSystemFont", 
    "Segoe UI",
    "Roboto",
    "Oxygen",
    "Ubuntu",
    "Cantarell",
    "Open Sans",
    "Helvetica Neue",
    "sans-serif"
  ],
  adjustFontFallback: true, // Automatic fallback font metrics adjustment
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
})

// JetBrains Mono for code blocks
const jetbrainsMono = Inter({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false, // Only preload if needed on page
  fallback: [
    "Menlo",
    "Monaco",
    "Consolas",
    "Liberation Mono",
    "Courier New",
    "monospace"
  ],
  adjustFontFallback: true
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
      <head>
        {/* Font preloading for performance */}
        <link
          rel="preload"
          href="/fonts/Inter-Variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/JetBrainsMono-Variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Preconnect to external font services */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ErrorBoundary>
          <I18nProvider>
            <TooltipProvider>
              <div className="relative min-h-screen flex flex-col">
                <Navigation />
                <main className="flex-1">
                  {children}
                </main>
              </div>
              <Toaster />
              <PerformanceMonitoring />
            </TooltipProvider>
          </I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
