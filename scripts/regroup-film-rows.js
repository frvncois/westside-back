'use strict';

/**
 * Regroup each repertory's gallery so film pieces sit 2 per row.
 *
 * Walks gallery rows in order: film items (type "films", or video mime as a
 * fallback for untyped entries) are extracted and re-emitted as rows of 2 —
 * order preserved, placed where the first film row occurred. Non-film items
 * keep their original rows (rows left empty by the extraction are dropped).
 * Galleries with no films, or whose film rows are already all pairs, are left
 * untouched, so the script is idempotent. An odd film count leaves one final
 * single-film row — those artists are flagged in the report for content review.
 *
 * Run against LOCAL data (dev server stopped — SQLite lock):
 *   node scripts/regroup-film-rows.js
 * Then push to cloud with `strapi transfer --to <cloud> --exclude files`.
 */

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const isFilm = (item) =>
  item.type === 'films' || !!(item.image?.mime ?? '').startsWith('video/');

/** Strip Strapi metadata down to writable component data. */
const itemData = (item) => ({
  title: item.title ?? null,
  client: item.client ?? null,
  type: item.type ?? null,
  image: item.image?.id ?? null,
  filter: (item.filter ?? []).map((c) => c.id),
});

function regroup(rows) {
  const films = [];
  const keptRows = []; // { position: index of source row, items }
  let firstFilmRow = -1;

  rows.forEach((row, index) => {
    const rowItems = row.items ?? [];
    const filmsHere = rowItems.filter(isFilm);
    const rest = rowItems.filter((item) => !isFilm(item));
    if (filmsHere.length && firstFilmRow === -1) firstFilmRow = index;
    films.push(...filmsHere);
    if (rest.length) keptRows.push({ position: index, items: rest });
  });

  if (!films.length) return null; // nothing to do

  const filmRows = [];
  for (let i = 0; i < films.length; i += 2) filmRows.push(films.slice(i, i + 2));

  // Already exactly rows of 2 (or a lone trailing single) in the source? Then only
  // rebuild when the source shape differs from the target shape.
  const targetShape = JSON.stringify({
    filmRows: filmRows.map((r) => r.map((i) => i.id)),
    kept: keptRows.map((r) => r.items.map((i) => i.id)),
  });
  const sourceShape = JSON.stringify({
    filmRows: rows
      .map((row) => (row.items ?? []).filter(isFilm).map((i) => i.id))
      .filter((r) => r.length),
    kept: rows
      .map((row) => (row.items ?? []).filter((i) => !isFilm(i)).map((i) => i.id))
      .filter((r) => r.length),
  });
  const alreadyPaired =
    sourceShape === targetShape &&
    rows.every((row) => {
      const f = (row.items ?? []).filter(isFilm).length;
      const rest = (row.items ?? []).length - f;
      return (f === 0 || rest === 0) && f <= 2; // no mixed rows, film rows ≤2
    }) &&
    rows.filter((row) => (row.items ?? []).some(isFilm)).length === filmRows.length;

  if (alreadyPaired) return null;

  // Reassemble: kept rows before the first film row, then the film pairs, then the rest.
  const before = keptRows.filter((r) => r.position < firstFilmRow);
  const after = keptRows.filter((r) => r.position >= firstFilmRow);
  const newRows = [
    ...before.map((r) => ({ items: r.items.map(itemData) })),
    ...filmRows.map((pair) => ({ items: pair.map(itemData) })),
    ...after.map((r) => ({ items: r.items.map(itemData) })),
  ];

  return { newRows, filmCount: films.length };
}

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const docs = await strapi.documents('api::repertory.repertory').findMany({
      populate: {
        gallery: { populate: { items: { populate: ['image', 'filter'] } } },
      },
      pagination: { pageSize: 1000 },
    });

    const report = [];
    for (const doc of docs) {
      const result = regroup(doc.gallery ?? []);
      if (!result) {
        report.push({ name: doc.name, note: 'no change' });
        continue;
      }

      await strapi.documents('api::repertory.repertory').update({
        documentId: doc.documentId,
        data: { gallery: result.newRows },
      });
      await strapi.documents('api::repertory.repertory').publish({ documentId: doc.documentId });

      const odd = result.filmCount % 2 === 1 ? '  ⚠ odd film count — last row is a single' : '';
      report.push({
        name: doc.name,
        note: `${result.filmCount} films → ${Math.ceil(result.filmCount / 2)} rows${odd}`,
      });
    }

    console.log('\n============== FILM ROW REGROUP REPORT ==============\n');
    for (const r of report) console.log(`● ${String(r.name).padEnd(22)} → ${r.note}`);
    console.log(`\n${report.filter((r) => r.note !== 'no change').length} updated, ${docs.length} scanned\n`);
    console.log('=====================================================\n');
  } finally {
    await app.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
