'use strict';

/**
 * Companion to split-repertory.js: repoint the Hero's slides from the old `repertory`
 * relation to the new `director` / `photographer` ones.
 *
 * A slide keeps pointing at the same person. When that person exists in only one of the
 * new collections the choice is forced; when they're in both, the slide's own media
 * decides — a video slide belongs to the film (Director) side, a still to Photography.
 *
 * Run:  node scripts/split-hero-slides.js [--dry]     (dev server must be stopped)
 */

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const DRY = process.argv.includes('--dry');

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const hero = await strapi.documents('api::hero.hero').findFirst({
      status: 'published',
      populate: { slides: { populate: { media: true, repertory: true } } }
    });

    if (!hero) {
      console.log('No hero entry found — nothing to migrate.');
      return;
    }

    const directors = await strapi.documents('api::director.director').findMany({ limit: -1 });
    const photographers = await strapi
      .documents('api::photographer.photographer')
      .findMany({ limit: -1 });
    const directorBySlug = new Map(directors.map((d) => [d.slug, d]));
    const photographerBySlug = new Map(photographers.map((p) => [p.slug, p]));

    const report = [];
    const slides = (hero.slides ?? []).map((slide) => {
      const artist = slide.repertory;
      const director = artist ? directorBySlug.get(artist.slug) : null;
      const photographer = artist ? photographerBySlug.get(artist.slug) : null;
      const isVideo = (slide.media?.mime ?? '').startsWith('video/');
      // Both disciplines → the slide's own media picks the side.
      const pickDirector = director && (!photographer || isVideo);

      report.push({
        artist: artist?.name ?? '—',
        media: slide.media?.name ?? '—',
        target: pickDirector ? 'Director' : photographer ? 'Photographer' : '⚠ unmatched'
      });

      return {
        media: slide.media?.id ?? null,
        duration: slide.duration ?? null,
        director: pickDirector ? director.documentId : null,
        photographer: !pickDirector && photographer ? photographer.documentId : null
      };
    });

    if (!DRY) {
      await strapi.documents('api::hero.hero').update({
        documentId: hero.documentId,
        data: { slides }
      });
      await strapi.documents('api::hero.hero').publish({ documentId: hero.documentId });
    }

    console.log(`\n============ HERO SLIDES ${DRY ? '(DRY RUN)' : ''} ============\n`);
    for (const row of report) {
      console.log(`● ${row.artist.padEnd(20)} ${row.target.padEnd(14)} ${row.media}`);
    }
    console.log(`\n${report.length} slides repointed\n`);
  } finally {
    await app.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
