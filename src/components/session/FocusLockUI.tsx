"use client";

import { useFocusLock } from "@/lib/focus/focusLock";
import { Icon } from "../ui/Icon";

export function FocusLockChip() {
  const f = useFocusLock();
  if (!f.locked) return null;
  const until = f.until ? new Date(f.until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
  return (
    <p className="chip focus-lock__chip">
      <Icon name="flag" size={12} />
      Locked{until ? ` until ${until}` : ""}
      {f.extension !== "connected" ? " · this tab only" : ""}
    </p>
  );
}
