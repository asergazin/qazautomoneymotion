import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("type", "low_stock")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ items: data ?? [], notifications: notifications ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load inventory" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const payload = {
      sku: String(body.sku ?? "").trim(),
      name: String(body.name ?? "").trim(),
      quantity: Number(body.quantity ?? 0),
      unit: String(body.unit ?? "pcs"),
      purchase_price: Number(body.purchasePrice ?? 0),
      min_quantity: Number(body.minQuantity ?? 0),
      manager_bitrix_user_id:
        body.managerBitrixUserId == null || body.managerBitrixUserId === ""
          ? null
          : Number(body.managerBitrixUserId)
    };

    if (!payload.sku || !payload.name) {
      return NextResponse.json({ error: "SKU and name are required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("inventory_items").upsert(payload, { onConflict: "sku" });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save item" },
      { status: 500 }
    );
  }
}

