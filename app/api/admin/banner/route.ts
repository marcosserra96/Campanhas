import {NextRequest,NextResponse} from 'next/server';
import {isAdmin} from '@/lib/admin-session';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 if(!await isAdmin())return NextResponse.json({error:'Acesso restrito à CIPAA.'},{status:401});
 if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Origem inválida.'},{status:403});
 const key=process.env.SUPABASE_SECRET_KEY;
 const base=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://kgbnapstffmqdwhtslwt.supabase.co';
 if(!key)return NextResponse.json({error:'Chave do Supabase não configurada.'},{status:503});
 try{
  const form=await req.formData();
  const file=form.get('file');
  if(!(file instanceof File))return NextResponse.json({error:'Selecione uma imagem.'},{status:400});
  const formats:Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
  const ext=formats[file.type];
  if(!ext||file.size>5*1024*1024||file.size===0)return NextResponse.json({error:'Use PNG, JPG ou WebP com até 5 MB.'},{status:400});
  const bytes=await file.arrayBuffer();
  const path='headers/'+randomUUID()+'.'+ext;
  const url=base+'/storage/v1/object/campaign-banners/'+path;
  const result=await fetch(url,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':file.type,'x-upsert':'false'},body:bytes});
  if(!result.ok){console.error('Storage failed:',result.status,await result.text());return NextResponse.json({error:'Falha ao enviar imagem para o Supabase.'},{status:502})}
  return NextResponse.json({url:base+'/storage/v1/object/public/campaign-banners/'+path});
 }catch(e){console.error('Banner upload failure',e);return NextResponse.json({error:'Não foi possível enviar a imagem.'},{status:500})}
}
