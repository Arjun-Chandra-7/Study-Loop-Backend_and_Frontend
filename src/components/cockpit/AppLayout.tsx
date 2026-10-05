"use client";

import { PHONE_QUERY, useMedia } from "@/lib/useMedia";
import { MobileApp } from "../mobile/MobileApp";
import { Cockpit } from "./Cockpit";

export function AppLayout() {
  const phone = useMedia(PHONE_QUERY);
  return phone ? (
    <div className="only-phone">
      <MobileApp />
    </div>
  ) : (
    <div className="only-wide">
      <Cockpit />
    </div>
  );
}
