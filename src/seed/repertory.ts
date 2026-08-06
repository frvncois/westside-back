import type { Core } from '@strapi/strapi';

/**
 * Repertory roster seeded from the "Dev Handoff" content batches.
 *
 * Split rule (per the handoff): the first paragraph of a bio becomes the
 * `excerpt`; every remaining paragraph becomes `information`. Single-paragraph
 * bios therefore have an excerpt only and no information.
 *
 * Links follow a fixed convention: the website link is titled `WS`, the
 * Instagram link is titled `IG` and points at instagram.com/<handle>.
 *
 * Roles are a `disciplines` many-to-many relation to the Discipline taxonomy,
 * so a person can be both a Director and a Photographer.
 *
 * Seeding is idempotent — an entry is created only when no repertory with the
 * same `name` already exists, so editor edits (and later batches) are safe.
 */

type DisciplineName = 'Director' | 'Photographer';

type SeedLink = { title: string; url: string };

type SeedRepertory = {
  name: string;
  disciplines: DisciplineName[];
  excerpt: string;
  information?: string;
  links: SeedLink[];
};

const REPERTORY_SEED: SeedRepertory[] = [
  {
    name: 'Julian King',
    disciplines: ['Director'],
    excerpt:
      'Cinematographer turned Director, Julian King crafts genre-bending narratives that are rooted in a powerful visual language. With technical expertise, Julian layers emotive storytelling with bold, cinematic imagery.',
    information: `Julian's directorial debut, The Real Thing, a hot rod documentary that quickly went viral, led to high-profile campaigns with automotive clients. His work spans genres – from high concept automotive films and visceral sports narratives, to optimistic lifestyle spots. Past clients include, Cadillac, Under Armour, Toyota, Uber, and Ford. Julian's commercial work has earned nods from Creativity, Motionographer, and The Drum Awards.

The strength of Julian's work is a result of his commitment to fostering creative partnerships, grounded in trust and respect.`,
    links: [
      { title: 'WS', url: 'https://www.julianking.tv' },
      { title: 'IG', url: 'https://www.instagram.com/julianking' },
    ],
  },
  {
    name: 'Teaunna Gray',
    disciplines: ['Director'],
    excerpt:
      "Teaunna Gray brings a cinematic polish to her documentary style. She is deeply passionate about projects that involve real people and showcasing their captivating stories. Teaunna's kindness and confidence create a safe space for individuals in front of her camera, enabling them to embrace their true selves without inhibition. Educated in the social services, Teaunna brings a deep well of empathy to her work. She excels at creating honest representation in front of and behind the camera. Teaunna's Afro-Indigenous heritage informs her work, and her perspective on every project. Teaunna takes inspiration from the stories shared with her, creating opportunities to amplify their experiences though her elevated approach.",
    links: [
      { title: 'WS', url: 'https://www.teaunnagray.com' },
      { title: 'IG', url: 'https://www.instagram.com/teaunnagray' },
    ],
  },
  {
    name: 'Carla Dauden',
    disciplines: ['Director'],
    excerpt:
      "Carla Dauden, an accomplished director hailing from Brazil, currently based in Los Angeles, employs a narrative-driven filmmaking style that skillfully weaves together human stories with a stylish and cinematic approach. With a comprehensive background that encompasses almost every role on set, Carla possesses a holistic understanding of the filmmaking process, enabling her to bring any concept to life. Carla approaches filmmaking as an opportunity to create a social impact, and empower empathy. She has a wealth of experience working with children, and has an innate ability to capture authentic performances from kids and adults alike. In 2019, her campaign for Disney's 'Team of Heroes' was nominated for a Daytime Emmy Award. In addition to her commercial work, Carla has also directed episodic television, most recently for the critically acclaimed TV show, Good Trouble, further expanding her versatile repertoire.",
    links: [
      { title: 'WS', url: 'https://www.carladauden.com' },
      { title: 'IG', url: 'https://www.instagram.com/carladauden' },
    ],
  },
  {
    name: 'Kevin Wilson, Jr.',
    disciplines: ['Director'],
    excerpt:
      'Oscar-nominated director, Kevin Wilson, Jr., is a storyteller. With impactful narratives woven with empathy, both scripted and documentary, Kevin\'s work creates a lasting impression on the viewer. With a journalism degree, Kevin has dedicated himself to sharing the stories of others with honesty and compassion. His work has garnered critical acclaim and numerous awards including the AICP and SHOTS award for "Best New Director", YDA Gold, a Cannes Lion, 4 x D&ADs, and an Oscar nomination for his short film, My Nephew Emmett. Kevin\'s commercial projects have provided avenues to uplift and enlighten audiences on challenging subjects.',
    links: [
      { title: 'WS', url: 'https://www.directedbykevin.com' },
      { title: 'IG', url: 'https://www.instagram.com/directedbykevin' },
    ],
  },
  {
    name: 'Matt Enlow',
    disciplines: ['Director'],
    excerpt:
      'Matt Enlow is an Emmy-nominated director and writer known for his sharp eye for comedic performance and cinematic visual style.',
    information: `He began his career at Comedy Central, honing his craft while simultaneously creating his own award-winning work. His breakout digital series Squaresville earned acclaim from Entertainment Weekly, USA Today, and Variety, and helped establish his reputation as a creator with both heart and wit.

After earning an Emmy nomination for his work on Key & Peele, Matt quickly became a regular at CollegeHumor and Lorne Michaels' Above Average, where he helped define the tone of their celebrity-driven branded content. His campaigns garnered millions of views and positioned him as a trusted director for comedy that's smart, stylish, and viral.

Matt is particularly known for coaxing standout comedic performances while maintaining high production value and a distinctly cinematic feel. Whether directing absurdist sketches or character-driven narratives, he strikes a rare balance between authenticity, visual sophistication, and comic timing.

Over the past decade, Matt has directed national commercial campaigns for Fortune 500 companies and led major projects for networks like Facebook, Verizon, and Viacom.

He also co-hosts Just Shoot It, a popular filmmaking podcast where he breaks down the craft and business of directing with honesty and humor.`,
    links: [
      { title: 'WS', url: 'https://www.mrmattenlow.com' },
      { title: 'IG', url: 'https://www.instagram.com/mrmattenlow' },
    ],
  },
  {
    name: 'Marc Santos',
    disciplines: ['Photographer'],
    excerpt: `Marc Santos is a Toronto-based photographer whose work is rooted in clarity, balance, and a strong sense of design. He moves between still life, food and portraiture with an eye for shape, texture, and the kinds of details that make an image quietly memorable. Marc creates photographs with a refined, intentional simplicity. His work is sculptural and minimal, guided by a curiosity for how light falls, how materials meet, and how something ordinary can shift into something remarkable.`,
    links: [
      { title: 'WS', url: 'https://marcsantosphoto.com' },
      { title: 'IG', url: 'https://www.instagram.com/marcsantosphoto' },
    ],
  },
  {
    name: 'Wade Hudson',
    disciplines: ['Photographer'],
    excerpt: `Wade Hudson specializes in portraiture. He celebrates his subjects' joy and captures their vulnerability in an intimate fashion. The highly approachable Wade brings out the playful side of personalities — whether they're everyday people, models or celebrities. In addition to his commercial work, he also specializes in fashion and beauty. Wade is a virtuoso of lighting technique, inside and outside the studio. He brilliantly illuminates a person's complexion, bringing out the best in each of his subjects, in any environment. He describes his work as 'honest and personal.' His clients describe it as 'flawless.'`,
    links: [
      { title: 'WS', url: 'https://wadehudson.ca' },
      { title: 'IG', url: 'https://www.instagram.com/wadehudson' },
    ],
  },
  {
    name: 'Nikki Ross',
    disciplines: ['Photographer'],
    excerpt: `Nikki Ross brings an undeniable energy and lightness to her lifestyle photography. She has an extraordinary ability to invite anyone in front of her lens, and make them feel comfortable and courageous. Through the confidence she inspires in her subjects, Nikki is able to authentically capture the essence of any individual. Nikki spends time with her subjects — be they models, actors or real people — and gets to know them in order to capture their most genuine self in a single still image. She works particularly well with children, creating a lively and energetic set, making it for a fun and enjoyable experience. Radiating with creativity and drive, Nikki is one to watch.`,
    links: [
      { title: 'WS', url: 'https://www.nikkiross.com' },
      { title: 'IG', url: 'https://www.instagram.com/_nikkiross' },
    ],
  },
  {
    name: 'Chris Gordaneer',
    disciplines: ['Photographer'],
    excerpt: `Chris Gordaneer's strong, stylistic look is one he has established as iconically his own. With an innate ability to craft narratives that resonate deeply, Chris's work evokes a wide spectrum of emotions. Through his decades of experience, Chris has collaborated with globally renowned brands on projects that have taken him around the world. Chris can comfortably navigate any scenario, viewing potential challenges as exciting opportunities, especially when working with remote locations. His work is often described as "epic", whether capturing a mountaineer mid-journey, or elevating an everyday moment between family. Chris is well known for his work with animals, particularly in his iconic Telus campaigns. While animals are notoriously unpredictable, Chris thrives by making the most of the unexpected. Whether in studio or on locations ranging from a dairy farm, an ice rink, to the open road, Chris is able to effortlessly adapt and excel.`,
    links: [
      { title: 'WS', url: 'https://www.chrisgordaneer.com' },
      { title: 'IG', url: 'https://www.instagram.com/cgordaneer' },
    ],
  },
  {
    name: 'Vicky Lam',
    disciplines: ['Photographer'],
    excerpt: `Vicky Lam is beloved for her playful and bold style. She uses shadows, textures, and colour to bring the subject of every frame to life. Whether capturing food or product, Vicky creates worlds that are imaginative, whimsical, and uniquely hers. Behind the scenes Vicky's process is methodical and meticulous – leaving clients feeling safe in her hands. Vicky examines every angle and possible approach to elevate and execute every creative concept. In photography, she works in tabletop style for product or still life shots, using a colourful palette and unique combinations. Her work feels elevated and polished, with comic undertones. Her seamless expansion into stop-motion animation expands her creative abilities and her boundless imagination.`,
    links: [
      { title: 'WS', url: 'https://www.vickylam.com' },
      { title: 'IG', url: 'https://www.instagram.com/chichi_photo' },
    ],
  },
  {
    name: 'Sammy Rawal',
    disciplines: ['Director', 'Photographer'],
    excerpt: `Sammy Rawal is an award-winning director and digital artist, known for his hyper-stylised look & feel. Sammy's work has an undeniable energy, expressed through his use of rhythm, bold colour, choreography, and innovative VFX. His love for colour, dance and fashion, is rooted in his Indo-African-Canadian background. Authentic representation and the creation of inclusive spaces play an important role in Sammy's life, and has endeared the likes of artists such as Lizzo, Cardi B and Elton John to his work. Sammy is deeply engaged in community-building through his work as a DJ and as a member of the queer Ballroom collective, The House of Gorgeous Gucci.`,
    links: [
      { title: 'WS', url: 'https://www.sammyrawal.com' },
      { title: 'IG', url: 'https://www.instagram.com/sammyrawal' },
    ],
  },
  {
    name: 'Jennifer Roberts',
    disciplines: ['Director', 'Photographer'],
    excerpt: `Jennifer Roberts is an award winning photographer and director, recognized for her ability to tell stories with empathy and truth. With a background in photojournalism, she beautifully captures intimate moments with genuine emotion, whether collaborating with actors or real people. Jennifer approaches every project as an opportunity to shine a light on human connection, portraying even the most complex and challenging stories with sensitivity and authenticity.`,
    information: `Her recent work, "24 Hours of Care," has earned international acclaim, including a YDA for Charity Commercial at Cannes, a bronze at the Shots Awards of the Americas, and both Gold and Silver Clio Awards. Her photography has been featured in The New York Times, The Hollywood Reporter, The Wall Street Journal, and Rolling Stone.`,
    links: [
      { title: 'WS', url: 'https://jenniferroberts.ca' },
      { title: 'IG', url: 'https://www.instagram.com/jenniferroberts' },
    ],
  },
  {
    name: 'Matt Barnes',
    disciplines: ['Director', 'Photographer'],
    excerpt: `Matt Barnes is a creative powerhouse. A photographer/director like no other, Matt creates extraordinary scenarios for every subject he captures. Celebrated for his high-concept creative direction and unique style, Matt is an innovator at heart, always looking for the most interesting way to capture a scene or product. He has extensive experience capturing celebrities, musicians, models, and everyday people, often partnering his subjects with a symbolic environment. A hyper-conceptual storyteller with a quick mind, Matt's sets match his own energy and focus. Whether in film or photography, his personality and pop come through in high contrast, high-saturated visuals. Known for his portraiture and lifestyle photography, he won't shy away from shooting a sandwich by putting his electric and colourful spin on it.`,
    links: [
      { title: 'WS', url: 'https://www.mattbarnesphotography.com' },
      { title: 'IG', url: 'https://www.instagram.com/mattbarnesphoto' },
    ],
  },
  {
    name: 'Maya Fuhr',
    disciplines: ['Director', 'Photographer'],
    excerpt: `Maya Fuhr is an award-winning photographer, director, and visual artist whose work blends playfulness with emotional depth. Recognized for her intuitive eye and use of high flash and analogue film, she brings a sense of spontaneity and creative instinct to everything she shoots, whether it's a fashion portrait, a cultural document, or a quietly surreal image that feels lifted from a dream.`,
    information: `Her work often explores beauty in unconventional places, focusing on authentic representation and storytelling that feels personal, vibrant, and artfully composed. She deeply appreciates subcultures that often go unseen, and her portraits carry an innate sense of style and ease that feels fresh and grounded. Maya has collaborated with brands like Coach, Converse, and About Face, and has photographed talent for publications including The Fader, Interview, and Numéro.

While her photography moves fluidly between editorial and brand work, Maya is also an accomplished visual artist with an international exhibition history, including shows at the Art Gallery of Ontario, Patel Brown, and NADA New York. Her practice is rooted in self-expression and a deep sensitivity to the people and worlds she photographed. That same sense of curiosity and openness carries through everything she creates.

Outside of work, she finds joy in nature, dancing, and a good soft cheese.`,
    links: [
      { title: 'WS', url: 'https://www.mayafuhr.com' },
      { title: 'IG', url: 'https://www.instagram.com/mayafuhr' },
    ],
  },
  {
    name: 'Ryan Szulc',
    disciplines: ['Director', 'Photographer'],
    excerpt: `Whether capturing food through photography or film, Ryan Szulc reveals the whole picture. His lens takes a holistic approach, focusing not just on one ingredient, but the experience surrounding the shot. Clients and chefs alike value his understanding of the needs and nuances of any plated dish. Ryan's work is polished and editorial with naturalistic lighting. Working both in studio and on location, Ryan brings a dynamic versatility and depth to the images, using a broad colour palette. He's photographed more than 50 cookbooks, of which many have won countless awards. Clients deeply appreciate his meticulous, yet efficient shooting process. Able to adapt his style to any creative ask, Ryan delivers a stunning visual product that elevates any initial brief.`,
    links: [
      { title: 'WS', url: 'https://www.ryanszulc.ca' },
      { title: 'IG', url: 'https://www.instagram.com/ryan_szulc' },
    ],
  },
  {
    name: 'Aleksandra Kingo',
    disciplines: ['Director', 'Photographer'],
    excerpt: `Aleksandra Kingo is a photographer and director with a knack for turning the mundane into the surreal, the awkward into the iconic, and the pastel-coloured into the deeply relatable. Her work blends bold colors, razor-sharp wit, and a touch of dark comedy, creating illusory worlds where lipstick stains are a blessing, spa days happen in rivers, and curbside dinners are perfectly romantic.`,
    information: `Aleksandra has built a career crafting visually striking campaigns for major brands and publications. With over a hundred commercial projects under her belt, her style isn't just recognizable – it's referenced, reshared, and occasionally, shamelessly imitated. She's been featured in It's Nice That, Wired, Creative Review, and enough "feeds to follow" lists to make your algorithm jealous. Her clients include Coca-Cola, Adidas, L'Oréal, American Express, Target, and Virgin Atlantic, all drawn to her ability to blend high-impact visuals with playful storytelling and a touch of the unexpected.

Aleksandra's work is a celebration of life's weird little moments – the good, the bad, and the wonderfully awkward. Whether through photography or film, she invites you into her world, where the everyday gets a surreal twist, and nothing is taken too seriously… except for immaculate set design.`,
    links: [
      { title: 'WS', url: 'https://aleksandrakingo.com' },
      { title: 'IG', url: 'https://www.instagram.com/aleksandrakingo' },
    ],
  },
];

