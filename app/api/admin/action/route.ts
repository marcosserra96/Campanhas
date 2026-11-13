import {NextRequest,NextResponse} from 'next/server';
import {isAdmin} from '@/lib/admin-session';
import {configured,db} from '@/lib/supabase-server';
import {Campaign} from '@/lib/types';
export const runtime='nodejs';
type Row=Record<string,unknown>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const valid=(x:unknown)=>typeof x==='string'&&uuid.test(x);
const txt=(x:unknown,max=200)=>typeof x==='string'?x.trim().slice(0,max):'';
const finite=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e9;
const failure=(message:string,status=400)=>NextResponse.json({error:message},{status});
async function findCampaign(slug:string){const data=await db<Row[]>('campaigns','select=id,slug,status&slug=eq.'+encodeURIComponent(slug));return data[0]}
async function needInfo(needId:string){const ns=await db<Row[]>('needs','select=id,institution_id& id=eq.'.replace(' ','')+needId);return ns[0]}
async function campaignOwnsInstitution(campaignId:string,institutionId:string){const inst=await db<Row[]>('institutions','select=id&campaign_id=eq.'+campaignId+'&id=eq.'+institutionId);return inst.length>0}
export async function POST(req:NextRequest){
 if(!configured())return failure('Supabase ainda não configurado.',503);
 if(!await isAdmin())return failure('Acesso restrito à CIPAA.',401);
 if(req.headers.get('origin')!==req.nextUrl.origin)return failure('Origem inválida.',403);
 try{
 const body=await req.json() as Record<string,any>;
 const op=body.op as string;
 if(op==='saveCampaign'){
 const c=body.campaign as Campaign;
 if(!c||!txt(c.title,160)||!txt(c.id,100)||!/^[a-z0-9-]{3,100}$/.test(c.id))return failure('Dados da campanha inválidos.');
 if(!['draft','published','closed'].includes(c.status)||!['setor','andar','gerencia','equipe'].includes(c.rankingBy)||!['points','quantity'].includes(c.rankingMode))return failure('Configuração inválida.');
 if(c.start&& !/^\d{4}-\d{2}-\d{2}$/.test(c.start))return failure('Data inicial inválida.');
 if(c.end&& !/^\d{4}-\d{2}-\d{2}$/.test(c.end))return failure('Data final inválida.');
 if(c.end&&c.start&&c.end<c.start)return failure('Data final anterior ao início.');
 const existing=await findCampaign(c.id);
 const data={slug:c.id,title:txt(c.title,160),subtitle:txt(c.subtitle,200),description:txt(c.description,4000),starts_on:c.start||null,ends_on:c.end||null,status:c.status,accent:/^#[0-9a-f]{6}$/i.test(c.accent)?c.accent:'#66b900',banner_url:c.banner&&/^https:\/\//.test(c.banner)?txt(c.banner,1200):null,ranking_by:c.rankingBy,ranking_mode:c.rankingMode,updated_at:new Date().toISOString()};
 if(existing)await db('campaigns','id=eq.'+existing.id,'PATCH',data);
 else await db('campaigns','','POST',data);
 return NextResponse.json({ok:true});
 }
 const slug=txt(body.campaignId,100);const camp=await findCampaign(slug);
 if(!camp)return failure('Campanha não encontrada.',404);
 if(op==='saveInstitution'){
 const item=body.institution as {id?:string;name:string;description?:string};
 if(!item||!txt(item.name,160))return failure('Informe a instituição.');
 const data={campaign_id:camp.id,name:txt(item.name,160),description:txt(item.description,2000)};
 if(valid(item.id)){
  if(!await campaignOwnsInstitution(String(camp.id),item.id!))return failure('Instituição não pertence à campanha.',403);
  await db('institutions','id=eq.'+item.id,'PATCH',data);
 }else await db('institutions','','POST',data);
 return NextResponse.json({ok:true});
 }
 if(op==='deleteInstitution'){
 if(!valid(body.institutionId)||!await campaignOwnsInstitution(String(camp.id),body.institutionId))return failure('Instituição inválida.');
 const donations=await db<Row[]>('donations','select=id&institution_id=eq.'+body.institutionId+'&limit=1');
 if(donations.length)return failure('Exclua os recebimentos desta instituição antes de removê-la.');
 await db('institutions','id=eq.'+body.institutionId,'DELETE');return NextResponse.json({ok:true});
 }
 if(op==='addNeed'){
 const item=body.need as {name:string;unit:string;target:number;points:number};const iid=body.institutionId as string;
 if(!valid(iid)||!await campaignOwnsInstitution(String(camp.id),iid))return failure('Instituição inválida.');
 if(!item||!txt(item.name,150)||!finite(item.target)||item.target===0||!finite(item.points))return failure('Dados do item inválidos.');
 await db('needs','','POST',{institution_id:iid,name:txt(item.name,150),unit:txt(item.unit,30)||'unidade(s)',target:item.target,points:item.points,specification:txt((item as {specification?:string}).specification,250)});return NextResponse.json({ok:true});
 }
 if(op==='editNeed'){
 const nid=body.needId as string;
 if(!valid(nid))return failure('Item inválido.');
 const existing=await needInfo(nid);
 if(!existing||!await campaignOwnsInstitution(String(camp.id),String(existing.institution_id)))return failure('Item não pertence à campanha.',403);
 const item=body.need as {name:string;unit:string;target:number;points:number;specification?:string};
 if(!item||!txt(item.name,150)||!finite(item.target)||item.target===0||!finite(item.points))return failure('Informe um nome, meta e pontuação válidos.');
 await db('needs','id=eq.'+nid,'PATCH',{name:txt(item.name,150),unit:txt(item.unit,30)||'unidade(s)',target:item.target,points:item.points,specification:txt(item.specification,250)});
 return NextResponse.json({ok:true});
 }
 if(op==='deleteNeed'){
 const nid=body.needId as string;if(!valid(nid))return failure('Item inválido.');
 const need=await needInfo(nid);if(!need||!await campaignOwnsInstitution(String(camp.id),String(need.institution_id)))return failure('Item não pertence à campanha.');
 const donations=await db<Row[]>('donations','select=id&need_id=eq.'+nid+'&limit=1');if(donations.length)return failure('Exclua os lançamentos deste item antes de removê-lo.');
 await db('needs','id=eq.'+nid,'DELETE');return NextResponse.json({ok:true});
 }
 if(op==='receiveDonation'){
 const nid=body.needId as string;const quantity=body.quantity as number;
 if(!valid(nid)||!finite(quantity)||quantity===0||!txt(body.donor,160)||!txt(body.group,160)||!txt(body.receivedBy,160))return failure('Dados da doação inválidos.');
 const need=await needInfo(nid);if(!need||!await campaignOwnsInstitution(String(camp.id),String(need.institution_id)))return failure('Item não pertence à campanha.');
 await db('donations','','POST',{campaign_id:camp.id,institution_id:need.institution_id,need_id:nid,quantity,donor_name:txt(body.donor,160),group_name:txt(body.group,160),received_by:txt(body.receivedBy,160)});
 return NextResponse.json({ok:true});
 }
 if(op==='deleteDonation'){
 const did=body.donationId;if(!valid(did))return failure('Lançamento inválido.');
 const donation=await db<Row[]>('donations','select=id&campaign_id=eq.'+camp.id+'&id=eq.'+did);
 if(!donation.length)return failure('Doação não encontrada.',404);
 await db('donations','id=eq.'+did,'DELETE');return NextResponse.json({ok:true});
 }
 return failure('Operação não suportada.');
 }catch(err){console.error('Erro administrativo',err);return failure('Não foi possível concluir a operação. Verifique os dados e tente novamente.',500)}
}
