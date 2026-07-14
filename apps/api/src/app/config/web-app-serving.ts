import { existsSync } from 'node:fs';
import { ServerResponse } from 'node:http';
import { join } from 'node:path';
import { DynamicModule } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

const WEB_DIST_PATH = join(__dirname, '..', 'web', 'browser');
const HASHED_ASSET_FILENAME = /-[A-Z0-9]{8,}\.[a-z0-9]+$/i;
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function setWebAppCacheHeaders(
  response: ServerResponse,
  filePath: string,
): void {
  if (filePath.endsWith('index.html')) {
    response.setHeader('Cache-Control', 'no-store');
    return;
  }
  response.setHeader(
    'Cache-Control',
    HASHED_ASSET_FILENAME.test(filePath) ? IMMUTABLE_CACHE_CONTROL : 'no-cache',
  );
}

export function webAppServingImports(): DynamicModule[] {
  if (!existsSync(WEB_DIST_PATH)) {
    return [];
  }
  return [
    ServeStaticModule.forRoot({
      rootPath: WEB_DIST_PATH,
      exclude: ['/api/{*splat}'],
      serveStaticOptions: { setHeaders: setWebAppCacheHeaders },
    }),
  ];
}
