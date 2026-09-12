import type {CompanyFinancialData,FinancialPeriod,FinancialValue,HistoricalPricePoint,MarketCompany} from '@/lib/markets/types';

type YahooChartResult={
  meta?:{symbol?:string;currency?:string;regularMarketPrice?:number;previousClose?:number;chartPreviousClose?:number;regularMarketTime?:number;exchangeTimezoneName?:string;fullExchangeName?:string};
  timestamp?:number[];
  indicators?:{quote?:Array<{open?:Array<number|null>;high?:Array<number|null>;low?:Array<number|null>;close?:Array<number|null>;volume?:Array<number|null>}>;adjclose?:Array<{adjclose?:Array<number|null>}>};
};
type YahooResponse={chart?:{result?:YahooChartResult[];error?:{description?:string}|null}};
type YahooRaw={raw?:number;fmt?:string};
type YahooPeriodValue=YahooRaw & {asOfDate?:string;periodType?:string};
type YahooModule={
  currentPrice?:YahooRaw;marketCap?:YahooRaw;enterpriseValue?:YahooRaw;trailingPE?:YahooRaw;priceToSalesTrailing12Months?:YahooRaw;priceToBook?:YahooRaw;enterpriseToRevenue?:YahooRaw;enterpriseToEbitda?:YahooRaw;
  totalRevenue?:YahooRaw;revenueGrowth?:YahooRaw;grossProfits?:YahooRaw;operatingIncome?:YahooRaw;ebitda?:YahooRaw;netIncomeToCommon?:YahooRaw;trailingEps?:YahooRaw;grossMargins?:YahooRaw;operatingMargins?:YahooRaw;profitMargins?:YahooRaw;
  returnOnEquity?:YahooRaw;returnOnAssets?:YahooRaw;returnOnCapital?:YahooRaw;totalCash?:YahooRaw;totalDebt?:YahooRaw;totalAssets?:YahooRaw;totalLiab?:YahooRaw;stockholdersEquity?:YahooRaw;bookValue?:YahooRaw;freeCashflow?:YahooRaw;operatingCashflow?:YahooRaw;capitalExpenditures?:YahooRaw;dividendRate?:YahooRaw;dividendYield?:YahooRaw;payoutRatio?:YahooRaw;sharesOutstanding?:YahooRaw;
};
type YahooSummaryResponse={quoteSummary?:{result?:Array<{price?:YahooModule;summaryDetail?:YahooModule;defaultKeyStatistics?:YahooModule;financialData?:YahooModule;incomeStatementHistory?:{incomeStatementHistory?:Array<Record<string,YahooPeriodValue>>};balanceSheetHistory?:{balanceSheetStatements?:Array<Record<string,YahooPeriodValue>>};cashflowStatementHistory?:{cashflowStatements?:Array<Record<string,YahooPeriodValue>>}}>;error?:{description?:string}|null}};

type YahooSearchResponse={quotes?:Array<{symbol?:string;shortname?:string;longname?:string;quoteType?:string;exchange?:string}>};

const YAHOO_SUFFIX:Record<string,string>={EG:'.CA',MA:'.CS',TN:'.TN'};
const YAHOO_SOURCE='Yahoo Finance';

function finite(value:number|null|undefined):value is number{return typeof value==='number'&&Number.isFinite(value);}
function raw(value:YahooRaw|undefined){return finite(value?.raw)?value.raw:undefined;}
function providerTicker(countryCode:string,ticker:string){const clean=ticker.trim().toUpperCase();if(clean.includes('.'))return clean;const suffix=YAHOO_SUFFIX[countryCode.toUpperCase()];return suffix?`${clean}${suffix}`:undefined;}

async function fetchJson<T>(url:string,init?:RequestInit):Promise<T>{
  const response=await fetch(url,{...init,headers:{'User-Agent':'Mozilla/5.0 iStocks/1.0','Accept':'application/json',...(init?.headers??{})}});
  if(!response.ok)throw new Error(`${YAHOO_SOURCE} returned HTTP ${response.status}`);
  return (await response.json()) as T;
}

async function fetchYahooChart(symbol:string,range:'1d'|'5d'|'1mo'|'3mo'|'6mo'|'1y'|'3y'|'5y'|'max'){
  const url=new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set('range',range);url.searchParams.set('interval',range==='1d'?'5m':'1d');url.searchParams.set('events','div,splits');
  const body=await fetchJson<YahooResponse>(url.toString(),{next:{revalidate:300}} as RequestInit & {next?:{revalidate:number}});
  if(body.chart?.error)throw new Error(body.chart.error.description??`${YAHOO_SOURCE} chart error`);
  const result=body.chart?.result?.[0];if(!result)throw new Error(`${YAHOO_SOURCE} returned no chart data`);return result;
}

