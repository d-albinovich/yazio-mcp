import type { YazioAddWaterIntakeOptions, YazioWaterIntake } from '../types.js';
import type { YazioApiClient } from './yazio-api-client.js';

const WATER_INTAKE_PATH = '/user/water-intake';

/** Water intake reads and writes on `/v20`. */
export class WaterClient {
  constructor(private readonly api: YazioApiClient) {}

  async getWaterIntake(date: string): Promise<YazioWaterIntake> {
    return this.api.get<YazioWaterIntake>(WATER_INTAKE_PATH, { date });
  }

  async addWaterIntake(entries: YazioAddWaterIntakeOptions): Promise<void> {
    // v20 accepts an array of cumulative entries; gateway/source are optional.
    await this.api.post<unknown>(WATER_INTAKE_PATH, entries);
  }
}
