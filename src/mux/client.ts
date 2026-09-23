/**
 * Minimal Mux Video API client.
 *
 * Deliberately fetch-based rather than pulling in the Mux SDK: we use four endpoints and the
 * SDK would be the largest dependency in the project.
 */

const API = 'https://api.mux.com/video/v1';

export type MuxAsset = {
  id: string;
  status: 'preparing' | 'ready' | 'errored';
  duration?: number;
  aspect_ratio?: string;
  errors?: { type?: string; messages?: string[] };
  playback_ids?: Array<{ id: string; policy: 'public' | 'signed' }>;
};

function credentials() {
  const id = process.env.MUX_ACCESS_TOKEN_ID;
  const secret = process.env.MUX_SECRET_KEY;
  if (!id || !secret) return null;
  return Buffer.from(`${id}:${secret}`).toString('base64');
}

export const muxConfigured = () => credentials() !== null;

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = credentials();
  if (!auth) throw new Error('Mux credentials missing (MUX_ACCESS_TOKEN_ID / MUX_SECRET_KEY)');

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(new Error(`Mux ${init.method ?? 'GET'} ${path} -> ${res.status} ${body}`), {
      status: res.status,
    });
  }
  if (res.status === 204) return undefined as T;
  return ((await res.json()) as { data: T }).data;
}

/**
 * Ask Mux to pull a video from a public URL. Mux fetches it itself, so nothing is uploaded
 * from this process — the file only needs to be reachable from the internet.
 */
export function createAssetFromUrl(url: string): Promise<MuxAsset> {
  return call<MuxAsset>('/assets', {
    method: 'POST',
    body: JSON.stringify({
      inputs: [{ url }],
      playback_policies: ['public'],
      video_quality: 'basic',
    }),
  });
}

export function getAsset(assetId: string): Promise<MuxAsset> {
  return call<MuxAsset>(`/assets/${assetId}`);
}

export function deleteAsset(assetId: string): Promise<void> {
  return call<void>(`/assets/${assetId}`, { method: 'DELETE' });
}

export const publicPlaybackId = (asset: MuxAsset): string | null =>
  asset.playback_ids?.find((p) => p.policy === 'public')?.id ?? null;
