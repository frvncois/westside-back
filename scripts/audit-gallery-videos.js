'use strict';

/**
 * Audit each artist's media-library folder for videos missing from their gallery,
 * then add them.
 *
 * Root cause of the gap: populate-galleries.js preferred each artist's Photography
 * folder, so dual-discipline artists' Film-folder videos never entered their galleries.
 *
 * For each repertory:
 *   - locate its folder by name (artist folders are unique; only the shared "Film"/
 *     "Photography" subfolder names repeat), gather every video whose folderPath is that
 *     folder or nested under it;
 *   - diff against the file ids already linked in the gallery (any type);
 *   - report the missing videos, then PREPEND them as film rows of 2 (ordered by
 *     filename) ahead of the existing rows, so film leads the gallery.
 * Dedupe is strictly by file id, so re-running is a no-op ("no change").
 *
 * Run against LOCAL data (dev server stopped — SQLite lock):
 *   node scripts/audit-gallery-videos.js
 * Then push to cloud with `strapi transfer --to <cloud> --exclude files`.
 */

const { compileStrapi, createStrapi } = require('@strapi/strapi');

/** Re-emit an existing gallery item as writable component data (ids stripped). */
const itemData = (item) => ({
  title: item.title ?? null,
  client: item.client ?? null,
  type: item.type ?? null,
  image: item.image?.id ?? null,
  filter: (item.filter ?? []).map((c) => c.id),
});

const filmItem = (fileId) => ({
  title: null,
  client: null,
  type: 'films',
  image: fileId,
  filter: [],
});

async function folderVideos(folderName) {
  const folder = await strapi.db.query('plugin::upload.folder').findOne({
    where: { name: folderName },
    select: ['id', 'path'],
  });
  if (!folder) return [];
  const files = await strapi.db.query('plugin::upload.file').findMany({
    where: {
      mime: { $startsWith: 'video/' },
      $or: [{ folderPath: folder.path }, { folderPath: { $startsWith: folder.path + '/' } }],
    },
    select: ['id', 'name'],
  });
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const docs = await strapi.documents('api::repertory.repertory').findMany({
      populate: { gallery: { populate: { items: { populate: ['image', 'filter'] } } } },
      pagination: { pageSize: 1000 },
    });

    console.log('\n================ GALLERY VIDEO AUDIT ================\n');
    const report = [];
    for (const doc of docs) {
      const videos = await folderVideos(doc.name);
      const existingIds = new Set();
      for (const row of doc.gallery ?? []) {
        for (const item of row.items ?? []) {
          if (item.image?.id) existingIds.add(item.image.id);
        }
      }
      const missing = videos.filter((v) => !existingIds.has(v.id));

      if (!missing.length) {
        report.push({ name: doc.name, note: videos.length ? 'complete' : 'no folder videos' });
        continue;
      }

      console.log(`● ${doc.name} — ${missing.length} missing:`);
      for (const v of missing) console.log(`    + ${v.name}`);

      // Prepend the missing videos as film rows of 2, ahead of the existing rows.
      const filmRows = [];
      for (let i = 0; i < missing.length; i += 2) {
        filmRows.push({ items: missing.slice(i, i + 2).map((v) => filmItem(v.id)) });
      }
      const existingRows = (doc.gallery ?? []).map((row) => ({
        items: (row.items ?? []).map(itemData),
      }));

      await strapi.documents('api::repertory.repertory').update({
        documentId: doc.documentId,
        data: { gallery: [...filmRows, ...existingRows] },
      });
      await strapi.documents('api::repertory.repertory').publish({ documentId: doc.documentId });

      const odd = missing.length % 2 === 1 ? '  ⚠ odd count — last film row is a single' : '';
      report.push({ name: doc.name, note: `+${missing.length} films → ${filmRows.length} rows${odd}` });
    }

    console.log('\n---------------- SUMMARY ----------------\n');
    for (const r of report) console.log(`● ${String(r.name).padEnd(22)} → ${r.note}`);
    console.log(`\n${report.filter((r) => r.note.startsWith('+')).length} artists updated, ${docs.length} scanned\n`);
    console.log('=====================================================\n');
  } finally {
    await app.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
