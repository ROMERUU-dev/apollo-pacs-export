import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  let worklistStatus = 'scheduled';
  let addOnCreated = false;
  let orderOneCharge = { id: 'charge-1', encounter_id: 'encounter-1', imaging_service_request_id: 'isr-1', code_snapshot: 'DEMO-E15', name_snapshot: 'US Abdomen', base_amount: '1200.00', currency: 'MXN', created_by: 'apollo-receptionist', created_at: new Date().toISOString(), adjustments: [] as unknown[], net_amount: '1200.00' };
  let pendingOrderResolved = false;
  let encounterOneCoverage: Record<string, unknown> | null = null;
  let orderOneResolution: Record<string, unknown> | null = null;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path.endsWith('/session')) body = {
      username: 'apollo-receptionist', subject: 'user-1',
      roles: ['apollo-receptionist', 'apollo-technician', 'apollo-physician'],
    };
    if (path.endsWith('/health')) body = { status: 'ok' };
    if (path.endsWith('/studies') && route.request().method() === 'GET') body = [{ id: 'study-1', study_instance_uid: '1.2.3', patient_id: 'p1', patient_name: 'Prueba, Patricia', medical_record_number: 'AP-P-000001', accession_number: 'AP260705000002', description: 'Tórax AP', performed_at: new Date().toISOString(), modality: 'DX', modalities: ['DX'], status: 'completed', series_count: 1, instance_count: 1, viewer_available: true }];
    if (path.endsWith('/studies/study-1/delivery-options')) body = { patient_id: 'p1', email_masked: 'p***@example.com', phone_masked: '•••• 4567', email_configured: false, whatsapp_configured: false, email_consented: false, whatsapp_consented: false, notice_version: '2026-07' };
    if (path.endsWith('/studies/study-1/deliveries')) body = [];
    if (path.endsWith('/portal/redeem')) body = { study_id: 'study-1', patient_name: 'Patricia Prueba', description: 'Tórax AP', viewer_url: '/ohif/viewer?patientPortal=1&StudyInstanceUIDs=1.2.3', expires_at: new Date(Date.now() + 1800000).toISOString() };
    if (path.endsWith('/catalog-items') && route.request().method() === 'GET') body = [
      { id: 'c1', code: 'DEMO-E00', name: 'ANTEBRAZO AP Y LAT', modality: 'DX', amount: '500.00', currency: 'MXN', is_active: true },
      { id: 'c2', code: 'DEMO-E01', name: 'BIOPSIA DE MAMA', modality: 'US', amount: '3500.00', currency: 'MXN', is_active: true },
    ];
    if (path.endsWith('/catalog-items') && route.request().method() === 'POST') body = {
      id: 'c3', code: 'OFFERING-NUEVA', name: 'Offering nueva', modality: 'DX', amount: '900.00', currency: 'MXN', is_active: true,
    };
    if (path.match(/\/catalog-items\/c\d+$/) && route.request().method() === 'PUT') body = {
      id: 'c1', code: 'DEMO-E00', name: 'ANTEBRAZO AP Y LAT', modality: 'DX', amount: '650.00', currency: 'MXN', is_active: true,
    };
    if (path.endsWith('/catalog-items/c1/detail')) body = {
      id: 'c1', code: 'DEMO-E00', name: 'ANTEBRAZO AP Y LAT', modality: 'DX', amount: '500.00', currency: 'MXN', is_active: true, components: [],
    };
    if (path.endsWith('/catalog-items/c2/detail')) body = {
      id: 'c2', code: 'DEMO-E01', name: 'BIOPSIA DE MAMA', modality: 'US', amount: '3500.00', currency: 'MXN', is_active: true, components: [],
    };
    if (path.endsWith('/patients') && route.request().method() === 'GET') body = [{ id: 'p1', mrn: 'AP-P-000001', first_name: 'Patricia', last_name: 'Prueba', second_last_name: 'Apollo', birth_date: '1990-01-01', sex: 'female', phone: '6641234567' }];
    if (path.endsWith('/quotes') && route.request().method() === 'POST') body = { id: 'q1', patient_id: 'p1', status: 'issued', total_mxn: '500.00', created_at: new Date().toISOString(), lines: [] };
    if (path.endsWith('/quotes/q1/schedule')) body = [{ id: 'order-quote-1', patient_id: 'p1', accession_number: 'AP260705000001', modality: 'DX', status: 'scheduled', priority: 'routine', description: 'ANTEBRAZO AP Y LAT', scheduled_at: new Date().toISOString(), scheduled_duration_minutes: 15 }];
    if (path.endsWith('/orders') && route.request().method() === 'GET') body = [{
      id: 'order-1', patient_id: 'p1', accession_number: 'AP260705000002', modality: 'DX', status: 'scheduled', priority: 'routine',
      description: 'Tórax AP', scheduled_at: new Date().toISOString(), scheduled_duration_minutes: 15,
      encounter_id: 'encounter-1', imaging_service_request_id: 'isr-1', procedure_definition_id: 'pd-us-1',
    }, {
      id: 'order-pending', patient_id: 'p1', accession_number: 'AP260705000009', modality: 'US', status: 'scheduled', priority: 'routine',
      description: 'US mamario (add-on)', scheduled_at: new Date().toISOString(), scheduled_duration_minutes: 15,
      encounter_id: 'encounter-2', imaging_service_request_id: 'isr-2',
      financial_resolution_status: pendingOrderResolved ? 'resolved' : 'review_required',
    }];
    if (path.endsWith('/orders/order-1/schedule')) body = { id: 'order-1', patient_id: 'p1', accession_number: 'AP260705000002', modality: 'DX', status: 'scheduled', priority: 'routine', description: 'Tórax AP', scheduled_at: new Date().toISOString(), scheduled_duration_minutes: 15 };
    if (path.endsWith('/orders/order-1/cancel')) body = { id: 'order-1', status: 'cancelled', accession_number: 'AP260705000002' };
    if (path.endsWith('/charges') && route.request().method() === 'GET') {
      const encounterId = new URL(route.request().url()).searchParams.get('encounter_id');
      body = encounterId === 'encounter-1' ? [orderOneCharge] : [];
    }
    if (path.endsWith('/charges/charge-1/adjustments') && route.request().method() === 'POST') {
      const payload = route.request().postDataJSON();
      const amount = payload.type === 'percentage_discount' ? String((1200 * Number(payload.percentage) / 100).toFixed(2))
        : payload.type === 'courtesy' ? orderOneCharge.net_amount : payload.amount;
      const adjustment = { id: 'adj-1', charge_id: 'charge-1', type: payload.type, amount, percentage: payload.percentage, reason: payload.reason, created_by: 'apollo-receptionist', created_at: new Date().toISOString(), is_active: true };
      orderOneCharge = { ...orderOneCharge, adjustments: [adjustment], net_amount: String((Number(orderOneCharge.net_amount) - Number(amount)).toFixed(2)) };
      body = adjustment;
    }
    if (path.endsWith('/resolve-financial-review') && route.request().method() === 'POST') {
      pendingOrderResolved = true;
      body = {
        id: 'charge-pending', encounter_id: 'encounter-2', imaging_service_request_id: 'isr-2',
        code_snapshot: 'OFFERING-US-PENDING', name_snapshot: 'US Mamario', base_amount: '800.00', currency: 'MXN',
        created_by: 'apollo-receptionist', created_at: new Date().toISOString(), adjustments: [], net_amount: '800.00',
      };
    }
    if (path.endsWith('/payers') && route.request().method() === 'GET') body = [
      { id: 'payer-1', code: 'ISSSTESON', name: 'ISSSTESON', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    if (path.endsWith('/payers/payer-1/contracts')) body = [
      { id: 'contract-1', payer_id: 'payer-1', name: 'Convenio 2026', valid_from: '2026-01-01', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    if (path.endsWith('/procedure-definitions/pd-us-1/payer-tariffs')) body = [
      { payer_id: 'payer-1', payer_code: 'ISSSTESON', payer_name: 'ISSSTESON', contract_id: 'contract-1', contract_name: 'Convenio 2026', tariff: null },
    ];
    if (path.endsWith('/payer-contracts/contract-1/tariffs') && route.request().method() === 'POST') body = {
      id: 'tariff-1', contract_id: 'contract-1', procedure_definition_id: 'pd-us-1', eligibility: 'eligible',
      tariff_amount: '750.00', currency: 'MXN', requires_authorization: false, valid_from: '2026-01-01',
      is_active: true, created_by: 'apollo-receptionist', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    if (path.endsWith('/encounters/encounter-1/coverage') && route.request().method() === 'GET') body = encounterOneCoverage;
    if (path.endsWith('/encounters/encounter-1/coverage') && route.request().method() === 'PUT') {
      encounterOneCoverage = {
        id: 'coverage-1', encounter_id: 'encounter-1', payer_id: 'payer-1', contract_id: 'contract-1',
        is_primary: true, is_active: true, created_by: 'apollo-receptionist', created_at: new Date().toISOString(),
      };
      body = encounterOneCoverage;
    }
    if (path.endsWith('/orders/order-1/payer-resolution') && route.request().method() === 'GET') body = orderOneResolution;
    if (path.endsWith('/orders/order-1/payer-resolution/override')) {
      orderOneResolution = {
        id: 'res-1', order_id: 'order-1', payer_id: 'payer-1', contract_id: 'contract-1', procedure_definition_id: 'pd-us-1',
        eligibility_status: 'eligible', tariff_amount: '700.00', currency: 'MXN', requires_authorization: true,
        authorization_reference: 'FOLIO-1', resolution_source: 'authorized_override',
        resolved_by: 'apollo-receptionist', resolved_at: new Date().toISOString(),
      };
      body = orderOneResolution;
    }
    if (path.endsWith('/cash/access')) body = route.request().method() === 'POST' ? { unlocked: true, mode: 'development_bypass', expires_at: new Date(Date.now() + 900000).toISOString() } : { unlocked: false, mode: 'locked' };
    if (path.endsWith('/operational-worklist')) {
      body = [{
        order_id: 'order-1', encounter_id: 'encounter-1', imaging_service_request_id: 'isr-1',
        patient: { id: 'p1', mrn: 'DEMO-001', first_name: 'Prueba', last_name: 'Paciente', middle_name: null, birth_date: '1990-01-01', sex: 'unknown' },
        procedure: { accession_number: 'ACC-DEMO', modality: 'DX', status: worklistStatus, priority: 'routine', description: 'Tórax AP', scheduled_at: new Date().toISOString() },
      }];
      if (addOnCreated) (body as unknown[]).push({
        order_id: 'order-2', encounter_id: 'encounter-1', imaging_service_request_id: 'isr-2',
        patient: { id: 'p1', mrn: 'DEMO-001', first_name: 'Prueba', last_name: 'Paciente', middle_name: null, birth_date: '1990-01-01', sex: 'unknown' },
        procedure: { accession_number: 'ACC-DEMO-ADDON', modality: 'US', status: 'scheduled', priority: 'routine', description: 'Ultrasonido mamario', scheduled_at: new Date().toISOString() },
      });
    }
    if (path.endsWith('/orders/order-1/status') && route.request().method() === 'PATCH') {
      worklistStatus = route.request().postDataJSON().status;
      body = { id: 'order-1', status: worklistStatus };
    }
    if (path.endsWith('/procedure-definitions') && route.request().method() === 'GET') body = [
      { id: 'pd-us-1', code: 'PD-US', name: 'Ultrasonido mamario', modality: 'US', is_active: true },
      { id: 'pd-mg-1', code: 'PD-MG', name: 'Mastografía bilateral', modality: 'MG', is_active: true },
      { id: 'pd-dx-1', code: 'PD-DX', name: 'Tórax PA y LAT', modality: 'DX', is_active: true },
    ];
    if (path.endsWith('/procedure-definitions') && route.request().method() === 'POST') body = {
      id: 'pd-new-1', code: 'PD-NEW', name: 'Procedimiento nuevo', modality: 'DX', is_active: true,
    };
    if (path.match(/\/procedure-definitions\/pd-[\w-]+$/) && route.request().method() === 'PUT') body = {
      id: 'pd-us-1', code: 'PD-US', name: 'Ultrasonido mamario editado', modality: 'US', is_active: true,
    };
    if (path.includes('/add-on-procedures') && route.request().method() === 'POST') {
      addOnCreated = true;
      body = {
        id: 'order-2', patient_id: 'p1', accession_number: 'ACC-DEMO-ADDON', modality: 'US',
        status: 'scheduled', priority: 'routine', encounter_id: 'encounter-1', imaging_service_request_id: 'isr-2',
      };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
});

test('las rutas React soportan navegación y recarga directa', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Apollo PACS' })).toBeVisible();
  await page.getByRole('link', { name: 'Recepción', exact: true }).first().click();
  await expect(page).toHaveURL(/\/recepcion$/);
  await expect(page.getByRole('heading', { name: 'Recepción', exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Recepción', exact: true }).first()).toBeVisible();
  await expect(page.getByText('apollo-pacs.local')).toHaveCount(0);
  await expect(page.locator('.traffic-lights')).toHaveCount(0);
});

test('Recepción normal conserva BrowserAdapter y no habilita hardware nativo', async ({ page }) => {
  await page.goto('/recepcion');
  await page.getByRole('button', { name: 'Configuración' }).click();
  const device = page.locator('.device-status');
  await expect(device.getByRole('heading', { name: 'Browser' })).toBeVisible();
  await expect(device.getByText('Unavailable')).toBeVisible();
  for (const capability of ['Printing', 'Printer status', 'Cash drawer', 'Device settings']) {
    await expect(device.locator('dt', { hasText: capability }).locator('..').getByText('No disponible')).toBeVisible();
  }
  await expect(device.getByRole('button')).toHaveCount(0);
});

test('el menú respeta las rutas clínicas disponibles para la sesión', async ({ page }) => {
  await page.goto('/tecnico');
  await expect(page.getByRole('heading', { name: 'Estación del técnico' })).toBeVisible();
  await expect(page.getByText('Paciente, Prueba').first()).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar estudio' }).click();
  await expect(page.getByRole('button', { name: 'Marcar como completado' })).toBeVisible();
  await page.getByRole('link', { name: 'Médico', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lectura del radiólogo' })).toBeVisible();
});

test('el catálogo alimenta un único cotizador con precios del standalone', async ({ page }) => {
  await page.goto('/recepcion');
  const first = page.locator('.catalog-card').filter({ hasText: 'ANTEBRAZO AP Y LAT' });
  const second = page.locator('.catalog-card').filter({ hasText: 'BIOPSIA DE MAMA' });
  await first.getByRole('button', { name: '+' }).click();
  await second.getByRole('button', { name: '+' }).click();
  await expect(page.locator('.quote-pane')).toContainText('2 estudios');
  await expect(page.locator('.quote-total')).toContainText('$4,000.00');
});

test('crear cotización permite buscar y asociar un paciente existente', async ({ page }) => {
  await page.goto('/recepcion');
  await page.locator('.catalog-card').filter({ hasText: 'ANTEBRAZO AP Y LAT' }).getByRole('button', { name: '+' }).click();
  await page.getByRole('button', { name: 'Crear cotización' }).click();
  await page.getByRole('button', { name: /Paciente existente/ }).click();
  await page.getByPlaceholder(/Nombre, apellidos/).fill('Patricia');
  await expect(page.getByText('AP-P-000001')).toBeVisible();
  await page.getByRole('button', { name: /Patricia Prueba Apollo/ }).click();
  await expect(page.getByText(/Cotización creada y 1 estudio/)).toBeVisible();
});

test('Órdenes permite reprogramar y retirar una cita de Worklist con motivo', async ({ page }) => {
  await page.goto('/recepcion');
  await page.getByRole('button', { name: 'Órdenes' }).click();
  await page.locator('.dense-row.order-row').filter({ hasText: 'AP260705000002' }).getByRole('button', { name: 'Gestionar' }).click();
  await expect(page.getByText('Accession AP260705000002')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar / retirar WL' }).click();
  await page.getByPlaceholder(/El paciente se retiró/).fill('El paciente se retiró');
  await page.getByRole('button', { name: 'Confirmar cancelación' }).click();
  await expect(page.getByText(/retirada de Worklist/)).toBeVisible();
});

test('Caja oculta saldos hasta obtener acceso temporal', async ({ page }) => {
  await page.goto('/recepcion');
  await page.getByRole('button', { name: 'Caja', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Caja protegida' })).toBeVisible();
  await page.getByRole('button', { name: 'Verificar acceso a Caja' }).click();
  await expect(page.getByText(/Modo desarrollo/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apertura / Cierre' })).toBeVisible();
});

test('entrega segura muestra proveedores deshabilitados sin afirmar un envío', async ({ page }) => {
  await page.goto('/medico');
  await page.getByRole('button', { name: 'Enviar por correo / WhatsApp' }).click();
  await expect(page.getByRole('heading', { name: 'Enviar estudio' })).toBeVisible();
  await expect(page.getByText('SES/SMTP no configurado')).toBeVisible();
  await expect(page.getByText('Meta Cloud API no configurada')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar enlace seguro' })).toBeDisabled();
});

test('el portal canjea y elimina el token de la barra de direcciones', async ({ page }) => {
  await page.goto('/portal?token=opaque-test-token');
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole('heading', { name: 'Patricia Prueba' })).toBeVisible();
});

test('Lote C4/C5: el técnico agrega un estudio por indicación verbal del médico y aparece en Worklist', async ({ page }) => {
  await page.goto('/tecnico');
  await expect(page.getByText('1 estudios programados o activos')).toBeVisible();

  await page.getByRole('button', { name: '＋ Agregar estudio' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Paciente, Prueba' })).toBeVisible();
  // Grid muestra más de dos estudios reales, no solo los dos históricos.
  await expect(dialog.getByText('Mastografía bilateral')).toBeVisible();
  await expect(dialog.getByText('Tórax PA y LAT')).toBeVisible();

  await dialog.getByPlaceholder(/ultrasonido mamario/i).fill('ultrasonido');
  await dialog.getByText('Ultrasonido mamario').click();

  // El único campo obligatorio es la selección: se agrega sin expandir Detalles opcionales.
  await dialog.getByRole('button', { name: 'Agregar estudio', exact: true }).click();

  await expect(page.getByText('2 estudios programados o activos')).toBeVisible();
  await expect(page.getByText('ACC-DEMO-ADDON')).toBeVisible();
});

test('Lote C5: el técnico puede registrar el médico solicitante expandiendo Detalles opcionales', async ({ page }) => {
  await page.goto('/tecnico');
  await page.getByRole('button', { name: '＋ Agregar estudio' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'MG', exact: true }).click();
  await dialog.getByText('Mastografía bilateral').click();

  await expect(dialog.getByPlaceholder(/Dra\. Gómez/i)).not.toBeVisible();
  await dialog.getByRole('button', { name: /Detalles opcionales/ }).click();
  await dialog.getByPlaceholder(/Dra\. Gómez/i).fill('Dra. Gómez');
  await dialog.getByRole('button', { name: 'Agregar estudio', exact: true }).click();

  await expect(page.getByText('2 estudios programados o activos')).toBeVisible();
});

test('Lote C5: en Médico, colapsar ambos paneles expande el visor y el reporte conserva su contenido', async ({ page }) => {
  await page.goto('/medico');
  await expect(page.getByRole('heading', { name: 'Lectura del radiólogo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pendientes', exact: true })).toBeVisible();
  await expect(page.getByText('REPORTE')).toBeVisible();

  const reportTextarea = page.locator('.report-panel textarea');
  await reportTextarea.fill('HALLAZGOS: hallazgo de prueba para persistencia');

  await page.getByLabel('Colapsar lista de pacientes').click();
  await expect(page.getByRole('heading', { name: 'Pendientes', exact: true })).not.toBeVisible();

  await page.getByLabel('Colapsar reporte').click();
  await expect(page.getByText('REPORTE')).not.toBeVisible();
  await expect(page.getByText('Visor DICOM conectado mediante OHIF')).toBeVisible();

  await page.getByLabel('Expandir reporte').click();
  await expect(page.getByText('REPORTE')).toBeVisible();
  await expect(page.locator('.report-panel textarea')).toHaveValue('HALLAZGOS: hallazgo de prueba para persistencia');
});

test('Lote C5: Configuración > Catálogo clínico permite ver Offerings, procedimientos y editar precio', async ({ page }) => {
  await page.goto('/configuracion/catalogo');
  await expect(page.getByRole('heading', { name: 'Catálogo clínico' })).toBeVisible();
  await expect(page.getByText('ANTEBRAZO AP Y LAT')).toBeVisible();

  await page.getByRole('button', { name: 'Procedimientos' }).click();
  await expect(page.getByText('Ultrasonido mamario')).toBeVisible();
  await expect(page.getByText('Mastografía bilateral')).toBeVisible();
  await expect(page.getByText('Tórax PA y LAT')).toBeVisible();

  await page.getByRole('button', { name: 'Precios' }).click();
  const priceRow = page.locator('.price-row').filter({ hasText: 'ANTEBRAZO AP Y LAT' });
  await priceRow.getByRole('button', { name: 'Editar precio' }).click();
  await priceRow.locator('input[type="number"]').fill('650.00');
  await priceRow.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText(/Precio de "ANTEBRAZO AP Y LAT" actualizado/)).toBeVisible();
});

test('Lote F1 Caso A: Recepción aplica un descuento del 20% sin generar CashMovement', async ({ page }) => {
  const cashCalls: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && (request.url().includes('/cash/movements') || request.url().includes('/cash/payments'))) cashCalls.push(request.url());
  });

  await page.goto('/recepcion');
  await page.getByRole('button', { name: 'Órdenes' }).click();
  await page.locator('.dense-row.order-row').filter({ hasText: 'AP260705000002' }).getByRole('button', { name: 'Gestionar' }).click();
  await page.getByRole('button', { name: 'Financiero' }).click();

  await expect(page.getByText('Total')).toBeVisible();
  await expect(page.getByText('$1200.00 MXN').first()).toBeVisible();

  await page.getByRole('button', { name: '+ Aplicar ajuste' }).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('Porcentaje').fill('20');
  await dialog.getByRole('button', { name: 'Aplicar ajuste' }).click();

  await expect(page.getByText('$960.00 MXN')).toBeVisible();
  expect(cashCalls).toHaveLength(0);
});

test('Lote F1 Caso B: cortesía preserva el precio de referencia y deja el total en $0', async ({ page }) => {
  const cashCalls: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && (request.url().includes('/cash/movements') || request.url().includes('/cash/payments'))) cashCalls.push(request.url());
  });

  await page.goto('/recepcion');
  await page.getByRole('button', { name: 'Órdenes' }).click();
  await page.locator('.dense-row.order-row').filter({ hasText: 'AP260705000002' }).getByRole('button', { name: 'Gestionar' }).click();
  await page.getByRole('button', { name: 'Financiero' }).click();
  await page.getByRole('button', { name: '+ Aplicar ajuste' }).click();

  const dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('Tipo de ajuste').selectOption('courtesy');
  await dialog.getByRole('button', { name: 'Aplicar ajuste' }).click();

  await expect(page.locator('.charge-row').filter({ hasText: 'Precio base' }).getByText('$1200.00 MXN')).toBeVisible(); // base amount preserved as reference
  await expect(page.locator('.charge-total').getByText('$0.00 MXN')).toBeVisible(); // net
  expect(cashCalls).toHaveLength(0);
});

test('Lote F1 Caso D: Recepción resuelve un add-on pendiente de revisión sin opciones de asegurador', async ({ page }) => {
  const cashCalls: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && (request.url().includes('/cash/movements') || request.url().includes('/cash/payments'))) cashCalls.push(request.url());
  });

  await page.goto('/recepcion');
  await page.getByRole('button', { name: 'Órdenes' }).click();
  await page.locator('.dense-row.order-row').filter({ hasText: 'AP260705000009' }).getByRole('button', { name: 'Gestionar' }).click();
  await page.getByRole('button', { name: 'Financiero' }).click();

  await expect(page.getByText('Estado financiero: Pendiente de revisión')).toBeVisible();
  await page.getByRole('button', { name: 'Resolver' }).click();

  const dialog = page.getByRole('dialog').last();
  await expect(dialog.getByText(/asegurador/i)).toHaveCount(0);
  await dialog.getByPlaceholder('Buscar Offering…').fill('biopsia');
  await dialog.getByText('BIOPSIA DE MAMA').click();
  await dialog.getByRole('button', { name: 'Resolver', exact: true }).click();

  await expect(page.getByText(/resuelta/i)).toBeVisible();
  expect(cashCalls).toHaveLength(0);
});

test('Lote F2: Recepción asigna cobertura ISSSTESON y autoriza una excepción sin tocar la tarifa general', async ({ page }) => {
  await page.goto('/recepcion');
  await page.getByRole('button', { name: 'Órdenes' }).click();
  await page.locator('.dense-row.order-row').filter({ hasText: 'AP260705000002' }).getByRole('button', { name: 'Gestionar' }).click();
  await page.getByRole('button', { name: 'Financiero' }).click();

  await expect(page.getByText('Particular')).toBeVisible();
  await page.getByRole('button', { name: 'Asignar cobertura' }).click();
  const coverageDialog = page.locator('[aria-labelledby="coverage-dialog-title"]');
  await coverageDialog.getByLabel('Cobertura').selectOption('payer-1');
  await coverageDialog.getByLabel('Convenio').selectOption('contract-1');
  await coverageDialog.getByRole('button', { name: 'Asignar cobertura' }).click();
  await expect(coverageDialog).toHaveCount(0);

  await expect(page.getByText('ISSSTESON')).toBeVisible();
  await expect(page.getByText('? Sin resolución todavía')).toBeVisible();

  await page.getByRole('button', { name: 'Autorizar excepción' }).click();
  const overrideDialog = page.getByRole('dialog').last();
  await overrideDialog.getByPlaceholder(/700\.00/).fill('700');
  await overrideDialog.getByPlaceholder(/FOLIO-123/).fill('FOLIO-1');
  await overrideDialog.getByPlaceholder(/vía telefónica/).fill('Autorizado por dependencia via telefono.');
  await overrideDialog.getByRole('button', { name: 'Registrar excepción' }).click();

  await expect(page.getByText('✓ Elegible')).toBeVisible();
  await expect(page.getByText('Tarifa convenio: $700.00 MXN')).toBeVisible();
});

test('Lote F2: pestaña Subrogados muestra la matriz por procedimiento y permite configurar una tarifa', async ({ page }) => {
  await page.goto('/configuracion/catalogo');
  await page.getByRole('button', { name: 'Subrogados' }).click();
  await page.locator('.component-row').filter({ hasText: 'Ultrasonido mamario' }).getByRole('button', { name: 'Ver subrogados' }).click();

  await expect(page.getByText('ISSSTESON')).toBeVisible();
  await expect(page.getByText('? No configurado')).toBeVisible();

  await page.getByRole('button', { name: 'Configurar' }).click();
  const tariffDialog = page.getByRole('dialog').last();
  await tariffDialog.getByLabel('Tarifa').fill('750.00');
  await tariffDialog.getByLabel('Vigente desde').fill('2026-01-01');
  await tariffDialog.getByRole('button', { name: 'Configurar tarifa' }).click();

  await expect(page.getByText(/Tarifa configurada/)).toBeVisible();
});
