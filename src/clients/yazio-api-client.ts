import type { YazioV20AuthTokenResponse } from '../types.js';
import { loadYazioV20Credentials, type YazioV20Credentials } from '../env.js';

const YAZIO_V20_BASE_URL = 'https://yzapi.yazio.com/v20';
const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};
// Re-authenticate slightly before the token actually expires to avoid races.
const TOKEN_EXPIRY_SKEW_MS = 30_000;

type CredentialsLoader = () => YazioV20Credentials;
type HttpMethod = 'GET' | 'POST' | 'DELETE';
type QueryParams = Record<string, string | undefined>;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Authenticated transport for the Yazio `/v20` API. Owns the OAuth password-grant
 * flow (with token caching) and the JSON request/response plumbing; resource clients
 * depend on this abstraction rather than on `fetch` directly.
 */
export class YazioApiClient {
  private readonly loadCredentials: CredentialsLoader;
  private readonly baseUrl: string;
  private cachedToken: CachedToken | null = null;

  constructor(loadCredentials: CredentialsLoader = loadYazioV20Credentials, baseUrl = YAZIO_V20_BASE_URL) {
    this.loadCredentials = loadCredentials;
    this.baseUrl = baseUrl;
  }

  /** Verifies credentials by acquiring an access token. Used once at startup. */
  async authenticate(): Promise<void> {
    await this.getAccessToken();
  }

  async get<T>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>('GET', buildPath(path, query));
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body);
  }

  private async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${accessToken}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      const errorDetails = formatErrorDetails(responseBody);
      throw new Error(
        `Yazio v20 ${method} ${path} failed: ${response.status} ${response.statusText}${errorDetails}`,
      );
    }

    return responseBody as T;
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.accessToken;
    }

    const credentials = this.loadCredentials();
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        client_id: credentials.mobileClientId,
        client_secret: credentials.mobileClientSecret,
        username: credentials.username,
        password: credentials.password,
        grant_type: 'password',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to authenticate with Yazio v20: ${response.status} ${response.statusText}`);
    }

    const auth = (await response.json()) as YazioV20AuthTokenResponse;

    if (!auth.access_token) {
      throw new Error('Failed to authenticate with Yazio v20: missing access token in response');
    }

    const lifetimeMs = (auth.expires_in ?? 0) * 1000;
    this.cachedToken = {
      accessToken: auth.access_token,
      expiresAt: Date.now() + Math.max(0, lifetimeMs - TOKEN_EXPIRY_SKEW_MS),
    };

    return auth.access_token;
  }
}

function buildPath(path: string, query?: QueryParams): string {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

function formatErrorDetails(responseBody: unknown): string {
  if (!responseBody) {
    return '';
  }

  const detailText = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);

  return detailText ? ` - ${detailText}` : '';
}
