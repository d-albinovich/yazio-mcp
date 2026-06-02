import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { YazioApiClient } from './clients/yazio-api-client.js';
import { ProductsClient } from './clients/products-client.js';
import { UserClient } from './clients/user-client.js';
import { DiaryClient } from './clients/diary-client.js';
import { WaterClient } from './clients/water-client.js';
import { registerTools } from './tools/registrar.js';
import type { ToolContext } from './tools/types.js';
import { userTools } from './tools/user.tools.js';
import { consumptionTools } from './tools/consumption.tools.js';
import { waterTools } from './tools/water.tools.js';
import { productTools } from './tools/product.tools.js';
import { registerPrompts } from './prompts/registrar.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

export class YazioMcpServer {
  private readonly server: McpServer;
  private readonly api = new YazioApiClient();
  private readonly context: ToolContext = {
    products: new ProductsClient(this.api),
    user: new UserClient(this.api),
    diary: new DiaryClient(this.api),
    water: new WaterClient(this.api),
  };

  constructor() {
    this.server = new McpServer({ name: 'yazio-mcp', version });
  }

  async run(): Promise<void> {
    await this.api.authenticate();
    console.error('✅ Successfully authenticated with Yazio using environment variables');

    registerTools(this.server, this.context, [
      ...userTools,
      ...consumptionTools,
      ...waterTools,
      ...productTools,
    ]);
    registerPrompts(this.server);
    this.setupSignalHandling();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Yazio MCP server running on stdio');
  }

  private setupSignalHandling(): void {
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }
}
