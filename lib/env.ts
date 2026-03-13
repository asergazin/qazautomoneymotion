import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  BITRIX_WEBHOOK_URL: z.string().url(),
  BITRIX_CASHFLOW_ENTITY_TYPE_ID: z.string().default("1060"),
  BITRIX_CASHFLOW_CATEGORY_ID: z.string().default("0"),
  CRON_SECRET: z.string().min(4),
  BITRIX_NOTIFY_USER_ID: z.string().optional(),
  BITRIX_FIELD_OPERATION_TYPE: z.string().optional(),
  BITRIX_FIELD_AMOUNT: z.string().optional(),
  BITRIX_FIELD_PAYMENT_TYPE: z.string().optional(),
  BITRIX_FIELD_ARTICLE: z.string().optional(),
  BITRIX_FIELD_COUNTERPARTY: z.string().optional(),
  BITRIX_FIELD_REASON: z.string().optional(),
  BITRIX_FIELD_MANAGER: z.string().optional()
});

export function getEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }
  return parsed.data;
}

