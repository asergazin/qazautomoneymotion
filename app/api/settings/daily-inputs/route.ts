import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const reportDate = String(body.reportDate ?? new Date().toISOString().slice(0, 10));

    const payload = {
      report_date: reportDate,
      opening_balance: Number(body.openingBalance ?? 0),
      office_cash: Number(body.officeCash ?? 0),
      home_cash: Number(body.homeCash ?? 0),
      kaspi_pay: Number(body.kaspiPay ?? 0),
      kaspi_gold: Number(body.kaspiGold ?? 0),
      cash_in_currency: Number(body.cashInCurrency ?? 0),
      goods_in_transit: Number(body.goodsInTransit ?? 0),
      goods_in_warehouse_cost: Number(body.goodsInWarehouseCost ?? 0),
      receivables: Number(body.receivables ?? 0),
      other_current_assets: Number(body.otherCurrentAssets ?? 0),
      long_term_liabilities: Number(body.longTermLiabilities ?? 0),
      salary_liabilities: Number(body.salaryLiabilities ?? 0),
      short_term_liabilities: Number(body.shortTermLiabilities ?? 0)
    };

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("cash_daily_inputs")
      .upsert(payload, { onConflict: "report_date" });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save daily inputs" },
      { status: 500 }
    );
  }
}

