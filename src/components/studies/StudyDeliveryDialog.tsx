import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import { operationsApi, type DeliveryChannel, type DeliveryOptions, type StudyDelivery } from '../../api/operations';

const channelLabel = (channel: DeliveryChannel) => channel === 'email' ? 'Correo electrónico' : 'WhatsApp';

export function StudyDeliveryDialog({ studyId, studyLabel, onClose }: { studyId: string; studyLabel: string; onClose: () => void }) {
  const [options, setOptions] = useState<DeliveryOptions>();
  const [history, setHistory] = useState<StudyDelivery[]>([]);
  const [channels, setChannels] = useState<DeliveryChannel[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    Promise.all([operationsApi.deliveryOptions(studyId), operationsApi.deliveries(studyId)])
      .then(([nextOptions, deliveries]) => { setOptions(nextOptions); setHistory(deliveries); })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setBusy(false));
  }, [studyId]);

  function toggle(channel: DeliveryChannel) {
    setChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]);
  }

  async function revoke(event: MouseEvent, channel: DeliveryChannel) {
    event.preventDefault(); event.stopPropagation(); setBusy(true); setError('');
    try {
      await operationsApi.revokeDeliveryConsent(studyId, channel);
      setOptions(await operationsApi.deliveryOptions(studyId));
      setNotice(`Consentimiento de ${channelLabel(channel)} revocado.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible revocar el consentimiento.');
    } finally { setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!options || !channels.length) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const deliveries = await operationsApi.deliverStudy(studyId, channels, consent, options.notice_version);
      setHistory([...deliveries, ...history]);
      setNotice(deliveries.every((item) => item.status === 'provider_accepted')
        ? 'Entrega aceptada por los proveedores; aún no confirma recepción por el paciente.'
        : 'Uno o más canales fallaron; revisa el historial.');
      setChannels([]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible enviar el estudio.');
    } finally { setBusy(false); }
  }

  const emailReady = Boolean(options?.email_configured && options.email_masked);
  const whatsappReady = Boolean(options?.whatsapp_configured && options.phone_masked);
  const selectedNeedsConsent = channels.some((channel) => channel === 'email' ? !options?.email_consented : !options?.whatsapp_consented);

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="apollo-dialog delivery-dialog" role="dialog" aria-modal="true" aria-labelledby="delivery-title">
      <header><div><span className="panel-kicker">ENTREGA SEGURA</span><h2 id="delivery-title">Enviar estudio</h2><p>{studyLabel}</p></div><button className="icon-action" aria-label="Cerrar" onClick={onClose}>×</button></header>
      {busy && !options ? <div className="dialog-state">Consultando canales…</div> : <form className="delivery-form" onSubmit={submit}>
        <p>Se enviará únicamente un enlace seguro que expira en 72 horas. No se adjuntan imágenes ni diagnóstico.</p>
        <label className={!emailReady ? 'delivery-channel unavailable' : 'delivery-channel'}>
          <input type="checkbox" checked={channels.includes('email')} disabled={!emailReady} onChange={() => toggle('email')} />
          <span><b>Correo electrónico</b><small>{options?.email_masked ?? 'Paciente sin correo'} · {options?.email_configured ? 'Proveedor listo' : 'SES/SMTP no configurado'}</small></span>
          {options?.email_consented && <button type="button" onClick={(event) => void revoke(event, 'email')}>Revocar</button>}
        </label>
        <label className={!whatsappReady ? 'delivery-channel unavailable' : 'delivery-channel'}>
          <input type="checkbox" checked={channels.includes('whatsapp')} disabled={!whatsappReady} onChange={() => toggle('whatsapp')} />
          <span><b>WhatsApp</b><small>{options?.phone_masked ?? 'Paciente sin teléfono'} · {options?.whatsapp_configured ? 'Proveedor listo' : 'Meta Cloud API no configurada'}</small></span>
          {options?.whatsapp_consented && <button type="button" onClick={(event) => void revoke(event, 'whatsapp')}>Revocar</button>}
        </label>
        <label className="consent-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required={selectedNeedsConsent} />Confirmo que el paciente autorizó a Apollo Imagen a enviar el enlace de su estudio por los canales seleccionados.</label>
        <button className="primary-action" disabled={busy || !channels.length || (!consent && selectedNeedsConsent)}>Enviar enlace seguro</button>
      </form>}
      {error && <div className="inline-notice error">{error}</div>}{notice && <div className="inline-notice success">{notice}</div>}
      <section className="delivery-history"><div className="panel-kicker">HISTORIAL</div>{history.map((item) => <div key={item.id}><span><b>{channelLabel(item.channel)}</b><small>{item.destination_masked} · {new Date(item.created_at).toLocaleString('es-MX')}</small></span><i className={`status-pill ${item.status}`}>{item.status === 'provider_accepted' ? 'Aceptado por proveedor' : item.status === 'failed' ? 'Fallido' : 'Pendiente'}</i></div>)}{!history.length && <p>Sin envíos registrados.</p>}</section>
    </section>
  </div>;
}
