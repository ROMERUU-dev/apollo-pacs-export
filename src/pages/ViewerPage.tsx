import { useState } from 'react';
import { launchStudyViewer } from '../api/studies';

export function ViewerPage() {
  const [studyId, setStudyId] = useState(new URLSearchParams(location.search).get('study') ?? ''); const [error, setError] = useState<string>();
  async function launch() { try { const value = await launchStudyViewer(studyId); location.assign(value.viewerUrl); } catch (e) { setError((e as Error).message); } }
  return <div className="screen-page viewer-page"><div className="view-label">VISOR PACS</div><h1 className="screen-title">Abrir estudio en OHIF</h1><section className="module-shell viewer-launch-panel"><p>El estudio se solicita a Apollo; el navegador no accede directamente a Orthanc.</p><div className="inline-form"><input value={studyId} onChange={(e) => setStudyId(e.target.value)} placeholder="ID interno del estudio" /><button className="primary-action" disabled={!studyId} onClick={() => void launch()}>Abrir visor</button></div>{error && <p className="alert alert--error">{error}</p>}</section></div>;
}
