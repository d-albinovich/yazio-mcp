import { v4 as uuidv4 } from 'uuid';
import type { CreateUserProductInput } from './schemas.js';
import type { YazioCreateProductResponse, YazioV20AuthTokenResponse } from './types.js';
import { loadYazioV20Credentials, type YazioV20Credentials } from './env.js';

const YAZIO_V20_BASE_URL = 'https://yzapi.yazio.com/v20';
const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

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
  constructor(
    private readonly loadCredentials: CredentialsLoader = loadYazioV20Credentials,
    private readonly baseUrl = YAZIO_V20_BASE_URL,
  ) {}

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
