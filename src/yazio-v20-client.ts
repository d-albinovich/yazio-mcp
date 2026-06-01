import { v4 as uuidv4 } from 'uuid';
import type { CreateUserProductInput } from './schemas.js';
import type {
  YazioCreateProductResponse,
  YazioFindProductByBarcodeOptions,
  YazioFindProductByBarcodeResult,
  YazioV20AuthTokenResponse,
  YazioV20Product,
  YazioV20ProductSearchResult,
  YazioV20SearchProductsOptions,
} from './types.js';
import { loadYazioV20Credentials, type YazioV20Credentials } from './env.js';

const YAZIO_V20_BASE_URL = 'https://yzapi.yazio.com/v20';
const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
const DEFAULT_SEARCH_SEX = 'male';
const DEFAULT_SEARCH_COUNTRIES = ['US'];
const DEFAULT_SEARCH_LOCALES = ['en_US'];
const DEFAULT_USER_PRODUCT_SCAN_LIMIT = 500;
const BARCODE_INDEX_LIMITATION = 'Yazio has no public client API that publishes user-created products into the global barcode/search index. Custom products are discoverable through /v20/user/products plus /v20/products/{id} and matching eans[].';

export interface CreateUserProductPayload extends CreateUserProductInput {
  id: string;
  country?: string;
}

export interface CreateUserProductResult {
  createdProductId: string;
  product: YazioCreateProductResponse | CreateUserProductPayload;
  payload: CreateUserProductPayload;
  requestSummary: CreateUserProductRequestSummary;
}

export interface CreateUserProductRequestSummary {
  id: string;
  name: string;
  category: string;
  base_unit: string;
  is_private: boolean;
  producer: string | null;
  ean: string | null;
  country: string | null;
  servings: CreateUserProductInput['servings'];
  nutrients: CreateUserProductInput['nutrients'];
}

type CredentialsLoader = () => YazioV20Credentials;

export class YazioV20Client {
  private readonly loadCredentials: CredentialsLoader;
  private readonly baseUrl: string;

  constructor(
    loadCredentials: CredentialsLoader = loadYazioV20Credentials,
    baseUrl = YAZIO_V20_BASE_URL,
  ) {
    this.loadCredentials = loadCredentials;
    this.baseUrl = baseUrl;
  }

  async createUserProduct(input: CreateUserProductInput): Promise<CreateUserProductResult> {
    const accessToken = await this.getAccessToken();
    const payload = buildCreateUserProductPayload(input);
    const responseBody = await this.postUserProduct(payload, accessToken);
    const product = normalizeCreateProductResponse(responseBody, payload);
    const createdProductId = typeof product.id === 'string' ? product.id : payload.id;

    return {
      createdProductId,
      product,
      payload,
      requestSummary: buildCreateUserProductRequestSummary(payload, createdProductId),
    };
  }

  async searchProducts(options: YazioV20SearchProductsOptions): Promise<YazioV20ProductSearchResult[]> {
    const accessToken = await this.getAccessToken();
    return await this.getJson<YazioV20ProductSearchResult[]>(buildProductSearchPath(options), accessToken);
  }

  async getProduct(id: string): Promise<YazioV20Product> {
    const accessToken = await this.getAccessToken();
    return await this.getProductWithToken(id, accessToken);
  }

  async listUserProductIds(): Promise<string[]> {
    const accessToken = await this.getAccessToken();
    return await this.getJson<string[]>('/user/products', accessToken);
  }

  async findProductByBarcode(options: YazioFindProductByBarcodeOptions): Promise<YazioFindProductByBarcodeResult> {
    const accessToken = await this.getAccessToken();
    const barcode = options.barcode.trim();
    const globalCandidates = await this.getJson<YazioV20ProductSearchResult[]>(
      buildProductSearchPath({
        query: barcode,
        sex: options.sex,
        countries: options.countries,
        locales: options.locales,
      }),
      accessToken,
    );
    const globalMatch = await this.findExactGlobalBarcodeMatch(barcode, globalCandidates, accessToken);

    if (globalMatch) {
      return buildBarcodeLookupResult(barcode, globalCandidates, 0, globalMatch);
    }

    if (options.include_user_products === false) {
      return buildBarcodeLookupResult(barcode, globalCandidates, 0, null);
    }

    const userProductIds = await this.getJson<string[]>('/user/products', accessToken);
    const maxUserProducts = options.max_user_products ?? DEFAULT_USER_PRODUCT_SCAN_LIMIT;
    const scannedUserProductIds = userProductIds.slice(0, maxUserProducts);

    for (const productId of scannedUserProductIds) {
      const product = await this.getProductWithToken(productId, accessToken);
      if (productHasBarcode(product, barcode)) {
        return buildBarcodeLookupResult(barcode, globalCandidates, scannedUserProductIds.length, {
          source: 'user_product',
          product_id: productId,
          product,
        });
      }
    }

    return buildBarcodeLookupResult(barcode, globalCandidates, scannedUserProductIds.length, null);
  }

