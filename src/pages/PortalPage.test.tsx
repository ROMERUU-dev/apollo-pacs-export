import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalPage } from './PortalPage';
import { operationsApi } from '../api/operations';

vi.mock('../api/operations', () => ({
  operationsApi: {
    redeem: vi.fn(),
    portalSession: vi.fn(),
    portalVerify: vi.fn(),
    portalConsent: vi.fn(),
  },
}));

// The brand loads over the network in production; in tests the clinic fallback is enough.
vi.mock('../portal/branding', () => {
  const brand = { clinic_name: 'Clínica', short_name: 'Clínica', privacy_url: '/privacidad' };
  return { FALLBACK_BRAND: brand, loadBrand: vi.fn().mockResolvedValue(brand), resetBrandCache: vi.fn() };
});

const mockedSession = vi.mocked(operationsApi.portalSession);
const mockedVerify = vi.mocked(operationsApi.portalVerify);
const mockedConsent = vi.mocked(operationsApi.portalConsent);

const EXPIRES = '2026-11-07T20:00:00Z';
const CONSENT_GATE = { consent_required: true, notice_version: '2026-07', expires_at: EXPIRES };
const IDENTITY_GATE = { verification_required: true, methods: ['birth_date', 'last_name'], attempts_left: 5, expires_at: EXPIRES };
const READY = {
  study_id: 's1', study_instance_uid: '1.2.3', patient_name: 'López Ana', description: 'CT',
  viewer_url: '/ohif/viewer?x', expires_at: EXPIRES, report: null,
  studies: [{ study_id: 's1', study_instance_uid: '1.2.3', description: 'CT', study_date: '2026-10-09', report_signed: false, report: null, viewer_url: '/ohif/viewer?x' }],
};

describe('PortalPage consent gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Force Spanish so the assertions read the clinic's default language, not jsdom's en-US.
    Object.defineProperty(window.navigator, 'language', { value: 'es-MX', configurable: true });
  });

  it('keeps studies behind two checkboxes and records the consent on submit', async () => {
    mockedSession.mockResolvedValue(CONSENT_GATE);
    mockedConsent.mockResolvedValue(READY);
    render(<PortalPage />);

    await screen.findByText('Tu consentimiento');

    // The privacy notice is linked for the patient to read.
    expect(screen.getByRole('link', { name: /Leer el Aviso de Privacidad/ })).toHaveAttribute('href', '/privacidad');

    const cta = screen.getByRole('button', { name: /Acepto y continúo/ });
    const [readNotice, grantConsent] = screen.getAllByRole('checkbox');
    expect(cta).toBeDisabled();

    fireEvent.click(readNotice);
    expect(cta).toBeDisabled();            // one box alone is not express consent
    fireEvent.click(grantConsent);
    expect(cta).toBeEnabled();

    fireEvent.click(cta);
    await screen.findByText('Tus resultados están listos');
    expect(mockedConsent).toHaveBeenCalledWith({ accept_notice: true, accept_consent: true });
  });

  it('never calls the consent endpoint while a box is unticked', async () => {
    mockedSession.mockResolvedValue(CONSENT_GATE);
    render(<PortalPage />);
    await screen.findByText('Tu consentimiento');

    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Acepto y continúo/ }));
    expect(mockedConsent).not.toHaveBeenCalled();
  });

  it('routes from the identity gate to the consent gate after a successful check', async () => {
    mockedSession.mockResolvedValue(IDENTITY_GATE);
    mockedVerify.mockResolvedValue(CONSENT_GATE);
    render(<PortalPage />);

    await screen.findByText('Confirma la identidad del paciente');
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento del paciente'), { target: { value: '1990-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Ver mis resultados/ }));

    await screen.findByText('Tu consentimiento');
    expect(mockedVerify).toHaveBeenCalledWith({ birth_date: '1990-01-01' });
  });
});
