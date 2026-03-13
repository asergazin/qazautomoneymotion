export type CashOperationType = "income" | "expense";

export type CashSummary = {
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

export type NotificationLevel = "info" | "warning" | "critical";

