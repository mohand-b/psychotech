import { describe, expect, it } from 'vitest';
import { SITE_NAME } from '../../core/seo/route-seo';
import { LEGAL_DOCUMENTS, LegalDocument, LegalRun } from './legal-documents';

function firstParagraphRuns(document: LegalDocument): readonly LegalRun[] {
  const block = document.sections[0]?.blocks.find(
    (candidate) => candidate.kind === 'text',
  );
  return block?.kind === 'text' ? block.runs : [];
}

describe('LEGAL_DOCUMENTS internal linking', () => {
  it.each(LEGAL_DOCUMENTS.map((document) => [document.id, document] as const))(
    'anchors %s to the home on the site name',
    (_id, document) => {
      const link = firstParagraphRuns(document).find((run) => run.href === '/');

      expect(link).toBeDefined();
      expect(link?.text).toBe(SITE_NAME);
    },
  );

  it.each(LEGAL_DOCUMENTS.map((document) => [document.id, document] as const))(
    'keeps a single home link in the opening paragraph of %s',
    (_id, document) => {
      const homeLinks = firstParagraphRuns(document).filter(
        (run) => run.href === '/',
      );

      expect(homeLinks).toHaveLength(1);
    },
  );

  it('never names an employer in a legal document', () => {
    const wholeCorpus = JSON.stringify(LEGAL_DOCUMENTS);

    expect(wholeCorpus).not.toMatch(/\bSNCF\b/i);
    expect(wholeCorpus).not.toMatch(/\bRATP\b/i);
  });
});
