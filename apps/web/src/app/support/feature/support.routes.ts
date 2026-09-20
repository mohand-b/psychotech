import { Route } from '@angular/router';
import { RouteSeo, SITE_NAME } from '../../core/seo/route-seo';

const CONTACT_SEO: RouteSeo = {
  title: `Contact | ${SITE_NAME}`,
  description:
    'Une question, une suggestion ou un problème sur PsychoTech Training ? Écrivez-nous, avec ou sans compte : nous répondons par email.',
};

export const supportRoutes: Route[] = [
  {
    path: 'contact',
    loadComponent: () => import('./contact/contact').then((m) => m.Contact),
    data: { seo: CONTACT_SEO },
  },
];
