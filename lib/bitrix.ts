import { getEnv } from "@/lib/env";
import { CashOperationType } from "@/lib/types";

type BitrixResponse<T> = {
  result: T;
  next?: number;
};

type BitrixSmartItem = {
  id: number;
  title?: string;
  createdTime?: string;
  updatedTime?: string;
  [key: string]: unknown;
};

function normalizeWebhook(base: string) {
  return base.endsWith("/") ? base : `${base}/`;
}

async function bitrixCall<T>(method: string, payload: Record<string, unknown>) {
  const env = getEnv();
  const endpoint = `${normalizeWebhook(env.BITRIX_WEBHOOK_URL)}${method}.json`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bitrix call failed (${method}): ${response.status} ${text}`);
  }

  const json = (await response.json()) as BitrixResponse<T> & {
    error?: string;
    error_description?: string;
  };

  if (json.error) {
    throw new Error(`Bitrix API error (${method}): ${json.error} ${json.error_description ?? ""}`);
  }

  return json;
}

export async function fetchAllCashflowItems() {
  const env = getEnv();
  const entityTypeId = Number(env.BITRIX_CASHFLOW_ENTITY_TYPE_ID);
  const categoryId = Number(env.BITRIX_CASHFLOW_CATEGORY_ID);

  const records: BitrixSmartItem[] = [];
  let start = 0;

  while (true) {
    const response = await bitrixCall<BitrixSmartItem[]>("crm.item.list", {
      entityTypeId,
      filter: { categoryId },
      select: ["*", "uf*"],
      order: { id: "DESC" },
      start
    });

    records.push(...response.result);

    if (typeof response.next !== "number") {
      break;
    }
    start = response.next;
  }

  return records;
}

export async function sendBitrixWarehouseNotification(message: string) {
  const env = getEnv();
  if (!env.BITRIX_NOTIFY_USER_ID) {
    return { skipped: true };
  }

  await bitrixCall("im.notify.system.add", {
    USER_ID: Number(env.BITRIX_NOTIFY_USER_ID),
    MESSAGE: message,
    MESSAGE_OUT: message,
    TAG: "warehouse-min-stock"
  });

  return { skipped: false };
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function mapBitrixCashItem(raw: BitrixSmartItem) {
  const env = getEnv();

  const operationRaw = env.BITRIX_FIELD_OPERATION_TYPE
    ? raw[env.BITRIX_FIELD_OPERATION_TYPE]
    : raw.type;

  const operationString = String(operationRaw ?? raw.title ?? "").toLowerCase();
  const operationType: CashOperationType = operationString.includes("расход")
    ? "expense"
    : "income";

  const amountField = env.BITRIX_FIELD_AMOUNT ? raw[env.BITRIX_FIELD_AMOUNT] : raw.amount;
  const amount = parseNumber(amountField);

  const createdAt = String(raw.createdTime ?? new Date().toISOString());
  const title = String(raw.title ?? `Bitrix #${raw.id}`);

  const pick = (field?: string) => {
    if (!field) return null;
    const val = raw[field];
    return val == null ? null : String(val);
  };

  return {
    bitrix_item_id: String(raw.id),
    title,
    operation_type: operationType,
    amount,
    payment_type: pick(env.BITRIX_FIELD_PAYMENT_TYPE),
    article: pick(env.BITRIX_FIELD_ARTICLE),
    counterparty: pick(env.BITRIX_FIELD_COUNTERPARTY),
    reason: pick(env.BITRIX_FIELD_REASON),
    manager_name: pick(env.BITRIX_FIELD_MANAGER),
    source_payload: raw,
    transaction_date: createdAt,
    created_at: createdAt,
    updated_at: new Date().toISOString()
  };
}

