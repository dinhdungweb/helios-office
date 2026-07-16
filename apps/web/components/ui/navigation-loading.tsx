"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldShowNavigationLoading(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  const nextUrl = new URL(anchor.href, window.location.href);
  const currentUrl = new URL(window.location.href);

  if (nextUrl.origin !== currentUrl.origin) {
    return false;
  }

  if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) {
    return false;
  }

  return true;
}

export function NavigationLoading() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timeout = window.setTimeout(() => setIsLoading(false), 8000);

    return () => window.clearTimeout(timeout);
  }, [isLoading]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;

      if (!(target instanceof HTMLAnchorElement) || !shouldShowNavigationLoading(target)) {
        return;
      }

      setIsLoading(true);
    };

    window.addEventListener("click", handleClick, true);

    return () => window.removeEventListener("click", handleClick, true);
  }, []);

  if (!isLoading) {
    return null;
  }

  return <div className="app-loading-overlay" role="status" aria-live="polite" aria-label="Đang tải dữ liệu" />;
}
