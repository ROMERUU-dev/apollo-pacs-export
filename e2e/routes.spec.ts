import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  let worklistStatus = 'scheduled';
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
    if (path.endsWith('/catalog-items')) body = [
      { id: 'c1', code: 'DEMO-E00', name: 'ANTEBRAZO AP Y LAT', modality: 'DX', amount: '500.00', currency: 'MXN', is_active: true },
      { id: 'c2', code: 'DEMO-E01', name: 'BIOPSIA DE MAMA', modality: 'US', amount: '3500.00', currency: 'MXN', is_active: true },
    ];
    if (path.endsWith('/patients') && route.request().method() === 'GET') body = [{ id: 'p1', mrn: 'AP-P-000001', first_name: 'Patricia', last_name: 'Prueba', second_last_name: 'Apollo', birth_date: '1990-01-01', sex: 'female', phone: '6641234567' }];
    if (path.endsWith('/quotes') && route.request().method() === 'POST') body = { id: 'q1', patient_id: 'p1', status: 'issued', total_mxn: '500.00', created_at: new Date().toISOString(), lines: [] };
    if (path.endsWith('/quotes/q1/schedule')) body = [{ id: 'order-quote-1', patient_id: 'p1', accession_number: 'AP260705000001', modality: 'DX', status: 'scheduled', priority: 'routine', description: 'ANTEBRAZO AP Y LAT', scheduled_at: new Date().toISOString(), scheduled_duration_minutes: 15 }];
    if (path.endsWith('/orders') && route.request().method() === 'GET') body = [{ id: 'order-1', patient_id: 'p1', accession_number: 'AP260705000002', modality: 'DX', status: 'scheduled', priority: 'routine', description: 'Tórax AP', scheduled_at: new Date().toISOString(), scheduled_duration_minutes: 15 }];
    if (path.endsWith('/orders/order-1/schedule')) body = { id: 'order-1', patient_id: 'p1', accession_number: 'AP260705000002', modality: 'DX', status: 'scheduled', priority: 'routine', description: 'Tórax AP', scheduled_at: new Date().toISOString(), scheduled_duration_minutes: 15 };
    if (path.endsWith('/orders/order-1/cancel')) body = { id: 'order-1', status: 'cancelled', accession_number: 'AP260705000002' };
    if (path.endsWith('/cash/access')) body = route.request().method() === 'POST' ? { unlocked: true, mode: 'development_bypass', expires_at: new Date(Date.now() + 900000).toISOString() } : { unlocked: false, mode: 'locked' };
    if (path.endsWith('/operational-worklist')) body = [{
      order_id: 'order-1',
      patient: { id: 'p1', mrn: 'DEMO-001', first_name: 'Prueba', last_name: 'Paciente', middle_name: null, birth_date: '1990-01-01', sex: 'unknown' },
      procedure: { accession_number: 'ACC-DEMO', modality: 'DX', status: worklistStatus, priority: 'routine', description: 'Tórax AP', scheduled_at: new Date().toISOString() },
    }];
    if (path.endsWith('/orders/order-1/status') && route.request().method() === 'PATCH') {
      worklistStatus = route.request().postDataJSON().status;
      body = { id: 'order-1', status: worklistStatus };
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
  await page.getByRole('button', { name: 'Gestionar' }).click();
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
