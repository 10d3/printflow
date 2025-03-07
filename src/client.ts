// src/client.ts
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

export class ApliiqClient {
  private readonly client: AxiosInstance;
  private cache?: LRUCache<string, any>;

  constructor(private config: ApliiqConfig) {
    // Initialize cache if enabled
    if (config.cache?.enabled) {
      this.cache = new LRUCache({
        max: config.cache.max ?? 1000,
        ttl: config.cache.ttl ?? 1000 * 60 * 5, // 5 minutes default
      });
    }

    // Configure axios instance
    this.client = axios.create({
      baseURL: config.endpoint || "https://api.apliiq.com/v1",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: config.timeout ?? 15000,
    });

    // Add authentication interceptor
    this.client.interceptors.request.use((config) => {
      const rts = Math.floor(Date.now() / 1000).toString();
      const state = this.generateNonce();
      const data = config.data ? JSON.stringify(config.data) : "";

      const base64Content = Buffer.from(data).toString("base64");
      const signatureData = `${this.config.appId}${rts}${state}${base64Content}`;

      const hmac = crypto.createHmac("sha256", this.config.sharedSecret);
      hmac.update(signatureData);
      const sig = hmac.digest("base64");

      (config.headers as RawAxiosRequestHeaders)[
        "x-apliiq-auth"
      ] = `${rts}:${sig}:${this.config.appId}:${state}`;

      return config;
    });
  }

  // ======================
  // PRODUCT METHODS
  // ======================

  async getProducts(): Promise<Product[]> {
    try {
      const response = await this.client.get("/api/Product");
      return z.array(ProductSchema).parse(response.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  async getProduct(productId: number): Promise<Product> {
    const cacheKey = `product:${productId}`;

    try {
      // Check cache first
      if (this.cache?.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Fetch from API
      const response = await this.client.get(`/api/Product/${productId}`);
      const product = ProductSchema.parse(response.data);

      // Update cache
      if (this.cache) {
        this.cache.set(cacheKey, product);
      }

      return product;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ======================
  // ORDER METHODS
  // ======================

  async createOrder(orderData: ApliiqOrder): Promise<ApliiqOrderResponse> {
    try {
      const parsedData = ApliiqOrderSchema.parse(orderData);
      const response = await this.client.post<ApliiqOrderResponse>(
        "/Order",
        parsedData
      );

      if (response.status === 202) {
        console.warn("Order accepted but not processed:", response.data);
      }

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  // ======================
  // PRIVATE METHODS
  // ======================

  private handleError(error: unknown): never {
    if (error instanceof z.ZodError) {
      throw new ApliiqError(
        `Validation failed: ${error.errors.map((e) => e.message).join(", ")}`,
        400
      );
    }

    if (axios.isAxiosError(error)) {
      throw new ApliiqError(
        error.response?.data?.message || error.message,
        error.response?.status || 500,
        error.response?.data
      );
    }

    throw new ApliiqError("Unknown error occurred", 500);
  }

  private generateNonce(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  // ======================
  // CACHE MANAGEMENT
  // ======================

  clearCache(): void {
    this.cache?.clear();
  }

  getCacheStats(): { size: number } | undefined {
    return this.cache
      ? {
          size: this.cache.size,
        }
      : undefined;
  }
}
