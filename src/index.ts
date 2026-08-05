import type { Core } from '@strapi/strapi';

// Fixed gallery taxonomy — seeded on first boot so editors don't have to
// recreate it by hand. Edit/extend the list in the admin panel afterwards.
const CATEGORIES = [
  'Beauty',
  'Automotive',
  'Product & Still life',
  'Lifestyle',
  'Comedy',
  'Sports',
  'Entertainment',
  'Fashion',
  'Animals',
  'Kids',
  'VFX',
  'Food & Beverage',
  'Portrait',
  'Real People',
  'Travel',
];

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Seed the Category taxonomy only when the collection is empty, so this
    // stays idempotent across restarts and never clobbers editor changes.
    const count = await strapi.db.query('api::category.category').count();
    if (count === 0) {
      for (const name of CATEGORIES) {
        await strapi.documents('api::category.category').create({ data: { name } });
      }
      strapi.log.info(`[bootstrap] Seeded ${CATEGORIES.length} categories`);
    }
  },
};
