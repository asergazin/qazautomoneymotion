import { getSupabaseServerClient } from "@/lib/supabase";

export async function createLowStockNotifications() {
  const supabase = getSupabaseServerClient();

  const { data: allItems, error } = await supabase
    .from("inventory_items")
    .select("id, name, sku, quantity, min_quantity, manager_bitrix_user_id");

  if (error) {
    throw error;
  }

  const items = (allItems ?? []).filter((x) => Number(x.quantity) <= Number(x.min_quantity));

  if (!items.length) {
    return [] as Array<{ message: string; managerBitrixUserId: number | null }>;
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("notifications")
    .select("metadata")
    .eq("type", "low_stock")
    .gte("created_at", yesterday);

  const existingItemIds = new Set(
    (existing ?? [])
      .map((x) => (x.metadata as { inventory_item_id?: string } | null)?.inventory_item_id)
      .filter(Boolean)
  );

  const created: Array<{ message: string; managerBitrixUserId: number | null }> = [];

  for (const item of items) {
    if (existingItemIds.has(item.id)) {
      continue;
    }

    const message = `Внимание: товар ${item.name} (${item.sku}) ниже минимума. Остаток ${item.quantity}, минимум ${item.min_quantity}.`;

    const { error: insertError } = await supabase.from("notifications").insert({
      type: "low_stock",
      level: "warning",
      message,
      metadata: { inventory_item_id: item.id, sku: item.sku }
    });

    if (!insertError) {
      created.push({ message, managerBitrixUserId: item.manager_bitrix_user_id });
    }
  }

  return created;
}
