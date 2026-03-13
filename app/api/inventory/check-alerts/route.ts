import { NextRequest, NextResponse } from "next/server";
import { sendBitrixWarehouseNotification } from "@/lib/bitrix";
import { getEnv } from "@/lib/env";
import { createLowStockNotifications } from "@/lib/inventory";

export const dynamic = "force-dynamic";

async function runCheck() {
  const created = await createLowStockNotifications();
  for (const alert of created) {
    await sendBitrixWarehouseNotification(alert.message);
  }
  return created.length;
}

function isAuthorized(req: NextRequest) {
  const env = getEnv();
  const headerSecret = req.headers.get("x-cron-secret");
  const querySecret = req.nextUrl.searchParams.get("secret");
  return headerSecret === env.CRON_SECRET || querySecret === env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const alertsCreated = await runCheck();
    return NextResponse.json({ ok: true, alertsCreated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check alerts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const alertsCreated = await runCheck();
    return NextResponse.json({ ok: true, alertsCreated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check alerts" },
      { status: 500 }
    );
  }
}
