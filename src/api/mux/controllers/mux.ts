/**
 * Operational endpoints for the Mux mirror: the webhook Mux calls, plus the migration and
 * reconcile entry points used to move the existing library over and to repair drift.
 */
import type { Core } from '@strapi/strapi';
import { findByAssetId, ingestFile, isVideo, reconcileFile, videoFiles } from '../../../mux/ingest';
import { muxConfigured } from '../../../mux/client';

/** Shared-secret gate for the operational endpoints (the webhook has its own trust model). */
function assertAdmin(ctx: any) {
  const expected = process.env.MUX_ADMIN_SECRET;
  if (!expected) return ctx.badRequest('MUX_ADMIN_SECRET is not configured on the server');
  const provided = ctx.request.headers['x-mux-admin-secret'];
  if (provided !== expected) return ctx.unauthorized('Bad or missing x-mux-admin-secret');
  return null;
}

/** Runs `worker` over `items` with bounded concurrency so a big migration stays polite. */
async function pooled<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (cursor < items.length) await worker(items[cursor++]!);
    })
  );
}

export default {
  /**
   * Mux -> us. Unauthenticated by necessity, so the payload is treated as a hint only: we read the
   * asset id, confirm it belongs to a file we already track, then ask the Mux API what the truth
   * is over an authenticated call. A forged request can therefore do nothing but trigger a
   * redundant lookup of an asset we already own.
   */
  async webhook(ctx: any) {
    const body = ctx.request.body ?? {};
    const assetId: string | undefined =
      body?.data?.id ?? (typeof body?.object?.id === 'string' ? body.object.id : undefined);

    if (!assetId) return (ctx.status = 204);

    const strapi = global.strapi as Core.Strapi;
    const file = await findByAssetId(strapi, assetId);
    if (!file) {
      strapi.log.debug(`[mux] webhook for unknown asset ${assetId} — ignored`);
      return (ctx.status = 204);
    }

    const status = await reconcileFile(strapi, file);
    strapi.log.info(`[mux] webhook ${body?.type ?? '?'} -> "${file.name}" is ${status}`);
    ctx.body = { ok: true };
  },

  /** Status of the mirror: how many videos exist, and how many are ready / pending / errored. */
  async status(ctx: any) {
    const denied = assertAdmin(ctx);
    if (denied) return denied;

    const files = await videoFiles(global.strapi as Core.Strapi, 2000);
    const tally = { total: files.length, ready: 0, preparing: 0, errored: 0, unmigrated: 0 };
    const problems: Array<{ name: string; status?: string; error?: string }> = [];

    for (const file of files) {
      const meta = file.provider_metadata ?? {};
      if (!meta.muxAssetId) tally.unmigrated++;
      else if (meta.muxStatus === 'ready') tally.ready++;
      else if (meta.muxStatus === 'errored') tally.errored++;
      else tally.preparing++;

      /* Reported for anything not ready, keyed off the stored error rather than off having an
         asset id: an ingest that never got as far as creating an asset still records why, and
         those were previously invisible here. */
      if (meta.muxError && meta.muxStatus !== 'ready') {
        problems.push({ name: file.name, status: meta.muxStatus, error: meta.muxError });
      }
    }

    ctx.body = { configured: muxConfigured(), ...tally, problems };
  },

  /**
   * Hands un-migrated videos to Mux, `limit` at a time so a single request stays quick. Idempotent
   * — re-running only picks up what is still missing, so it can be called in a loop until
   * `remaining` is 0.
   */
  async migrate(ctx: any) {
    const denied = assertAdmin(ctx);
    if (denied) return denied;

    const strapi = global.strapi as Core.Strapi;
    const limit = Math.min(Number(ctx.query.limit ?? 25) || 25, 200);
    const files = await videoFiles(strapi, 2000);
    const pending = files.filter((f) => isVideo(f) && !f.provider_metadata?.muxAssetId);
    const batch = pending.slice(0, limit);

    const counts = { ingested: 0, failed: 0, skipped: 0 };
    await pooled(batch, 2, async (file) => {
      const result = await ingestFile(strapi, file);
      counts[result]++;
    });

    ctx.body = { ...counts, attempted: batch.length, remaining: pending.length - batch.length };
  },

  /**
   * Re-reads every not-yet-ready asset from Mux. This is the safety net that lets the mirror
   * converge even if no webhook is ever delivered.
   */
  async reconcile(ctx: any) {
    const denied = assertAdmin(ctx);
    if (denied) return denied;

    const strapi = global.strapi as Core.Strapi;
    const files = await videoFiles(strapi, 2000);
    const stale = files.filter(
      (f) => f.provider_metadata?.muxAssetId && f.provider_metadata?.muxStatus !== 'ready'
    );

    const counts: Record<string, number> = {};
    await pooled(stale, 2, async (file) => {
      const status = (await reconcileFile(strapi, file)) ?? 'cleared';
      counts[status] = (counts[status] ?? 0) + 1;
    });

    ctx.body = { checked: stale.length, results: counts };
  },
};
