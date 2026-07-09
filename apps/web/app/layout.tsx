import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter-tight";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helios Office",
  description: "Nền tảng HRM và mạng nội bộ cho Helios.",
  applicationName: "Helios Office",
  appleWebApp: {
    capable: true,
    title: "Helios Office",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#f3f4f6",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
