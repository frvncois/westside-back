'use strict';

/**
 * Assign each Repertory an `order` weight of 10, 20, 30… following the current
 * default listing order, so editors can reorder the roster from the admin.
 * Idempotent: entries already at their target order are skipped.
 *
 * Run against LOCAL data (dev server stopped — SQLite lock):
 *   node scripts/set-repertory-order.js
 * Then push to cloud with `strapi transfer --to <cloud> --exclude files`.
 */

const { compileStrapi, createStrapi } = require('@strapi/strapi');

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    // No sort → the document service's default order, i.e. today's listing order.
    const docs = await strapi.documents('api::repertory.repertory').findMany({
      pagination: { pageSize: 1000 },
    });

    const report = [];
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const target = (i + 1) * 10;
      if (doc.order === target) {
        report.push({ name: doc.name, note: `already ${target}` });
        continue;
      }
      await strapi.documents('api::repertory.repertory').update({
        documentId: doc.documentId,
        data: { order: target },
      });
      await strapi.documents('api::repertory.repertory').publish({ documentId: doc.documentId });
      report.push({ name: doc.name, note: `${doc.order ?? '—'} → ${target}` });
    }

    console.log('\n================ REPERTORY ORDER REPORT ================\n');
    for (const r of report) console.log(`● ${String(r.name).padEnd(22)} → ${r.note}`);
    console.log(`\n${report.filter((r) => !r.note.startsWith('already')).length} updated, ${docs.length} scanned\n`);
    console.log('=======================================================\n');
  } finally {
    await app.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
