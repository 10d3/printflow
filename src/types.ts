import { z } from 'zod';

// Configuration Types ======================================
export interface ApliiqConfig {
  appId: string;
  sharedSecret: string;
  endpoint?: string;
  timeout?: number;
  cache?: {
    max?: number;
    ttl?: number;
    enabled?: boolean;
  };
}

// Product API Types =========================================
const ProductSizeSchema = z.object({
  Weight: z.string(),
  PlusSize_Fee: z.number(),
  Id: z.number(),
  Name: z.string()
});

const ColorSchema = z.object({
  Id: z.number(),
  Name: z.string()
});

const ServiceColorSchema = z.object({
  HexColorCode: z.string(),
  PantoneColorCode: z.string(),
  EmbroideryColorCode: z.string(),
  RBG: z.string()
});

const ServiceSchema = z.object({
  Alt_Name: z.string().optional(),
  AvailableColors: z.array(ServiceColorSchema).optional(),
  Id: z.number(),
  Name: z.string()
});

const SubscriptionSchema = z.object({
  SavedDesign: z.object({
    ProductId: z.number(),
    Id: z.number()
  }),
  RemainInventory: z.number(),
  Type: z.string(),
  Placements: z.array(z.object({
    Id: z.number(),
    Name: z.string()
  })),
  Id: z.number(),
  Name: z.string(),
  ImagePath: z.string()
});

const LocationSchema = z.object({
  Id: z.number(),
  Name: z.string()
});

export const ProductSchema = z.object({
  Code: z.string(),
  SKU: z.string(),
  Sizes: z.array(ProductSizeSchema),
  Features: z.string().optional(),
  Benefits: z.string().optional(),
  Colors: z.array(ColorSchema).optional(),
  Services: z.array(ServiceSchema).optional(),
  Price: z.number().optional(),
  Currency_Code: z.string().optional(),
  Subscriptions: z.array(SubscriptionSchema).optional(),
  Locations: z.array(LocationSchema).optional(),
  DetailName: z.string().optional(),
  Id: z.number(),
  Name: z.string(),
  Description: z.string().optional()
});

export type Product = z.infer<typeof ProductSchema>;
export type ProductSize = z.infer<typeof ProductSizeSchema>;
export type Service = z.infer<typeof ServiceSchema>;

// Order API Types ===========================================
const LineItemSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  name: z.string().optional(),
  quantity: z.number().positive(),
  price: z.string().regex(/^\d+\.\d{2}$/),
  sku: z.string().startsWith('APQ-'),
  grams: z.number().optional()
}).refine(data => !!data.title || !!data.name, {
  message: 'Line item requires either title or name'
});

const ShippingAddressSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  zip: z.string(),
  province: z.string(),
  country: z.string(),
  country_code: z.string().length(2),
  province_code: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.country_code === 'US' && !data.province_code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'province_code required for US addresses'
    });
  }
});

export const ApliiqOrderSchema = z.object({
  number: z.number().positive(),
  name: z.string(),
  order_number: z.number().positive(),
  line_items: z.array(LineItemSchema).min(1),
  billing_address: z.any().optional(),
  shipping_address: ShippingAddressSchema,
  shipping_lines: z.array(
    z.object({ code: z.enum(['standard', 'upgraded', 'rush']) })
  ).optional()
});

export type ApliiqOrder = z.infer<typeof ApliiqOrderSchema>;
export type ApliiqOrderResponse = { id: number };