async function resolveYahooSymbol(company:MarketCompany):Promise<string|undefined>{
  const direct=providerTicker(company.countryCode,company.ticker);
  if(direct){try{const result=await fetchYahooChart(direct,'5d');if(result.timestamp?.length)return direct;}catch{}}
  const url=new URL('https://query1.finance.yahoo.com/v1/finance/search');
  url.searchParams.set('q',`${company.ticker} ${company.name}`);url.searchParams.set('quotesCount','10');url.searchParams.set('newsCount','0');
  try{
    const body=await fetchJson<YahooSearchResponse>(url.toString(),{next:{revalidate:86400}} as RequestInit & {next?:{revalidate:number}});
    const candidates=(body.quotes??[]).filter(q=>q.quoteType==='EQUITY'&&q.symbol);
    const exact=candidates.find(q=>q.symbol?.toUpperCase()===direct?.toUpperCase());
    const sameTicker=candidates.find(q=>q.symbol?.split('.')[0]?.toUpperCase()===company.ticker.toUpperCase());
    const sameName=candidates.find(q=>`${q.longname??''} ${q.shortname??''}`.toLowerCase().includes(company.name.toLowerCase().split(' ')[0]));
    return exact?.symbol??sameTicker?.symbol??sameName?.symbol;
  }catch{return undefined;}
}

function normalizeHistory(result:YahooChartResult):HistoricalPricePoint[]{
  const timestamps=result.timestamp??[];const quote=result.indicators?.quote?.[0]??{};const adjusted=result.indicators?.adjclose?.[0]?.adjclose??[];const points:HistoricalPricePoint[]=[];
  timestamps.forEach((timestamp,index)=>{const close=quote.close?.[index];if(!finite(close))return;points.push({date:new Date(timestamp*1000).toISOString(),close,open:finite(quote.open?.[index])?quote.open?.[index]:undefined,high:finite(quote.high?.[index])?quote.high?.[index]:undefined,low:finite(quote.low?.[index])?quote.low?.[index]:undefined,adjustedClose:finite(adjusted[index])?adjusted[index]:undefined,volume:finite(quote.volume?.[index])?quote.volume?.[index]:undefined});});
  return points.sort((a,b)=>a.date.localeCompare(b.date));
}

function buildQuote(result:YahooChartResult,company:MarketCompany):Partial<MarketCompany>{
  const meta=result.meta??{};const latest=result.indicators?.quote?.[0];const close=latest?.close?.filter(finite).at(-1);const previous=finite(meta.previousClose)?meta.previousClose:finite(meta.chartPreviousClose)?meta.chartPreviousClose:undefined;const price=finite(meta.regularMarketPrice)?meta.regularMarketPrice:close;const open=latest?.open?.filter(finite).at(-1);const high=latest?.high?.filter(finite).at(-1);const low=latest?.low?.filter(finite).at(-1);const volume=latest?.volume?.filter(finite).at(-1);const changePercent=price!==undefined&&previous!==undefined&&previous!==0?((price-previous)/previous)*100:company.changePercent;const timestamp=meta.regularMarketTime?new Date(meta.regularMarketTime*1000).toISOString():new Date().toISOString();const marketCapLocal=price!==undefined&&company.sharesOutstanding!==undefined?price*company.sharesOutstanding:company.marketCapLocal;
  return {...company,price,previousClose:previous??company.previousClose,changePercent,open:open??company.open,high:high??company.high,low:low??company.low,volume:volume??company.volume,marketCapLocal,marketCapUSD:marketCapLocal!==undefined&&company.marketCapUSD!==undefined&&company.marketCapLocal?company.marketCapUSD*(marketCapLocal/company.marketCapLocal):company.marketCapUSD,marketCapSource:marketCapLocal!==undefined&&company.sharesOutstanding!==undefined&&price!==undefined?'calculated':company.marketCapSource,timestamp,dataSource:YAHOO_SOURCE,providerTicker:meta.symbol};
}

