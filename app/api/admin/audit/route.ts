import {NextRequest,NextResponse} from 'next/server';
import {isAdmin} from '@/lib/admin-session';
import {configured,db} from '@/lib/supabase-server';

export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 if(!await isAdmin())return NextResponse.json({error:'Acesso reservado à CIPAA.'},{status:401});
 if(!configured())return NextResponse.json({error:'Banco não configurado.'},{status:503});
 const slug=request.nextUrl.searchParams.get('campaign')||'';
 if(!/^[a-z0-9-]{3,100}$/.test(slug))return NextResponse.json({error:'Campanha inválida.'},{status:400});
 try{
  const campaign=await db<{id:string}[]>('campaigns','select=id&slug=eq.'+encodeURIComponent(slug));
  if(!campaign.length)return NextResponse.json({error:'Campanha não encontrada.'},{status:404});
  const history=await db<{id:number;donation_id:string;event_type:string;changed_at:string;changed_by:string;reason:string;before_data:Record<string,unknown>|null;after_data:Record<string,unknown>|null}[]>('donation_audit','select=id,donation_id,event_type,changed_at,changed_by,reason,before_data,after_data&campaign_id=eq.'+campaign[0].id+'&order=changed_at.desc&limit=150');
  const initial=await db<{id:number;attribution_id:string;action:string;changed_at:string;changed_by:string;reason:string;before_data:Record<string,unknown>|null;after_data:Record<string,unknown>|null}[]>('opening_attribution_audit','select=id,attribution_id,action,changed_at,changed_by,reason,before_data,after_data&campaign_id=eq.'+campaign[0].id+'&order=changed_at.desc&limit=150');
  const institutions=await db<{id:string}[]>('institutions','select=id&campaign_id=eq.'+campaign[0].id);
  const giftAudit=institutions.length?await db<{id:number;gift_id:string;event_type:string;changed_at:string;changed_by:string;reason:string;before_data:Record<string,unknown>|null;after_data:Record<string,unknown>|null}[]>('gift_request_audit','select=id,gift_id,event_type,changed_at,changed_by,reason,before_data,after_data&institution_id=in.('+institutions.map(i=>i.id).join(',')+')&order=changed_at.desc&limit=150'):[];
  const combined=[
    ...history.map(e=>({...e,id:'d-'+e.id,source:'new' as const})),
    ...initial.map(e=>({id:'o-'+e.id,donation_id:e.attribution_id,event_type:e.action,changed_at:e.changed_at,changed_by:e.changed_by,reason:e.reason,before_data:e.before_data,after_data:e.after_data,source:'opening' as const})),
    ...giftAudit.map(e=>({id:'g-'+e.id,donation_id:e.gift_id,event_type:e.event_type,changed_at:e.changed_at,changed_by:e.changed_by,reason:e.reason,before_data:e.before_data,after_data:e.after_data,source:'gift' as const}))
  ].sort((a,b)=>new Date(b.changed_at).getTime()-new Date(a.changed_at).getTime()).slice(0,200);
  return NextResponse.json({history:combined},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Falha ao consultar auditoria',e);return NextResponse.json({error:'Não foi possível consultar a auditoria.'},{status:500})}
}
