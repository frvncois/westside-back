'use strict';

/**
 * Populate each Repertory's `gallery` (rows -> items) from the media library.
 *
 * Rules:
 *  - Use the artist's Photography folder; fall back to Film when no Photography.
 *  - Each list line = one gallery-row; each number = one gallery-item.
 *  - A number maps to the file whose name starts with `NN_` (leading integer).
 *  - item.image  = the file          (image or video)
 *  - item.type   = 'photography' (image mime) | 'films' (video mime)
 *  - item.filter = category whose name matches a filename token (else empty)
 *
 * Run:  node scripts/populate-galleries.js
 */

const { compileStrapi, createStrapi } = require('@strapi/strapi');

// --- artist config: folder path (Photography preferred, else Film) + repertory documentId + groups ---
const ARTISTS = [
  {
    name: 'Wade Hudson',
    documentId: 'zdtrat8a6wk66tz6vtaxny6h',
    folderPath: '/3/36/38', // Photography
    groups: `01 - 02 / 03 - 04 - 05 / 06 - 07 - 08 / 09 - 10 / 11 / 12 - 13 - 14 / 15 / 16 - 17 - 18 / 19 - 20 / 21 - 22 / 23 - 24 - 25`,
  },
  {
    name: 'Vicky Lam',
    documentId: 'jzpqb905xk466e42fb9k1342',
    folderPath: '/3/35/37', // Photography
    groups: `01 - 02 / 03 - 04 - 05 / 06 / 07 - 08 - 09 / 10 / 11 - 12 - 13 / 14 - 15 / 16 / 17 - 18 - 19 / 20 / 21 - 22 - 23 / 24 - 25 / 26 - 27 / 28 / 29 - 30 - 31 / 32 - 33`,
  },
  {
    name: 'Teaunna Gray',
    documentId: 'hcw8fq70m9p5hkuw7kh04hf2',
    folderPath: '/3/33/34', // Film
    groups: `01 / 02 / 03 / 04 / 05`,
    // ref 01 has no NN_ prefix — it's the Hero file:
    overrides: { 1: 'Teaunnagray_Hero.mp4' },
  },
  {
    name: 'Sammy Rawal',
    documentId: 'n2ue5kec2d7dour1ru3id2pk',
    folderPath: '/3/30/32', // Photography
    groups: `01 - 02 - 03 - 04 / 05 - 06 - 07 / 08 - 09 / 10 / 11 - 12 - 13 / 14 / 15 - 16 / 17 - 18 - 19 / 20 - 21 / 22 / 23 - 24 / 25 - 26 / 27 - 28 - 29 / 30 / 31 - 32 / 33`,
  },
  {
    name: 'Ryan Szulc',
    documentId: 'e9a26budtsrl9j0p5nh4rk9d',
    folderPath: '/3/27/29', // Photography
    groups: `1 / 2 - 3 / 4 - 5 / 6 / 7 - 8 / 9 / 10 - 11 / 12 - 13 / 14 - 15 - 16 / 17 - 18 / 19 / 20 - 21 / 22 - 23 / 24 / 25 - 26 / 27 / 28 - 29 / 30 / 31 - 32 / 33 - 34 / 35 - 36 / 37 / 38 - 39`,
  },
  {
    name: 'Nikki Ross', // list: "Nikkoi Ross"
    documentId: 'fmylrn0jkbykw396slww02l4',
    folderPath: '/3/26/40', // Photography
    groups: `1 - 2 / 3 - 4 - 5 / 6 - 7 / 8 - 9 / 10 / 11 - 12 - 13 / 14 - 15 / 16 - 17 - 18 / 19 - 20 / 21 / 22 - 23 / 24 / 25 - 26 / 27 / 28 - 29 / 30 - 31 / 32 - 33 - 34 / 35 - 36 / 37 / 38 - 39 / 40`,
  },
  {
    name: 'Maya Fuhr',
    documentId: 'c3ogx9pt7cs5z93kvxuyfcub',
    folderPath: '/3/23/25', // Photography
    groups: `1 - 2 - 3 / 4 - 5 - 6 / 7 / 8 - 9 / 10 - 11 - 12 / 13 / 14 - 15 - 16 / 17 - 18 - 19 / 20 - 21 / 22 - 23 - 24 / 25 / 26 - 27 - 28 / 29 - 30 - 31 / 32 - 33 / 34 - 35 - 36`,
  },
  {
    name: 'Matt Enlow',
    documentId: 'uncdacvdf9m8earwee5lm60w',
    folderPath: '/3/21/22', // Film
    groups: `1 / 2 / 3 / 4 / 5 / 6 / 7 / 8`,
  },
  {
    name: 'Matt Barnes',
    documentId: 'qnjdsi4ffq0ip0chz4e5j2c7',
    folderPath: '/3/18/20', // Photography
    groups: `1 - 2 / 3 - 4 / 5 / 6 - 7 / 8 - 9 / 10 - 11 / 12 / 13 - 14 / 15 - 16 - 17 / 18 - 19 / 20 - 21 / 22 - 23 / 24 - 25 / 26 - 27 / 28 - 29 / 30 - 31 / 32`,
  },
  {
    name: 'Marc Santos',
    documentId: 'hefg9iznxpoo2v84svrs1t2l',
    folderPath: '/3/17/39', // Photography
    groups: `1 - 2 - 3 / 4 - 5 / 6 - 7 - 8 / 9 / 10 - 11 - 12 / 13 - 14 - 15 / 16 - 17 / 18 - 19 - 20 / 21 - 22 / 23 - 24 - 25 / 26 - 27 / 28 - 29 - 30 / 31 - 32 / 33 - 34 / 35 - 36 - 37 / 38 - 39 / 40`,
  },
  {
    name: 'Chris Gordaneer',
    documentId: 'd0edp4vy4h0s3r9uaiz6n5zw',
    folderPath: '/3/16/41', // Photography
    groups: `1 - 2 / 3 / 4 - 5 / 6 / 7 - 8 / 9 - 10 / 11 - 12 - 13 / 14 - 15 / 16 - 17 - 18 / 19 - 20 - 21 / 22 / 23 - 24 - 25 / 26 - 27 / 28 / 29 - 30 - 31 / 32 - 33 - 34 / 35 - 36 - 37 / 38 / 39 - 40`,
  },
  {
    name: 'Kevin Wilson, Jr.',
    documentId: 'hsavnms9z24331vqa3zi3738',
    folderPath: '/3/14/15', // Film
    groups: `01 / 02 / 03 / 04 / 05 / 06`,
    overrides: { 6: 'kevinwilsonjr_Hero.mp4' }, // un-numbered Hero video = ref 06
  },
  {
    name: 'Julian King',
    documentId: 'a7vjmh3lfgz7u2c23t6sgdt6',
    folderPath: '/3/12/13', // Film
    groups: `01 / 02 / 03 / 04 / 05 / 06 / 07 / 08`,
    overrides: { 8: 'julianking_Film Hero.mp4' }, // un-numbered Hero video = ref 08
  },
  {
    name: 'Jennifer Roberts',
    documentId: 'm8y6xsgvcxvss4ytehb58neg',
    folderPath: '/3/9/11', // Photography
    groups: `01 - 02 / 03 - 04 / 05 / 06 - 07 / 08 - 09 / 10 - 11 / 12 / 13 - 14 / 15 - 16 / 17 - 18 / 19 - 20 - 21 / 22 - 23 / 24 - 25 / 26 - 27 / 28 - 29 / 30 - 31 / 32 - 33 / 34 - 35 / 36 - 37`,
  },
  {
    name: 'Carla Dauden',
    documentId: 'f0przfirszwop0bvfmxymkr1',
    folderPath: '/3/7/8', // Film
    groups: `01 / 02 / 03 / 04 / 05 / 06 / 07 / 08`,
    overrides: { 8: 'carladauden_Hero Film.mp4' }, // un-numbered Hero video = ref 08
  },
];

