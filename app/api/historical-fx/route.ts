import {NextResponse} from 'next/server';
import {getHistoricalFXSeries} from '@/lib/historical-fx';

export async function GET(request:Request){
  const url=new URL(request.url);
  const currency=url.searchParams.get('currency')?.toUpperCase()??'';
  const start=url.searchParams.get('start')??'';
  const end=url.searchParams.get('end')??'';
  if(!currency||!start||!end)return NextResponse.json({error:'currency, start and end are required'}, {status:400});
  const series=await getHistoricalFXSeries(currency,start,end);
  return NextResponse.json(series,{headers:{'Cache-Control':'public, s-maxage=86400, stale-while-revalidate=604800'}});
}
