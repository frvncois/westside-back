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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* Mux rate-limits its API, and a bulk migration hits that ceiling immediately if it fires requests
   as fast as it can. Every call goes through one spaced queue, and a 429 is retried with backoff
   instead of being surfaced as a failure — this is background work, so trading throughput for
   never being throttled is the right way round. */
const MIN_SPACING_MS = 400;
const MAX_ATTEMPTS = 6;

let nextSlot = 0;

async function takeSlot() {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  // Reserved before awaiting, so concurrent callers queue behind each other instead of all waking
  // at the same instant.
  nextSlot = at + MIN_SPACING_MS;
  if (at > now) await sleep(at - now);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = credentials();
  if (!auth) throw new Error('Mux credentials missing (MUX_ACCESS_TOKEN_ID / MUX_SECRET_KEY)');

  for (let attempt = 1; ; attempt++) {
    await takeSlot();

    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (res.status === 429 && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(2 ** attempt * 500, 20_000);
      // Jitter stops a batch of callers retrying in lockstep.
      await sleep(backoff + Math.floor(Math.random() * 400));
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw Object.assign(
        new Error(`Mux ${init.method ?? 'GET'} ${path} -> ${res.status} ${body}`),
        { status: res.status }
      );
    }

    if (res.status === 204) return undefined as T;
    return ((await res.json()) as { data: T }).data;
  }
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
