export type MarketExchange = {
  code: string;
  name: string;
};

export type MarketConfig = {
  countryCode: string;
  countryName: string;
  flag: string;
  exchangeCode: string;
  exchangeName: string;
  exchanges?: MarketExchange[];
  currencyCode: string;
  currencySymbol: string;
  timezone: string;
  benchmark?: string;
  dataSource: string;
  delay: string;
  lastUpdated: string;
};

export type MarketCompany = {
  id: string;
  countryCode: string;
  exchangeCode: string;
  ticker: string;
  name: string;
  sector?: string;
  industry?: string;
  currency: string;
  price?: number;
  previousClose?: number;
  changePercent?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  sharesOutstanding?: number;
  marketCapLocal?: number;
  marketCapUSD?: number;
  marketCapSource?: 'provider' | 'calculated';
  timestamp?: string;
  dataSource?: string;
  providerTicker?: string;
};

export type HistoricalPricePoint = {
  date: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  adjustedClose?: number;
  volume?: number;
};

export type FinancialValue = {
  value?: number;
  currency?: string;
  period?: string;
  periodType?: 'annual' | 'quarterly' | 'ttm';
  source: string;
  retrievedAt: string;
  methodology?: 'provider' | 'calculated';
};

export type FinancialPeriod = {
  label: string;
  periodType: 'annual' | 'quarterly' | 'ttm';
  fiscalYear?: number;
  quarter?: number;
  startDate?: string;
  endDate?: string;
};

export type CompanyFinancialData = {
  valuation: {
    pe?: FinancialValue;
    ps?: FinancialValue;
    pb?: FinancialValue;
    evRevenue?: FinancialValue;
    evEbitda?: FinancialValue;
    enterpriseValue?: FinancialValue;
  };
  incomeStatement: {
    revenue?: FinancialValue;
    revenueGrowth?: FinancialValue;
    grossProfit?: FinancialValue;
    operatingIncome?: FinancialValue;
    ebitda?: FinancialValue;
    netIncome?: FinancialValue;
    eps?: FinancialValue;
    grossMargin?: FinancialValue;
    operatingMargin?: FinancialValue;
    netMargin?: FinancialValue;
  };
  profitability: {
    roe?: FinancialValue;
    roa?: FinancialValue;
    roic?: FinancialValue;
  };
  balanceSheet: {
    cash?: FinancialValue;
    totalDebt?: FinancialValue;
    netDebt?: FinancialValue;
    totalAssets?: FinancialValue;
    totalLiabilities?: FinancialValue;
    equity?: FinancialValue;
    bookValue?: FinancialValue;
    bookValuePerShare?: FinancialValue;
  };
  cashFlow: {
    operatingCashFlow?: FinancialValue;
    capitalExpenditure?: FinancialValue;
    freeCashFlow?: FinancialValue;
    fcfMargin?: FinancialValue;
  };
  shareholder: {
    sharesOutstanding?: FinancialValue;
    dividendPerShare?: FinancialValue;
    dividendYield?: FinancialValue;
    payoutRatio?: FinancialValue;
    buybacks?: FinancialValue;
  };
  periods: FinancialPeriod[];
  capabilities: {
    quote: boolean;
    historicalPrices: boolean;
    valuation: boolean;
    incomeStatement: boolean;
    balanceSheet: boolean;
    cashFlow: boolean;
    dividends: boolean;
  };
  source: string;
  retrievedAt: string;
  error?: string;
};

export type CompanyMarketData = {
  quote: Partial<MarketCompany>;
  history: HistoricalPricePoint[];
  financials?: CompanyFinancialData;
  source: string;
  retrievedAt: string;
  delay: string;
  providerTicker?: string;
  historyAvailable: boolean;
  error?: string;
};

export type MarketSummary = {
  count: number;
  totalLocal: number;
  totalUSD?: number;
  industries: number;
  fxRate?: number;
  fxSource?: string;
  lastUpdated: string;
  dataSource: string;
  delay: string;
};

export type MarketDataProvider = {
  getCompanies(): Promise<MarketCompany[]>;
  getCompany(ticker: string): Promise<MarketCompany | undefined>;
  getMarketSummary(): Promise<MarketSummary>;
  getFX(): Promise<number | undefined>;
  getMarketStatus(): Promise<'open' | 'closed' | 'auction'>;
};
