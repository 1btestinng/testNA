import {NextRequest,NextResponse} from 'next/server';
import {getMarket,getMarketCompaniesSync,rankMarketCompanies} from '@/lib/markets/registry';

const ALLOWED_LIMITS=[10,20,50,100,200,300,400,500,1000] as const;

export async function GET(req:NextRequest){
  const market=getMarket('EG');const raw=Number(req.nextUrl.searchParams.get('limit')??'100');const limit=ALLOWED_LIMITS.includes(raw as (typeof ALLOWED_LIMITS)[number])?raw:100;
  const ranked=rankMarketCompanies(getMarketCompaniesSync('EG'));const data=ranked.slice(0,limit);
  return NextResponse.json({data,meta:{count:data.length,available:ranked.length,requestedLimit:limit,calculated:true,delay:market.config.delay,market:market.config.countryCode}});
}
