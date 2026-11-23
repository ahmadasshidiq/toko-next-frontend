"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useMemo } from "react";
import { startNavigationProgress } from "@/components/NavigationProgress";

/** Same as next/navigation useRouter, but shows the top progress bar on push/replace. */
export function useRouter() {
  const router = useNextRouter();
  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        startNavigationProgress();
        router.push(...args);
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        startNavigationProgress();
        router.replace(...args);
      },
    }),
    [router]
  );
}
