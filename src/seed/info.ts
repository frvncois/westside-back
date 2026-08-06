import type { Core } from '@strapi/strapi';

/**
 * Team members for the Info single type's repeatable `team` component
 * (info.team-member: name / title / email / phone).
 *
 * Idempotent by email: existing members are kept, and only members whose email
 * isn't already present get appended. Only the `team` field is touched, so any
 * other Info content (intro, office, links, image) is left untouched.
 */

type SeedTeamMember = { name: string; title: string; email: string; phone: string };

const INFO_TEAM: SeedTeamMember[] = [
  {
    name: 'Jonathan Lajoie',
    title: 'Executive Producer',
    email: 'jonathan@westsidestudio.com',
    phone: '+1 416 457 7551',
  },
  {
    name: 'Jill Heintzman',
    title: 'Executive Producer',
    email: 'jill@westsidestudio.com',
    phone: '+1 647 983 6016',
  },
  {
    name: 'Tom Nesbitt',
    title: 'Partner / Executive Producer',
    email: 'tom@westsidestudio.com',
    phone: '+1 416 272 9166',
  },
  {
    name: 'Meghan Buckley',
    title: 'Head of Production',
    email: 'meghan@westsidestudio.com',
    phone: '+1 416 818 5150',
  },
  {
    name: 'Alex Beetham',
    title: 'Studio Manager',
    email: 'alex@westsidestudio.com',
    phone: '+1 647 328 3145',
  },
];

export async function seedInfoTeam({ strapi }: { strapi: Core.Strapi }) {
  const uid = 'api::info.info' as const;

  const existing = await strapi.documents(uid).findFirst({ populate: { team: true } });
  const currentTeam = (existing?.team ?? []) as any[];
  const currentEmails = new Set(currentTeam.map((m) => m.email));

  const toAdd = INFO_TEAM.filter((m) => !currentEmails.has(m.email));
  if (toAdd.length === 0) return;

  // Preserve existing components (keep their id so they update in place) and
  // append the new members.
  const team = [
    ...currentTeam.map((m) => ({
      id: m.id,
      name: m.name,
      title: m.title,
      email: m.email,
      phone: m.phone,
    })),
    ...toAdd,
  ];

  const doc = existing
    ? await strapi.documents(uid).update({ documentId: existing.documentId, data: { team } })
    : await strapi.documents(uid).create({ data: { team } });

  if (!doc) return;

  // draftAndPublish is on for Info, so publish the change.
  await strapi.documents(uid).publish({ documentId: doc.documentId });
  strapi.log.info(`[bootstrap] Info team — added ${toAdd.length} member(s)`);
}
