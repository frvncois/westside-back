/**
 * Mux routes. All are `auth: false`: the webhook cannot carry a Strapi token, and the operational
 * endpoints are gated on the MUX_ADMIN_SECRET header inside the controller instead.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/mux/webhook',
      handler: 'mux.webhook',
      config: { auth: false },
    },
    {
      // The path registered in the Mux dashboard before this integration existed. Kept as an alias
      // so the dashboard needs no edit; /mux/webhook is the canonical one.
      method: 'POST',
      path: '/mux-video-uploader/webhook-handler',
      handler: 'mux.webhook',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/mux/status',
      handler: 'mux.status',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/mux/migrate',
      handler: 'mux.migrate',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/mux/reconcile',
      handler: 'mux.reconcile',
      config: { auth: false },
    },
  ],
};
