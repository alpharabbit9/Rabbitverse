import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SmoothScroll } from "@/components/smooth-scroll";
import { MoodMode } from "@/components/mood-mode";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
// Distinctive geometric display sans — used only for the "Rabbit Verse" brand wordmark.
const spaceGrotesk = Space_Grotesk({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Rabbit Verse — Forge Your Legacy",
  description: "See your life. Not just live it. A calm, premium dashboard for your projects, workouts, spending, and mind.",
  applicationName: "Rabbit Verse",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Rabbit Verse" },
  // Tab / apple-touch icons come from the logo via the app/icon.png + app/apple-icon.png file conventions.
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05070f" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fc" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={["light", "dark"]}>
          <SmoothScroll />
          <MoodMode />
          {children}
          <Toaster position="top-center" toastOptions={{ style: { background: "var(--card-solid)", border: "1px solid var(--border)", color: "var(--fg)" } }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
