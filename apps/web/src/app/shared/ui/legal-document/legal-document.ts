import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalDocument } from '../../data/legal-documents';

@Component({
  selector: 'ui-legal-document',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './legal-document.html',
  styleUrl: './legal-document.css',
})
export class LegalDocumentView {
  readonly document = input.required<LegalDocument>();

  protected sectionNumber(index: number): string {
    return String(index + 1).padStart(2, '0');
  }
}
