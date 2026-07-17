import { Route } from '@angular/router';

export const subscriptionsRoutes: Route[] = [
  {
    path: 'abonnements',
    loadComponent: () => import('./offers/offers').then((m) => m.Offers),
  },
  {
    path: 'paiement/:plan',
    loadComponent: () => import('./payment/payment').then((m) => m.Payment),
    data: {
      focusedHeader: {
        title: 'Paiement',
        backLabel: 'Retour aux offres',
        backLink: '/abonnements',
        mobileTitle: true,
        showEnergy: false,
        showTimer: false,
      },
    },
  },
  {
    path: 'offres',
    redirectTo: 'abonnements',
  },
];
