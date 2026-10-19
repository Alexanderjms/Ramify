import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import LanguageProvider from "@/components/language-provider";
import { WarmTooltipGroup } from "@/components/WarmTooltip";
import AppToaster from "@/components/app-feedback";
import "goey-toast/styles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ramify",
  description: "Proyecto Ramify.",
  icons: {
    icon: { url: "/icons/favicon.png?v=3", type: "image/png", sizes: "48x48" },
    shortcut: "/icons/favicon.png?v=3",
    apple: {
      url: "/icons/apple-touch-icon.png?v=2",
      sizes: "180x180",
      type: "image/png",
    },
  },
  appleWebApp: {
    capable: true,
    title: "Ramify",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <WarmTooltipGroup travel={200}>{children}</WarmTooltipGroup>
          <AppToaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
