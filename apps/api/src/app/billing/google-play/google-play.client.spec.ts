import { generateKeyPairSync } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GooglePlayConfig } from '../../config/google-play.config';
import {
  GooglePlayClient,
  GooglePlayNotConfiguredError,
  GooglePlayRequestError,
} from './google-play.client';

const PACKAGE_NAME = 'com.example.app';
const PURCHASE_URL =
  'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.example.app/purchases/products/pack_discovery/tokens/token-1';

function buildClient(configured: boolean): GooglePlayClient {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const config: GooglePlayConfig = {
    packageName: PACKAGE_NAME,
    serviceAccount: configured
      ? {
          clientEmail: 'billing@example.iam.gserviceaccount.com',
          privateKey: privateKey
            .export({ type: 'pkcs8', format: 'pem' })
            .toString(),
        }
      : null,
  };
  return new GooglePlayClient({
    getOrThrow: () => config,
  } as unknown as ConfigService);
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GooglePlayClient', () => {
  it('signs in with the service account once and reuses the access token', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === 'https://oauth2.googleapis.com/token'
          ? jsonResponse({ access_token: 'access-1', expires_in: 3600 })
          : jsonResponse({ purchaseState: 0, consumptionState: 0 }),
      ),
    );
    const client = buildClient(true);

    await client.fetchProductPurchase('pack_discovery', 'token-1');
    const purchase = await client.fetchProductPurchase(
      'pack_discovery',
      'token-1',
    );

    expect(purchase).toEqual({ purchaseState: 0, consumptionState: 0 });
    const tokenRequests = fetchMock.mock.calls.filter(
      ([url]) => url === 'https://oauth2.googleapis.com/token',
    );
    expect(tokenRequests).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(PURCHASE_URL, {
      headers: { Authorization: 'Bearer access-1' },
    });
  });

  it('consumes a purchase with a POST on the consume action', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === 'https://oauth2.googleapis.com/token'
          ? jsonResponse({ access_token: 'access-1', expires_in: 3600 })
          : new Response('', { status: 200 }),
      ),
    );
    const client = buildClient(true);

    await client.consumeProductPurchase('pack_discovery', 'token-1');

    expect(fetchMock).toHaveBeenCalledWith(`${PURCHASE_URL}:consume`, {
      method: 'POST',
      headers: { Authorization: 'Bearer access-1' },
    });
  });

  it('follows every page of voided purchases', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === 'https://oauth2.googleapis.com/token') {
        return Promise.resolve(
          jsonResponse({ access_token: 'access-1', expires_in: 3600 }),
        );
      }
      return Promise.resolve(
        url.includes('token=page-2')
          ? jsonResponse({
              voidedPurchases: [
                { purchaseToken: 'token-2', voidedTimeMillis: '2' },
              ],
            })
          : jsonResponse({
              voidedPurchases: [
                { purchaseToken: 'token-1', voidedTimeMillis: '1' },
              ],
              tokenPagination: { nextPageToken: 'page-2' },
            }),
      );
    });
    const client = buildClient(true);

    const voided = await client.listVoidedPurchases();

    expect(voided.map((purchase) => purchase.purchaseToken)).toEqual([
      'token-1',
      'token-2',
    ]);
  });

  it('reports the HTTP status of a failed Google Play request', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === 'https://oauth2.googleapis.com/token'
          ? jsonResponse({ access_token: 'access-1', expires_in: 3600 })
          : jsonResponse({ error: 'not found' }, 404),
      ),
    );
    const client = buildClient(true);

    await expect(
      client.fetchProductPurchase('pack_discovery', 'token-1'),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      client.fetchProductPurchase('pack_discovery', 'token-1'),
    ).rejects.toBeInstanceOf(GooglePlayRequestError);
  });

  it('refuses to call Google Play without a service account', async () => {
    const client = buildClient(false);

    expect(client.isConfigured()).toBe(false);
    await expect(
      client.fetchProductPurchase('pack_discovery', 'token-1'),
    ).rejects.toBeInstanceOf(GooglePlayNotConfiguredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
