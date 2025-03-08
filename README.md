# @10d3/printflow

[![npm version](https://img.shields.io/npm/v/@10d3/printflow.svg?style=flat-square)](https://www.npmjs.com/package/@10d3/printflow)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-brightgreen)](https://github.com/10d3/printflow)

Modern TypeScript SDK for integrating with Apliiq's Print-on-Demand API. Handle product catalog management, order processing, and inventory tracking with full type safety and caching support.

## Features

- **Full TypeScript Support** - Built with TypeScript 5 and Zod validation
- **Intelligent Caching** - LRU caching with customizable TTL strategies
- **Security** - HMAC authentication for API requests
- **Error Handling** - Structured error classes with context details
- **ESM Support** - Modern module system for better tree-shaking

## Installation

```bash
npm install @10d3/printflow
# or
bun add @10d3/printflow
```

## Configuration

Create a client instance with your Apliiq credentials:

```typescript
import { ApliiqClient } from '@10d3/printflow';

const client = new ApliiqClient({
  appId: 'YOUR_APP_ID',
  sharedSecret: 'YOUR_SHARED_SECRET',
  endpoint: 'https://api.apliiq.com/v1', // Optional
  timeout: 15000, // 15 seconds
  cache: {
    enabled: true,
    max: 1000,
    ttl: 300000, // 5 minutes
    products: {
      ttl: 60000, // 1 minute per product
      batchTTL: 180000 // 3 minutes for product lists
    }
  }
});
```

## Usage

### Product API

<Tabs> <Tab label="Get All Products">

```typescript
async function listProducts() {
  try {
    const products = await client.getProducts();
    console.log('Available products:', products);
  } catch (error) {
    console.error('Failed to fetch products:', error.message);
  }
}
```
</Tab> <Tab label="Get Single Product">

```typescript
async function listProducts() {
  try {
    const products = await client.getProducts();
    console.log('Available products:', products);
  } catch (error) {
    console.error('Failed to fetch products:', error.message);
  }
}
```
</Tab></Tabs>

### Order API

#### Create Order

```typescript
try {
  const orderResponse = await client.createOrder({
    number: 1006,
    name: "#1006",
    order_number: 1006,
    line_items: [
      {
        id: "1511138222",
        title: "cotton heritage polly pocket",
        quantity: 1,
        price: "45.50",
        sku: "APQ-1998244S7A1",
      },
    ],
    shipping_address: {
      first_name: "john",
      last_name: "smith",
      address1: "1692 Avenue du Mont-Royal Est",
      city: "los angeles",
      zip: "90013",
      province: "California",
      country: "United States",
      country_code: "US",
      province_code: "CA",
    },
  });
  console.log("Order created:", orderResponse.id);
} catch (error) {
  if (error instanceof ApliiqError) {
    console.error(`Order failed: ${error.message}`);
  }
}
```

## Caching

The client includes built-in LRU caching support for product data:

```typescript
const client = new ApliiqClient({
  appId: "your-app-id",
  sharedSecret: "your-shared-secret",
  cache: {
    enabled: true, // Enable caching
    max: 1000, // Maximum number of items (default: 1000)
    ttl: 300000, // Time-to-live in ms (default: 5 minutes)
  },
});

// Get cache statistics
const stats = client.getCacheStats(); // Returns: { size: number }

// Clear entire cache
client.clearCache();

// Clear specific product
client.clearProductCache(123);

// Clear all products
client.clearProductsCache();
```

## TypeScript Types

The client provides built-in type definitions for all API operations:

```typescript
import {
  ApliiqConfig,
  Product,
  ApliiqOrder,
  ApliiqOrderResponse,
} from "apliiq-client";

// Configuration type
const config: ApliiqConfig = {
  appId: "your-app-id",
  sharedSecret: "your-shared-secret",
  cache: {
    enabled: true,
    max: 1000,
    ttl: 300000,
  },
};

// Product type
const product: Product = await client.getProduct(162);
// {
//   Id: number;
//   Name: string;
//   SKU: string;
//   Colors: Array<{ Id: number; Name: string }>;
//   Sizes: Array<{ Id: number; Name: string; Weight: string; PlusSize_Fee: number }>;
//   // ... other properties
// }

// Order type
const order: ApliiqOrder = {
  number: 1006,
  name: "#1006",
  order_number: 1006,
  line_items: [
    {
      id: "1511138222",
      title: "cotton heritage polly pocket",
      quantity: 1,
      price: "45.50",
      sku: "APQ-1998244S7A1",
    },
  ],
  shipping_address: {
    first_name: "john",
    last_name: "smith",
    address1: "1692 Avenue du Mont-Royal Est",
    city: "los angeles",
    zip: "90013",
    province: "California",
    country: "United States",
    country_code: "US",
    province_code: "CA",
  },
};

// Order response type
const response: ApliiqOrderResponse = await client.createOrder(order);
// { id: number }
```

All types include full TypeScript intellisense support and runtime validation through Zod schemas.

## Error Handling

```typescript
try {
  await client.createOrder(/* ... */);
} catch (error) {
  if (error instanceof ApliiqError) {
    console.error(`API Error (${error.statusCode}): ${error.message}`);
    if (error.details) console.error("Details:", error.details);
  }
}
```

### Common Error Scenarios

- Validation Errors: Zod schema validation failures
- 401 Unauthorized: Invalid HMAC signature
- 202 Accepted: Order received but not yet processed

## Response Examples

### Product Response

```json
{
  "Id": 162,
  "Name": "womens t shirt",
  "SKU": "6004",
  "Price": 6,
  "Sizes": [
    {
      "Id": 6,
      "Name": "s",
      "Weight": "16 oz",
      "PlusSize_Fee": 0
    }
  ],
  "Colors": [
    {
      "Id": 50,
      "Name": "black"
    }
  ]
}
```

### Order Response

```json
{
  "id": 567890
}
```

## Rate Limiting

The API currently doesn't specify rate limits. It's recommended to implement retry logic for production use.

## Development

```bash
# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm test
```

## Contribution

- Clone repository

```bash
git clone https://github.com/10d3/printflow.git
```

- Install dep

```bash
bun install
```

- Build the project

```bash
bun run build
```

- Submit PR with tests

## License

MIT - See [LICENSE](LICENSE)

## Documentation

For complete API documentation, visit [Apliiq API Docs](https://help.apliiq.com/portal/en/kb/help/api)
