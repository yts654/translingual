import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TransLingual - 多言語ドキュメント翻訳",
  description:
    "Word/Excel/PowerPointファイルのフォーマットを保持したまま多言語翻訳",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
