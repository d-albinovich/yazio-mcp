import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { promptDefinitions } from './guides.js';

export function registerPrompts(server: McpServer): void {
  for (const prompt of promptDefinitions) {
    server.registerPrompt(
      prompt.name,
      { title: prompt.title, description: prompt.description },
      async () => ({
        messages: [{ role: 'user', content: { type: 'text', text: prompt.text } }],
      }),
    );
  }
}
