import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LEGAL_LAST_UPDATED } from '@psychotech/shared';
import {
  LEGAL_DOCUMENTS,
  LegalDocumentId,
  legalDocumentById,
  legalDocumentHasTodo,
} from '../../data/legal-documents';
import { LegalDocumentView } from '../../ui/legal-document/legal-document';

@Component({
  selector: 'app-legal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LegalDocumentView, RouterLink],
  templateUrl: './legal-page.html',
  styleUrls: ['../../../landing/landing-theme.css', './legal-page.css'],
})
export class LegalPage {
  private readonly route = inject(ActivatedRoute);

  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });

  protected readonly documents = LEGAL_DOCUMENTS;
  protected readonly lastUpdated = LEGAL_LAST_UPDATED;

  protected readonly document = computed(() =>
    legalDocumentById(this.routeData()['documentId'] as LegalDocumentId),
  );

  protected readonly showTodoNotice = computed(() =>
    legalDocumentHasTodo(this.document()),
  );
}
