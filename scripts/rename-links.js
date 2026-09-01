'use strict';

/**
 * Rename repertory link titles from abbreviations to full words.
 *   WS → Website, IG → Instagram
 * Any other title (e.g. an already-renamed one) is left untouched, so this is
 * idempotent and safe to re-run. Updates the draft then republishes each entry.
 *
 * Run against LOCAL data (dev server stopped — SQLite lock):
 *   pkill -f "strapi develop"
 *   node scripts/rename-links.js
 * Then push to cloud with `strapi transfer --to <cloud> --exclude files`.
 */

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const RENAME = { WS: 'Website', IG: 'Instagram' };

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const docs = await strapi.documents('api::repertory.repertory').findMany({
      populate: ['links'],
      pagination: { pageSize: 1000 },
    });

    const report = [];
    for (const doc of docs) {
      const links = doc.links ?? [];
      if (!links.length) continue;

      let changed = false;
      const newLinks = links.map((l) => {
        const title = RENAME[l.title] ?? l.title;
        if (title !== l.title) changed = true;
        return { title, url: l.url };
      });

      if (!changed) {
        report.push({ name: doc.name, note: 'no change' });
        continue;
      }

      await strapi.documents('api::repertory.repertory').update({
        documentId: doc.documentId,
        data: { links: newLinks },
      });
      await strapi.documents('api::repertory.repertory').publish({ documentId: doc.documentId });

      report.push({ name: doc.name, note: newLinks.map((l) => l.title).join(', ') });
    }

    console.log('\n================ RENAME LINKS REPORT ================\n');
    for (const r of report) console.log(`● ${String(r.name).padEnd(22)} → ${r.note}`);
    console.log(`\n${report.filter((r) => r.note !== 'no change').length} updated, ${docs.length} scanned\n`);
    console.log('====================================================\n');
  } finally {
    await app.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
