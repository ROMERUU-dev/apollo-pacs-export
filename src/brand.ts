/**
 * Single source of truth for the product brand.
 *
 * NOTE: "Belka" is already registered as a trademark in Mexico, so the final
 * name is still being settled (candidates: Belstrel, Belstra, Strelix, ...).
 * When it lands, change `name` here and the whole UI follows. The squirrel
 * glyph lives in components/brand/BelkaLogo.tsx.
 */
export const BRAND = {
  name: 'Belstrel',
  suffix: 'PACS',
  tagline: 'Imagen diagnóstica',
} as const;

export const BRAND_FULL = `${BRAND.name} ${BRAND.suffix}`;
