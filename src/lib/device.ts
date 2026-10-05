export function isLowEnd(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  return cores <= 4 || memory <= 4 || nav.connection?.saveData === true;
}

export const LITE_SCRIPT = `try{var n=navigator,c=n.hardwareConcurrency||8,m=n.deviceMemory||8;if(c<=4||m<=4||(n.connection&&n.connection.saveData)||/[?&]lite\\b/.test(location.search))document.documentElement.setAttribute("data-lite","")}catch(e){}`;

export function isLite(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute("data-lite");
}
