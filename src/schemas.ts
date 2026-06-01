import * as z from "zod";

export const DaytimeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export const DateStringSchema = z.iso.date().describe('Date in YYYY-MM-DD format');
export const ProductIdSchema = z.uuid().describe('Product UUID v1/v4 (e.g. 4ceff6e9-78ce-441b-964a-22e81c1dee92)');
export const ItemIdSchema = ProductIdSchema.describe('Unique item identifier');
export const ServingTypeSchema = z.string().describe('Serving type (e.g. portion, fruit, glass, cup, slice, piece, bar, gram, bottle, can, etc.)');
export const BaseUnitSchema = z.enum(['g', 'ml']).describe('Base unit: grams (g) or milliliters (ml)');
export const ProductCategorySchema = z.enum([
  'babyfood',
  'bakedgoods',
  'bakingingredients',
  'bread',
  'candy',
  'cerealproducts',
  'cheese',
  'chocolate',
  'dishes',
  'drinksalcoholic',
  'drinksnonalcoholic',
  'fastfood',
  'fish',
  'fruits',
  'icecream',
  'legumes',
  'meat',
  'milk',
  'miscellaneous',
  'nutritionalsupplements',
  'oils',
  'pasta',
  'potatoproducts',
  'poultry',
  'riceproducts',
  'sauces',
  'seeds',
  'soyproducts',
  'spices',
  'spreads',
  'vegetables'
]).describe('Product category');
export const CreateProductServingNameSchema = z.enum([
  'portion',
  'cup',
  'each',
  'slice',
  'piece',
  'package',
  'glass',
  'bottle',
  'bar',
  'tablet',
  'can',
  'teaspoon',
  'tablespoon'
]).describe('Serving name');

export const QueryStringSchema = z.string().describe('Search query string');
export const LimitSchema = z.number().optional().describe('Maximum number of results to return');
export const BarcodeSchema = z.string().min(1).describe('Barcode/EAN value to look up');

export const DateInputSchema = z.object({
  date: DateStringSchema
});

export const OptionalDateInputSchema = z.object({
  date: DateStringSchema.optional()
});

export const QueryInputSchema = z.object({
  query: QueryStringSchema.describe('Search query'),
  sex: z.enum(["male", "female"]).default("male").optional(),
  countries: z.array(z.string()).default(["US"]).optional().describe('Array of country codes for product search (e.g. ["US", "DE", "TR"])'),
  locales: z.array(z.string()).default(["en_US"]).optional().describe('Array of locale codes (e.g. ["en_US", "de_US"])'),
  test_group: z.string().optional().describe('Optional Yazio search test_group, e.g. exclude_nutritionix')
});

export const OptionalQueryInputSchema = z.object({
  query: QueryStringSchema.optional().describe('Search query (optional)'),
  limit: LimitSchema
});

export const FindProductByBarcodeInputSchema = z.object({
  barcode: BarcodeSchema,
  sex: z.enum(["male", "female"]).default("male").optional(),
  countries: z.array(z.string()).default(["US"]).optional().describe('Array of country codes for product search (e.g. ["US", "DE", "SK"])'),
  locales: z.array(z.string()).default(["en_US"]).optional().describe('Array of locale codes (e.g. ["en_US", "sk_SK", "de_DE"])'),
  include_user_products: z.boolean().default(true).optional().describe('If global search has no exact EAN match, scan authenticated user products via /user/products + /products/{id}'),
  max_user_products: z.number().int().positive().max(1000).default(500).optional().describe('Safety cap for hydrated user products during fallback')
});

export const EmptyInputSchema = z.object({});

export const CreateProductServingSchema = z.object({
  serving: CreateProductServingNameSchema,
  amount: z.number().positive().describe('Serving amount in base units (g or ml)')
});

export const CreateProductNutrientsSchema = z.object({
  'energy.energy': z.number().nonnegative().describe('Energy per base unit (kcal per g/ml, not per 100 g/ml)'),
  'nutrient.fat': z.number().nonnegative().describe('Fat per base unit (g per g/ml, not per 100 g/ml)'),
  'nutrient.protein': z.number().nonnegative().describe('Protein per base unit (g per g/ml, not per 100 g/ml)'),
  'nutrient.carb': z.number().nonnegative().describe('Carbohydrates per base unit (g per g/ml, not per 100 g/ml)')
}).catchall(z.number().nonnegative()).describe('Nutrients per base unit (per 1 g/ml). Convert label per-100 values by dividing by 100.');

