import { v4 as uuidv4 } from 'uuid';
import type { AddConsumedItemInput } from '../schemas.js';
import type { YazioConsumedItems } from '../types.js';
import type { YazioApiClient } from './yazio-api-client.js';

const CONSUMED_ITEMS_PATH = '/user/consumed-items';

/** Food diary (consumed items) and daily nutrient totals on `/v20`. */
export class DiaryClient {
  constructor(private readonly api: YazioApiClient) {}

  async getConsumedItems(date: string): Promise<YazioConsumedItems> {
    return this.api.get<YazioConsumedItems>(CONSUMED_ITEMS_PATH, { date });
  }

  async addConsumedItem(item: AddConsumedItemInput): Promise<void> {
    // v20 expects a wrapper grouping the three entry kinds; we only add products.
    await this.api.post<unknown>(CONSUMED_ITEMS_PATH, {
      products: [{ id: uuidv4(), ...item }],
      simple_products: [],
      recipe_portions: [],
    });
  }

  async removeConsumedItems(itemIds: string[]): Promise<void> {
    // v20 deletes by a JSON array of consumed-item UUIDs in the request body.
    await this.api.delete<unknown>(CONSUMED_ITEMS_PATH, itemIds);
  }

  /** Daily nutrient totals over [start, end]. Shape isn't documented, so kept opaque. */
  async getNutrientsDaily(start: string, end: string): Promise<unknown> {
    return this.api.get<unknown>(`${CONSUMED_ITEMS_PATH}/nutrients-daily`, { start, end });
  }
}
