import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

// Functional UI face — navigation, body, buttons, data, labels. Highly legible variable sans.
const jakarta = Plus_Jakarta_Sans({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

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
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={["light", "dark"]}>
          <SmoothScroll />
          {children}
          <Toaster position="top-center" toastOptions={{ style: { background: "var(--card-solid)", border: "1px solid var(--border)", color: "var(--fg)" } }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