const DISCIPLINES: DisciplineName[] = ['Director', 'Photographer'];

/**
 * Seed the Discipline taxonomy (idempotent by name) and return a
 * name → documentId map so repertory entries can connect to their roles.
 */
export async function seedDisciplines({ strapi }: { strapi: Core.Strapi }) {
  const uid = 'api::discipline.discipline' as const;

  for (const name of DISCIPLINES) {
    const existing = await strapi.db.query(uid).findOne({ where: { name } });
    if (!existing) {
      await strapi.documents(uid).create({ data: { name } });
    }
  }

  const map = new Map<string, string>();
  const all = await strapi.documents(uid).findMany({ fields: ['name'] });
  for (const d of all) {
    if (d.name) map.set(d.name, d.documentId);
  }
  return map;
}

export async function seedRepertory({
  strapi,
  disciplineMap,
}: {
  strapi: Core.Strapi;
  disciplineMap: Map<string, string>;
}) {
  const uid = 'api::repertory.repertory' as const;
  let created = 0;
  let migrated = 0;

  for (const entry of REPERTORY_SEED) {
    const disciplineIds = entry.disciplines
      .map((name) => disciplineMap.get(name))
      .filter((id): id is string => Boolean(id));

    const [existing] = await strapi.documents(uid).findMany({
      filters: { name: entry.name },
      populate: { disciplines: true },
      limit: 1,
    });

    if (!existing) {
      const doc = await strapi.documents(uid).create({
        data: {
          name: entry.name,
          excerpt: entry.excerpt,
          information: entry.information,
          links: entry.links,
          disciplines: disciplineIds,
        },
      });
      // draftAndPublish is on for this content type, so publish the new draft.
      await strapi.documents(uid).publish({ documentId: doc.documentId });
      created += 1;
    } else if (!existing.disciplines || existing.disciplines.length === 0) {
      // One-time migration: entries created before `disciplines` existed get
      // their role attached from the seed data. Once set, editor changes win.
      await strapi.documents(uid).update({
        documentId: existing.documentId,
        data: { disciplines: disciplineIds },
      });
      await strapi.documents(uid).publish({ documentId: existing.documentId });
      migrated += 1;
    }
  }

  if (created > 0 || migrated > 0) {
    strapi.log.info(
      `[bootstrap] Repertory — created ${created}, migrated disciplines for ${migrated}`
    );
  }
}
