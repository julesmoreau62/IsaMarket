import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ISAMARKET — Les pronostics de la promo",
  description: "Le marché privé de pronostics de la classe, en Squids.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