function value(rawValue:number|undefined,period?:string,periodType?:'annual'|'quarterly'|'ttm',currency?:string,methodology:'provider'|'calculated'='provider'):FinancialValue|undefined{return rawValue===undefined?undefined:{value:rawValue,period,periodType,currency,source:YAHOO_SOURCE,retrievedAt:new Date().toISOString(),methodology};}
function latestStatementValue(statements:Array<Record<string,YahooPeriodValue>>|undefined,field:string):YahooPeriodValue|undefined{return statements?.map(statement=>statement[field]).filter(Boolean).sort((a,b)=>(b.asOfDate??'').localeCompare(a.asOfDate??''))[0];}
function periodFromDate(date:string|undefined,type:'annual'|'quarterly'):FinancialPeriod|undefined{if(!date)return undefined;const d=new Date(date);if(Number.isNaN(d.getTime()))return undefined;return {label:type==='annual'?`FY ${d.getUTCFullYear()}`:`${d.toLocaleString('en-US',{month:'short',timeZone:'UTC'})} ${d.getUTCFullYear()}`,periodType:type,endDate:date,fiscalYear:d.getUTCFullYear(),quarter:type==='quarterly'?Math.floor(d.getUTCMonth()/3)+1:undefined};}

async function fetchYahooFinancials(symbol:string,currency:string):Promise<CompanyFinancialData>{
  const url=new URL(`https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`);url.searchParams.set('modules','price,summaryDetail,defaultKeyStatistics,financialData,incomeStatementHistory,balanceSheetHistory,cashflowStatementHistory');
  const retrievedAt=new Date().toISOString();
  const empty=(error?:string):CompanyFinancialData=>({valuation:{},incomeStatement:{},profitability:{},balanceSheet:{},cashFlow:{},shareholder:{},periods:[],capabilities:{quote:false,historicalPrices:false,valuation:false,incomeStatement:false,balanceSheet:false,cashFlow:false,dividends:false},source:YAHOO_SOURCE,retrievedAt,error});
  try{
    const body=await fetchJson<YahooSummaryResponse>(url.toString(),{next:{revalidate:21600}} as RequestInit & {next?:{revalidate:number}});const item=body.quoteSummary?.result?.[0];if(!item)return empty(body.quoteSummary?.error?.description??'No fundamental data returned');
    const p=item.price??{},s=item.summaryDetail??{},k=item.defaultKeyStatistics??{},f=item.financialData??{};const income=item.incomeStatementHistory?.incomeStatementHistory??[];const balance=item.balanceSheetHistory?.balanceSheetStatements??[];const cash=item.cashflowStatementHistory?.cashflowStatements??[];
    const revenue=raw(f.totalRevenue??p.totalRevenue);const netIncome=raw(f.netIncomeToCommon??p.netIncomeToCommon);const eps=raw(k.trailingEps??f.trailingEps??p.trailingEps);const grossProfit=raw(f.grossProfits);const operatingIncome=raw(f.operatingIncome);const ebitda=raw(f.ebitda);const cashValue=raw(f.totalCash);const debt=raw(f.totalDebt);const assets=raw(f.totalAssets);const liabilities=raw(f.totalLiab);const equity=raw(f.stockholdersEquity);const bookValue=raw(k.bookValue);const ocf=raw(f.operatingCashflow);const capex=raw(f.capitalExpenditures);const fcf=raw(f.freeCashflow);const shares=raw(k.sharesOutstanding??f.sharesOutstanding);const dividendPerShare=raw(s.dividendRate);const dividendYield=raw(s.dividendYield);const payout=raw(s.payoutRatio);const pe=raw(s.trailingPE??k.trailingPE);const ps=raw(s.priceToSalesTrailing12Months??k.priceToSalesTrailing12Months);const pb=raw(k.priceToBook);const ev=raw(k.enterpriseValue??f.enterpriseValue);const evRevenue=raw(k.enterpriseToRevenue??f.enterpriseToRevenue);const evEbitda=raw(k.enterpriseToEbitda??f.enterpriseToEbitda);
    const netDebt=debt!==undefined&&cashValue!==undefined?debt-cashValue:undefined;const bookValuePerShare=bookValue;const fcfMargin=fcf!==undefined&&revenue?fcf/revenue:undefined;
    const periods=[...income.map(sx=>periodFromDate(latestStatementValue([sx],'endDate')?.asOfDate,'annual')).filter(Boolean),...balance.map(sx=>periodFromDate(latestStatementValue([sx],'endDate')?.asOfDate,'annual')).filter(Boolean)] as FinancialPeriod[];
    return {valuation:{pe:value(pe,'TTM','ttm',currency),ps:value(ps,'TTM','ttm',currency),pb:value(pb,'MRQ','quarterly',currency),evRevenue:value(evRevenue,'TTM','ttm',currency),evEbitda:value(evEbitda,'TTM','ttm',currency),enterpriseValue:value(ev,'TTM','ttm',currency)},incomeStatement:{revenue:value(revenue,'TTM','ttm',currency),revenueGrowth:value(raw(f.revenueGrowth),'TTM','ttm'),grossProfit:value(grossProfit,'TTM','ttm',currency),operatingIncome:value(operatingIncome,'TTM','ttm',currency),ebitda:value(ebitda,'TTM','ttm',currency),netIncome:value(netIncome,'TTM','ttm',currency),eps:value(eps,'TTM','ttm',currency),grossMargin:value(raw(f.grossMargins),'TTM','ttm'),operatingMargin:value(raw(f.operatingMargins),'TTM','ttm'),netMargin:value(raw(f.profitMargins),'TTM','ttm')},profitability:{roe:value(raw(f.returnOnEquity),'TTM','ttm'),roa:value(raw(f.returnOnAssets),'TTM','ttm'),roic:value(raw(f.returnOnCapital),'TTM','ttm')},balanceSheet:{cash:value(cashValue,'MRQ','quarterly',currency),totalDebt:value(debt,'MRQ','quarterly',currency),netDebt:value(netDebt,'MRQ','quarterly',currency,'calculated'),totalAssets:value(assets,'MRQ','quarterly',currency),totalLiabilities:value(liabilities,'MRQ','quarterly',currency),equity:value(equity,'MRQ','quarterly',currency),bookValue:value(bookValue,'MRQ','quarterly',currency),bookValuePerShare:value(bookValuePerShare,'MRQ','quarterly',currency)},cashFlow:{operatingCashFlow:value(ocf,'TTM','ttm',currency),capitalExpenditure:value(capex,'TTM','ttm',currency),freeCashFlow:value(fcf,'TTM','ttm',currency),fcfMargin:value(fcfMargin,'TTM','ttm')},shareholder:{sharesOutstanding:value(shares,'MRQ','quarterly'),dividendPerShare:value(dividendPerShare,'TTM','ttm',currency),dividendYield:value(dividendYield,'TTM','ttm'),payoutRatio:value(payout,'TTM','ttm')},periods,capabilities:{quote:true,historicalPrices:false,valuation:[pe,ps,pb,evRevenue,evEbitda,ev].some(v=>v!==undefined),incomeStatement:[revenue,grossProfit,operatingIncome,ebitda,netIncome,eps].some(v=>v!==undefined),balanceSheet:[cashValue,debt,assets,liabilities,equity].some(v=>v!==undefined),cashFlow:[ocf,capex,fcf].some(v=>v!==undefined),dividends:[dividendPerShare,dividendYield,payout].some(v=>v!==undefined)},source:YAHOO_SOURCE,retrievedAt};
  }catch(error){return empty(error instanceof Error?error.message:'Unknown fundamental provider error');}
}

