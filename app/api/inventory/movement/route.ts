import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const sku = String(body.sku ?? "").trim();
    const movementType = String(body.movementType ?? "");
    const quantity = Number(body.quantity ?? 0);
    const note = String(body.note ?? "").trim();

    if (!sku || !movementType || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: item, error: itemError } = await supabase
      .from("inventory_items")
      .select("id, quantity")
      .eq("sku", sku)
      .single();

    if (itemError) throw itemError;

    let nextQuantity = Number(item.quantity);
    if (movementType === "in") nextQuantity += quantity;
    else if (movementType === "out") nextQuantity -= quantity;
    else if (movementType === "adjustment") nextQuantity = quantity;
    else return NextResponse.json({ error: "Unknown movement type" }, { status: 400 });

    if (nextQuantity < 0) {
      return NextResponse.json({ error: "Quantity can not be negative" }, { status: 400 });
    }

    const { error: movementError } = await supabase.from("inventory_movements").insert({
      inventory_item_id: item.id,
      movement_type: movementType,
      quantity,
      note
    });
    if (movementError) throw movementError;

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ quantity: nextQuantity })
      .eq("id", item.id);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, quantity: nextQuantity });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add movement" },
      { status: 500 }
    );
  }
}

