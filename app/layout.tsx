import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
const display = Baloo_2({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700", "800"] });
const body = Nunito({ subsets: ["latin"], variable: "--font-body", weight: ["400", "600", "700", "800"] });
export const metadata: Metadata = { title: "Eira's P3 Quest", description: "A fresh daily Primary 3 Math and Science practice adventure." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en-SG"><body className={`${display.variable} ${body.variable}`}>{children}</body></html>; }
