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

/**
 * Clinic (customer) brand — shown as the PRIMARY mark everywhere (white-label);
 * Belstrel is the platform, kept as the small "belstrel pacs" tag. The logo
 * asset lives in components/brand/radiodiagnostico-emblema.svg.
 */
export const CLINIC = {
  name: 'Radiodiagnóstico',
  location: 'Puerto Peñasco',
} as const;
