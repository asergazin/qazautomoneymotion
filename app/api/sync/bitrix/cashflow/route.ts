import { NextResponse } from "next/server";
import { fetchAllCashflowItems, mapBitrixCashItem } from "@/lib/bitrix";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const rawItems = await fetchAllCashflowItems();
    const rows = rawItems.map(mapBitrixCashItem).filter((x) => x.amount > 0);

    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from("cash_transactions")
      .upsert(rows, { onConflict: "bitrix_item_id" });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, synced: rows.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

