export type Design = "atelier" | "legacy";

export const DESIGN_COOKIE = "sl-design";

export function parseDesign(value: string | undefined | null): Design | null {
  return value === "legacy" || value === "atelier" ? value : null;
}
