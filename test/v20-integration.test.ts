/**
 * Live integration tests against the real Yazio /v20 API.
 *
 * These hit the network, so they are opt-in: they run only when YAZIO_USERNAME and
 * YAZIO_PASSWORD are set, and are skipped otherwise. A 2-second pause is inserted before
 * every test (and between the sub-calls of multi-step tests) to avoid hammering the API.
 *
 * Run with:
 *   YAZIO_USERNAME=... YAZIO_PASSWORD=... npm run test:integration
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { YazioApiClient } from '../src/clients/yazio-api-client.js';
import { ProductsClient } from '../src/clients/products-client.js';
import { UserClient } from '../src/clients/user-client.js';
import { DiaryClient } from '../src/clients/diary-client.js';
import { WaterClient } from '../src/clients/water-client.js';
import type { YazioConsumedItems } from '../src/types.js';

const PAUSE_MS = 2000;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const hasCredentials = Boolean(process.env.YAZIO_USERNAME && process.env.YAZIO_PASSWORD);
const skip = hasCredentials ? false : 'set YAZIO_USERNAME and YAZIO_PASSWORD to run live tests';

// One shared client so the OAuth token is fetched once and reused across tests.
const api = new YazioApiClient();
const products = new ProductsClient(api);
const user = new UserClient(api);
const diary = new DiaryClient(api);
const water = new WaterClient(api);

const today = new Date().toISOString().slice(0, 10);
const waterStamp = `${today} 12:00:00`;

// A stable, verified global product (Apple) for product/diary tests.
const APPLE_PRODUCT_ID = '9cd25628-becf-11e6-9579-e0071b8a8723';

// Pause before each test to stay gentle on the API.
beforeEach(() => sleep(PAUSE_MS));

test('get_user returns a profile with a uuid', { skip }, async () => {
  const profile = await user.getProfile();
  assert.equal(typeof profile.uuid, 'string');
  assert.ok(profile.uuid.length > 0);
});

test('get_user_goals returns energy and macro targets', { skip }, async () => {
  const goals = await user.getGoals(today);
  assert.equal(typeof goals['energy.energy'], 'number');
  assert.equal(typeof goals['nutrient.protein'], 'number');
});

test('get_user_settings returns the water-tracker flag', { skip }, async () => {
  const settings = await user.getSettings();
  assert.equal(typeof settings.has_water_tracker, 'boolean');
});

test('get_user_dietary_preferences returns a restriction field', { skip }, async () => {
  const preferences = await user.getDietaryPreferences();
  assert.ok('restriction' in preferences);
});

test('get_user_weight returns the latest weight entry', { skip }, async () => {
  const weight = await user.getLastWeight(today);
  assert.equal(typeof weight, 'object');
  assert.notEqual(weight, null);
});

test('get_user_exercises returns training arrays', { skip }, async () => {
  const exercises = await user.getExercises(today);
  assert.ok(Array.isArray(exercises.training));
  assert.ok(Array.isArray(exercises.custom_training));
});

test('get_user_suggested_products returns an array', { skip }, async () => {
  const suggestions = await products.getSuggested({ daytime: 'breakfast', date: today });
  assert.ok(Array.isArray(suggestions));
});

test('search_products finds matches for "apple"', { skip }, async () => {
  const results = await products.search({ query: 'apple' });
  assert.ok(Array.isArray(results));
  assert.ok(results.length > 0);
  assert.equal(typeof results[0].product_id, 'string');
});

test('get_product returns details including eans[]', { skip }, async () => {
  const product = await products.get(APPLE_PRODUCT_ID);
  assert.equal(typeof product.name, 'string');
  assert.ok(Array.isArray(product.eans));
});

test('list_user_products returns an array of ids', { skip }, async () => {
  const ids = await products.listUserProductIds();
  assert.ok(Array.isArray(ids));
});

test('get_user_consumed_items returns the diary wrapper', { skip }, async () => {
  const items = await diary.getConsumedItems(today);
  assert.ok(Array.isArray(items.products));
});

test('get_user_daily_summary (nutrients-daily) responds', { skip }, async () => {
  const summary = await diary.getNutrientsDaily(today, today);
  assert.notEqual(summary, undefined);
});

test('get_user_water_intake returns a cumulative value', { skip }, async () => {
  const intake = await water.getWaterIntake(today);
  assert.equal(typeof intake.water_intake, 'number');
});

test('find_product_by_barcode returns a structured result', { skip }, async () => {
  const result = await products.findByBarcode({ barcode: '4006381333931', include_user_products: false });
  assert.equal(result.barcode, '4006381333931');
  assert.ok(Array.isArray(result.globalCandidates));
});

test('water intake: add → read back → reset', { skip }, async () => {
  await water.addWaterIntake([{ date: waterStamp, water_intake: 250 }]);
  await sleep(PAUSE_MS);

  const intake = await water.getWaterIntake(today);
  assert.equal(intake.water_intake, 250);
  await sleep(PAUSE_MS);

  // Restore the account to a clean state.
  await water.addWaterIntake([{ date: waterStamp, water_intake: 0 }]);
});

test('consumed item: add → appears in diary → remove', { skip }, async () => {
  await diary.addConsumedItem({
    product_id: APPLE_PRODUCT_ID,
    date: today,
    daytime: 'breakfast',
    amount: 100,
  });
  await sleep(PAUSE_MS);

  const items: YazioConsumedItems = await diary.getConsumedItems(today);
  const entry = items.products.find((product) => product.product_id === APPLE_PRODUCT_ID);
  assert.ok(entry, 'added consumed item should appear in the diary');
  await sleep(PAUSE_MS);

  await diary.removeConsumedItems([entry.id]);
  await sleep(PAUSE_MS);

  const afterRemoval = await diary.getConsumedItems(today);
  const stillPresent = afterRemoval.products.some((product) => product.id === entry.id);
  assert.equal(stillPresent, false, 'removed consumed item should be gone');
});
