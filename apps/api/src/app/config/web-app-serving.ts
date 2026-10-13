import { existsSync } from 'node:fs';
import { ServerResponse } from 'node:http';
import { join } from 'node:path';
import {
  NextFunction,
  Request,
  Response,
  static as serveStatic,
} from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';

const WEB_DIST_PATH = join(__dirname, '..', 'web', 'browser');
const HASHED_ASSET_FILENAME = /-[A-Z0-9]{8}\.[a-z0-9]+$/;
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const API_PREFIX = '/api';
const WELL_KNOWN_DIRECTORY = '.well-known';
const SAFE_ROUTE_PATH = /^\/[a-z0-9/-]*$/;

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
  const normalized = routePath.replace(/\/+$/, '');
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
    if (
      (request.method !== 'GET' && request.method !== 'HEAD') ||
      request.path.startsWith(API_PREFIX)
    ) {
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
