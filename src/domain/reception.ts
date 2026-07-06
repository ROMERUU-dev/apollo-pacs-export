import type { CashMovement, CatalogItem, Payment } from '../api/operations';

export function catalogTotalMxn(items: CatalogItem[], mxnPerUsd?: number): number {
  return items.reduce((total, item) => total + Number(item.amount) * (item.currency === 'USD' ? (mxnPerUsd ?? 0) : 1), 0);
}

export function paymentPreview(amount: number, debtMxn: number, currency: 'MXN' | 'USD', method: 'cash' | 'card', mxnPerUsd?: number) {
  const receivedMxn = amount * (currency === 'USD' ? (mxnPerUsd ?? 0) : 1);
  return { receivedMxn, changeMxn: method === 'cash' ? Math.max(0, receivedMxn - debtMxn) : 0 };
}

export function cashSummary(movements: CashMovement[], payments: Payment[]) {
  return {
    ingresos: movements.filter((item) => Number(item.amount_mxn) > 0).reduce((sum, item) => sum + Number(item.amount_mxn), 0),
    egresos: Math.abs(movements.filter((item) => Number(item.amount_mxn) < 0).reduce((sum, item) => sum + Number(item.amount_mxn), 0)),
    tarjetas: payments.flatMap((item) => item.components).filter((item) => item.method === 'card').reduce((sum, item) => sum + Number(item.amount_mxn), 0),
  };
}
