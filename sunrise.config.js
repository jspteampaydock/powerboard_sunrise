const getEnv = (env) => {
  return typeof global?.Cypress?.env === 'function'
      ? global.Cypress.env(env)
      : process.env[env];
};
let localConfig = {};
if (getEnv('VUE_APP_LOCAL_SUNRISE_CONFIG')) {
  localConfig = require(process.env
      .VUE_APP_LOCAL_SUNRISE_CONFIG).default;
}
const config = {
  ct: {
    auth: {
      host: 'https://auth.europe-west1.gcp.commercetools.com',
      projectKey: 'dev-powerboard',
      credentials: {
        clientId: 'q8PSVqFt1QCSwom_cXcR2Afz',
        clientSecret: 'wqnry5_uTd_YJpktxeW6LC6Sb5YhvZx3',
      },
      scope: 'create_anonymous_token:dev-powerboard manage_approval_rules:dev-powerboard manage_order_edits:dev-powerboard manage_product_selections:dev-powerboard manage_customer_groups:dev-powerboard manage_project:dev-powerboard view_products:dev-powerboard manage_my_profile:dev-powerboard manage_products:dev-powerboard manage_import_containers:dev-powerboard manage_customers:dev-powerboard manage_payments:dev-powerboard manage_orders:dev-powerboard manage_api_clients:dev-powerboard manage_my_quotes:dev-powerboard manage_associate_roles:dev-powerboard manage_my_shopping_lists:dev-powerboard view_audit_log:dev-powerboard manage_connectors:dev-powerboard manage_my_quote_requests:dev-powerboard view_quote_requests:dev-powerboard introspect_oauth_tokens:dev-powerboard manage_discount_codes:dev-powerboard manage_cart_discounts:dev-powerboard manage_audit_log:dev-powerboard manage_my_payments:dev-powerboard manage_sessions:dev-powerboard manage_business_units:dev-powerboard manage_my_business_units:dev-powerboard manage_approval_flows:dev-powerboard manage_attribute_groups:dev-powerboard manage_connectors_deployments:dev-powerboard manage_categories:dev-powerboard view_categories:dev-powerboard view_project_settings:dev-powerboard view_api_clients:dev-powerboard view_messages:dev-powerboard manage_my_orders:dev-powerboard manage_extensions:dev-powerboard manage_checkout_payment_intents:dev-powerboard view_sessions:dev-powerboard'
    },
    api:
        'https://api.europe-west1.gcp.commercetools.com',
  },
  languages: {
    'DE-DE': 'Deutsch'
  },
  countries: {
    US: 'United States',
  },
  formats: {
    number: {
      US: {
        currency: {
          style: 'currency',
          currency: 'AUD',
        },
      },
    },
    datetime: {
      US: {
        short: {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        },
      },
    },
  },
  categories: {
    salesExternalId: '6',
  },
  facetSearches: [
    {
      name: 'size',
      type: 'text',
      label: {
        it: 'Size',
        de: 'Größe',
        en: 'Size',
      },
    },
    {
      name: 'color',
      type: 'lnum',
      component: 'colors',
      label: {
        de: 'Farbe',
        it: 'Color',
        en: 'Color',
      },
    },
    {
      name: 'designer',
      type: 'enum',
      component: 'designer',
      label: {
        it: 'Designer',
        de: 'Designer',
        en: 'Designer',
      },
    },
  ],
  detailAttributes: [
    {
      name: 'designer',
      label: {
        it: 'Designer',
        de: 'Designer',
        en: 'Designer',
      },
    },
    {
      name: 'colorFreeDefinition',
      label: {
        it: 'Color',
        de: 'Farbe',
        en: 'Color',
      },
    },
    {
      name: 'size',
      label: {
        it: 'Size',
        de: 'Grösse',
        en: 'Size',
      },
    },
    {
      name: 'style',
      label: {
        it: 'Style',
        de: 'Stil',
        en: 'Style',
      },
    },
    {
      name: 'gender',
      label: {
        it: 'Gender',
        de: 'Zielgruppe',
        en: 'Gender',
      },
    },
    {
      name: 'articleNumberManufacturer',
      label: {
        it: 'Manufacturer AID',
        de: 'Herstellernummer',
        en: 'Manufacturer AID',
      },
    },
  ],
  variantSelector: ['color', 'size'],
  variantInProductName: ['size'],
  ...localConfig,
};
// eslint-disable-next-line no-console
export default config;
