# Apliiq API Client

TypeScript client for Apliiq's Print-on-Demand API

[![npm version](https://img.shields.io/npm/v/apliiq-client.svg)](https://www.npmjs.com/package/apliiq-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🛡️ HMAC Authentication
- 🧩 TypeScript-first implementation
- ✅ Zod schema validation
- 📦 Product & Order management
- 🚨 Comprehensive error handling
- ⚡ Axios-based HTTP client

## Installation

```bash
npm install apliiq-client
```

## Configuration

```typescript
import { ApliiqClient } from 'apliiq-client';

const client = new ApliiqClient({
  appId: 'your-app-id',
  sharedSecret: 'your-shared-secret',
  endpoint: 'https://api.apliiq.com/v1', // Optional
  timeout: 15000 // Optional
});
```

## Usage

### Product API

#### Get All Products
```typescript
const products = await client.getProducts();
console.log('Available products:', products);
```

#### Get Single Product
```typescript
const product = await client.getProduct(162);
console.log('Product details:', product);
```

### Order API

#### Create Order
```typescript
try {
  const orderResponse = await client.createOrder({
    number: 1006,
    name: "#1006",
    order_number: 1006,
    line_items: [{
      id: "1511138222",
      title: "cotton heritage polly pocket",
      quantity: 1,
      price: "45.50",
      sku: "APQ-1998244S7A1"
    }],
    shipping_address: {
      first_name: "john",
      last_name: "smith",
      address1: "1692 Avenue du Mont-Royal Est",
      city: "los angeles",
      zip: "90013",
      province: "California",
      country: "United States",
      country_code: "US",
      province_code: "CA"
    }
  });
  console.log('Order created:', orderResponse.id);
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
  appId: 'your-app-id',
  sharedSecret: 'your-shared-secret',
  cache: {
    enabled: true,    // Enable caching
    max: 1000,        // Maximum number of items (default: 1000)
    ttl: 300000      // Time-to-live in ms (default: 5 minutes)
  }
});

// Get cache statistics
const stats = client.getCacheStats(); // Returns: { size: number }

// Clear cache
client.clearCache();
```


## TypeScript Types

The client provides built-in type definitions for all API operations:

```typescript
import { 
  ApliiqConfig,
  Product,
  ApliiqOrder,
  ApliiqOrderResponse
} from 'apliiq-client';

// Configuration type
const config: ApliiqConfig = {
  appId: 'your-app-id',
  sharedSecret: 'your-shared-secret',
  cache: {
    enabled: true,
    max: 1000,
    ttl: 300000
  }
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
  line_items: [{
    id: "1511138222",
    title: "cotton heritage polly pocket",
    quantity: 1,
    price: "45.50",
    sku: "APQ-1998244S7A1"
  }],
  shipping_address: {
    first_name: "john",
    last_name: "smith",
    address1: "1692 Avenue du Mont-Royal Est",
    city: "los angeles",
    zip: "90013",
    province: "California",
    country: "United States",
    country_code: "US",
    province_code: "CA"
  }
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
    if (error.details) console.error('Details:', error.details);
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

## License
MIT - See [LICENSE](LICENSE)

## Documentation
For complete API documentation, visit [Apliiq API Docs](https://help.apliiq.com/portal/en/kb/help/api)