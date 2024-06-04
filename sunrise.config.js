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
      projectKey: 'paydockecomm',
      credentials: {
        clientId: 'uKgzoXpkdctZy13P8rMeCs7x',
        clientSecret: 'AmKsSTMvK85LbS51kkb07ZzIy5NcrrQb',
      },
      scope: 'manage_my_orders:paydockecomm create_anonymous_token:paydockecomm manage_my_shopping_lists:paydockecomm manage_customer_groups:paydockecomm view_products:paydockecomm manage_my_quotes:paydockecomm manage_connectors_deployments:paydockecomm manage_sessions:paydockecomm manage_my_quote_requests:paydockecomm manage_my_orders:paydockecomm:paydockecomm manage_discount_codes:paydockecomm manage_extensions:paydockecomm manage_orders:paydockecomm:paydockecomm manage_cart_discounts:paydockecomm:paydockecomm view_api_clients:paydockecomm manage_customers:paydockecomm:paydockecomm view_categories:paydockecomm manage_my_profile:paydockecomm:paydockecomm manage_cart_discounts:paydockecomm manage_my_business_units:paydockecomm view_published_products:paydockecomm manage_payments:paydockecomm manage_business_units:paydockecomm manage_shopping_lists:paydockecomm:paydockecomm manage_my_profile:paydockecomm manage_my_payments:paydockecomm manage_my_shopping_lists:paydockecomm:paydockecomm manage_attribute_groups:paydockecomm view_messages:paydockecomm manage_orders:paydockecomm manage_categories:paydockecomm manage_project:paydockecomm manage_order_edits:paydockecomm manage_api_clients:paydockecomm manage_customers:paydockecomm manage_checkout_payment_intents:paydockecomm manage_audit_log:paydockecomm manage_connectors:paydockecomm manage_associate_roles:paydockecomm manage_import_containers:paydockecomm manage_product_selections:paydockecomm view_product_selections:paydockecomm'
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