// Parse "01 - 02 / 03 - 04 - 05" (and newlines) into [[1,2],[3,4,5]]
function parseGroups(raw) {
  return raw
    .split(/[\/\n]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .split('-')
        .map((n) => parseInt(n.trim(), 10))
        .filter((n) => Number.isInteger(n))
    )
    .filter((g) => g.length);
}

const leadingNum = (name) => {
  const m = name.match(/^\s*\\?\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    // category name (lowercased) -> documentId
    const cats = await strapi.documents('api::category.category').findMany({ limit: -1 });
    const catByName = new Map();
    for (const c of cats) catByName.set(c.name.toLowerCase(), c.documentId);

    // Confident synonyms: filename token (lowercased) -> canonical category name
    const SYNONYMS = {
      food: 'Food & Beverage',
      beverage: 'Food & Beverage',
      product: 'Product & Still life',
      stilllife: 'Product & Still life',
      auto: 'Automotive',
      locationportrait: 'Portrait',
    };

    const resolveToken = (key) => {
      if (catByName.has(key)) return catByName.get(key); // exact category name
      const syn = SYNONYMS[key];
      if (syn && catByName.has(syn.toLowerCase())) return catByName.get(syn.toLowerCase());
      return null;
    };

    const matchCategory = (fileName) => {
      const base = fileName.replace(/\.[^.]+$/, '');
      for (const tok of base.split(/[_\s]+/)) {
        const key = tok.trim().toLowerCase();
        if (!key) continue;
        const docId = resolveToken(key);
        if (docId) return { docId, token: tok };
      }
      return null;
    };

    const report = [];

    for (const artist of ARTISTS) {
      const files = await strapi.db.query('plugin::upload.file').findMany({
        where: { folderPath: artist.folderPath },
        select: ['id', 'name', 'mime'],
      });

      // number -> file
      const byNum = new Map();
      const usableMimes = (m) => /^image\//.test(m) || /^video\//.test(m);
      for (const f of files) {
        if (!usableMimes(f.mime)) continue; // skip PDFs etc.
        const n = leadingNum(f.name);
        if (n != null && !byNum.has(n)) byNum.set(n, f);
      }
      // explicit overrides (e.g. Teaunna Hero has no NN_ prefix)
      for (const [num, fname] of Object.entries(artist.overrides || {})) {
        const f = files.find((x) => x.name === fname);
        if (f) byNum.set(parseInt(num, 10), f);
      }

      const groups = parseGroups(artist.groups);
      const referenced = new Set(groups.flat());
      const missing = [];
      const noCategory = new Set();

      const rows = [];
      for (const group of groups) {
        const items = [];
        for (const num of group) {
          const f = byNum.get(num);
          if (!f) {
            missing.push(num);
            continue;
          }
          const isVideo = /^video\//.test(f.mime);
          const cat = matchCategory(f.name);
          if (!cat) noCategory.add(f.name);
          items.push({
            image: f.id,
            type: isVideo ? 'films' : 'photography',
            filter: cat ? [cat.docId] : [],
          });
        }
        if (items.length) rows.push({ items });
      }

      // files present in the folder but never referenced by the list
      const extras = [...byNum.keys()].filter((n) => !referenced.has(n)).sort((a, b) => a - b);

      await strapi.documents('api::repertory.repertory').update({
        documentId: artist.documentId,
        data: { gallery: rows },
      });
      await strapi.documents('api::repertory.repertory').publish({ documentId: artist.documentId });

      report.push({
        artist: artist.name,
        folder: artist.folderPath,
        rows: rows.length,
        items: rows.reduce((s, r) => s + r.items.length, 0),
        missingRefs: missing,
        extraFiles: extras,
        tokensWithoutCategory: [...noCategory],
      });
    }

    console.log('\n================ POPULATION REPORT ================\n');
    for (const r of report) {
      console.log(`● ${r.artist}  (${r.folder})`);
      console.log(`    rows: ${r.rows}   items: ${r.items}`);
      if (r.missingRefs.length) console.log(`    ⚠ list refs with NO file: ${r.missingRefs.join(', ')}`);
      if (r.extraFiles.length) console.log(`    ⚠ files not in list (ignored): ${r.extraFiles.join(', ')}`);
      if (r.tokensWithoutCategory.length)
        console.log(`    · no category matched for: ${r.tokensWithoutCategory.join(' | ')}`);
      console.log('');
    }
    console.log('==================================================\n');
  } finally {
    await app.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
