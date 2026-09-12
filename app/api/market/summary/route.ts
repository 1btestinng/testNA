import {NextResponse} from 'next/server';import {marketSummary} from '@/lib/market';export async function GET(){return NextResponse.json(marketSummary())}
