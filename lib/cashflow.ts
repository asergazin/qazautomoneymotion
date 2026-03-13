import ExcelJS from "exceljs";
import { CashSummary } from "@/lib/types";

export function calcCashSummary(params: {
  date: string;
  openingBalance: number;
  income: number;
  expense: number;
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
}) {
  const netCashflow = params.income - params.expense;
  const closingBalance = params.openingBalance + netCashflow;
  const totalLiabilities =
    params.longTermLiabilities + params.salaryLiabilities + params.shortTermLiabilities;

  const currentAssetsTotal =
    params.officeCash +
    params.homeCash +
    params.kaspiPay +
    params.kaspiGold +
    params.cashInCurrency +
    params.goodsInTransit +
    params.goodsInWarehouseCost +
    params.receivables +
    params.otherCurrentAssets;

  const netWorkingCapital = currentAssetsTotal - totalLiabilities;

  const summary: CashSummary = {
    date: params.date,
    openingBalance: params.openingBalance,
    income: params.income,
    expense: params.expense,
    netCashflow,
    closingBalance,
    officeCash: params.officeCash,
    homeCash: params.homeCash,
    kaspiPay: params.kaspiPay,
    kaspiGold: params.kaspiGold,
    cashInCurrency: params.cashInCurrency,
    goodsInTransit: params.goodsInTransit,
    goodsInWarehouseCost: params.goodsInWarehouseCost,
    receivables: params.receivables,
    otherCurrentAssets: params.otherCurrentAssets,
    longTermLiabilities: params.longTermLiabilities,
    salaryLiabilities: params.salaryLiabilities,
    shortTermLiabilities: params.shortTermLiabilities,
    totalLiabilities,
    netWorkingCapital
  };

  return summary;
}

export async function buildCashflowWorkbook(summary: CashSummary) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("ДДС");

  ws.columns = [
    { width: 45 },
    { width: 26 },
    { width: 62 },
    { width: 22 }
  ];

  ws.getCell("A1").value = "";
  ws.getCell("B1").value = "Текущий день";
  ws.getCell("C1").value = "Комментарии";
  ws.getCell("D1").value = "Сумма в рублях";

  const rows: Array<[string, number | string, string]> = [
    ["Сальдо на начало дня", summary.openingBalance, "Остаток вчерашнего дня"],
    ["Поступление ДС", summary.income, "Приход текущего дня (сумма карточек)"],
    ["Платежи ДС", summary.expense, "Расход текущего дня (сумма карточек)"],
    ["ЧИСТЫЙ ДЕНЕЖНЫЙ ПОТОК", summary.netCashflow, "Чистый доход на текущий день"],
    ["Деньги в кассе (офис)", summary.officeCash, "Вручную вводится"],
    ["Деньги в кассе (дом)", summary.homeCash, "Вручную вводится"],
    ["Деньги в р/счете (Kaspi Pay)", summary.kaspiPay, "Вручную вводится"],
    ["Деньги в р/счете (Kaspi Gold)", summary.kaspiGold, "Вручную вводится"],
    ["Деньги в валюте", summary.cashInCurrency, "Вручную вводится"],
    ["Товар в пути (себес тенге)", summary.goodsInTransit, "Вручную вводится"],
    ["Товар на складе (себес тенге)", summary.goodsInWarehouseCost, "Сумма товара на складе"],
    ["Дебиторка", summary.receivables, "Вручную вводится"],
    ["Прочие оборотные средства", summary.otherCurrentAssets, "Вручную вводится"],
    ["Сальдо на конец дня", summary.closingBalance, "Остаток текущего дня"],
    ["Долгосрочные обязательства", summary.longTermLiabilities, ""],
    ["Зарплата", summary.salaryLiabilities, ""],
    ["Краткосрочные обязательства", summary.shortTermLiabilities, ""],
    ["ИТОГО обязательства", summary.totalLiabilities, ""],
    ["ЧИСТЫЙ ОБОРОТНЫЙ КАПИТАЛ (ЧОК)", summary.netWorkingCapital, ""],
    ["Дата", summary.date, "Сформировано автоматически"]
  ];

  rows.forEach((row, idx) => {
    const line = idx + 2;
    ws.getCell(`A${line}`).value = row[0];
    ws.getCell(`B${line}`).value = row[1] as string | number;
    ws.getCell(`C${line}`).value = row[2];
  });

  ws.getColumn(2).numFmt = "#,##0.00";

  [1, 15, 19].forEach((line) => {
    ws.getCell(`A${line}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" }
    };
    ws.getCell(`B${line}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" }
    };
  });

  ws.getCell("A20").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFB6D7A8" }
  };
  ws.getCell("B20").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFB6D7A8" }
  };

  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

