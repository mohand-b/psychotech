import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import {
  APP_FALLBACK_SEO,
  CANONICAL_ORIGIN,
  OG_IMAGE_PATH,
  RouteSeo,
  SITE_NAME,
} from './route-seo';

const JSONLD_MARKER = 'data-seo-jsonld';
const FONT_PRELOAD_MARKER = 'data-seo-font';

@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  start(): void {
    this.applyCurrentRoute();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.applyCurrentRoute());
  }

  private applyCurrentRoute(): void {
    let route: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const seo = route.data['seo'] as RouteSeo | undefined;
    this.apply(seo ?? APP_FALLBACK_SEO, seo !== undefined);
  }

  private apply(seo: RouteSeo, indexable: boolean): void {
    const canonicalUrl = this.canonicalUrl();
    this.titleService.setTitle(seo.title);
    this.meta.updateTag({ name: 'description', content: seo.description });
    this.meta.updateTag({
      name: 'robots',
      content: indexable ? 'index, follow' : 'noindex, nofollow',
    });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:locale', content: 'fr_FR' });
    this.meta.updateTag({ property: 'og:title', content: seo.title });
    this.meta.updateTag({
      property: 'og:description',
      content: seo.description,
    });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({
      property: 'og:image',
      content: `${CANONICAL_ORIGIN}${OG_IMAGE_PATH}`,
    });
    this.meta.updateTag({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    this.meta.updateTag({ name: 'twitter:title', content: seo.title });
    this.meta.updateTag({
      name: 'twitter:description',
      content: seo.description,
    });
    this.meta.updateTag({
      name: 'twitter:image',
      content: `${CANONICAL_ORIGIN}${OG_IMAGE_PATH}`,
    });
    this.setCanonical(indexable ? canonicalUrl : null);
    this.setStructuredData(seo.structuredData ?? []);
    this.setFontPreloads(seo.preloadFonts ?? []);
  }

  private canonicalUrl(): string {
    const path = this.router.url.split('?')[0].split('#')[0];
    return path === '/'
      ? `${CANONICAL_ORIGIN}/`
      : `${CANONICAL_ORIGIN}${path.replace(/\/+$/, '')}`;
  }

  private setCanonical(url: string | null): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (url === null) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setFontPreloads(paths: string[]): void {
    const head = this.document.head;
    head
      .querySelectorAll(`link[${FONT_PRELOAD_MARKER}]`)
      .forEach((node) => node.remove());
    for (const path of paths) {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'preload');
      link.setAttribute('as', 'font');
      link.setAttribute('type', 'font/woff2');
      link.setAttribute('crossorigin', 'anonymous');
      link.setAttribute('href', path);
      link.setAttribute(FONT_PRELOAD_MARKER, '');
      head.appendChild(link);
    }
  }

  private setStructuredData(entries: object[]): void {
    const head = this.document.head;
    head
      .querySelectorAll(`script[${JSONLD_MARKER}]`)
      .forEach((node) => node.remove());
    for (const entry of entries) {
      const script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute(JSONLD_MARKER, '');
      script.textContent = JSON.stringify(entry);
      head.appendChild(script);
    }
  }
}
