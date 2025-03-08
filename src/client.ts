/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, RawAxiosRequestHeaders } from "axios";
import * as crypto from "crypto";
import { z } from "zod";
import {
  ApliiqConfig,
  Product,
  ProductSchema,
  ApliiqOrder,
  ApliiqOrderResponse,
  ApliiqOrderSchema,
} from "./types";
import { ApliiqError } from "./errors";
import { LRUCache } from "lru-cache";

// Enhanced cache configuration interface
export interface CacheConfig {
  enabled: boolean;
  max?: number;
  ttl?: number;
  staleWhileRevalidate?: boolean;
  products?: {
    ttl?: number;
    batchTTL?: number;
  };
}

// Update your types.ts file to include this updated definition
declare module "./types" {
  export interface ApliiqConfig {
    appId: string;
    sharedSecret: string;
    endpoint?: string;
    timeout?: number;
    cache?: CacheConfig; // Changed from the original basic cache type
  }
}

export class ApliiqClient {
  private readonly client: AxiosInstance;
  private cache?: LRUCache<string, any>;
  private cacheEnabled: boolean;
  private readonly cacheKeyPrefix = "apliiq:";

  constructor(private config: ApliiqConfig) {
    this.cacheEnabled = config.cache?.enabled ?? false;

    if (this.cacheEnabled) {
      this.cache = new LRUCache({
        max: config.cache?.max ?? 1000,
        ttl: config.cache?.ttl ?? 1000 * 60 * 5, // 5 minutes default
        allowStale: config.cache?.staleWhileRevalidate ?? false,
        updateAgeOnGet: true,
        updateAgeOnHas: false,
      });
    }

    this.client = axios.create({
      baseURL: config.endpoint || "https://api.apliiq.com/v1",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: config.timeout ?? 15000,
    });

    this.client.interceptors.request.use((config) => {
      try {
        const rts = Math.floor(Date.now() / 1000).toString();
        const state = this.generateNonce();
        const data = config.data ? JSON.stringify(config.data) : "";
        const base64Content = Buffer.from(data).toString("base64");
        const signatureData = `${this.config.appId}${rts}${state}${base64Content}`;
        const hmac = crypto.createHmac("sha256", this.config.sharedSecret);
        hmac.update(signatureData);
        const sig = hmac.digest("base64");

        (config.headers as RawAxiosRequestHeaders)[
          "Authorization"
        ] = `x-apliiq-auth ${rts}:${sig}:${this.config.appId}:${state}`;

        return config;
      } catch (error) {
        console.error("Error in request interceptor:", error);
        throw error;
      }
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error("Response error:", error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all products with caching support
   */
  async getProducts(): Promise<Product[]> {
    const cacheKey = `${this.cacheKeyPrefix}products:all`;

    // Check cache first
    if (this.cacheEnabled && this.cache?.has(cacheKey)) {
      console.log("Cache hit: Using cached products list");
      return this.cache.get(cacheKey) as Product[];
    }

    try {
      const response = await this.client.get("/Product");
      // console.log("Raw API structure:", response.data);

      // Handle the nested array structure
      let productsArray: Product[] = [];

      if (Array.isArray(response.data)) {
        // Access first element's Products property
        const firstElement = response.data[0];
        if (firstElement?.Products && Array.isArray(firstElement.Products)) {
          productsArray = firstElement.Products;
        } else {
          throw new Error("Unexpected array structure - missing Products key");
        }
      } else if (typeof response.data === "object" && response.data !== null) {
        // Handle non-array responses
        const possibleProductKeys = ["Products", "products", "items"];
        const foundKey = possibleProductKeys.find((key) =>
          Array.isArray(response.data[key])
        );

        productsArray = foundKey ? response.data[foundKey] : [];
      } else {
        throw new Error(`Unexpected response type: ${typeof response.data}`);
      }

      console.log(`Found ${productsArray.length} products`);

      // Cache the result with appropriate TTL
      if (this.cacheEnabled && this.cache) {
        // Use type guards to ensure TypeScript knows config.cache exists
        const productsTTL =
          this.config.cache?.products?.batchTTL ?? this.config.cache?.ttl;
        this.cache.set(cacheKey, productsArray, { ttl: productsTTL });

        // Also cache individual products to avoid duplicate requests
        productsArray.forEach((product) => {
          if (product.Id) {
            const productCacheKey = `${this.cacheKeyPrefix}product:${product.Id}`;
            const singleProductTTL =
              this.config.cache?.products?.ttl ?? this.config.cache?.ttl;
            this.cache?.set(productCacheKey, product, {
              ttl: singleProductTTL,
            });
          }
        });
      }

      return productsArray;
    } catch (error) {
      console.error("Error in getProducts:", error);
      this.handleError(error);
    }
  }

  /**
   * Get a single product by ID with caching support
   */
  async getProduct(id: number): Promise<Product> {
    const cacheKey = `${this.cacheKeyPrefix}product:${id}`;

    // Check cache first
    if (this.cacheEnabled && this.cache?.has(cacheKey)) {
      console.log(`Cache hit: Using cached product ${id}`);
      return this.cache.get(cacheKey) as Product;
    }

    try {
      const response = await this.client.get(`/Product/${id}`);
      const productData = response.data?.data || response.data;

      // Validate the product data
      const validatedProduct = ProductSchema.parse(productData);

      // Cache the result with product-specific TTL
      if (this.cacheEnabled && this.cache) {
        const productTTL =
          this.config.cache?.products?.ttl ?? this.config.cache?.ttl;
        this.cache.set(cacheKey, validatedProduct, { ttl: productTTL });
      }

      return validatedProduct;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      this.handleError(error);
    }
  }

  /**
   * Create an order (not cached as it's a mutation)
   */
  async createOrder(order: ApliiqOrder): Promise<ApliiqOrderResponse> {
    try {
      const response = await this.client.post("/Order", order);
      return ApliiqOrderSchema.parse(response.data);
    } catch (error) {
      console.error("Error creating order:", error);
      this.handleError(error);
    }
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    if (this.cacheEnabled && this.cache) {
      this.cache.clear();
      console.log("Cache cleared");
    }
  }

  /**
   * Clear a specific product from cache
   */
  clearProductCache(id: number): void {
    if (this.cacheEnabled && this.cache) {
      const cacheKey = `${this.cacheKeyPrefix}product:${id}`;
      this.cache.delete(cacheKey);
      console.log(`Product ${id} removed from cache`);
    }
  }

  /**
   * Clear all products from cache
   */
  clearProductsCache(): void {
    if (this.cacheEnabled && this.cache) {
      // Clear the main products list
      this.cache.delete(`${this.cacheKeyPrefix}products:all`);

      // Get all keys in the cache
      const keys = this.cache.keys();

      // Filter and delete all product-related keys
      for (const key of keys) {
        if (key.startsWith(`${this.cacheKeyPrefix}product:`)) {
          this.cache.delete(key);
        }
      }

      console.log("Products cache cleared");
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors);
      throw new ApliiqError(
        `Validation failed: ${error.errors.map((e) => e.message).join(", ")}`,
        400
      );
    }

    if (axios.isAxiosError(error)) {
      throw new ApliiqError(
        error.response?.data?.message || error.message,
        error.response?.status || 500
      );
    }

    throw new ApliiqError(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }

  private generateNonce(): string {
    return crypto.randomBytes(16).toString("hex");
  }
}
