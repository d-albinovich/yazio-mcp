import { GetWaterIntakeInputSchema, AddWaterIntakeInputSchema } from '../schemas.js';
import { defineTool } from './registrar.js';
import type { ToolDefinition } from './types.js';

export const waterTools: ToolDefinition[] = [
  defineTool({
    name: 'get_user_water_intake',
    description: 'Get water intake data for a specific date',
    inputSchema: GetWaterIntakeInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    failureAction: 'get water intake',
    async execute(args, ctx) {
      const waterIntake = await ctx.water.getWaterIntake(args.date);
      return { summary: `Water intake for ${args.date}:`, data: waterIntake };
    },
  }),

  defineTool({
    name: 'add_user_water_intake',
    description:
      'Log a water intake entry. Requires date (YYYY-MM-DD HH:mm:ss format) and cumulative water_intake in milliliters (ml). Always get the latest water intake first and add the new amount to calculate the cumulative value.',
    inputSchema: AddWaterIntakeInputSchema,
    annotations: { readOnlyHint: false, idempotentHint: false },
    failureAction: 'add water intake',
    async execute(args, ctx) {
      // date is already in "YYYY-MM-DD HH:mm:ss" format; the API expects an array.
      await ctx.water.addWaterIntake([{ date: args.date, water_intake: args.water_intake }]);
      return { summary: 'Successfully logged water intake entry' };
    },
  }),
];
