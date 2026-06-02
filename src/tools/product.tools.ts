import {
  SearchProductsInputSchema,
  FindProductByBarcodeInputSchema,
  GetProductInputSchema,
  GetUserInfoInputSchema,
  CreateUserProductInputSchema,
} from '../schemas.js';
import { defineTool } from './registrar.js';
import type { ToolDefinition } from './types.js';

export const productTools: ToolDefinition[] = [
  defineTool({
    name: 'search_products',
    description:
      'Search for food products in the Yazio v20 database. Barcode scans use this same endpoint with the barcode as query; there is no ?ean= endpoint.',
    inputSchema: SearchProductsInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    failureAction: 'search products via Yazio v20',
    async execute(args, ctx) {
      const products = await ctx.products.search(args);
      return {
        summary: 'Products from Yazio v20 search:',
        data: products,
        structured: { products },
      };
    },
  }),

  defineTool({
    name: 'find_product_by_barcode',
    description:
      'Find a product by barcode/EAN using the real Yazio app flow: global /v20/products/search?query=<barcode>, then fallback to the authenticated user product list and match product.eans[].',
    inputSchema: FindProductByBarcodeInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    failureAction: 'find product by barcode via Yazio v20',
    async execute(args, ctx) {
      const result = await ctx.products.findByBarcode(args);
      const summary = result.match
        ? `Found ${result.match.source} match for barcode "${args.barcode}" with product ID "${result.match.product_id}".`
        : `No exact product match found for barcode "${args.barcode}".`;
      return { summary, data: result, structured: { result } };
    },
  }),

  defineTool({
    name: 'get_product',
    description:
      'Get detailed product information from Yazio v20 by product ID, including eans[] for barcode checks.',
    inputSchema: GetProductInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    failureAction: 'get product via Yazio v20',
    async execute(args, ctx) {
      const product = await ctx.products.get(args.id);
      return {
        summary: `Product details from Yazio v20 for ID "${args.id}":`,
        data: product,
        structured: { product },
      };
    },
  }),

  defineTool({
    name: 'list_user_products',
    description:
      'List custom/user-created Yazio product IDs for the authenticated account. Use get_product to hydrate details such as eans[].',
    inputSchema: GetUserInfoInputSchema,
    annotations: { readOnlyHint: true, idempotentHint: true },
    failureAction: 'list user products via Yazio v20',
    async execute(_args, ctx) {
      const productIds = await ctx.products.listUserProductIds();
      return {
        summary: 'User product IDs from Yazio v20:',
        data: productIds,
        structured: { productIds },
      };
    },
  }),

  defineTool({
    name: 'create_user_product',
    description: 'Create a custom Yazio product for the authenticated user',
    inputSchema: CreateUserProductInputSchema,
    annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    failureAction: 'create user product',
    async execute(args, ctx) {
      const { createdProductId, product, requestSummary } = await ctx.products.create(args);
      return {
        summary: `Created user product with ID "${createdProductId}".`,
        data: requestSummary,
        structured: { product, requestSummary },
      };
    },
  }),
];
