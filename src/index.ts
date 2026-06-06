#!/usr/bin/env node

import { YazioMcpServer } from './server.js';

new YazioMcpServer().run().catch((error) => {
  console.error('❌ Failed to start Yazio MCP server:', (error as Error).message);
  console.error('💡 Please check your Yazio environment variables');
  process.exit(1);
});
