import type { Metadata } from "next";
import { Cormorant_Garamond, Cormorant_SC, Manrope } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const cormorantSc = Cormorant_SC({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cormorant-sc" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { template: "%s · Clubhouse Office", default: "Clubhouse Office · CamSur Uptown Golf" },
  robots: { index: false, follow: false },
  icons: { icon: "/mark.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${cormorantSc.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
