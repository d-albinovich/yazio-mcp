import { v4 as uuidv4 } from 'uuid';
import type { CreateUserProductInput } from '../schemas.js';
import type {
  YazioCreateProductResponse,
  YazioFindProductByBarcodeOptions,
  YazioFindProductByBarcodeResult,
  YazioV20Product,
  YazioV20ProductSearchResult,
  YazioV20SearchProductsOptions,
} from '../types.js';
import type { YazioApiClient } from './yazio-api-client.js';

const DEFAULT_SEARCH_SEX = 'male';
const DEFAULT_SEARCH_COUNTRIES = ['US'];
const DEFAULT_SEARCH_LOCALES = ['en_US'];
const DEFAULT_USER_PRODUCT_SCAN_LIMIT = 500;
const BARCODE_INDEX_LIMITATION =
  'Yazio has no public client API that publishes user-created products into the global barcode/search index. Custom products are discoverable through /v20/user/products plus /v20/products/{id} and matching eans[].';

export interface CreateUserProductPayload extends CreateUserProductInput {
  id: string;
  country?: string;
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

export interface CreateUserProductResult {
  createdProductId: string;
  product: YazioCreateProductResponse | CreateUserProductPayload;
  payload: CreateUserProductPayload;
  requestSummary: CreateUserProductRequestSummary;
}

export interface SuggestedProductsOptions {
  daytime: string;
  date?: string;
  test_group?: string;
}

/** Product search, detail, custom-product creation and barcode lookup on `/v20`. */
export class ProductsClient {
  constructor(private readonly api: YazioApiClient) {}

  async search(options: YazioV20SearchProductsOptions): Promise<YazioV20ProductSearchResult[]> {
    return this.api.get<YazioV20ProductSearchResult[]>(buildProductSearchPath(options));
  }

  async get(id: string): Promise<YazioV20Product> {
    return this.api.get<YazioV20Product>(`/products/${encodeURIComponent(id)}`);
  }

  async listUserProductIds(): Promise<string[]> {
    return this.api.get<string[]>('/user/products');
  }

  async getSuggested(options: SuggestedProductsOptions): Promise<unknown> {
    return this.api.get<unknown>('/user/products/suggested', {
      daytime: options.daytime,
      date: options.date,
      test_group: options.test_group,
    });
  }

  async create(input: CreateUserProductInput): Promise<CreateUserProductResult> {
    const payload = buildCreateUserProductPayload(input);
    const responseBody = await this.api.post<unknown>('/user/products', payload);
    const product = normalizeCreateProductResponse(responseBody, payload);
    const createdProductId = typeof product.id === 'string' ? product.id : payload.id;

    return {
      createdProductId,
      product,
      payload,
      requestSummary: buildCreateUserProductRequestSummary(payload, createdProductId),
    };
  }

  async findByBarcode(options: YazioFindProductByBarcodeOptions): Promise<YazioFindProductByBarcodeResult> {
    const barcode = options.barcode.trim();
    const globalCandidates = await this.api.get<YazioV20ProductSearchResult[]>(
      buildProductSearchPath({
        query: barcode,
        sex: options.sex,
        countries: options.countries,
        locales: options.locales,
      }),
    );
    const globalMatch = await this.findExactGlobalBarcodeMatch(barcode, globalCandidates);

    if (globalMatch) {
      return buildBarcodeLookupResult(barcode, globalCandidates, 0, globalMatch);
    }

    if (options.include_user_products === false) {
      return buildBarcodeLookupResult(barcode, globalCandidates, 0, null);
    }

    const userProductIds = await this.listUserProductIds();
    const maxUserProducts = options.max_user_products ?? DEFAULT_USER_PRODUCT_SCAN_LIMIT;
    const scannedUserProductIds = userProductIds.slice(0, maxUserProducts);

    for (const productId of scannedUserProductIds) {
      const product = await this.get(productId);
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

  private async findExactGlobalBarcodeMatch(
    barcode: string,
    candidates: YazioV20ProductSearchResult[],
  ): Promise<YazioFindProductByBarcodeResult['match']> {
    for (const candidate of candidates) {
      const product = await this.get(candidate.product_id);
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
  const normalizedValues = (values?.length ? values : fallback).map((value) => value.trim()).filter(Boolean);

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

function isObjectRecord(value: unknown): value is YazioCreateProductResponse {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
