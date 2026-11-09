/**
 * GODSHOP Application Route Definitions
 * Centralizes route paths for typed navigation across web and Android.
 */
export const ROUTES = {
  DASHBOARD: '/',
  LOGIN: '/login',
  PRODUCTS: '/products',
  SALES: '/sales',
  CONSOLES: '/consoles',
  GIFTS_ACCESSORIES: '/gifts-accessories',
  INVOICES: '/invoices',
  CLIENTS: '/clients',
  SUPPLIERS: '/suppliers',
  GUARANTEE_NOTE: '/guarantee-note',
  PRICE_TABLE: '/price-table',
  SETTINGS: '/settings',
  USERS: '/users',
  NOTES: '/notes',
  FISCAL_HUB: '/fiscal',
  CLIENT_SIGNATURE: '/assinar/:saleId',
  CLIENT_REMOTE_REGISTER: '/cadastro-cliente',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
