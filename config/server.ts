import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Behind nginx: PUBLIC_URL is the browser-facing origin (admin assets, media URLs,
  // password-reset links), and `proxy` makes Koa trust X-Forwarded-Proto so Strapi knows
  // the request arrived over TLS. Both are no-ops locally, where neither env var is set.
  url: env('PUBLIC_URL', undefined),
  proxy: env.bool('IS_PROXIED', false),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
