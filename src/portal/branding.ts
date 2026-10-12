/**
 * Marca de la clínica para el portal del paciente.
 *
 * El portal es multi-clínica: cada despliegue sirve `/brand/brand.json` (archivo estático
 * montado por operaciones junto con el logo). Si no existe, el portal cae a la marca del
 * producto. Nada de esto se compila dentro de la imagen del frontend.
 */
import { BRAND } from '../brand';

export interface ClinicBrand {
  clinic_name: string;
  short_name?: string;
  logo_url?: string;
  icon_url?: string;
  /** Color principal (encabezados, texto de marca). */
  primary?: string;
  /** Color de acento (botones, enlaces). */
  accent?: string;
  phone?: string;
  whatsapp_url?: string;
  privacy_url?: string;
  city?: string;
}

export const BRAND_JSON_URL = '/brand/brand.json';

export const FALLBACK_BRAND: ClinicBrand = { clinic_name: BRAND.name, short_name: BRAND.name, privacy_url: '/privacidad' };

const HEX = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;

function clean(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function sameOriginOrHttps(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { return new URL(value).protocol === 'https:' ? value : undefined; } catch { return undefined; }
}

/** Acepta solo lo que el portal sabe usar; cualquier otra cosa del JSON se ignora. */
export function normalizeBrand(raw: unknown): ClinicBrand {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const clinicName = clean(input.clinic_name);
  if (!clinicName) return FALLBACK_BRAND;
  const primary = clean(input.primary); const accent = clean(input.accent);
  return {
    clinic_name: clinicName,
    short_name: clean(input.short_name) ?? clinicName,
    logo_url: sameOriginOrHttps(clean(input.logo_url)),
    icon_url: sameOriginOrHttps(clean(input.icon_url)),
    primary: primary && HEX.test(primary) ? primary : undefined,
    accent: accent && HEX.test(accent) ? accent : undefined,
    phone: clean(input.phone),
    whatsapp_url: sameOriginOrHttps(clean(input.whatsapp_url)),
    privacy_url: sameOriginOrHttps(clean(input.privacy_url)) ?? FALLBACK_BRAND.privacy_url,
    city: clean(input.city),
  };
}

let cached: Promise<ClinicBrand> | undefined;

export function loadBrand(): Promise<ClinicBrand> {
  cached ??= fetch(BRAND_JSON_URL, { cache: 'no-cache' })
    .then((response) => (response.ok ? response.json() : undefined))
    .then(normalizeBrand)
    .catch(() => FALLBACK_BRAND);
  return cached;
}

/** Solo para pruebas: olvida la marca cacheada. */
export function resetBrandCache(): void { cached = undefined; }
