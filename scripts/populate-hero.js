'use strict';

/**
 * Fill each Repertory's `hero` media field.
 * Rule: use the file whose name contains "hero"; otherwise the leading-`01` file
 * in the artist's folder (Photography preferred, else Film — same as galleries).
 *
 * Run:  node scripts/populate-hero.js
 */

const { compileStrapi, createStrapi } = require('@strapi/strapi');

const ARTISTS = [
  { name: 'Wade Hudson', documentId: 'zdtrat8a6wk66tz6vtaxny6h', folderPath: '/3/36/38' },
  { name: 'Vicky Lam', documentId: 'jzpqb905xk466e42fb9k1342', folderPath: '/3/35/37' },
  { name: 'Teaunna Gray', documentId: 'hcw8fq70m9p5hkuw7kh04hf2', folderPath: '/3/33/34' },
  { name: 'Sammy Rawal', documentId: 'n2ue5kec2d7dour1ru3id2pk', folderPath: '/3/30/32' },
  { name: 'Ryan Szulc', documentId: 'e9a26budtsrl9j0p5nh4rk9d', folderPath: '/3/27/29' },
  { name: 'Nikki Ross', documentId: 'fmylrn0jkbykw396slww02l4', folderPath: '/3/26/40' },
  { name: 'Maya Fuhr', documentId: 'c3ogx9pt7cs5z93kvxuyfcub', folderPath: '/3/23/25' },
  { name: 'Matt Enlow', documentId: 'uncdacvdf9m8earwee5lm60w', folderPath: '/3/21/22' },
  { name: 'Matt Barnes', documentId: 'qnjdsi4ffq0ip0chz4e5j2c7', folderPath: '/3/18/20' },
  { name: 'Marc Santos', documentId: 'hefg9iznxpoo2v84svrs1t2l', folderPath: '/3/17/39' },
  { name: 'Chris Gordaneer', documentId: 'd0edp4vy4h0s3r9uaiz6n5zw', folderPath: '/3/16/41' },
  { name: 'Kevin Wilson, Jr.', documentId: 'hsavnms9z24331vqa3zi3738', folderPath: '/3/14/15' },
  { name: 'Julian King', documentId: 'a7vjmh3lfgz7u2c23t6sgdt6', folderPath: '/3/12/13' },
  { name: 'Jennifer Roberts', documentId: 'm8y6xsgvcxvss4ytehb58neg', folderPath: '/3/9/11' },
  { name: 'Carla Dauden', documentId: 'f0przfirszwop0bvfmxymkr1', folderPath: '/3/7/8' },
];

const leadingNum = (name) => {
  const m = name.match(/^\s*\\?\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};
const usable = (m) => /^image\//.test(m) || /^video\//.test(m);

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';

  try {
    const report = [];
    for (const artist of ARTISTS) {
      const files = await strapi.db.query('plugin::upload.file').findMany({
        where: { folderPath: artist.folderPath },
        select: ['id', 'name', 'mime'],
      });
      const media = files.filter((f) => usable(f.mime));

      // 1) a file whose name contains "hero"
      let chosen = media.find((f) => /hero/i.test(f.name));
      // 2) else the leading-01 file
      if (!chosen) chosen = media.find((f) => leadingNum(f.name) === 1);

      if (!chosen) {
        report.push({ artist: artist.name, file: '⚠ NONE FOUND' });
        continue;
      }

      await strapi.documents('api::repertory.repertory').update({
        documentId: artist.documentId,
        data: { hero: chosen.id },
      });
      await strapi.documents('api::repertory.repertory').publish({ documentId: artist.documentId });

      report.push({ artist: artist.name, file: chosen.name });
    }

    console.log('\n================ HERO REPORT ================\n');
    for (const r of report) console.log(`● ${r.artist.padEnd(20)} → ${r.file}`);
    console.log('\n============================================\n');
  } finally {
    await app.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
