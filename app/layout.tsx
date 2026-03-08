import { Syne, JetBrains_Mono, Caveat } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500", "600"],
})

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwritten",
  weight: ["400", "500", "600", "700"],
})

export const metadata = {
  title: "Poof — Self-Destructing Email",
  description:
    "Disposable email that actually disappears. Spam-proof, encrypted, real-time. Like a burner phone, but for your inbox.",
  keywords: ["temp mail", "disposable email", "burner email", "anonymous email", "spam protection"],
  icons: {
    icon: "/favicon.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(syne.variable, jetbrainsMono.variable, caveat.variable)}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
