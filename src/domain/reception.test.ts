import { describe, expect, it } from 'vitest';
import { cashSummary, catalogTotalMxn, paymentPreview } from './reception';

describe('Reception calculations', () => {
  it('totals MXN and USD catalog lines with the active rate', () => {
    expect(catalogTotalMxn([
      { id: '1', code: 'A', name: 'DX', amount: '500', currency: 'MXN', is_active: true },
      { id: '2', code: 'B', name: 'USD', amount: '10', currency: 'USD', is_active: true },
    ], 20)).toBe(700);
  });

  it('previews cash change only in MXN', () => {
    expect(paymentPreview(30, 500, 'USD', 'cash', 20)).toEqual({ receivedMxn: 600, changeMxn: 100 });
    expect(paymentPreview(600, 500, 'MXN', 'card')).toEqual({ receivedMxn: 600, changeMxn: 0 });
  });

  it('separates physical movement and card totals', () => {
    const result = cashSummary([
      { id: '1', cash_session_id: 's', kind: 'payment', currency: 'MXN', amount: '500', amount_mxn: '500', created_at: '' },
      { id: '2', cash_session_id: 's', kind: 'change', currency: 'MXN', amount: '-50', amount_mxn: '-50', created_at: '' },
    ], [{ id: 'p', cash_session_id: 's', quote_id: 'q', total_received_mxn: '300', applied_mxn: '300', change_mxn: '0', created_at: '', components: [{ method: 'card', currency: 'MXN', amount: '300', amount_mxn: '300' }] }]);
    expect(result).toEqual({ ingresos: 500, egresos: 50, tarjetas: 300 });
  });
});
