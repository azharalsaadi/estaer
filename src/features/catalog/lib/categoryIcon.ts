const KNOWN_CATEGORY_ASSETS: Record<string, string> = {
  cameras: "/assets/cameras.svg",
  laptops: "/assets/laptops.svg",
  projectors: "/assets/projectors.svg",
  cables: "/assets/cables.svg",
}

/** Returns an illustration path for the known starter categories from the
 * approved design, or null for any category an admin adds later — callers
 * fall back to a generic icon in that case. */
export function getCategoryIllustration(categoryName: string): string | null {
  return KNOWN_CATEGORY_ASSETS[categoryName.trim().toLowerCase()] ?? null
}
