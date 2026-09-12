import type {HistoricalPricePoint} from '@/lib/markets/types';

export function filterHistoryByRange(points:HistoricalPricePoint[],range:string){
  if(range==='MAX')return points;
  const days:Record<string,number>={'1D':1,'1W':7,'1M':31,'3M':92,'6M':184,'1Y':366,'3Y':1096,'5Y':1830};
  const daysBack=days[range]??366;
  const latest=points.at(-1)?.date;
  if(!latest)return points;
  const cutoff=new Date(latest);
  cutoff.setUTCDate(cutoff.getUTCDate()-daysBack);
  return points.filter(point=>new Date(point.date)>=cutoff);
}

export function downsampleHistory(points:HistoricalPricePoint[],maxPoints=600){
  if(points.length<=maxPoints)return points;
  const step=(points.length-1)/(maxPoints-1);
  return Array.from({length:maxPoints},(_,index)=>points[Math.round(index*step)]).filter(Boolean);
}
