import { Route } from '@angular/router';
import { LEGAL_DOCUMENTS } from '../data/legal-documents';

export const legalRoutes: Route[] = LEGAL_DOCUMENTS.map((document) => ({
  path: document.path.replace('/', ''),
  loadComponent: () =>
    import('./legal-page/legal-page').then((m) => m.LegalPage),
  data: { documentId: document.id },
}));
