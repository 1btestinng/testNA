import type {HistoricalPricePoint,MarketCompany} from '@/lib/markets/types';
import {getNorthAfricaHistoricalPrices} from '@/lib/north-africa-history';

type YahooChartResult={timestamp?:number[];indicators?:{quote?:Array<{close?:Array<number|null>}>};meta?:{symbol?:string}};
type YahooChartResponse={chart?:{result?:YahooChartResult[];error?:{description?:string}|null}};
type YahooSearchQuote={symbol?:string;shortname?:string;longname?:string;quoteType?:string;exchange?:string};
type YahooSearchResponse={quotes?:YahooSearchQuote[]};

const SUFFIX:Record<string,string>={EG:'.CA',MA:'.CS',TN:'.TN'};
const SOURCE='Yahoo Finance';

async function json<T>(url:string):Promise<T>{
  const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 iStocks/1.0',Accept:'application/json'},next:{revalidate:900}});
  if(!response.ok)throw new Error(`${SOURCE} returned HTTP ${response.status}`);
  return (await response.json()) as T;
}

async function chart(symbol:string){
  const url=new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set('range','max');
  url.searchParams.set('interval','1d');
  url.searchParams.set('events','div,splits');
  const body=await json<YahooChartResponse>(url.toString());
  if(body.chart?.error)throw new Error(body.chart.error.description??`${SOURCE} chart error`);
  const result=body.chart?.result?.[0];
  if(!result)throw new Error('No historical observations returned');
  return result;
}

function expectedSuffix(company:MarketCompany){return SUFFIX[company.countryCode.toUpperCase()];}
function tickerBase(symbol:string){return symbol.split('.')[0]?.toUpperCase()??symbol.toUpperCase();}
function nameTokens(name:string){return name.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(token=>token.length>=4).slice(0,5);}
function nameScore(company:MarketCompany,candidate:YahooSearchQuote){
  const hay=`${candidate.longname??''} ${candidate.shortname??''}`.toLowerCase();
  return nameTokens(company.name).reduce((score,token)=>score+(hay.includes(token)?1:0),0);
}

async function resolve(company:MarketCompany){
  const clean=company.ticker.trim().toUpperCase();
  const suffix=expectedSuffix(company);
  const direct=clean.includes('.')?clean:suffix?`${clean}${suffix}`:undefined;
  const candidates:string[]=[];
  if(direct)candidates.push(direct);

  const url=new URL('https://query1.finance.yahoo.com/v1/finance/search');
  url.searchParams.set('q',`${company.ticker} ${company.name}`);
  url.searchParams.set('quotesCount','20');
  url.searchParams.set('newsCount','0');
  try{
    const body=await json<YahooSearchResponse>(url.toString());
    const equities=(body.quotes??[]).filter(q=>q.quoteType==='EQUITY'&&q.symbol);
    const exact=equities.filter(q=>q.symbol!.toUpperCase()===direct?.toUpperCase());
    const suffixMatches=suffix?equities.filter(q=>q.symbol!.toUpperCase().endsWith(suffix)):[];
    const tickerMatches=equities.filter(q=>tickerBase(q.symbol!)===clean);
    const nameMatches=equities.filter(q=>nameScore(company,q)>0);
    for(const q of [...exact,...suffixMatches,...tickerMatches,...nameMatches])if(q.symbol&&!candidates.includes(q.symbol))candidates.push(q.symbol);
  }catch{}

  for(const symbol of candidates){
    try{const result=await chart(symbol);if((result.timestamp?.length??0)>1)return symbol;}catch{}
  }
  return undefined;
}

function normalize(result:YahooChartResult):HistoricalPricePoint[]{
  const timestamps=result.timestamp??[];
  const closes=result.indicators?.quote?.[0]?.close??[];
  const points:HistoricalPricePoint[]=[];
  timestamps.forEach((timestamp,index)=>{
    const close=closes[index];
    if(!Number.isFinite(timestamp)||typeof close!=='number'||!Number.isFinite(close))return;
    points.push({date:new Date(timestamp*1000).toISOString(),close});
  });
  return points.sort((a,b)=>a.date.localeCompare(b.date));
}

export async function getCompanyMaxHistory(company:MarketCompany){
  const symbol=await resolve(company);
  if(symbol){
    try{
      const points=normalize(await chart(symbol));
      if(points.length>1)return {history:points,providerTicker:symbol,error:''};
    }catch{}
  }

  const fallback=await getNorthAfricaHistoricalPrices(company);
  if(fallback.history.length>1){
    return {history:fallback.history,providerTicker:fallback.source,error:''};
  }

  return {
    history:[] as HistoricalPricePoint[],
    providerTicker:symbol,
    error:fallback.error??`No verified historical market-data provider returned usable data for ${company.countryCode} ${company.ticker}.`
  };
}