export async function getCompanyMarketData(company:MarketCompany){
  const symbol=await resolveYahooSymbol(company);
  if(!symbol)return {quote:company,history:[],financials:undefined,source:company.dataSource??'Configured market snapshot',retrievedAt:new Date().toISOString(),delay:'Delayed snapshot',historyAvailable:false,error:`No compatible Yahoo Finance symbol was found for ${company.countryCode} ${company.ticker}.`};
  try{
    const result=await fetchYahooChart(symbol,'5y');const history=normalizeHistory(result);if(history.length===0)throw new Error('Provider returned no usable historical observations');
    const quote=buildQuote(result,company);const financials=await fetchYahooFinancials(symbol,company.currency);
    return {quote,history,financials,source:YAHOO_SOURCE,retrievedAt:new Date().toISOString(),providerTicker:symbol,delay:'Delayed / provider-defined',historyAvailable:true,error:financials.error};
  }catch(error){
    return {quote:company,history:[],financials:undefined,source:company.dataSource??'Configured market snapshot',retrievedAt:new Date().toISOString(),providerTicker:symbol,delay:'Delayed snapshot',historyAvailable:false,error:error instanceof Error?error.message:'Unknown market-data provider error'};
  }
}

export function filterHistoryByRange(points:HistoricalPricePoint[],range:string){if(range==='MAX')return points;const days:Record<string,number>={'1D':1,'1W':7,'1M':31,'3M':92,'6M':184,'1Y':366,'3Y':1096,'5Y':1830};const daysBack=days[range]??366;const latest=points.at(-1)?.date;if(!latest)return points;const cutoff=new Date(latest);cutoff.setUTCDate(cutoff.getUTCDate()-daysBack);return points.filter(point=>new Date(point.date)>=cutoff);}
export function downsampleHistory(points:HistoricalPricePoint[],maxPoints=600){if(points.length<=maxPoints)return points;const step=(points.length-1)/(maxPoints-1);return Array.from({length:maxPoints},(_,index)=>points[Math.round(index*step)]).filter(Boolean);}
