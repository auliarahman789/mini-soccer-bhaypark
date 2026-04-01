import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://mini-soccer-bhaypark.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Bhaypark Mini Soccer – Jadwal & Booking Lapangan",
    template: "%s | Bhaypark Mini Soccer",
  },
  description:
    "Cek jadwal dan ketersediaan slot booking lapangan mini soccer Bhaypark – fasilitas Pelayanan Markas Polda Kepulauan Bangka Belitung.",
  keywords: [
    "bhaypark",
    "mini soccer",
    "lapangan futsal",
    "booking lapangan",
    "Bangka Belitung",
    "Polda Babel",
    "jadwal lapangan",
  ],
  authors: [{ name: "Pelayanan Markas Polda Kep. Babel" }],
  creator: "Pelayanan Markas Polda Kep. Babel",
  publisher: "Bhaypark Mini Soccer",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: BASE_URL,
    siteName: "Bhaypark Mini Soccer",
    title: "Bhaypark Mini Soccer – Jadwal & Booking Lapangan",
    description:
      "Cek jadwal dan ketersediaan slot booking lapangan mini soccer Bhaypark – fasilitas Pelayanan Markas Polda Kepulauan Bangka Belitung.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Bhaypark Mini Soccer – Lapangan Futsal Polda Kep. Babel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bhaypark Mini Soccer – Jadwal & Booking Lapangan",
    description:
      "Cek jadwal dan ketersediaan slot booking lapangan mini soccer Bhaypark – Polda Kep. Babel.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/Main.png", type: "image/png" }],
    apple: [{ url: "/Main.png", sizes: "180x180" }],
    shortcut: "/Main.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: BASE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Explicit <link> tags as a hard fallback.
          Next.js metadata icons() is usually enough, but these ensure
          every browser and OS picks up Main.png correctly.
        */}
        <link rel="icon" href="/Main.png" type="image/png" />
        <link rel="shortcut icon" href="/Main.png" type="image/png" />
        <link rel="apple-touch-icon" href="/Main.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-[#EAEAEA]">
        {children}
      </body>
    </html>
  );
}
