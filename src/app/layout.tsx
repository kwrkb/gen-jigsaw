import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gen-Jigsaw",
  description: "Collaborative AI-powered outpainting puzzle",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </body>
    </html>
  );
}
