/** Overlays render inside the phone mockup screen when it exists, so they never spill past the frame. */
export function phonePortal(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined;
  return (document.querySelector(".mockup-screen-shell") as HTMLElement | null) ?? undefined;
}
