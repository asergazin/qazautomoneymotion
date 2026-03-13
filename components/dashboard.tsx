"use client";

import { useEffect, useMemo, useState } from "react";

type CashSummary = {
  date: string;
  openingBalance: number;
  income: number;
  expense: number;
  netCashflow: number;
  closingBalance: number;
  officeCash: number;
  homeCash: number;
  kaspiPay: number;
  kaspiGold: number;
  cashInCurrency: number;
  goodsInTransit: number;
  goodsInWarehouseCost: number;
  receivables: number;
  otherCurrentAssets: number;
  longTermLiabilities: number;
  salaryLiabilities: number;
  shortTermLiabilities: number;
  totalLiabilities: number;
  netWorkingCapital: number;
};

type InventoryItem = {
  sku: string;
  name: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  purchase_price: number;
};

type NotificationItem = {
  id: string;
  message: string;
  created_at: string;
};

const numberFields = [
  ["openingBalance", "Сальдо на начало дня"],
  ["officeCash", "Деньги в кассе (офис)"],
  ["homeCash", "Деньги в кассе (дом)"],
  ["kaspiPay", "Kaspi Pay"],
  ["kaspiGold", "Kaspi Gold"],
  ["cashInCurrency", "Деньги в валюте"],
  ["goodsInTransit", "Товар в пути"],
  ["goodsInWarehouseCost", "Товар на складе (себес)"],
  ["receivables", "Дебиторка"],
  ["otherCurrentAssets", "Прочие оборотные средства"],
  ["longTermLiabilities", "Долгосрочные обязательства"],
  ["salaryLiabilities", "Зарплата"],
  ["shortTermLiabilities", "Краткосрочные обязательства"]
] as const;

function fmtMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value || 0);
}

