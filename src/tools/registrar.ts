import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import type { ToolContext, ToolDefinition, ToolOutput } from './types.js';

interface ToolSpec<TSchema extends z.ZodType> {
  name: string;
  description: string;
  inputSchema: TSchema;
  annotations: ToolAnnotations;
  /** Text after "Failed to " used when the handler throws (e.g. "get user info"). */
  failureAction: string;
  execute(args: z.infer<TSchema>, ctx: ToolContext): Promise<ToolOutput>;
}

/**
 * Builds a {@link ToolDefinition} from a typed spec. The shared try/catch and
 * response formatting live here, so individual handlers only return data.
 */
export function defineTool<TSchema extends z.ZodType>(spec: ToolSpec<TSchema>): ToolDefinition {
  return {
    name: spec.name,
    register(server, ctx) {
      // The args type is sound (`z.infer<TSchema>` equals the SDK's
      // `SchemaOutput<TSchema>`), but TS cannot prove it against the SDK's
      // deferred conditional callback type while TSchema is still generic, so
      // we assert at this single framework boundary.
      const handler = (async (args: z.infer<TSchema>) => {
        try {
          return formatOutput(await spec.execute(args, ctx));
        } catch (error) {
          throw new Error(`Failed to ${spec.failureAction}: ${error}`);
        }
      }) as ToolCallback<TSchema>;

      server.registerTool(
        spec.name,
        {
          description: spec.description,
          inputSchema: spec.inputSchema,
          annotations: spec.annotations,
        },
        handler,
      );
    },
  };
}

export function registerTools(
  server: McpServer,
  ctx: ToolContext,
  definitions: ToolDefinition[],
): void {
  for (const definition of definitions) {
    definition.register(server, ctx);
  }
}

function formatOutput({ summary, data, structured }: ToolOutput): CallToolResult {
  const text = data === undefined ? summary : `${summary}\n\n${JSON.stringify(data, null, 2)}`;
  return {
    content: [{ type: 'text', text }],
    ...structured,
  };
}
