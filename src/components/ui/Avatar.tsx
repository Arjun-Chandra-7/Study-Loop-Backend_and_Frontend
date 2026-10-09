"use client";

import { useState } from "react";
import { initials, useAuth } from "@/lib/auth";

export function Avatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { user, photo } = useAuth();
  const [broken, setBroken] = useState<string | null>(null);
  const cls = `avatar${size === "md" ? "" : ` avatar--${size}`}`;
  if (photo && broken !== photo) {
    return (
      <span className={`${cls} avatar--photo`} aria-hidden>

        <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(photo)} />
      </span>
    );
  }
  return (
    <span className={cls} aria-hidden>
      {initials(user)}
    </span>
  );
}