export function Dashboard() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [tab, setTab] = useState<"cashflow" | "warehouse">("cashflow");
  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [status, setStatus] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [itemForm, setItemForm] = useState({
    sku: "",
    name: "",
    quantity: "0",
    minQuantity: "0",
    purchasePrice: "0",
    unit: "pcs",
    managerBitrixUserId: ""
  });
  const [movement, setMovement] = useState({ sku: "", movementType: "out", quantity: "1", note: "" });

  const loadSummary = async (targetDate: string) => {
    const res = await fetch(`/api/cashflow/summary?date=${targetDate}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Ошибка загрузки ДДС");
    }
    setSummary(json.summary);
  };

  const loadInventory = async () => {
    const res = await fetch("/api/inventory/items", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || "Ошибка загрузки склада");
    }
    setItems(json.items);
    setNotifications(json.notifications);
  };

  useEffect(() => {
    loadSummary(date).catch((e: Error) => setStatus({ type: "error", text: e.message }));
    loadInventory().catch((e: Error) => setStatus({ type: "error", text: e.message }));
  }, [date]);

  useEffect(() => {
    if (!summary) return;
    setInputs({
      openingBalance: String(summary.openingBalance ?? 0),
      officeCash: String(summary.officeCash ?? 0),
      homeCash: String(summary.homeCash ?? 0),
      kaspiPay: String(summary.kaspiPay ?? 0),
      kaspiGold: String(summary.kaspiGold ?? 0),
      cashInCurrency: String(summary.cashInCurrency ?? 0),
      goodsInTransit: String(summary.goodsInTransit ?? 0),
      goodsInWarehouseCost: String(summary.goodsInWarehouseCost ?? 0),
      receivables: String(summary.receivables ?? 0),
      otherCurrentAssets: String(summary.otherCurrentAssets ?? 0),
      longTermLiabilities: String(summary.longTermLiabilities ?? 0),
      salaryLiabilities: String(summary.salaryLiabilities ?? 0),
      shortTermLiabilities: String(summary.shortTermLiabilities ?? 0)
    });
  }, [summary]);

  const handleSaveInputs = async () => {
    try {
      setSaving(true);
      const payload: Record<string, unknown> = { reportDate: date };
      numberFields.forEach(([key]) => {
        payload[key] = Number(inputs[key] ?? 0);
      });

      const res = await fetch("/api/settings/daily-inputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось сохранить");

      await loadSummary(date);
      setStatus({ type: "ok", text: "Ручные поля ДДС сохранены" });
    } catch (e) {
      setStatus({ type: "error", text: e instanceof Error ? e.message : "Ошибка сохранения" });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncBitrix = async () => {
    try {
      const res = await fetch("/api/sync/bitrix/cashflow", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Ошибка синхронизации");
      await loadSummary(date);
      setStatus({ type: "ok", text: `Синхронизировано записей: ${json.synced}` });
    } catch (e) {
      setStatus({ type: "error", text: e instanceof Error ? e.message : "Ошибка синхронизации" });
    }
  };

  const handleAddItem = async () => {
    try {
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemForm)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось сохранить товар");
      setItemForm({
        sku: "",
        name: "",
        quantity: "0",
        minQuantity: "0",
        purchasePrice: "0",
        unit: "pcs",
        managerBitrixUserId: ""
      });
      await loadInventory();
      setStatus({ type: "ok", text: "Товар сохранен" });
    } catch (e) {
      setStatus({ type: "error", text: e instanceof Error ? e.message : "Ошибка" });
    }
  };

  const handleMovement = async () => {
    try {
      const res = await fetch("/api/inventory/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movement)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Не удалось сохранить движение");
      await loadInventory();
      setStatus({ type: "ok", text: "Движение товара сохранено" });
    } catch (e) {
      setStatus({ type: "error", text: e instanceof Error ? e.message : "Ошибка" });
    }
  };

  return (
    <main>
      <h1>Qaz Auto Money Motion</h1>
      <div className="tabs">
        <button className={`tab ${tab === "cashflow" ? "active" : ""}`} onClick={() => setTab("cashflow")}>
          Движение ДС
        </button>
        <button className={`tab ${tab === "warehouse" ? "active" : ""}`} onClick={() => setTab("warehouse")}>
          Складской учет
        </button>
      </div>

      {status && <div className={`alert ${status.type}`}>{status.text}</div>}

      {tab === "cashflow" && (
        <div className="panel">
          <div className="row">
            <div className="field">
              <label>Дата отчета</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="actions">
            <button onClick={handleSyncBitrix}>Синхронизировать из Bitrix</button>
            <button className="secondary" onClick={() => window.open(`/api/cashflow/report?date=${date}`, "_blank")}>
              Скачать Excel отчет
            </button>
          </div>

          <h3>Ручные поля (как в вашем шаблоне)</h3>
          <div className="row">
            {numberFields.map(([key, label]) => (
              <div className="field" key={key}>
                <label>{label}</label>
                <input
                  type="number"
                  value={inputs[key] ?? "0"}
                  onChange={(e) => setInputs((s) => ({ ...s, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div className="actions">
            <button onClick={handleSaveInputs} disabled={saving}>
              {saving ? "Сохраняю..." : "Сохранить ручные поля"}
            </button>
          </div>

          {summary && (
            <table>
              <thead>
                <tr>
                  <th>Показатель</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Сальдо на начало дня</td><td>{fmtMoney(summary.openingBalance)}</td></tr>
                <tr><td>Поступление ДС</td><td>{fmtMoney(summary.income)}</td></tr>
                <tr><td>Платежи ДС</td><td>{fmtMoney(summary.expense)}</td></tr>
                <tr><td>Чистый денежный поток</td><td>{fmtMoney(summary.netCashflow)}</td></tr>
                <tr><td>Сальдо на конец дня</td><td>{fmtMoney(summary.closingBalance)}</td></tr>
                <tr><td>Итого обязательства</td><td>{fmtMoney(summary.totalLiabilities)}</td></tr>
                <tr><td>ЧОК</td><td>{fmtMoney(summary.netWorkingCapital)}</td></tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "warehouse" && (
        <div className="panel">
          <h3>Добавить / обновить товар</h3>
          <div className="row">
            <div className="field"><label>SKU</label><input value={itemForm.sku} onChange={(e) => setItemForm((s) => ({ ...s, sku: e.target.value }))} /></div>
            <div className="field"><label>Название</label><input value={itemForm.name} onChange={(e) => setItemForm((s) => ({ ...s, name: e.target.value }))} /></div>
            <div className="field"><label>Количество</label><input type="number" value={itemForm.quantity} onChange={(e) => setItemForm((s) => ({ ...s, quantity: e.target.value }))} /></div>
            <div className="field"><label>Мин. остаток</label><input type="number" value={itemForm.minQuantity} onChange={(e) => setItemForm((s) => ({ ...s, minQuantity: e.target.value }))} /></div>
            <div className="field"><label>Закуп. цена</label><input type="number" value={itemForm.purchasePrice} onChange={(e) => setItemForm((s) => ({ ...s, purchasePrice: e.target.value }))} /></div>
            <div className="field"><label>Ед.</label><input value={itemForm.unit} onChange={(e) => setItemForm((s) => ({ ...s, unit: e.target.value }))} /></div>
            <div className="field"><label>ID кладовщика в Bitrix</label><input value={itemForm.managerBitrixUserId} onChange={(e) => setItemForm((s) => ({ ...s, managerBitrixUserId: e.target.value }))} /></div>
          </div>

          <div className="actions">
            <button onClick={handleAddItem}>Сохранить товар</button>
          </div>

          <h3>Движение товара</h3>
          <div className="row">
            <div className="field"><label>SKU</label><input value={movement.sku} onChange={(e) => setMovement((s) => ({ ...s, sku: e.target.value }))} /></div>
            <div className="field">
              <label>Тип операции</label>
              <select value={movement.movementType} onChange={(e) => setMovement((s) => ({ ...s, movementType: e.target.value }))}>
                <option value="in">Приход</option>
                <option value="out">Расход</option>
                <option value="adjustment">Корректировка</option>
              </select>
            </div>
            <div className="field"><label>Количество</label><input type="number" value={movement.quantity} onChange={(e) => setMovement((s) => ({ ...s, quantity: e.target.value }))} /></div>
            <div className="field"><label>Комментарий</label><input value={movement.note} onChange={(e) => setMovement((s) => ({ ...s, note: e.target.value }))} /></div>
          </div>

          <div className="actions">
            <button onClick={handleMovement}>Сохранить движение</button>
          </div>

          <h3>Остатки</h3>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Товар</th>
                <th>Остаток</th>
                <th>Мин. остаток</th>
                <th>Ед.</th>
                <th>Себестоимость остатка</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.sku} className={item.quantity <= item.min_quantity ? "warn" : ""}>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.min_quantity}</td>
                  <td>{item.unit}</td>
                  <td>{fmtMoney(item.quantity * item.purchase_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Последние уведомления</h3>
          <table>
            <thead>
              <tr>
                <th>Время</th>
                <th>Сообщение</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => (
                <tr key={n.id}>
                  <td>{new Date(n.created_at).toLocaleString("ru-RU")}</td>
                  <td>{n.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}