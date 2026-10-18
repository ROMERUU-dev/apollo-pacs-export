/**
 * Built-in report templates, EDEN-style ("Plantillas"). Selecting one seeds the
 * rich-text editor. These are generic starting points — the radiologist can
 * replace them with the clinic's real templates (ask the user for their set).
 * `modality` is used to surface the most relevant templates first.
 */
export interface ReportTemplate {
  id: string;
  name: string;
  modality?: string;
  html: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'blank',
    name: 'En blanco',
    html: '<p><b>HALLAZGOS:</b></p><p><br></p><p><b>IMPRESIÓN:</b></p><p><br></p>',
  },
  {
    id: 'us-abdomen',
    name: 'US abdominal',
    modality: 'US',
    html:
      '<p><b>TÉCNICA:</b> Ultrasonido abdominal en tiempo real.</p>' +
      '<p><b>HALLAZGOS:</b></p>' +
      '<ul><li>Hígado: tamaño y ecogenicidad normales.</li><li>Vía biliar: no dilatada.</li>' +
      '<li>Vesícula biliar: sin litos.</li><li>Páncreas, bazo y riñones: sin alteraciones.</li></ul>' +
      '<p><b>IMPRESIÓN:</b></p><p><br></p>',
  },
  {
    id: 'mg-birads',
    name: 'Mastografía (BI-RADS)',
    modality: 'MG',
    html:
      '<p><b>TÉCNICA:</b> Mastografía digital bilateral, proyecciones CC y MLO.</p>' +
      '<p><b>HALLAZGOS:</b></p>' +
      '<ul><li>Composición mamaria: ___</li><li>Masas: ninguna.</li>' +
      '<li>Calcificaciones: ninguna sospechosa.</li><li>Asimetrías / distorsión: ninguna.</li></ul>' +
      '<p><b>IMPRESIÓN:</b> BI-RADS ___.</p>',
  },
  {
    id: 'dx-torax',
    name: 'Tórax PA',
    modality: 'DX',
    html:
      '<p><b>TÉCNICA:</b> Radiografía de tórax, proyección PA.</p>' +
      '<p><b>HALLAZGOS:</b></p>' +
      '<ul><li>Campos pulmonares sin consolidaciones.</li><li>Silueta cardiomediastinal normal.</li>' +
      '<li>Senos costofrénicos libres.</li><li>Estructuras óseas sin lesiones agudas.</li></ul>' +
      '<p><b>IMPRESIÓN:</b></p><p><br></p>',
  },
];

/** Default seed when a study is opened without an existing report. */
export const DEFAULT_REPORT_HTML = '<p><b>HALLAZGOS:</b></p><p><br></p><p><b>IMPRESIÓN:</b></p><p><br></p>';
