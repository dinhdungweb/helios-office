import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { NavigationLoading } from "@/components/ui/navigation-loading";
import "@fontsource-variable/inter-tight";
import "./globals.css";

const themeBootstrapScript = `
(() => {
  try {
    const themes = {
      orange: { primary: "#f15a24", strong: "#d94918", soft: "#fff0ea", border: "#ffd7cb" },
      red: { primary: "#ef4444", strong: "#dc2626", soft: "#fef2f2", border: "#fecaca" },
      rose: { primary: "#e11d48", strong: "#be123c", soft: "#fff1f2", border: "#fecdd3" },
      amber: { primary: "#f59e0b", strong: "#d97706", soft: "#fffbeb", border: "#fde68a" },
      emerald: { primary: "#10b981", strong: "#059669", soft: "#ecfdf5", border: "#a7f3d0" },
      cyan: { primary: "#06b6d4", strong: "#0891b2", soft: "#ecfeff", border: "#a5f3fc" },
      blue: { primary: "#2563eb", strong: "#1d4ed8", soft: "#eff6ff", border: "#bfdbfe" },
      violet: { primary: "#7c3aed", strong: "#6d28d9", soft: "#f5f3ff", border: "#ddd6fe" },
      slate: { primary: "#30363d", strong: "#1f2328", soft: "#f3f4f6", border: "#d1d5db" }
    };
    const currentThemeId = localStorage.getItem("helios:appearance-theme:current");
    const fallbackKey = Object.keys(localStorage).find((item) => item.startsWith("helios:appearance-theme:") && item !== "helios:appearance-theme:current");
    const themeId = currentThemeId || (fallbackKey ? localStorage.getItem(fallbackKey) : null);
    const theme = themeId ? themes[themeId] : null;

    if (theme) {
      document.documentElement.style.setProperty("--color-primary", theme.primary);
      document.documentElement.style.setProperty("--color-primary-strong", theme.strong);
      document.documentElement.style.setProperty("--color-primary-soft", theme.soft);
      document.documentElement.style.setProperty("--color-primary-border", theme.border);
      document.documentElement.style.setProperty("--color-primary-contrast", "#ffffff");
      document.documentElement.style.setProperty("--app-loading-color", theme.primary);
    }
  } catch {}
})();
`;

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
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        {children}
        <Suspense fallback={null}>
          <NavigationLoading />
        </Suspense>
      </body>
    </html>
  );
}
