import {NextRequest,NextResponse} from 'next/server';
import {isAdmin} from '@/lib/admin-session';
import {configured,db} from '@/lib/supabase-server';
import {Campaign,Donation,Store} from '@/lib/types';
export const dynamic='force-dynamic';
type Row=Record<string,any>;
export async function GET(request:NextRequest){
 if(!configured())return NextResponse.json({error:'Banco de dados ainda não configurado na Vercel.'},{status:503});
 try{
 const admin=await isAdmin();
 const wantAll=request.nextUrl.searchParams.get('all')==='1';
 if(wantAll&&!admin)return NextResponse.json({error:'Área administrativa: link reservado necessário.'},{status:401});
 const rows=await db<Row[]>('campaigns','select=*&order=created_at.desc'+(admin&&wantAll?'':'&status=eq.published'));
 const campaigns:Campaign[]=await Promise.all(rows.map(async r=>{
  const inst=await db<Row[]>('institutions','select=*&campaign_id=eq.'+r.id+'&order=created_at.asc');
  const institutions=await Promise.all(inst.map(async i=>{
   const needs=await db<Row[]>('needs','select=*&institution_id=eq.'+i.id+'&order=created_at.asc');
   return {id:i.id,name:i.name,description:i.description,needs:needs.map(n=>({id:n.id,name:n.name,unit:n.unit,target:Number(n.target),received:Number(n.opening_received||0),mode:n.mode==='free'?'free':'target' as 'free'|'target',openingReceived:Number(n.opening_received||0),specification:n.specification||'',points:Number(n.points)}))};
  }));
  const groups=admin&&wantAll?await db<Row[]>('campaign_groups','select=id,name&campaign_id=eq.'+r.id+'&order=name.asc'):[];
  const giftRows=await Promise.all(inst.map(async i=>await db<Row[]>('gift_requests','select=id,institution_id,beneficiary,gift_name,details,points,status'+(admin&&wantAll?',donor_name,group_name,reserved_at,delivered_at,reserved_by,delivered_by':'')+'&institution_id=eq.'+i.id+'&order=created_at.asc')));
  institutions.forEach((i,index)=>{i.gifts=giftRows[index].map(g=>({id:g.id,institutionId:g.institution_id,beneficiary:g.beneficiary,giftName:g.gift_name,details:g.details||'',points:Number(g.points),status:g.status,donor:admin&&wantAll?g.donor_name||'':'',group:admin&&wantAll?g.group_name||'':'',reservedAt:g.reserved_at||'',deliveredAt:g.delivered_at||'',reservedBy:admin&&wantAll?g.reserved_by||'':'',deliveredBy:admin&&wantAll?g.delivered_by||'':''}))});
  const beneficiaries=await db<Row[]>('beneficiary_groups','select=label,girls,boys&campaign_id=eq.'+r.id+'&order=label.asc');
  return {groups:groups.map(g=>({id:g.id,name:g.name})),beneficiaries:beneficiaries.map(b=>({label:b.label,girls:Number(b.girls),boys:Number(b.boys)})),id:r.slug,title:r.title,subtitle:r.subtitle,description:r.description,start:r.starts_on||'',end:r.ends_on||'',status:r.status,accent:r.accent,banner:r.banner_url||'',institutions,rankingBy:r.ranking_by,rankingMode:r.ranking_mode} as Campaign;
 }));
 const idToSlug=new Map(rows.map(r=>[r.id,r.slug]));
 const allowedIds=rows.map(r=>r.id);
 const raw=allowedIds.length?await db<Row[]>('donations','select=id,campaign_id,institution_id,need_id,quantity,group_name,received_at'+(admin&&wantAll?',donor_name,received_by':'')+'&campaign_id=in.('+allowedIds.join(',')+')&voided_at=is.null&order=received_at.desc&limit=10000'):[];
 const allocations=allowedIds.length?await db<Row[]>('opening_attributions','select=id,campaign_id,institution_id,need_id,quantity,group_name,recorded_at'+(admin&&wantAll?',donor_name,recorded_by':'')+'&campaign_id=in.('+allowedIds.join(',')+')&voided_at=is.null&order=recorded_at.desc&limit=10000'):[];
 const donations:Donation[]=raw.map(d=>({id:d.id,campaignId:idToSlug.get(d.campaign_id)||'',institutionId:d.institution_id,needId:d.need_id,quantity:Number(d.quantity),group:d.group_name,donor:admin&&wantAll?d.donor_name:'',receivedBy:admin&&wantAll?d.received_by:'',date:d.received_at,source:'new'}));
 for(const a of allocations)donations.push({id:a.id,campaignId:idToSlug.get(a.campaign_id)||'',institutionId:a.institution_id,needId:a.need_id,quantity:Number(a.quantity),group:a.group_name,donor:admin&&wantAll?a.donor_name:'',receivedBy:admin&&wantAll?a.recorded_by:'',date:a.recorded_at,source:'opening'});
 for(const d of donations){const c=campaigns.find(c=>c.id===d.campaignId);const n=c?.institutions.flatMap(i=>i.needs).find(n=>n.id===d.needId);if(n&&d.source!=='opening')n.received+=d.quantity}
 const store:Store={campaigns,donations,settings:{pinEnabled:false}};
 return NextResponse.json(store,{headers:{'Cache-Control':'no-store, max-age=0'}});
 }catch(e){console.error('Erro ao consultar campanhas',e);return NextResponse.json({error:'Falha ao consultar campanhas.'},{status:500})}
}
