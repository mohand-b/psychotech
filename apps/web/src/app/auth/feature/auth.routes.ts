import { Route } from '@angular/router';
import { RouteSeo } from '../../core/seo/route-seo';
import { authGuard, guestGuard } from '../data-access/auth.guard';

const LOGIN_SEO: RouteSeo = {
  title: 'Connexion à votre espace | PsychoTech Training',
  description:
    'Connectez-vous à votre espace PsychoTech Training pour reprendre votre entraînement aux épreuves psychotechniques des sélections ferroviaires.',
};

const REGISTER_SEO: RouteSeo = {
  title: 'Créer un compte gratuit | PsychoTech Training',
  description:
    "Créez votre compte gratuitement : mode découverte des 5 épreuves psychotechniques ferroviaires en accès libre et 3 crédits offerts à l'inscription.",
};

export const authRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        canMatch: [guestGuard],
        loadComponent: () => import('./login/login').then((m) => m.Login),
        data: { seo: LOGIN_SEO },
      },
      {
        path: 'register',
        canMatch: [guestGuard],
        loadComponent: () =>
          import('./register/register').then((m) => m.Register),
        data: { seo: REGISTER_SEO },
      },
      {
        path: 'verification',
        loadComponent: () =>
          import('./verification/verification').then((m) => m.Verification),
      },
      {
        path: 'verification-changement',
        loadComponent: () =>
          import('./email-change/email-change').then((m) => m.EmailChange),
      },
      {
        path: 'verification-email',
        canMatch: [authGuard],
        loadComponent: () =>
          import('./verification-pending/verification-pending').then(
            (m) => m.VerificationPending,
          ),
      },
    ],
  },
];
