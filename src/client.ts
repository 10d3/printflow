// src/client.ts
import axios, { type AxiosInstance, type RawAxiosRequestHeaders } from "axios";
import * as crypto from "crypto";
import { z } from "zod";
import {
  type ApliiqConfig,
  type Product,
  ProductSchema,
  type ApliiqOrder,
  type ApliiqOrderResponse,
  ApliiqOrderSchema,
} from "./types";
import { ApliiqError } from "./errors";

export class ApliiqClient {
  private readonly client: AxiosInstance;

  constructor(private config: ApliiqConfig) {
    this.client = axios.create({
      baseURL: config.endpoint || "https://api.apliiq.com/v1",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: config.timeout || 15000,
    });

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

  // Product API Methods =====================================
  async getProducts(): Promise<Product[]> {
    try {
      const response = await this.client.get("/api/Product");
      return z.array(ProductSchema).parse(response.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  async getProduct(productId: number): Promise<Product> {
    try {
      const response = await this.client.get(`/api/Product/${productId}`);
      return ProductSchema.parse(response.data);
    } catch (error) {
      this.handleError(error);
    }
  }

  // Order API Methods =======================================
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

  // Error Handling ==========================================
  private handleError(error: unknown): never {
    if (error instanceof z.ZodError) {
      throw new ApliiqError(
        "Validation failed: " + error.errors.map((e) => e.message).join(", "),
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

  // Helpers =================================================
  private generateNonce(): string {
    return crypto.randomBytes(16).toString("hex");
  }
}
