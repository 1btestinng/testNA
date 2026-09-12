import {companies} from './companies';

export const USD_EGP=51.36;

export function rankCompanies(priceOverrides:Record<string,number>={}){
  return companies
    .map(c=>{
      const override=priceOverrides[c.ticker];
      const price=override??c.price;
      // The snapshot market cap is the source-of-truth. Only recalculate when a quote override exists.
      const marketCapEGP=override===undefined?c.marketCapEGP:price*c.sharesOutstanding;
      return {...c,price,marketCapEGP,marketCapUSD:marketCapEGP/USD_EGP};
    })
    .sort((a,b)=>b.marketCapEGP-a.marketCapEGP)
    .map((c,i)=>({...c,rank:i+1}));
}

export function marketSummary(){
  const rows=rankCompanies();
  return {
    count:rows.length,
    totalEGP:rows.reduce((s,c)=>s+c.marketCapEGP,0),
    totalUSD:rows.reduce((s,c)=>s+c.marketCapUSD,0),
    industries:new Set(rows.map(c=>c.industry)).size,
    fx:USD_EGP,
    updatedAt:'2026-09-11T17:01:00+03:00',
    source:'StockAnalysis EGX actively traded securities snapshot; market caps sourced directly',
    delay:'Delayed snapshot'
  };
}
