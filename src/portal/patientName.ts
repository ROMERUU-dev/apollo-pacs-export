/**
 * Presentación del nombre del paciente en el portal.
 *
 * La API devuelve el nombre tal como viene del equipo (formato DICOM "Apellidos^Nombres",
 * normalmente en mayúsculas) o "Apellidos Nombres" del registro de recepción. Aquí se
 * convierte a "Nombres Apellidos" con mayúsculas iniciales para saludar al paciente.
 */
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'das', 'van', 'von', 'di']);

function titleWord(word: string, index: number): string {
  const lower = word.toLocaleLowerCase('es-MX');
  if (index > 0 && PARTICLES.has(lower)) return lower;
  return lower.replace(/(^|[-'’])(\p{L})/gu, (_match, separator: string, letter: string) => separator + letter.toLocaleUpperCase('es-MX'));
}

export function formatPatientName(raw: string | null | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return 'Paciente';
  let words: string[];
  if (value.includes('^')) {
    const [family = '', given = '', middle = ''] = value.split('^').map((part) => part.trim());
    words = `${given} ${middle} ${family}`.split(/\s+/).filter(Boolean);
  } else {
    words = value.replace(/[=,]/g, ' ').split(/\s+/).filter(Boolean);
  }
  return words.length ? words.map(titleWord).join(' ') : 'Paciente';
}
