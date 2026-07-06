import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStudies, launchStudyViewer } from './studies';

afterEach(() => vi.unstubAllGlobals());

describe('studies API', () => {
  it('maps the Apollo contract and pagination headers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 'study-1', study_instance_uid: '1.2.3', patient_id: 'patient-1',
      patient_name: 'González, María', medical_record_number: 'MRN-1',
      accession_number: 'ACC-1', description: 'RX Tórax', performed_at: null,
      modality: 'DX', modalities: ['DX'], status: 'in_progress', series_count: 2,
      instance_count: 4, viewer_available: true,
    }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Total-Count': '24' },
    })));

    const result = await getStudies({ page: 2, pageSize: 10, modality: 'DX', status: 'received' });

    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 24, totalPages: 3 });
    expect(result.items[0]).toMatchObject({ status: 'in-progress', instanceCount: 4 });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('limit=10&offset=10'), expect.anything());
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('status=registered'), expect.anything());
  });

  it('launches the viewer through Apollo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ viewer_url: '/ohif/viewer?StudyInstanceUIDs=1.2.3' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )));

    await expect(launchStudyViewer('study-1')).resolves.toEqual({
      viewerUrl: '/ohif/viewer?StudyInstanceUIDs=1.2.3',
    });
  });
});
