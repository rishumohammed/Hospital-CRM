// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/i18n',
  ],

  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', name: 'English', file: 'en.json' },
      { code: 'ml', iso: 'ml-IN', name: 'മലയാളം', file: 'ml.json' },
    ],
    defaultLocale: 'en',
    langDir: 'locales/',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1',
    },
  },

  app: {
    head: {
      title: 'Hospital CRM - Telecalling Module',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0f766e' },
        { name: 'description', content: 'In-house Hospital CRM Telecalling Module' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  ssr: false, // SPA / PWA mode for optimal interactive telecaller responsiveness
});
