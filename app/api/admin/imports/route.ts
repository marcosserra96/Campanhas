import {NextRequest,NextResponse} from 'next/server';
import {isAdmin} from '@/lib/admin-session';
import {configured,db} from '@/lib/supabase-server';
export const dynamic='force-dynamic';
type Row=Record<string,unknown>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(req:NextRequest){
 if(!await isAdmin())return NextResponse.json({error:'Área reservada à CIPAA.'},{status:401});
 if(!configured())return NextResponse.json({error:'Banco indisponível.'},{status:503});
 const slug=req.nextUrl.searchParams.get('campaign')||'';
 const institution=req.nextUrl.searchParams.get('institution')||'';
 if(!/^[a-z0-9-]{3,100}$/.test(slug)||!uuid.test(institution))return NextResponse.json({error:'Selecione uma campanha e uma instituição válidas.'},{status:400});
 try{
  const campaigns=await db<Row[]>('campaigns','select=id&slug=eq.'+encodeURIComponent(slug)+'&archived_at=is.null');
  if(!campaigns.length)return NextResponse.json({error:'Campanha não encontrada.'},{status:404});
  const campaignId=String(campaigns[0].id);
  const institutions=await db<Row[]>('institutions','select=id&campaign_id=eq.'+campaignId+'&id=eq.'+institution);
  if(!institutions.length)return NextResponse.json({error:'Instituição não pertence à campanha.'},{status:403});
  const batches=await db<Row[]>('import_batches','select=id,kind,row_count,created_at,created_by,label,undone_at,undone_by,undo_reason&campaign_id=eq.'+campaignId+'&institution_id=eq.'+institution+'&order=created_at.desc&limit=100');
  return NextResponse.json({batches},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Falha ao buscar importações',e);return NextResponse.json({error:'Não foi possível carregar o histórico de importações.'},{status:500});}
}
