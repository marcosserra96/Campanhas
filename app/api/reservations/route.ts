import {NextRequest,NextResponse} from 'next/server';
import {createHmac} from 'node:crypto';
import {configured,rpc} from '@/lib/supabase-server';
import {COMPANIES} from '@/lib/types';
export const runtime='nodejs';
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:NextRequest){
 if(!configured())return NextResponse.json({error:'Serviço de reservas indisponível.'},{status:503});
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Origem não autorizada.'},{status:403});
 if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Envie os dados da reserva.'},{status:415});
 try{
  const body=await request.json() as {giftId?:unknown;company?:unknown;fullName?:unknown};
  const giftId=typeof body.giftId==='string'?body.giftId:'';
  const company=typeof body.company==='string'?body.company:'';
  const fullName=typeof body.fullName==='string'?body.fullName.replace(/\s+/g,' ').trim():'';
  if(!idPattern.test(giftId)||!COMPANIES.some(c=>c===company)||fullName.length<5||fullName.length>160||fullName.split(' ').length<2)
    return NextResponse.json({error:'Selecione um presente, sua empresa e informe seu nome completo.'},{status:400});
  const secret=process.env.ADMIN_ACCESS_TOKEN||process.env.SUPABASE_SECRET_KEY||'';
  if(secret.length<32)return NextResponse.json({error:'Reservas temporariamente indisponíveis.'},{status:503});
  const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'indisponivel').split(',')[0].trim().slice(0,120);
  const fingerprint=createHmac('sha256',secret).update(ip).digest('hex');
  await rpc('reserve_gift_public',{p_gift:giftId,p_company:company,p_full_name:fullName,p_fingerprint:fingerprint});
  return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const raw=error instanceof Error?error.message:'';
  const match=raw.match(/"message":"([^"]+)"/);
  const known=match?.[1]||'Não foi possível concluir a reserva.';
  const safe=/^(Este presente|Outra pessoa|Esta campanha|O prazo|A CIPAA|Já existem três|Muitas solicitações|Informe empresa)/.test(known)?known:'Não foi possível concluir a reserva. Atualize a página ou procure a CIPAA.';
  return NextResponse.json({error:safe},{status:409,headers:{'Cache-Control':'no-store'}});
 }
}
