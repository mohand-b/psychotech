import { Route } from '@angular/router';

export const subscriptionsRoutes: Route[] = [
  {
    path: 'abonnements',
    loadComponent: () => import('./offers/offers').then((m) => m.Offers),
  },
  {
    path: 'abonnement-confirme',
    loadComponent: () =>
      import('./confirmation/confirmation').then(
        (m) => m.SubscriptionConfirmation,
      ),
  },
  {
    path: 'paiement/carte',
    loadComponent: () =>
      import('./payment-method/payment-method').then((m) => m.PaymentMethod),
    data: {
      focusedHeader: {
        title: 'Moyen de paiement',
        backLabel: 'Retour aux offres',
        backLink: '/abonnements',
        mobileTitle: true,
        showEnergy: false,
        showTimer: false,
      },
    },
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
