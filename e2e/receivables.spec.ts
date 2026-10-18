import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  const payer = { id: 'payer-1', code: 'ISSSTESON', name: 'ISSSTESON', is_active: true, created_at: '', updated_at: '' };
  let receivable = {
    id: 'rec-1', payer_id: 'payer-1', payer_pricing_resolution_id: 'res-1', order_id: 'order-1',
    procedure_definition_id: 'pd-us-1', encounter_id: 'enc-1', original_amount: '750.00', paid_amount: '0.00',
    outstanding_amount: '750.00', currency: 'MXN', status: 'draft', service_date: '2026-07-06',
    created_by: 'apollo-receptionist', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  let batch: Record<string, unknown> | null = null;
  const submissionLines: Record<string, unknown>[] = [];
  let remittance: Record<string, unknown> | null = null;
  const allocations: Record<string, unknown>[] = [];
  const campaigns: Record<string, unknown>[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    let body: unknown = [];

    if (path.endsWith('/session')) body = { username: 'apollo-receptionist', subject: 'user-1', roles: ['apollo-receptionist'] };
    if (path.endsWith('/health')) body = { status: 'ok' };

    if (path.endsWith('/payers') && method === 'GET') body = [payer];
    if (path.endsWith('/payer-receivables') && method === 'GET') body = [receivable];
    if (path.endsWith('/payer-receivables/summary')) body = {
      gross_expected: receivable.original_amount, submitted: receivable.status === 'submitted' ? receivable.original_amount : '0.00',
      accepted: '0.00', rejected: '0.00', disputed: '0.00', paid: receivable.paid_amount, outstanding: receivable.outstanding_amount, count: 1,
    };
    if (path.endsWith(`/payer-receivables/${receivable.id}`) && method === 'GET') body = receivable;
    if (path.endsWith(`/payer-receivables/${receivable.id}/transition`) && method === 'POST') {
      const payload = route.request().postDataJSON();
      receivable = { ...receivable, status: payload.status };
      body = receivable;
    }

    if (path.endsWith('/payer-submission-batches') && method === 'POST') {
      batch = { id: 'batch-1', payer_id: 'payer-1', batch_number: 'SUB-ISSSTESON-260707-0001', status: 'draft', created_by: 'apollo-receptionist', created_at: new Date().toISOString() };
      body = batch;
    }
    if (path.endsWith('/payer-submission-batches') && method === 'GET') body = batch ? [batch] : [];
    if (path.match(/\/payer-submission-batches\/[^/]+$/) && method === 'GET') body = batch;
    if (path.endsWith('/lines') && method === 'GET') body = submissionLines;
    if (path.endsWith('/lines') && method === 'POST') {
      const line = { id: 'line-1', batch_id: 'batch-1', receivable_id: receivable.id, amount_submitted_snapshot: receivable.outstanding_amount, created_by: 'apollo-receptionist', created_at: new Date().toISOString() };
      submissionLines.push(line);
      body = line;
    }
    if (path.endsWith('/submit') && method === 'POST') {
      batch = { ...(batch as Record<string, unknown>), status: 'submitted', submitted_at: new Date().toISOString(), submitted_by: 'apollo-receptionist' };
      receivable = { ...receivable, status: 'submitted' };
      body = batch;
    }

    if (path.endsWith('/payer-remittances') && method === 'POST') {
      const payload = route.request().postDataJSON();
      remittance = { id: 'rem-1', payer_id: payload.payer_id, received_date: payload.received_date, total_amount: payload.total_amount, currency: 'MXN', created_by: 'apollo-receptionist', created_at: new Date().toISOString() };
      body = remittance;
    }
    if (path.endsWith('/payer-remittances') && method === 'GET') body = remittance ? [remittance] : [];
    if (path.match(/\/payer-remittances\/[^/]+$/) && method === 'GET') {
      const allocated = allocations.reduce((sum, a) => sum + Number(a.allocated_amount), 0);
      body = {
        remittance,
        allocated_amount: allocated.toFixed(2),
        unallocated_amount: (Number((remittance as Record<string, unknown>)?.total_amount ?? 0) - allocated).toFixed(2),
      };
    }
    if (path.endsWith('/allocations') && method === 'POST') {
      const payload = route.request().postDataJSON();
      const allocation = { id: `alloc-${allocations.length + 1}`, remittance_id: 'rem-1', receivable_id: payload.receivable_id, allocated_amount: payload.allocated_amount, created_by: 'apollo-receptionist', created_at: new Date().toISOString() };
      allocations.push(allocation);
      const newPaid = (Number(receivable.paid_amount) + Number(payload.allocated_amount)).toFixed(2);
      const newOutstanding = (Number(receivable.original_amount) - Number(newPaid)).toFixed(2);
      receivable = { ...receivable, paid_amount: newPaid, outstanding_amount: newOutstanding, status: Number(newOutstanding) === 0 ? 'paid' : 'partially_paid' };
      body = allocation;
    }

    if (path.endsWith('/campaigns') && method === 'GET') body = campaigns;
    if (path.endsWith('/campaigns') && method === 'POST') {
      const payload = route.request().postDataJSON();
      const campaign = { id: `camp-${campaigns.length + 1}`, code: payload.code, name: payload.name, valid_from: payload.valid_from, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      campaigns.push(campaign);
      body = campaign;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
});

test('Lote F3: dashboard, lote de presentación, pago de dependencia y conciliación (Caso A)', async ({ page }) => {
  await page.goto('/cuentas-por-cobrar');
  await expect(page.getByText('Esperado')).toBeVisible();
  await expect(page.locator('.receivable-summary-card').filter({ hasText: 'Esperado' }).getByText('$750.00')).toBeVisible();

  // Select payer and go to batches.
  await page.locator('select').first().selectOption('payer-1');
  await page.getByRole('button', { name: 'Lotes de presentación' }).click();
  await page.getByRole('button', { name: '+ Nuevo lote' }).click();
  await expect(page.getByText(/SUB-ISSSTESON/)).toBeVisible();
  await page.getByRole('button', { name: 'Agregar' }).click();
  await page.getByRole('button', { name: 'Presentar lote' }).click();
  await expect(page.getByText('Lote presentado a la dependencia.')).toBeVisible();

  // Accept the receivable (submitted -> accepted), then register a remittance and allocate it.
  await page.getByRole('button', { name: 'Cuentas por cobrar' }).click();
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await expect(page.getByText('Estado de la cuenta por cobrar actualizado.')).toBeVisible();

  await page.getByRole('button', { name: 'Pagos de dependencias' }).click();
  page.once('dialog', (dialog) => dialog.accept('750.00'));
  await page.getByRole('button', { name: '+ Registrar pago' }).click();
  await expect(page.getByText('Sin asignar')).toBeVisible();
  await page.locator('input[type="number"]').first().fill('750');
  await page.getByRole('button', { name: 'Asignar' }).click();
  await expect(page.getByText('Asignación registrada.')).toBeVisible();
  await expect(page.getByText('$0.00').first()).toBeVisible(); // unallocated is now zero
});

test('Lote F3: campañas son independientes del pagador y no implican dinero (Caso D)', async ({ page }) => {
  await page.goto('/cuentas-por-cobrar');
  await page.getByRole('button', { name: 'Campañas' }).click();
  await expect(page.getByText('nunca crea ajustes')).toBeVisible();

  const prompts = ['MAMA2026', 'Campaña de Mama 2026'];
  page.on('dialog', (dialog) => { void dialog.accept(prompts.shift() ?? ''); });
  await page.getByRole('button', { name: '+ Nueva campaña' }).click();
  await expect(page.getByText('Campaña creada.')).toBeVisible();
  await expect(page.getByText('Campaña de Mama 2026')).toBeVisible();
});
