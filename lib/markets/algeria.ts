import type {MarketCompany, MarketConfig} from './types';

export const ALGERIA_CONFIG: MarketConfig = {
  countryCode:'DZ', countryName:'Algeria', flag:'🇩🇿', exchangeCode:'ALG', exchangeName:'Algiers Stock Exchange',
  currencyCode:'DZD', currencySymbol:'DZD', timezone:'Africa/Algiers', benchmark:'DZAIRINDEX',
  dataSource:'SGBV official Algiers Stock Exchange quotations and listed-security share counts', delay:'Delayed snapshot', lastUpdated:'2026-09-10T16:00:00+01:00'
};

const rows:Array<[string,string,string,number,number|undefined,number|undefined]> = [
['CREDIT POPULAIRE D\'ALGERIE','CPA','Banks',200000000,2049,0.49],
['BANQUE DE DEVELOPPEMENT LOCAL','BDL','Banks',147400000,1400,0],
['BIOPHARM','BIO','Pharmaceuticals',25521875,2516,0],
['AYRADE','AYRD','Technology',6250000,815,0],
['ALLIANCE ASSURANCES','ALL','Insurance',13930826,360,4.35],
['SAIDAL','SAI','Pharmaceuticals',10000000,431,0],
['EGH El Aurassi','AUR','Hospitality',6000000,360,0],
['AOM invest','AOM','Tourism',4596030,290,0],
['Moustachir','MST','Consulting',625000,779,0],
['CRAPC EXPERTISE','CREX','Scientific Services',299000,1600,0]
];

export const algeriaCompanies:MarketCompany[] = rows.map(([name,ticker,sector,shares,price,change])=>({
  id:`DZ-ALG-${ticker}`,countryCode:'DZ',exchangeCode:'ALG',ticker,name,sector,industry:sector,currency:'DZD',price,changePercent:change,
  sharesOutstanding:shares,marketCapLocal:price!==undefined?price*shares:undefined,marketCapSource:'calculated',dataSource:ALGERIA_CONFIG.dataSource,timestamp:ALGERIA_CONFIG.lastUpdated
}));

export const ALGERIA_FX_USD_DZD = 132.975;
