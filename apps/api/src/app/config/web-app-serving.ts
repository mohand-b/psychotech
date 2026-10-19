import { existsSync } from 'node:fs';
import { ServerResponse } from 'node:http';
import { join } from 'node:path';
import {
  NextFunction,
  Request,
  Response,
  static as serveStatic,
} from 'express';
import { HttpStatus } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  LEGAL_ACCOUNT_DELETION_ANCHOR,
  LEGAL_RETIRED_ACCOUNT_DELETION_PATH,
  LEGAL_TERMS_OF_USE_PATH,
} from '@psychotech/shared';

const WEB_DIST_PATH = join(__dirname, '..', 'web', 'browser');
const HASHED_ASSET_FILENAME = /-[A-Z0-9]{8}\.[a-z0-9]+$/;
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const API_PREFIX = '/api';
const WELL_KNOWN_DIRECTORY = '.well-known';
const SAFE_ROUTE_PATH = /^\/[a-z0-9/-]*$/;
const TRAILING_SLASHES = /\/+$/;
const RETIRED_PAGE_REDIRECTS: Readonly<Record<string, string>> = {
  [LEGAL_RETIRED_ACCOUNT_DELETION_PATH]: `${LEGAL_TERMS_OF_USE_PATH}#${LEGAL_ACCOUNT_DELETION_ANCHOR}`,
};

function isPageRequest(request: Request): boolean {
  return request.method === 'GET' || request.method === 'HEAD';
}

function redirectRetiredPages(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const target =
    RETIRED_PAGE_REDIRECTS[request.path.replace(TRAILING_SLASHES, '')];
  if (!target || !isPageRequest(request)) {
    next();
    return;
  }
  response.redirect(HttpStatus.MOVED_PERMANENTLY, target);
}

function setWebAppCacheHeaders(
  response: ServerResponse,
  filePath: string,
): void {
  if (filePath.endsWith('.html')) {
    response.setHeader('Cache-Control', 'no-store');
    return;
  }
  response.setHeader(
    'Cache-Control',
    HASHED_ASSET_FILENAME.test(filePath) ? IMMUTABLE_CACHE_CONTROL : 'no-cache',
  );
}

function htmlFileFor(webDistPath: string, routePath: string): string | null {
  if (!SAFE_ROUTE_PATH.test(routePath)) {
    return null;
  }
  const normalized = routePath.replace(TRAILING_SLASHES, '');
  const prerendered = join(webDistPath, normalized, 'index.html');
  if (existsSync(prerendered)) {
    return prerendered;
  }
  const csrShell = join(webDistPath, 'index.csr.html');
  if (existsSync(csrShell)) {
    return csrShell;
  }
  const shell = join(webDistPath, 'index.html');
  return existsSync(shell) ? shell : null;
}

export function applyWebAppServing(
  app: Pick<NestExpressApplication, 'use'>,
  webDistPath: string = WEB_DIST_PATH,
): void {
  if (!existsSync(webDistPath)) {
    return;
  }
  app.use(redirectRetiredPages);
  app.use(
    `/${WELL_KNOWN_DIRECTORY}`,
    serveStatic(join(webDistPath, WELL_KNOWN_DIRECTORY), {
      index: false,
      redirect: false,
      setHeaders: setWebAppCacheHeaders,
    }),
  );
  app.use(
    serveStatic(webDistPath, {
      index: false,
      redirect: false,
      setHeaders: setWebAppCacheHeaders,
    }),
  );
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (!isPageRequest(request) || request.path.startsWith(API_PREFIX)) {
      next();
      return;
    }
    const htmlFile = htmlFileFor(webDistPath, request.path);
    if (!htmlFile) {
      next();
      return;
    }
    response.setHeader('Cache-Control', 'no-store');
    response.sendFile(htmlFile);
  });
}
