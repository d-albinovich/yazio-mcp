import {
  GetUserInfoInputSchema,
  GetUserGoalsInputSchema,
  GetUserSettingsInputSchema,
  GetDietaryPreferencesInputSchema,
  GetUserWeightInputSchema,
  GetUserExercisesInputSchema,
  GetUserSuggestedProductsInputSchema,
} from '../schemas.js';
import { defineTool } from './registrar.js';
import type { ToolDefinition } from './types.js';

export const userTools: ToolDefinition[] = [
  defineTool({
    name: 'get_user',
    description: 'Get Yazio user profile information',
    inputSchema: GetUserInfoInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    failureAction: 'get user info',
    async execute(_args, ctx) {
      const userInfo = await ctx.user.getProfile();
      return { summary: 'User info:', data: userInfo };
    },
  }),

  defineTool({
    name: 'get_user_goals',
    description: 'Get user nutrition and fitness goals',
    inputSchema: GetUserGoalsInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    failureAction: 'get user goals',
    async execute(args, ctx) {
      const goals = await ctx.user.getGoals(args.date);
      return { summary: 'User goals:', data: goals };
    },
  }),

  defineTool({
    name: 'get_user_settings',
    description: 'Get user settings and preferences',
    inputSchema: GetUserSettingsInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    failureAction: 'get user settings',
    async execute(_args, ctx) {
      const settings = await ctx.user.getSettings();
      return { summary: 'User settings:', data: settings };
    },
  }),

  defineTool({
    name: 'get_user_dietary_preferences',
    description: 'Get user dietary preferences and restrictions',
    inputSchema: GetDietaryPreferencesInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    failureAction: 'get dietary preferences',
    async execute(_args, ctx) {
      const preferences = await ctx.user.getDietaryPreferences();
      return { summary: 'Dietary preferences:', data: preferences };
    },
  }),

  defineTool({
    name: 'get_user_weight',
    description: 'Get the most recent user weight entry',
    inputSchema: GetUserWeightInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    failureAction: 'get user weight',
    async execute(args, ctx) {
      const weight = await ctx.user.getLastWeight(args.date);
      return { summary: 'User weight data:', data: weight };
    },
  }),

  defineTool({
    name: 'get_user_exercises',
    description: 'Get user exercise data for a specific date',
    inputSchema: GetUserExercisesInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    failureAction: 'get user exercises',
    async execute(args, ctx) {
      const exercises = await ctx.user.getExercises(args.date);
      return { summary: 'User exercises:', data: exercises };
    },
  }),

  defineTool({
    name: 'get_user_suggested_products',
    description: 'Get product suggestions for the user for a given meal',
    inputSchema: GetUserSuggestedProductsInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    failureAction: 'get product suggestions',
    async execute(args, ctx) {
      const suggestions = await ctx.products.getSuggested({ daytime: args.daytime, date: args.date });
      return { summary: 'Product suggestions:', data: suggestions };
    },
  }),
];
