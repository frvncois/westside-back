/**
 * Mux ingest: keeps every video in the Strapi media library mirrored to a Mux asset.
 *
 * The Mux reference lives in the upload file's `provider_metadata` rather than in a relation on
 * each content type. That keeps the content model untouched — editors upload video exactly as
 * before — and lets existing videos migrate with no manual re-linking (there are 160+ of them,
 * referenced from six different media slots across four schemas).
 *
 * Mux pulls the file from its public URL, so nothing is uploaded from this process; the file only
 * has to be reachable from the internet.
 */
import type { Core } from '@strapi/strapi';
import { createAssetFromUrl, getAsset, muxConfigured, publicPlaybackId, type MuxAsset } from './client';

export const FILE_UID = 'plugin::upload.file';

export type MuxMeta = {
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxStatus?: 'preparing' | 'ready' | 'errored';
  muxDuration?: number;
  muxAspectRatio?: string;
  muxError?: string;
  muxUpdatedAt?: string;
};

type UploadFile = {
  id: number;
  name: string;
  url: string;
  mime: string;
  provider_metadata?: (MuxMeta & Record<string, unknown>) | null;
};

export const isVideo = (file: { mime?: string | null }) => !!file.mime?.startsWith('video/');

/** Public origin Mux pulls from. Falls back to the same value used for browser-facing media URLs. */
function pullBase(): string | null {
  const base = process.env.MUX_PULL_BASE_URL || process.env.PUBLIC_URL;
  return base ? base.replace(/\/+$/, '') : null;
}

function publicUrlFor(file: UploadFile): string | null {
  if (/^https?:\/\//.test(file.url)) return file.url;
  const base = pullBase();
  return base ? `${base}${file.url}` : null;
}

function metaFromAsset(asset: MuxAsset): MuxMeta {
  return {
    muxAssetId: asset.id,
    muxPlaybackId: publicPlaybackId(asset) ?? undefined,
    muxStatus: asset.status,
    muxDuration: asset.duration,
    muxAspectRatio: asset.aspect_ratio,
    muxError: asset.errors?.messages?.join('; '),
    muxUpdatedAt: new Date().toISOString(),
  };
}

/** Merges Mux keys into provider_metadata without disturbing anything the upload provider stored. */
async function patchMeta(strapi: Core.Strapi, file: UploadFile, patch: MuxMeta) {
  await strapi.db.query(FILE_UID).update({
    where: { id: file.id },
    data: { provider_metadata: { ...(file.provider_metadata ?? {}), ...patch } },
  });
}

/**
 * Hands one video to Mux. Idempotent: a file that already has an asset id is left alone, so this
 * is safe to re-run over the whole library.
 */
export async function ingestFile(
  strapi: Core.Strapi,
  file: UploadFile
): Promise<'skipped' | 'ingested' | 'failed'> {
  if (!isVideo(file)) return 'skipped';
  if (file.provider_metadata?.muxAssetId) return 'skipped';
  if (!muxConfigured()) {
    strapi.log.warn('[mux] credentials missing — skipping ingest');
    return 'skipped';
  }

  const url = publicUrlFor(file);
  if (!url) {
    strapi.log.error(
      `[mux] cannot ingest "${file.name}": set MUX_PULL_BASE_URL (or PUBLIC_URL) to this server's public origin`
    );
    return 'failed';
  }

  try {
    const asset = await createAssetFromUrl(url);
    await patchMeta(strapi, file, metaFromAsset(asset));
    strapi.log.info(`[mux] ingested "${file.name}" -> asset ${asset.id}`);
    return 'ingested';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await patchMeta(strapi, file, { muxStatus: 'errored', muxError: message, muxUpdatedAt: new Date().toISOString() });
    strapi.log.error(`[mux] ingest failed for "${file.name}": ${message}`);
    return 'failed';
  }
}

/**
 * Re-reads an asset from Mux and stores its current state. This is what moves a file from
 * `preparing` to `ready` when no webhook arrived, so the system converges without one.
 */
export async function reconcileFile(strapi: Core.Strapi, file: UploadFile): Promise<MuxMeta['muxStatus']> {
  const assetId = file.provider_metadata?.muxAssetId;
  if (!assetId) return undefined;
  try {
    const asset = await getAsset(assetId);
    await patchMeta(strapi, file, metaFromAsset(asset));
    return asset.status;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      // The asset is gone from Mux (deleted there). Clear the reference so a later pass re-ingests.
      await patchMeta(strapi, file, {
        muxAssetId: undefined,
        muxPlaybackId: undefined,
        muxStatus: undefined,
        muxUpdatedAt: new Date().toISOString(),
      });
      strapi.log.warn(`[mux] asset ${assetId} missing on Mux — reference cleared for "${file.name}"`);
      return undefined;
    }
    strapi.log.error(`[mux] reconcile failed for "${file.name}": ${(error as Error).message}`);
    return file.provider_metadata?.muxStatus;
  }
}

/** All video files, newest first. `provider_metadata` is filtered in JS — it is JSON in every DB. */
export async function videoFiles(strapi: Core.Strapi, limit = 500): Promise<UploadFile[]> {
  const files = (await strapi.db.query(FILE_UID).findMany({
    where: { mime: { $startsWith: 'video/' } },
    select: ['id', 'name', 'url', 'mime', 'provider_metadata'],
    orderBy: { id: 'desc' },
    limit,
  })) as UploadFile[];
  return files;
}

export async function findByAssetId(strapi: Core.Strapi, assetId: string): Promise<UploadFile | null> {
  const files = await videoFiles(strapi, 2000);
  return files.find((f) => f.provider_metadata?.muxAssetId === assetId) ?? null;
}

/**
 * Mux mirroring is opt-in via MUX_ENABLED. It is off by default: the site streams video from the
 * original uploads, so pushing new ones to Mux would be paying to encode and store assets nothing
 * plays. Set MUX_ENABLED=true (and flip the matching switch in the frontend's utils/mux.ts) to
 * turn the mirror back on.
 */
export const muxEnabled = () => process.env.MUX_ENABLED === 'true';

/** Fires on every new upload so videos added from the admin panel reach Mux on their own. */
export function registerUploadLifecycle(strapi: Core.Strapi) {
  if (!muxEnabled()) {
    strapi.log.info('[mux] mirroring disabled (set MUX_ENABLED=true to enable)');
    return;
  }

  strapi.db.lifecycles.subscribe({
    models: [FILE_UID],
    async afterCreate(event) {
      const file = event.result as UploadFile;
      if (!isVideo(file)) return;
      // Detached on purpose: a slow Mux round-trip must never make an editor's upload hang or fail.
      void ingestFile(strapi, file).catch((error) =>
        strapi.log.error(`[mux] lifecycle ingest error: ${(error as Error).message}`)
      );
    },
  });
  strapi.log.info('[mux] upload lifecycle registered');
}
