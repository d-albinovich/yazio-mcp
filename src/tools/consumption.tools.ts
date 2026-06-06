import {
  GetFoodEntriesInputSchema,
  GetDailySummaryInputSchema,
  AddConsumedItemInputSchema,
  RemoveConsumedItemInputSchema,
} from '../schemas.js';
import { defineTool } from './registrar.js';
import type { ToolDefinition } from './types.js';

export const consumptionTools: ToolDefinition[] = [
  defineTool({
    name: 'get_user_consumed_items',
    description: 'Get food entries for a specific date',
    inputSchema: GetFoodEntriesInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    failureAction: 'get food entries',
    async execute(args, ctx) {
      const foodEntries = await ctx.diary.getConsumedItems(args.date);
      return { summary: `Food entries for ${args.date}:`, data: foodEntries };
    },
  }),

  defineTool({
    name: 'get_user_daily_summary',
    description: 'Get daily nutrient totals (energy and macros) for a specific date',
    inputSchema: GetDailySummaryInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    failureAction: 'get daily summary',
    async execute(args, ctx) {
      const summary = await ctx.diary.getNutrientsDaily(args.date, args.date);
      return { summary: `Daily nutrient totals for ${args.date}:`, data: summary };
    },
  }),

  defineTool({
    name: 'add_user_consumed_item',
    description: 'Add a food item to user consumption log',
    inputSchema: AddConsumedItemInputSchema,
    annotations: { readOnlyHint: false, idempotentHint: false },
    failureAction: 'add consumed item',
    async execute(args, ctx) {
      await ctx.diary.addConsumedItem(args);
      return { summary: 'Successfully added consumed item' };
    },
  }),

  defineTool({
    name: 'remove_user_consumed_item',
    description: 'Remove a food item from user consumption log',
    inputSchema: RemoveConsumedItemInputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    failureAction: 'remove consumed item',
    async execute(args, ctx) {
      await ctx.diary.removeConsumedItems([args.itemId]);
      return { summary: `Successfully removed consumed item with ID: ${args.itemId}` };
    },
  }),
];
