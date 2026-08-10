import { Route } from '@angular/router';
import { RouteSeo, SITE_NAME } from '../../core/seo/route-seo';
import { LEGAL_DOCUMENTS } from '../data/legal-documents';

export const legalRoutes: Route[] = LEGAL_DOCUMENTS.map((document) => {
  const seo: RouteSeo = {
    title: `${document.title} | ${SITE_NAME}`,
    description: document.metaDescription,
  };
  return {
    path: document.path.replace('/', ''),
    loadComponent: () =>
      import('./legal-page/legal-page').then((m) => m.LegalPage),
    data: { documentId: document.id, seo },
  };
});
