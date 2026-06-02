import type {
  YazioDietaryPreferences,
  YazioExercises,
  YazioGoals,
  YazioSettings,
  YazioUserInfo,
} from '../types.js';
import type { YazioApiClient } from './yazio-api-client.js';

/** Read access to the authenticated user's profile and per-user data on `/v20`. */
export class UserClient {
  constructor(private readonly api: YazioApiClient) {}

  async getProfile(): Promise<YazioUserInfo> {
    return this.api.get<YazioUserInfo>('/user');
  }

  async getSettings(): Promise<YazioSettings> {
    return this.api.get<YazioSettings>('/user/settings');
  }

  async getDietaryPreferences(): Promise<YazioDietaryPreferences> {
    return this.api.get<YazioDietaryPreferences>('/user/dietary-preferences');
  }

  async getGoals(date?: string): Promise<YazioGoals> {
    return this.api.get<YazioGoals>('/user/goals', { date });
  }

  /** Most recent weight entry on/before `date`. Shape isn't documented, so kept opaque. */
  async getLastWeight(date?: string): Promise<unknown> {
    return this.api.get<unknown>('/user/bodyvalues/weight/last', { date });
  }

  async getExercises(date?: string): Promise<YazioExercises> {
    return this.api.get<YazioExercises>('/user/exercises', { date });
  }
}
