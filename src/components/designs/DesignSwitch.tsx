"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DESIGN_COOKIE, type Design } from "@/lib/design";

export function setDesign(design: Design) {
  document.cookie = `${DESIGN_COOKIE}=${design}; path=/; max-age=31536000; samesite=lax`;
}

/** Persists a `?design=` choice so it survives reloads and URL rewrites. */
export function RememberDesign({ design }: { design: Design }) {
  useEffect(() => setDesign(design), [design]);
  return null;
}

export function DesignSwitch({ current }: { current: Design }) {
  const router = useRouter();
  const next: Design = current === "atelier" ? "legacy" : "atelier";

  return (
    <button
      type="button"
      className="design-switch"
      data-design-current={current}
      onClick={() => {
        setDesign(next);
        const url = new URL(window.location.href);
        url.searchParams.delete("design");
        window.history.replaceState(null, "", url);
        window.scrollTo(0, 0);
        router.refresh();
      }}
    >
      {current === "atelier" ? "Legacy design" : "New design"}
    </button>
  );
}
