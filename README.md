# Yazio MCP Server <img src="https://assets.yazio.com/frontend/images/branded-logo-dark.svg" alt="Yazio Logo" width="104" height="28" />

> [!IMPORTANT]
> This is **not an official MCP server** and Yazio does **not provide an official API**.
> This server uses an [unofficial reverse-engineered API](https://github.com/juriadams/yazio) and may stop working at any time.

An MCP (Model Context Protocol) server that connects Claude/Cursor to your Yazio nutrition data. Track your diet, search food products, and manage your nutrition goals directly from your AI assistant.

**Available on NPM**: `npx yazio-mcp`

**Claude Desktop Extension**: [yazio-mcp.mcpb](https://github.com/fliptheweb/yazio-mcp/releases/latest/download/yazio-mcp.mcpb)

## ✨ Features

- 🔐 **Authentication** - Connect with your Yazio account
- 📊 **Nutrition Analysis** - Get comprehensive diet data and insights
- 🍎 **Food Tracking** - Search, add, and manage food entries
- 🏃‍♂️ **Fitness Data** - Track exercises and water intake
- ⚖️ **Weight Monitoring** - View weight history and trends
- 🎯 **Goal Management** - Access and manage nutrition goals
- 🔍 **Product Search** - Search Yazio's extensive [food database](https://www.yazio.com/en/foods)
- 🧾 **Barcode Lookup** - Uses the Yazio Android app-compatible v20 flow and falls back to your own custom products

## 🚀 Quick Start

Add the following JSON your MCP client configuration:

```json
{
  "mcpServers": {
    "yazio": {
      "command": "npx",
      "args": ["-y", "yazio-mcp"],
      "env": {
        "YAZIO_USERNAME": "your_email@emai.com",
        "YAZIO_PASSWORD": "your_password",
        "YAZIO_MOBILE_CLIENT_ID": "your_yazio_mobile_client_id",
        "YAZIO_MOBILE_CLIENT_SECRET": "your_yazio_mobile_client_secret"
      }
    }
  }
}
```


### Claude Desktop (Extension)

Download and open [yazio-mcp.mcpb](https://github.com/fliptheweb/yazio-mcp/releases/latest/download/yazio-mcp.mcpb) with Claude Desktop. You'll be prompted to enter your Yazio credentials — your password is stored securely in the OS keychain.

See [Building Desktop Extensions with MCPB](https://support.claude.com/en/articles/12922929-building-desktop-extensions-with-mcpb) for more details.

### Claude Desktop (Manual)

`~/Library/Application Support/Claude/claude_desktop_config.json`

### Claude Code (CLI)

```bash
claude mcp add yazio \
  -e YAZIO_USERNAME=your_email@email.com \
  -e YAZIO_PASSWORD=your_password \
  -e YAZIO_MOBILE_CLIENT_ID=your_yazio_mobile_client_id \
  -e YAZIO_MOBILE_CLIENT_SECRET=your_yazio_mobile_client_secret \
  -- npx -y yazio-mcp
```

Verify with `claude mcp list`.

### Cursor

There are a few ways to add the server:

- **Settings UI** (easiest) — `Settings → MCP → + Add new MCP server`, then fill in the command, args, and env
- **Project config** — add JSON to `.cursor/mcp.json` in your project root
- **Global config** — add JSON to `~/.cursor/mcp.json` (applies to all projects)


## 💡 Use Cases

![Showcase](https://github.com/user-attachments/assets/3aa47086-d40e-408c-ba51-cbe8cf165404)

### 📈 Analyze Your Nutrition Trends
> *"Get my nutrition data for the last week and analyze my eating patterns"*

Claude can retrieve your daily summaries, identify trends, and provide insights about your eating habits, macro distribution, and areas for improvement.

### 🔍 Search Food Products
> *"Search for 'chicken breast' in the Yazio database"*

Find detailed nutritional information for any food product, including calories, macros, vitamins, and minerals.

### 📝 Add Forgotten Meals
> *"Add 200g of grilled salmon for yesterday's dinner"*

Easily log meals you forgot to track in the Yazio app directly from Claude or Cursor.

## 🛠️ Available Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_user_daily_summary` | Get daily nutrition summary | `date` |
| `get_user_consumed_items` | Get food entries for a date | `date` |
| `get_user_weight` | Get weight data | - |
| `get_user_exercises` | Get exercise data | `date` |
| `get_user_water_intake` | Get water intake | `date` |
| `get_user_goals` | Get nutrition goals | - |
| `get_user_settings` | Get user preferences | - |
| `search_products` | Search food database through `/v20/products/search`; barcode scans are `query=<barcode>` | `query` |
| `find_product_by_barcode` | Search by barcode and fall back to user-created products via `/v20/user/products` + `eans[]` matching | `barcode`, `countries`, `locales` |
| `get_product` | Get detailed product info from `/v20/products/{id}` including `eans[]` | `id` |
| `list_user_products` | List custom/user-created product IDs for the authenticated account | - |
| `create_user_product` | Create a custom/private Yazio product in the user account | `name`, `category`, `base_unit`, `is_private`, `nutrients`, `servings`, `producer?`, `ean?`, `country?`, `id?` |
| `add_user_consumed_item` | Add food to your log | `productId`, `amount`, `date`, `mealType` |
| `add_user_water_intake` | Add water intake entry (cumulative value in ml) | `date`, `water_intake` |
| `remove_user_consumed_item` | Remove food from log | `itemId` |

## Test Connection

### Create custom products

`create_user_product` uses Yazio v20 API endpoint `POST /user/products` to create custom products in the authenticated Yazio account.

Required nutrients are:

- `energy.energy`
- `nutrient.fat`
- `nutrient.protein`
- `nutrient.carb`

Nutrients are defined per base unit (per 1 g/ml, not per 100 g/ml), at least one serving is required, and `is_private` defaults to `true` so custom products stay private unless you explicitly override it. For example, a food label with `243 kcal / 100 g` should be sent as `"energy.energy": 2.43`.

### Barcode search limitation

Reverse-engineering of Yazio Android v12.86.0 shows that the mobile app uses `/v20/products/search?query=<barcode>` for barcode scans. There is no public `?ean=`, `/barcode/{ean}`, publish, contribute, moderation, or barcode-binding endpoint.

Products created through `POST /v20/user/products` use the same endpoint as the mobile app and can store `ean`, but Yazio does not expose a client API that forces those products into the global barcode/search index. User-created products are discoverable by listing account products via `/v20/user/products`, hydrating each product through `/v20/products/{id}`, and matching the barcode against `eans[]`.

Use `find_product_by_barcode` for reliable automation: it first checks the global search index, then falls back to the authenticated user's own products so custom barcode products can be found without creating duplicates.

Safe validation probe (does not create a product by default):

```bash
npm run probe:create-product
```

The probe reads `YAZIO_USERNAME`, `YAZIO_PASSWORD`, `YAZIO_MOBILE_CLIENT_ID`, and `YAZIO_MOBILE_CLIENT_SECRET` from the environment first, then from `~/.hermes/.env` (or `YAZIO_ENV_PATH` if set). Real product creation is guarded behind `YAZIO_CREATE_PRODUCT_CONFIRM=1` and should only be used manually.

Do not commit runtime client credentials to source control. Keep them in `.env` or your MCP client's secure environment configuration.

```bash
YAZIO_USERNAME='your_email' \
YAZIO_PASSWORD='your_password' \
YAZIO_MOBILE_CLIENT_ID='your_yazio_mobile_client_id' \
YAZIO_MOBILE_CLIENT_SECRET='your_yazio_mobile_client_secret' \
npx yazio-mcp
```

## ⚠️ Important Disclaimers

- **Unofficial API**: This uses a [reverse-engineered API](https://github.com/juriadams/yazio) that may break
- **Credentials**: Your Yazio credentials are only used for auth on Yazio servers
- **Use at Your Own Risk**: API changes could affect functionality

## 📋 Requirements

- Node.js 18+ (for npx)
- Valid Yazio account
- MCP-compatible client (Claude Desktop, Cursor, etc.)

# Development
1. Download the repository
2. Point to local copy in your mcp config
3. Debugging:

```
YAZIO_USERNAME=X YAZIO_PASSWORD=X npx -y @modelcontextprotocol/inspector npx <local-path>/yazio-mcp
```
---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
