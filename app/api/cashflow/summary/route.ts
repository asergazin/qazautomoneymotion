import { NextRequest, NextResponse } from "next/server";
import { calcCashSummary } from "@/lib/cashflow";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function parseDate(date?: string | null) {
  const d = date ? new Date(`${date}T00:00:00`) : new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function dayBounds(date: Date) {
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export async function GET(req: NextRequest) {
  try {
    const dateInput = req.nextUrl.searchParams.get("date");
    const date = parseDate(dateInput);
    const dateStr = date.toISOString().slice(0, 10);
    const { start, end } = dayBounds(date);

    const supabase = getSupabaseServerClient();

    const [txRes, inputRes] = await Promise.all([
      supabase
        .from("cash_transactions")
        .select("operation_type, amount")
        .gte("transaction_date", start)
        .lt("transaction_date", end),
      supabase
        .from("cash_daily_inputs")
        .select("*")
        .eq("report_date", dateStr)
        .maybeSingle()
    ]);

    if (txRes.error) {
      throw txRes.error;
    }
    if (inputRes.error) {
      throw inputRes.error;
    }

    const income = (txRes.data ?? [])
      .filter((x) => x.operation_type === "income")
      .reduce((sum, x) => sum + toNumber(x.amount), 0);

    const expense = (txRes.data ?? [])
      .filter((x) => x.operation_type === "expense")
      .reduce((sum, x) => sum + toNumber(x.amount), 0);

    const input = inputRes.data;
    const summary = calcCashSummary({
      date: dateStr,
      openingBalance: toNumber(input?.opening_balance),
      income,
      expense,
      officeCash: toNumber(input?.office_cash),
      homeCash: toNumber(input?.home_cash),
      kaspiPay: toNumber(input?.kaspi_pay),
      kaspiGold: toNumber(input?.kaspi_gold),
      cashInCurrency: toNumber(input?.cash_in_currency),
      goodsInTransit: toNumber(input?.goods_in_transit),
      goodsInWarehouseCost: toNumber(input?.goods_in_warehouse_cost),
      receivables: toNumber(input?.receivables),
      otherCurrentAssets: toNumber(input?.other_current_assets),
      longTermLiabilities: toNumber(input?.long_term_liabilities),
      salaryLiabilities: toNumber(input?.salary_liabilities),
      shortTermLiabilities: toNumber(input?.short_term_liabilities)
    });

    return NextResponse.json({
      summary,
      transactionsCount: txRes.data?.length ?? 0
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build summary" },
      { status: 500 }
    );
  }
}

