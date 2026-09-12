export type HistoricalFXPoint = {
  date: string;
  timestamp: number;
  rate: number;
};

export type HistoricalFXSeries = {
  baseCurrency: string;
  quoteCurrency: string;
  points: HistoricalFXPoint[];
  source: string;
  retrievedAt: string;
  coverageStart?: string;
  coverageEnd?: string;
  error?: string;
};

type YahooFXResult = {
  meta?: { symbol?: string; currency?: string };
  timestamp?: number[];
  indicators?: { quote?: Array<{ close?: Array<number | null> }> };
};

type YahooFXResponse = {
  chart?: {
    result?: YahooFXResult[];
    error?: { description?: string } | null;
  };
};

const SOURCE = 'Yahoo Finance historical FX';

const FX_SYMBOLS: Record<string, string> = {
  EGP: 'EGP=X',
  MAD: 'MAD=X',
  TND: 'TND=X',
  DZD: 'DZD=X',
};

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

async function fetchYahooFX(symbol: string, startDate: string, endDate: string) {
  const period1 = Math.floor(new Date(`${startDate}T00:00:00.000Z`).getTime() / 1000);
  const period2 = Math.floor(new Date(`${endDate}T23:59:59.999Z`).getTime() / 1000) + 1;
  if (!Number.isFinite(period1) || !Number.isFinite(period2) || period2 <= period1) {
    throw new Error('Invalid historical FX date range');
  }

  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set('period1', String(period1));
  url.searchParams.set('period2', String(period2));
  url.searchParams.set('interval', '1d');
  url.searchParams.set('events', 'history');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 iStocks/1.0',
      Accept: 'application/json',
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) throw new Error(`${SOURCE} returned HTTP ${response.status}`);
  const body = (await response.json()) as YahooFXResponse;
  if (body.chart?.error) throw new Error(body.chart.error.description ?? `${SOURCE} chart error`);
  const result = body.chart?.result?.[0];
  if (!result) throw new Error(`${SOURCE} returned no historical FX data`);
  return result;
}

function normalize(result: YahooFXResult): HistoricalFXPoint[] {
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const byDate = new Map<string, HistoricalFXPoint>();

  timestamps.forEach((timestamp, index) => {
    const rate = closes[index];
    if (!Number.isFinite(timestamp) || !finite(rate) || rate <= 0) return;
    const date = new Date(timestamp * 1000);
    if (Number.isNaN(date.getTime())) return;
    const dateKey = date.toISOString().slice(0, 10);
    byDate.set(dateKey, {
      date: date.toISOString(),
      timestamp: date.getTime(),
      rate,
    });
  });

  return [...byDate.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export async function getHistoricalFXSeries(
  currency: string,
  startDate: string,
  endDate: string,
): Promise<HistoricalFXSeries> {
  const normalizedCurrency = currency.trim().toUpperCase();
  const symbol = FX_SYMBOLS[normalizedCurrency];
  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate);
  const retrievedAt = new Date().toISOString();

  if (!symbol) {
    return {
      baseCurrency: 'USD',
      quoteCurrency: normalizedCurrency,
      points: [],
      source: SOURCE,
      retrievedAt,
      error: `No verified free historical FX symbol is configured for ${normalizedCurrency}.`,
    };
  }

  if (!normalizedStart || !normalizedEnd || normalizedStart > normalizedEnd) {
    return {
      baseCurrency: 'USD',
      quoteCurrency: normalizedCurrency,
      points: [],
      source: SOURCE,
      retrievedAt,
      error: 'Invalid historical FX coverage dates.',
    };
  }

  try {
    const result = await fetchYahooFX(symbol, normalizedStart, normalizedEnd);
    const points = normalize(result);
    return {
      baseCurrency: 'USD',
      quoteCurrency: normalizedCurrency,
      points,
      source: SOURCE,
      retrievedAt,
      coverageStart: points[0]?.date,
      coverageEnd: points.at(-1)?.date,
      error: points.length === 0 ? `No valid historical FX observations were returned for ${symbol}.` : undefined,
    };
  } catch (error) {
    return {
      baseCurrency: 'USD',
      quoteCurrency: normalizedCurrency,
      points: [],
      source: SOURCE,
      retrievedAt,
      error: error instanceof Error ? error.message : 'Unknown historical FX provider error',
    };
  }
}

export function findHistoricalFXAtOrBefore(points: HistoricalFXPoint[], date: string) {
  const target = new Date(date).getTime();
  if (!Number.isFinite(target) || points.length === 0) return undefined;

  let lo = 0;
  let hi = points.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.timestamp <= target) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best >= 0 ? points[best] : undefined;
}
