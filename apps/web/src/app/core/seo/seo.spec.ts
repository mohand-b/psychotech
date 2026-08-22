import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { LANDING_SEO } from '../../landing/feature/landing.routes';
import { CANONICAL_ORIGIN, SITE_NAME } from './route-seo';
import { Seo } from './seo';

@Component({ template: '' })
class HostStub {}

function jsonLdNodes(): HTMLScriptElement[] {
  return Array.from(
    document.head.querySelectorAll<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    ),
  );
}

async function applyLanding(): Promise<void> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: '', component: HostStub, data: { seo: LANDING_SEO } },
      ]),
    ],
  });
  await TestBed.inject(Router).navigate(['/']);
  TestBed.inject(Seo).start();
}

beforeEach(() => {
  TestBed.resetTestingModule();
  document.head
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((node) => node.remove());
});

describe('Seo structured data', () => {
  it('injects every landing entry as strictly parsable JSON', async () => {
    await applyLanding();

    const nodes = jsonLdNodes();
    expect(nodes.length).toBe(LANDING_SEO.structuredData?.length);
    for (const node of nodes) {
      const raw = node.textContent ?? '';
      expect(() => JSON.parse(raw)).not.toThrow();
      expect(JSON.parse(raw)['@context']).toBe('https://schema.org');
    }
  });

  it('names the site so search engines stop falling back to the bare domain', async () => {
    await applyLanding();

    const website = jsonLdNodes()
      .map((node) => JSON.parse(node.textContent ?? '{}'))
      .find((entry) => entry['@type'] === 'WebSite');

    expect(website).toBeDefined();
    expect(website.name).toBe(SITE_NAME);
    expect(website.url).toBe(`${CANONICAL_ORIGIN}/`);
    expect(website.alternateName).toContain(SITE_NAME.replace(/\s/g, ''));
  });

  it('never offers the bare domain as an alternate name, which would license search engines to keep showing it', async () => {
    await applyLanding();

    const website = jsonLdNodes()
      .map((node) => JSON.parse(node.textContent ?? '{}'))
      .find((entry) => entry['@type'] === 'WebSite');

    expect(website.alternateName).not.toContain(
      new URL(CANONICAL_ORIGIN).hostname,
    );
  });

  it('keeps a single WebSite node so the home never declares two identities', async () => {
    await applyLanding();

    const websites = jsonLdNodes()
      .map((node) => JSON.parse(node.textContent ?? '{}'))
      .filter((entry) => entry['@type'] === 'WebSite');

    expect(websites).toHaveLength(1);
  });
});

describe('Seo home metadata', () => {
  it('keeps the home title short enough to survive the search results', async () => {
    await applyLanding();

    expect(document.title).toBe(LANDING_SEO.title);
    expect(LANDING_SEO.title.length).toBeLessThanOrEqual(60);
    expect(LANDING_SEO.title).not.toContain(SITE_NAME);
  });

  it('keeps the description within what search results display', () => {
    expect(LANDING_SEO.description.length).toBeLessThanOrEqual(155);
  });

  it('states the site name for social cards', async () => {
    await applyLanding();

    const tag = document.head.querySelector<HTMLMetaElement>(
      'meta[property="og:site_name"]',
    );
    expect(tag?.content).toBe(SITE_NAME);
  });
});
