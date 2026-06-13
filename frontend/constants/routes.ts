export const Routes = {
  auth: {
    welcome: '/(auth)',
  },
  protected: {
    dashboard: '/(protected)',
  },
  modals: {
    settings: '/(modals)/settings',
  },
  root: '/',
} as const;

export type AppRoutes = typeof Routes;
export default Routes;