export const CreateUserProductInputSchema = z.object({
  id: ProductIdSchema.optional(),
  name: z.string().min(1).describe('Product name'),
  category: ProductCategorySchema.default('miscellaneous'),
  base_unit: BaseUnitSchema,
  is_private: z.boolean().default(true).describe('Whether the custom product is private to the user'),
  nutrients: CreateProductNutrientsSchema,
  servings: z.array(CreateProductServingSchema).min(1).describe('Available servings for the custom product'),
  producer: z.string().min(1).optional().describe('Optional producer name'),
  ean: z.string().min(1).optional().describe('Optional EAN/barcode'),
  country: z.string().length(2).optional().describe('Optional ISO 3166-1 alpha-2 country code')
});

export const GetFoodEntriesInputSchema = DateInputSchema;
export const GetDailySummaryInputSchema = DateInputSchema;
export const GetUserInfoInputSchema = EmptyInputSchema;
export const GetUserWeightInputSchema = EmptyInputSchema; // Yazio getWeight doesn't accept parameters
export const GetWaterIntakeInputSchema = DateInputSchema;
export const SearchProductsInputSchema = QueryInputSchema;
export const SearchProductsOutputSchema = z.object({
  products: z.array(z.object({
    score: z.number(),
    name: z.string(),
    product_id: ProductIdSchema,
    serving: ServingTypeSchema,
    serving_quantity: z.number(),
    amount: z.number(),
    base_unit: BaseUnitSchema,
    producer: z.string().nullable().describe('Producer name'),
    is_verified: z.boolean(),
    nutrients: z.record(z.string(), z.number()).describe('Nutrients object with keys like energy.energy, nutrient.carb, etc.'),
    countries: z.array(z.string()).describe('Array of country codes (e.g. ["US", "DE"])'),
    language: z.string().describe('Language code (e.g. "en", "de")'),
  })),
});
export const GetProductInputSchema = z.object({
  id: ProductIdSchema.describe('Product ID to get details for')
});
export const GetUserExercisesInputSchema = OptionalDateInputSchema; // Only supports single date, not date ranges
export const GetUserSettingsInputSchema = EmptyInputSchema;
export const GetUserSuggestedProductsInputSchema = OptionalQueryInputSchema;
export const AddConsumedItemInputSchema = z.object({
  // id: ProductIdSchema.describe('Random identifier for the consumed item'),
  product_id: ProductIdSchema,
  date: DateStringSchema.describe('Date when the food was consumed'),
  daytime: DaytimeSchema.describe('Type of meal (breakfast, lunch, dinner, snack)'),
  amount: z.number().describe('Amount of the product consumed in base units (g or ml)'),
  serving: ServingTypeSchema.optional(),
  serving_quantity: z.number().optional().describe('Quantity of servings')
});
export const RemoveConsumedItemInputSchema = z.object({
  itemId: ItemIdSchema.describe('ID of the consumed item to remove')
});
export const AddWaterIntakeInputSchema = z.object({
  date: z.string().describe('Date and time in format "YYYY-MM-DD HH:mm:ss" (e.g., "2025-12-18 12:00:00")'),
  water_intake: z.number().describe('Cumulative water intake in milliliters (ml)')
});
export const GetDietaryPreferencesInputSchema = EmptyInputSchema;
export const GetUserGoalsInputSchema = EmptyInputSchema;

export type Daytime = z.infer<typeof DaytimeSchema>;
export type GetFoodEntriesInput = z.infer<typeof GetFoodEntriesInputSchema>;
export type GetDailySummaryInput = z.infer<typeof GetDailySummaryInputSchema>;
export type GetUserInfoInput = z.infer<typeof GetUserInfoInputSchema>;
export type GetUserWeightInput = z.infer<typeof GetUserWeightInputSchema>;
export type GetWaterIntakeInput = z.infer<typeof GetWaterIntakeInputSchema>;
export type SearchProductsInput = z.infer<typeof SearchProductsInputSchema>;
export type FindProductByBarcodeInput = z.infer<typeof FindProductByBarcodeInputSchema>;
export type GetProductInput = z.infer<typeof GetProductInputSchema>;
export type CreateUserProductInput = z.infer<typeof CreateUserProductInputSchema>;
export type GetUserExercisesInput = z.infer<typeof GetUserExercisesInputSchema>;
export type GetUserSettingsInput = z.infer<typeof GetUserSettingsInputSchema>;
export type GetUserSuggestedProductsInput = z.infer<typeof GetUserSuggestedProductsInputSchema>;
export type AddConsumedItemInput = z.infer<typeof AddConsumedItemInputSchema>;
export type RemoveConsumedItemInput = z.infer<typeof RemoveConsumedItemInputSchema>;
export type AddWaterIntakeInput = z.infer<typeof AddWaterIntakeInputSchema>;
export type GetDietaryPreferencesInput = z.infer<typeof GetDietaryPreferencesInputSchema>;
export type GetUserGoalsInput = z.infer<typeof GetUserGoalsInputSchema>;
