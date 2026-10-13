import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, importPKCS8 } from 'jose';
import {
  GooglePlayConfig,
  GooglePlayServiceAccount,
} from '../../config/google-play.config';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANDROID_PUBLISHER_SCOPE =
  'https://www.googleapis.com/auth/androidpublisher';
const ANDROID_PUBLISHER_APPLICATIONS_URL =
  'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const JWT_BEARER_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const SIGNING_ALGORITHM = 'RS256';
const ASSERTION_LIFETIME = '1h';
const ACCESS_TOKEN_RENEWAL_MARGIN_MS = 60_000;
const MILLISECONDS_PER_SECOND = 1000;

export enum GooglePlayPurchaseState {
  PURCHASED = 0,
  CANCELED = 1,
  PENDING = 2,
}

export enum GooglePlayConsumptionState {
  NOT_CONSUMED = 0,
  CONSUMED = 1,
}

export interface GooglePlayProductPurchase {
  purchaseState: GooglePlayPurchaseState;
  consumptionState: GooglePlayConsumptionState;
}

export interface GooglePlayVoidedPurchase {
  purchaseToken: string;
  voidedTimeMillis: string;
}

interface VoidedPurchasesPage {
  voidedPurchases?: GooglePlayVoidedPurchase[];
  tokenPagination?: { nextPageToken?: string };
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
}

interface GoogleAccessToken {
  value: string;
  expiresAt: number;
}

export class GooglePlayRequestError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(`Google Play request failed with status ${status}: ${detail}`);
  }
}

export class GooglePlayNotConfiguredError extends Error {
  constructor() {
    super('Google Play service account is not configured');
  }
}

@Injectable()
export class GooglePlayClient {
  private readonly config: GooglePlayConfig;
  private accessToken: GoogleAccessToken | null = null;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<GooglePlayConfig>('googlePlay');
  }

  isConfigured(): boolean {
    return this.config.serviceAccount !== null;
  }

  fetchProductPurchase(
    productId: string,
    purchaseToken: string,
  ): Promise<GooglePlayProductPurchase> {
    return this.request<GooglePlayProductPurchase>(
      this.productPurchaseUrl(productId, purchaseToken),
    );
  }

  async consumeProductPurchase(
    productId: string,
    purchaseToken: string,
  ): Promise<void> {
    await this.request<unknown>(
      `${this.productPurchaseUrl(productId, purchaseToken)}:consume`,
      { method: 'POST' },
    );
  }

  async listVoidedPurchases(): Promise<GooglePlayVoidedPurchase[]> {
    const voidedPurchases: GooglePlayVoidedPurchase[] = [];
    let pageToken: string | undefined;
    do {
      const pageQuery = pageToken
        ? `?${new URLSearchParams({ token: pageToken }).toString()}`
        : '';
      const page = await this.request<VoidedPurchasesPage>(
        `${this.purchasesUrl()}/voidedpurchases${pageQuery}`,
      );
      voidedPurchases.push(...(page.voidedPurchases ?? []));
      pageToken = page.tokenPagination?.nextPageToken;
    } while (pageToken);
    return voidedPurchases;
  }

  private purchasesUrl(): string {
    return `${ANDROID_PUBLISHER_APPLICATIONS_URL}/${encodeURIComponent(this.config.packageName)}/purchases`;
  }

  private productPurchaseUrl(productId: string, purchaseToken: string): string {
    return `${this.purchasesUrl()}/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const accessToken = await this.resolveAccessToken();
    const response = await fetch(url, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new GooglePlayRequestError(response.status, body);
    }
    return (body ? JSON.parse(body) : {}) as T;
  }

  private async resolveAccessToken(): Promise<string> {
    const serviceAccount = this.config.serviceAccount;
    if (!serviceAccount) {
      throw new GooglePlayNotConfiguredError();
    }
    if (
      this.accessToken &&
      this.accessToken.expiresAt - ACCESS_TOKEN_RENEWAL_MARGIN_MS > Date.now()
    ) {
      return this.accessToken.value;
    }
    this.accessToken = await this.requestAccessToken(serviceAccount);
    return this.accessToken.value;
  }

  private async requestAccessToken(
    serviceAccount: GooglePlayServiceAccount,
  ): Promise<GoogleAccessToken> {
    const signingKey = await importPKCS8(
      serviceAccount.privateKey,
      SIGNING_ALGORITHM,
    );
    const assertion = await new SignJWT({ scope: ANDROID_PUBLISHER_SCOPE })
      .setProtectedHeader({ alg: SIGNING_ALGORITHM, typ: 'JWT' })
      .setIssuer(serviceAccount.clientEmail)
      .setAudience(GOOGLE_OAUTH_TOKEN_URL)
      .setIssuedAt()
      .setExpirationTime(ASSERTION_LIFETIME)
      .sign(signingKey);
    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: JWT_BEARER_GRANT_TYPE,
        assertion,
      }),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new GooglePlayRequestError(response.status, body);
    }
    const token = JSON.parse(body) as GoogleTokenResponse;
    return {
      value: token.access_token,
      expiresAt: Date.now() + token.expires_in * MILLISECONDS_PER_SECOND,
    };
  }
}
