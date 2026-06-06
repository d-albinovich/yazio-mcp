import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProductsClient } from '../clients/products-client.js';
import type { UserClient } from '../clients/user-client.js';
import type { DiaryClient } from '../clients/diary-client.js';
import type { WaterClient } from '../clients/water-client.js';

/** Resource clients handed to every tool handler (dependency inversion). */
export interface ToolContext {
  readonly products: ProductsClient;
  readonly user: UserClient;
  readonly diary: DiaryClient;
  readonly water: WaterClient;
}

/**
 * Raw result of a handler. The registrar turns this into an MCP `CallToolResult`:
 * `summary` (and `data`, when present) become the text content, while
 * `structured` is merged as extra top-level fields.
 */
export interface ToolOutput {
  summary: string;
  data?: unknown;
  structured?: Record<string, unknown>;
}

/** A registrable tool, with its input type erased behind `register`. */
export interface ToolDefinition {
  readonly name: string;
  register(server: McpServer, ctx: ToolContext): void;
}
