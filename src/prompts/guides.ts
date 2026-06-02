import type { PromptDefinition } from './types.js';

const ADD_FOOD_ITEM_GUIDE = `To add a food item to the user's consumption log, follow these steps:

1. **Search for the product**: Use the \`search_products\` tool with a query string (e.g., "chicken breast", "apple", "pasta"), optionally specifying user's sex, country and locale of the products to search for. This will return a list of matching products with their IDs and short information about the product and serving.

2. **Clarify the product**: If multiple products are found, ask the user to clarify which product they want to use.

3. **Get product details**: Use the \`get_product\` tool with the \`product_id\` from the search results. This will show you full information about the product and serving:
   - Available serving types (e.g., "portion", "gram", "piece", "cup") and their amounts in base units (g or ml)
   - Base unit (g or ml)

4. **Clarify the serving**: If the user doesn't provide a serving type and quantity, ask them to clarify the serving type provided by previous step and quantity they want to add.

5. **Add the consumed item**: Use the \`add_user_consumed_item\` tool with:
   - \`product_id\`: The UUID from step 1
   - \`date\`: Date in YYYY-MM-DD format
   - \`daytime\`: One of: "breakfast", "lunch", "dinner", or "snack"
   - \`serving\`: Use a serving type from step 2 (e.g., "portion", "piece", "cup") OR base unit (g or ml)
   - \`serving_quantity\`: Quantity of the serving type (e.g., 1, 2, 0.5)
   - \`amount\`: Direct amount in base units (g or ml). If serving type is provided, use the amount of the serving type * serving_quantity. If serving type is not provided, use the amount of the base unit.

**Important Notes**:
- Always search first if you don't have a product_id
- Check product details to understand available serving types, base unit (g or ml) and amount in serving
- The date should be in ISO format (YYYY-MM-DD)
- You can use serving or base unit approach:
  1. serving type + serving quantity + amount (amount for selected serving type multiplied by serving quantity)
  2. amount in g/ml - serving fields could be omitted
Example:
  1. "I ate 2 apples" - serving type "piece" which has 100g amount (from product details) + serving quantity 2 + amount 200g
  2. "I ate 200g of chicken breast" - amount 200g
- Always provide amount in base units (g or ml), not in servings.
`;

const REMOVE_FOOD_ITEM_GUIDE = `To remove a food item from the user's consumption log, follow these steps:

1. **Get consumed items**: Use the \`get_user_consumed_items\` tool with the \`date\` parameter (in YYYY-MM-DD format) to retrieve all food entries for that date.

2. **Identify the item**: From the returned list of consumed items, identify the specific item you want to remove. Each item will have:
   - \`id\`: The unique identifier for the consumed item (this is what you need for removal)
   - \`product_id\`: The product identifier
   - \`name\`: The product name
   - \`date\`: The date it was consumed
   - \`daytime\`: The meal type (breakfast, lunch, dinner, snack)
   - Other details like amount, serving, etc.

3. **Remove the item**: Use the \`remove_user_consumed_item\` tool with:
   - \`itemId\`: The \`id\` field from the consumed item you identified in step 2

**Important Notes**:
- You must first retrieve the consumed items to get the item ID
- The \`itemId\` is different from \`product_id\` - use the \`id\` field from the consumed item
- The date should be in ISO format (YYYY-MM-DD)
- If multiple items match the description, you may need to ask the user to clarify which specific item to remove`;

const ADD_WATER_INTAKE_GUIDE = `To add water intake to the user's log, follow these steps:

1. **Get current water intake**: Use the \`get_user_water_intake\` tool with the \`date\` parameter (in YYYY-MM-DD format) to retrieve the current cumulative water intake for that date. The response will contain a \`water_intake\` field with the current cumulative value in milliliters (ml).

2. **Calculate cumulative value**: Add the new water intake amount (in ml) that the user wants to add to the existing \`water_intake\` value from step 1. This gives you the new cumulative water intake value.

3. **Add the water intake entry**: Use the \`add_user_water_intake\` tool with a single object (the tool will automatically wrap it in an array when sending to the API):
   - \`date\`: Date and time in format "YYYY-MM-DD HH:mm:ss" (e.g., "2025-12-18 12:00:00")
   - \`water_intake\`: The cumulative water intake in milliliters (ml) - this should be the previous cumulative value plus the new intake amount

**Important Notes**:
- Always get the latest water intake first to ensure you're adding to the correct cumulative value
- The \`water_intake\` field must be cumulative (previous total + new intake), not just the new amount
- The date format must be "YYYY-MM-DD HH:mm:ss" with both date and time
- Water intake is measured in milliliters (ml)
- The tool accepts a single object (not an array) - it will be automatically sent as a single-item array to the API

**Example**:
- Current water intake for 2025-12-18: 500ml
- User says: "I want to add 250ml"
- Get latest: 500ml
- Calculate: 500 + 250 = 750ml
- Call tool with: \`{ date: "2025-12-18 12:00:00", water_intake: 750 }\`
- The tool sends: \`[{ date: "2025-12-18 12:00:00", water_intake: 750 }]\` to the API`;

export const promptDefinitions: PromptDefinition[] = [
  {
    name: 'add_food_item',
    title: 'Add Food Item to Log',
    description: "Guide for adding a food item to the user's consumption log",
    text: ADD_FOOD_ITEM_GUIDE,
  },
  {
    name: 'remove_food_item',
    title: 'Remove Food Item from Log',
    description: "Guide for removing a food item from the user's consumption log",
    text: REMOVE_FOOD_ITEM_GUIDE,
  },
  {
    name: 'add_water_intake',
    title: 'Add Water Intake to Log',
    description: "Guide for adding water intake entries to the user's log",
    text: ADD_WATER_INTAKE_GUIDE,
  },
];