  private async getAccessToken(): Promise<string> {
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

    const auth = await response.json() as YazioV20AuthTokenResponse;

    if (!auth.access_token) {
      throw new Error('Failed to authenticate with Yazio v20: missing access token in response');
    }

    return auth.access_token;
  }

  private async postUserProduct(payload: CreateUserProductPayload, accessToken: string): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/user/products`, {
      method: 'POST',
      headers: {
        ...JSON_HEADERS,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      const errorDetails = formatErrorDetails(responseBody);
      throw new Error(`Failed to create user product: ${response.status} ${response.statusText}${errorDetails}`);
    }

    return responseBody;
  }

  private async getJson<T>(path: string, accessToken: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        ...JSON_HEADERS,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      const errorDetails = formatErrorDetails(responseBody);
      throw new Error(`Yazio v20 GET ${path} failed: ${response.status} ${response.statusText}${errorDetails}`);
    }

    return responseBody as T;
  }

  private async getProductWithToken(id: string, accessToken: string): Promise<YazioV20Product> {
    return await this.getJson<YazioV20Product>(`/products/${encodeURIComponent(id)}`, accessToken);
  }

  private async findExactGlobalBarcodeMatch(
    barcode: string,
    candidates: YazioV20ProductSearchResult[],
    accessToken: string,
  ): Promise<YazioFindProductByBarcodeResult['match']> {
    for (const candidate of candidates) {
      const product = await this.getProductWithToken(candidate.product_id, accessToken);
      if (productHasBarcode(product, barcode)) {
        return {
          source: 'global_search',
          product_id: candidate.product_id,
          product,
          searchResult: candidate,
        };
      }
    }

    return null;
  }
}

function buildProductSearchPath(options: YazioV20SearchProductsOptions): string {
  const params = new URLSearchParams();
  params.set('query', options.query);
  params.set('sex', options.sex ?? DEFAULT_SEARCH_SEX);
  params.set('countries', normalizeCsv(options.countries, DEFAULT_SEARCH_COUNTRIES));
  params.set('locales', normalizeCsv(options.locales, DEFAULT_SEARCH_LOCALES));

  if (options.test_group) {
    params.set('test_group', options.test_group);
  }

  return `/products/search?${params.toString()}`;
}

function normalizeCsv(values: string[] | undefined, fallback: string[]): string {
  const normalizedValues = (values?.length ? values : fallback)
    .map((value) => value.trim())
    .filter(Boolean);

  return normalizedValues.join(',');
}

function productHasBarcode(product: YazioV20Product, barcode: string): boolean {
  return Array.isArray(product.eans) && product.eans.includes(barcode);
}

function buildBarcodeLookupResult(
  barcode: string,
  globalCandidates: YazioV20ProductSearchResult[],
  scannedUserProductCount: number,
  match: YazioFindProductByBarcodeResult['match'],
): YazioFindProductByBarcodeResult {
  return {
    barcode,
    match,
    globalCandidates,
    scannedUserProductCount,
    limitation: BARCODE_INDEX_LIMITATION,
  };
}

function buildCreateUserProductPayload(input: CreateUserProductInput): CreateUserProductPayload {
  return {
    ...input,
    id: input.id ?? uuidv4(),
    ...(input.country ? { country: input.country.toUpperCase() } : {}),
  };
}

function buildCreateUserProductRequestSummary(
  payload: CreateUserProductPayload,
  createdProductId: string,
): CreateUserProductRequestSummary {
  return {
    id: createdProductId,
    name: payload.name,
    category: payload.category,
    base_unit: payload.base_unit,
    is_private: payload.is_private,
    producer: payload.producer ?? null,
    ean: payload.ean ?? null,
    country: payload.country ?? null,
    servings: payload.servings,
    nutrients: payload.nutrients,
  };
}

function normalizeCreateProductResponse(
  responseBody: unknown,
  fallbackPayload: CreateUserProductPayload,
): YazioCreateProductResponse | CreateUserProductPayload {
  return isObjectRecord(responseBody) ? responseBody : fallbackPayload;
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

  const detailText = typeof responseBody === 'string'
    ? responseBody
    : JSON.stringify(responseBody);

  return detailText ? ` - ${detailText}` : '';
}

function isObjectRecord(value: unknown): value is YazioCreateProductResponse {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
