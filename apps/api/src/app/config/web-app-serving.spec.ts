import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyWebAppServing } from './web-app-serving';

const ASSET_LINKS =
  '[{"relation":["delegate_permission/common.handle_all_urls"]}]';
const PRIVATE_CONTENT = 'private-content';
const CLIENT_SHELL = '<html>client shell</html>';
const YEAR_LONG_IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const REVALIDATED_CACHE = 'no-cache';

describe('applyWebAppServing', () => {
  let webDistPath: string;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    webDistPath = mkdtempSync(join(tmpdir(), 'web-dist-'));
    mkdirSync(join(webDistPath, '.well-known'));
    writeFileSync(
      join(webDistPath, '.well-known', 'assetlinks.json'),
      ASSET_LINKS,
    );
    writeFileSync(join(webDistPath, '.well-known', '.hidden'), PRIVATE_CONTENT);
    writeFileSync(join(webDistPath, '.env'), PRIVATE_CONTENT);
    writeFileSync(join(webDistPath, 'manifest.webmanifest'), '{}');
    writeFileSync(join(webDistPath, 'index.csr.html'), CLIENT_SHELL);
    writeFileSync(join(webDistPath, 'chunk-2JTO4QAI.js'), '');
    writeFileSync(join(webDistPath, 'badge-ferroviaire.svg'), '<svg></svg>');
    const app = express();
    applyWebAppServing(app, webDistPath);
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
    rmSync(webDistPath, { recursive: true, force: true });
  });

  it('redirects the retired account deletion page to its section of the terms of use', async () => {
    for (const path of ['/suppression-du-compte', '/suppression-du-compte/']) {
      const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });

      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe(
        '/cgu#suppression-du-compte',
      );
    }
  });

  it('serves the digital asset links of the Android app as JSON', async () => {
    const response = await fetch(`${baseUrl}/.well-known/assetlinks.json`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.text()).toBe(ASSET_LINKS);
  });

  it('serves the web manifest with its media type', async () => {
    const response = await fetch(`${baseUrl}/manifest.webmanifest`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain(
      'application/manifest+json',
    );
  });

  it('keeps every other dotfile private', async () => {
    const hidden = await fetch(`${baseUrl}/.well-known/.hidden`);
    const environment = await fetch(`${baseUrl}/.env`);

    expect(await hidden.text()).not.toContain(PRIVATE_CONTENT);
    expect(await environment.text()).not.toContain(PRIVATE_CONTENT);
  });

  it('caches only hashed build files for a year and revalidates named public files', async () => {
    const hashedChunk = await fetch(`${baseUrl}/chunk-2JTO4QAI.js`);
    const namedPublicFile = await fetch(`${baseUrl}/badge-ferroviaire.svg`);

    expect(hashedChunk.headers.get('cache-control')).toBe(
      YEAR_LONG_IMMUTABLE_CACHE,
    );
    expect(namedPublicFile.headers.get('cache-control')).toBe(
      REVALIDATED_CACHE,
    );
  });

  it('still answers application routes with the client shell', async () => {
    const response = await fetch(`${baseUrl}/dashboard`);

    expect(await response.text()).toBe(CLIENT_SHELL);
  });
});
