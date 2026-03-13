import { NextRequest, NextResponse } from "next/server";
import { buildCashflowWorkbook, calcCashSummary } from "@/lib/cashflow";
import { getSupabaseServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const start = `${date}T00:00:00.000Z`;
    const endDate = new Date(`${date}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end = endDate.toISOString();

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
        .eq("report_date", date)
        .maybeSingle()
    ]);

    if (txRes.error) throw txRes.error;
    if (inputRes.error) throw inputRes.error;

    const income = (txRes.data ?? [])
      .filter((x) => x.operation_type === "income")
      .reduce((sum, x) => sum + toNumber(x.amount), 0);

    const expense = (txRes.data ?? [])
      .filter((x) => x.operation_type === "expense")
      .reduce((sum, x) => sum + toNumber(x.amount), 0);

    const input = inputRes.data;
    const summary = calcCashSummary({
      date,
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

    const buffer = await buildCashflowWorkbook(summary);
    const filename = `cashflow-${date}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${filename}`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 }
    );
  }
}

