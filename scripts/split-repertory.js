'use strict';

/**
 * One-off migration: split Repertory (artists carrying a `disciplines` relation and a gallery
 * whose items are tagged `type: films | photography`) into two collections — Director and
 * Photographer.
 *
 * An artist with both disciplines becomes two independent entries sharing the same slug
 * (they live under different routes, so the slugs don't collide). Each entry keeps only the
 * gallery rows belonging to its discipline; rows are already single-type, so no row is split.
 *
 * Idempotent: an existing Director/Photographer with the same slug is updated, not duplicated.
 *
 * Run:  node scripts/split-repertory.js          (dev server must be stopped)
 *       node scripts/split-repertory.js --dry    (report only, writes nothing)
 */

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const DRY = process.argv.includes('--dry');

const TARGETS = [
  { discipline: 'Director', uid: 'api::director.director', type: 'films', hero: 'heroDirector', order: 'orderDirector' },
  { discipline: 'Photographer', uid: 'api::photographer.photographer', type: 'photography', hero: 'heroPhotographer', order: 'orderPhotographer' }
];

const POPULATE = {
  disciplines: true,
  hero: true,
  heroDirector: true,
  heroPhotographer: true,
  links: true,
  seo: { populate: { ogImage: true } },
  gallery: { populate: { items: { populate: { image: true, thumbnail: true, hover: true, filter: true } } } }
};

/** Untyped items (a handful were never tagged) fall back to their media kind: video → film. */
const inferType = (item) =>
  item.type ?? (item.image?.mime?.startsWith('video/') ? 'films' : 'photography');

/** A row's type is its first item's — no row in the data mixes the two. */
const rowType = (row) => {
  for (const item of row.items ?? []) {
    const type = inferType(item);
    if (type) return type;
  }
  return null;
};

const mediaId = (media) => (media ? media.id : null);

/** Components come back with their own `id`; reusing those on a new entry is rejected. */
const stripId = (value) => {
  if (Array.isArray(value)) return value.map(stripId);
  if (value && typeof value === 'object') {
    const { id, documentId, createdAt, updatedAt, publishedAt, ...rest } = value;
    for (const key of Object.keys(rest)) rest[key] = stripId(rest[key]);
    return rest;
  }
  return value;
};

function buildGallery(rows, target) {
  return rows
    .filter((row) => rowType(row) === target.type)
    .map((row) => ({
      items: (row.items ?? []).map((item) =>
        target.type === 'films'
          ? {
              image: mediaId(item.image),
              thumbnail: mediaId(item.thumbnail),
              hover: mediaId(item.hover),
              title: item.title ?? null,
              client: item.client ?? null
            }
          : {
              image: mediaId(item.image),
              title: item.title ?? null,
              client: item.client ?? null,
              // Relations inside a component are addressed by documentId in Strapi 5.
              filter: (item.filter ?? []).map((category) => category.documentId)
            }
      )
    }))
    .filter((row) => row.items.length > 0);
}

function buildSeo(seo) {
  if (!seo) return null;
  const clean = stripId(seo);
  // ogImage is media, not a component — carry the id across rather than the whole object.
  clean.ogImage = mediaId(seo.ogImage);
  return clean;
}

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  const report = [];

  try {
    const artists = await strapi.documents('api::repertory.repertory').findMany({
      status: 'published',
      populate: POPULATE,
      limit: -1
    });

    for (const artist of artists) {
      const disciplines = (artist.disciplines ?? []).map((d) => d.name);

      for (const target of TARGETS) {
        if (!disciplines.includes(target.discipline)) continue;

        const gallery = buildGallery(artist.gallery ?? [], target);
        const data = {
          name: artist.name,
          slug: artist.slug,
          // The discipline-specific field wins, falling back to the shared one.
          order: artist[target.order] ?? artist.order ?? null,
          hero: mediaId(artist[target.hero]) ?? mediaId(artist.hero),
          excerpt: artist.excerpt ?? null,
          information: artist.information ?? null,
          links: stripId(artist.links ?? []),
          seo: buildSeo(artist.seo),
          gallery
        };

        const items = gallery.reduce((sum, row) => sum + row.items.length, 0);
        report.push({
          artist: artist.name,
          target: target.discipline,
          rows: gallery.length,
          items,
          hero: data.hero ? 'yes' : '—',
          order: data.order ?? '—'
        });

        if (DRY) continue;

        const existing = await strapi
          .documents(target.uid)
          .findMany({ filters: { slug: artist.slug }, status: 'draft', limit: 1 });

        const documentId = existing.length
          ? (await strapi.documents(target.uid).update({ documentId: existing[0].documentId, data }))
              .documentId
          : (await strapi.documents(target.uid).create({ data })).documentId;

        await strapi.documents(target.uid).publish({ documentId });
      }
    }

    console.log(`\n============ REPERTORY SPLIT ${DRY ? '(DRY RUN)' : ''} ============\n`);
    for (const row of report) {
      console.log(
        `● ${row.artist.padEnd(20)} ${row.target.padEnd(13)} ` +
          `rows ${String(row.rows).padStart(3)}  items ${String(row.items).padStart(3)}  ` +
          `hero ${String(row.hero).padEnd(4)} order ${row.order}`
      );
    }
    const directors = report.filter((r) => r.target === 'Director').length;
    const photographers = report.filter((r) => r.target === 'Photographer').length;
    console.log(
      `\n${artists.length} artists → ${directors} directors + ${photographers} photographers ` +
        `(${report.reduce((s, r) => s + r.items, 0)} gallery items)\n`
    );
  } finally {
    await app.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
