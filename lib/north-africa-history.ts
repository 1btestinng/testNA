import type {HistoricalPricePoint,MarketCompany} from '@/lib/markets/types';

type StockAnalysisMarket='cbse'|'bvmt';
const MARKET_MAP:Record<string,StockAnalysisMarket>={MA:'cbse',TN:'bvmt'};
const SOURCE='StockAnalysis / S&P Global Market Intelligence';

function finite(value:number|undefined):value is number{return typeof value==='number'&&Number.isFinite(value);}
function marketFor(company:MarketCompany):StockAnalysisMarket|undefined{return MARKET_MAP[company.countryCode.toUpperCase()];}
function parseNumber(value:string|undefined){
  if(!value)return undefined;
  const cleaned=value.replace(/,/g,'').replace(/\s+/g,'').trim();
  if(cleaned==='-'||cleaned==='—'||cleaned==='')return undefined;
  const parsed=Number(cleaned);
  return Number.isFinite(parsed)?parsed:undefined;
}
function stripHtml(value:string){return value.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim();}
function parseDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?undefined:date.toISOString();}

function extractRows(html:string):HistoricalPricePoint[]{
  const rows:HistoricalPricePoint[]=[];
  const rowMatches=html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi)??[];
  for(const row of rowMatches){
    const cells=(row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)??[]).map(stripHtml);
    if(cells.length<5)continue;
    if(!/^\w{3}\s+\d{1,2},\s+\d{4}$/i.test(cells[0]))continue;
    const date=parseDate(cells[0]);
    const open=parseNumber(cells[1]);
    const high=parseNumber(cells[2]);
    const low=parseNumber(cells[3]);
    const close=parseNumber(cells[4]);
    const adjustedClose=parseNumber(cells[5]);
    const volume=parseNumber(cells[7]);
    if(!date||!finite(close))continue;
    rows.push({date,close,open,high,low,adjustedClose,volume});
  }
  return rows;
}

async function fetchPage(company:MarketCompany,page:number){
  const market=marketFor(company);
  if(!market)return [];
  const query=page>1?`?p=${page}`:'';
  const url=`https://stockanalysis.com/quote/${market}/${encodeURIComponent(company.ticker.toUpperCase())}/history/${query}`;
  const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 iStocks/1.0','Accept':'text/html'},next:{revalidate:900}});
  if(!response.ok)throw new Error(`${SOURCE} returned HTTP ${response.status}`);
  return extractRows(await response.text());
}

/**
 * Verified public historical fallback for CSE/BVMT. We consume only the
 * human-readable historical table and never manufacture observations. The
 * first three pages are bounded deliberately to avoid excessive provider load.
 */
export async function getNorthAfricaHistoricalPrices(company:MarketCompany){
  if(!marketFor(company))return {history:[] as HistoricalPricePoint[],source:undefined as string|undefined,error:undefined as string|undefined};
  const pages=await Promise.all([1,2,3].map(page=>fetchPage(company,page).catch(()=>[] as HistoricalPricePoint[])));
  const byDate=new Map<string,HistoricalPricePoint>();
  for(const point of pages.flat())byDate.set(point.date.slice(0,10),point);
  const history=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
  if(!history.length)return {history,source:undefined,error:`${SOURCE} returned no verified historical observations for ${company.countryCode} ${company.ticker}.`};
  return {history,source:SOURCE,error:undefined};
}
