import {NextRequest,NextResponse} from 'next/server';
import {isAdmin} from '@/lib/admin-session';
import {configured,db,rpc} from '@/lib/supabase-server';
import {Campaign,COMPANIES} from '@/lib/types';
export const runtime='nodejs';
type Row=Record<string,unknown>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const valid=(x:unknown)=>typeof x==='string'&&uuid.test(x);
const txt=(x:unknown,max=200)=>typeof x==='string'?x.trim().slice(0,max):'';
const finite=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e9;
const failure=(message:string,status=400)=>NextResponse.json({error:message},{status});
async function findCampaign(slug:string){const data=await db<Row[]>('campaigns','select=id,slug,status,archived_at&slug=eq.'+encodeURIComponent(slug));return data[0]}
async function needInfo(needId:string){const ns=await db<Row[]>('needs','select=id,institution_id&import_removed_at=is.null&id=eq.'+needId);return ns[0]}
async function campaignOwnsInstitution(campaignId:string,institutionId:string){const inst=await db<Row[]>('institutions','select=id&campaign_id=eq.'+campaignId+'&id=eq.'+institutionId);return inst.length>0}
async function validGroup(campaignId:string,name:string){if(!COMPANIES.some(x=>x===name))return false;const rows=await db<Row[]>('campaign_groups','select=name&campaign_id=eq.'+campaignId);return rows.some(r=>r.name===name)}
export async function POST(req:NextRequest){
 if(!configured())return failure('Supabase ainda não configurado.',503);
 if(!await isAdmin())return failure('Acesso restrito à CIPAA.',401);
 if(req.headers.get('origin')!==req.nextUrl.origin)return failure('Origem inválida.',403);
 try{
 const body=await req.json() as Record<string,any>;
 const op=body.op as string;
 if(op==='addCompanyContact'){
  const company=txt(body.company,30),name=txt(body.name,160);
  if(!COMPANIES.some(c=>c===company)||name.length<3)return failure('Selecione a empresa e informe o nome do membro da CIPAA.');
  const known=await db<Row[]>('cipaa_company_contacts','select=id,name&company=eq.'+encodeURIComponent(company));
  if(known.some(x=>String(x.name).toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')))return failure('Este membro já está cadastrado para a empresa.');
  await db('cipaa_company_contacts','','POST',{company,name});
  return NextResponse.json({ok:true});
 }
 if(op==='removeCompanyContact'){
  const id=body.contactId;
  if(!valid(id))return failure('Contato inválido.');
  const existing=await db<Row[]>('cipaa_company_contacts','select=id&id=eq.'+id);
  if(!existing.length)return failure('Contato não encontrado.',404);
  await db('cipaa_company_contacts','id=eq.'+id,'DELETE');
  return NextResponse.json({ok:true});
 }
 if(op==='archiveCampaign'||op==='restoreCampaign'){
  const slug=txt(body.campaignId,100),actor=txt(body.actor,160);
  if(!/^[a-z0-9-]{3,100}$/.test(slug)||actor.length<2)return failure('Informe a campanha e o nome de quem está realizando a ação.');
  const entry=await findCampaign(slug);
  if(!entry)return failure('Campanha não encontrada.',404);
  if(op==='archiveCampaign'){
   if(entry.archived_at)return failure('Campanha já está na lixeira.');
   const changed=await db<Row[]>('campaigns','id=eq.'+entry.id+'&archived_at=is.null','PATCH',{archived_at:new Date().toISOString(),archived_by:actor,restored_by:null});
   if(!changed.length)return failure('A campanha já foi alterada. Atualize a página.',409);
  }else{
   if(!entry.archived_at)return failure('Esta campanha já está ativa.');
   const changed=await db<Row[]>('campaigns','id=eq.'+entry.id+'&archived_at=not.is.null','PATCH',{archived_at:null,restored_by:actor});
   if(!changed.length)return failure('A campanha já foi restaurada. Atualize a página.',409);
  }
  return NextResponse.json({ok:true});
 }
 if(op==='saveCampaign'){
 const c=body.campaign as Campaign;
 if(!c||!txt(c.title,160)||!txt(c.id,100)||!/^[a-z0-9-]{3,100}$/.test(c.id))return failure('Dados da campanha inválidos.');
 if(!['draft','published','closed'].includes(c.status)||!['setor','andar','gerencia','equipe'].includes(c.rankingBy)||!['points','quantity'].includes(c.rankingMode))return failure('Configuração inválida.');
 if(c.start&& !/^\d{4}-\d{2}-\d{2}$/.test(c.start))return failure('Data inicial inválida.');
 if(c.end&& !/^\d{4}-\d{2}-\d{2}$/.test(c.end))return failure('Data final inválida.');
 if(c.end&&c.start&&c.end<c.start)return failure('Data final anterior ao início.');
 const existing=await findCampaign(c.id);
 if(existing?.archived_at)return failure('Esta campanha está na lixeira. Restaure-a antes de editar.',409);
 const data={slug:c.id,title:txt(c.title,160),subtitle:txt(c.subtitle,200),description:txt(c.description,4000),starts_on:c.start||null,ends_on:c.end||null,status:c.status,accent:/^#[0-9a-f]{6}$/i.test(c.accent)?c.accent:'#66b900',banner_url:c.banner&&/^https:\/\//.test(c.banner)?txt(c.banner,1200):null,ranking_by:'equipe',ranking_mode:c.rankingMode,show_item_points:c.showItemPoints===true,updated_at:new Date().toISOString()};
 if(existing)await db('campaigns','id=eq.'+existing.id,'PATCH',data);
 else {const created=await db<Row[]>('campaigns','','POST',data);if(created[0]?.id)await db('campaign_groups','','POST',COMPANIES.map(name=>({campaign_id:created[0].id,name})));}
 return NextResponse.json({ok:true});
 }
 const slug=txt(body.campaignId,100);const camp=await findCampaign(slug);
 if(!camp)return failure('Campanha não encontrada.',404);
 if(camp.archived_at)return failure('Esta campanha está na lixeira. Restaure-a antes de alterar.',409);
 if(op==='updateItemPoints'){
  const actor=txt(body.actor,160),reason=txt(body.reason,500);
  if(actor.length<2||reason.length<5)return failure('Informe o responsável e o motivo da atualização.');
  const updates=body.items as Array<{id:string;type:string;points:number}>;
  if(!Array.isArray(updates)||!updates.length||updates.length>5000||updates.some(x=>!valid(x?.id)||!['need','gift'].includes(x.type)||!finite(x.points)||x.points>100000))return failure('Existem códigos ou pontuações inválidos no arquivo.');
  try{
   const changed=await rpc<number>('update_campaign_item_points',{p_campaign:camp.id,p_items:updates,p_actor:actor,p_reason:reason});
   return NextResponse.json({ok:true,changed});
  }catch(e){
   const raw=e instanceof Error?e.message:'Erro de atualização';
   const found=raw.match(/"message":"([^"]+)"/);
   return failure(found?.[1]||'Não foi possível importar as pontuações. Verifique os códigos e valores.',409);
  }
 }

 if(op==='undoImportBatch'){
  const batchId=body.batchId as string,actor=txt(body.actor,160),reason=txt(body.reason,500);
  if(!valid(batchId)||actor.length<2||reason.length<5)return failure('Informe o responsável e o motivo da correção (mínimo 5 caracteres).');
  const owned=await db<Row[]>('import_batches','select=id,undone_at&campaign_id=eq.'+camp.id+'&id=eq.'+batchId);
  if(!owned.length)return failure('Importação não encontrada nesta campanha.',404);
  if(owned[0].undone_at)return failure('Esta importação já foi desfeita.');
  try{
   const count=await rpc<number>('undo_campaign_import',{p_batch:batchId,p_actor:actor,p_reason:reason});
   return NextResponse.json({ok:true,undone:count});
  }catch(e){
   const raw=e instanceof Error?e.message:'Erro desconhecido';
   let detail='Não foi possível desfazer esta importação. Verifique se existem doações, reservas ou alterações vinculadas.';
   const match=raw.match(/"message":"([^"]+)"/);
   if(match&&match[1]&&!/sql|postgres|function|schema|syntax/i.test(match[1]))detail=match[1];
   return failure(detail,409);
  }
 }
 if(op==='setGiftDeadline'){
  const deadline=txt(body.deadline,10);
  if(deadline&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(deadline))return failure('Data de entrega inválida.');
  await db('campaigns','id=eq.'+camp.id,'PATCH',{gift_delivery_deadline:deadline||null});
  return NextResponse.json({ok:true});
 }
 if(op==='addCampaignGroup'||op==='removeCampaignGroup')return failure('As empresas são fixas: EMR, CSE e (RE) Energisa.');
 if(op==='attributeOpening'){
  const nid=body.needId as string;const quantity=body.quantity as number;
  const donor=txt(body.donor,160),group=txt(body.group,120),actor=txt(body.actor,160);
  if(!valid(nid)||!finite(quantity)||quantity<=0||!donor||!group||actor.length<2)return failure('Preencha material, quantidade, doador, grupo e responsável CIPAA.');
  const need=await needInfo(nid);
  if(!need||!await campaignOwnsInstitution(String(camp.id),String(need.institution_id)))return failure('Material não pertence à campanha.');
  if(!await validGroup(String(camp.id),group))return failure('Selecione um grupo cadastrado na campanha.');
  await db('opening_attributions','','POST',{campaign_id:camp.id,institution_id:need.institution_id,need_id:nid,quantity,donor_name:donor,group_name:group,recorded_by:actor});
  return NextResponse.json({ok:true});
 }
 if(op==='editOpening'||op==='voidOpening'){
  const id=body.attributionId;
  if(!valid(id))return failure('Atribuição inválida.');
  const rows=await db<Row[]>('opening_attributions','select=id,need_id,voided_at&campaign_id=eq.'+camp.id+'&id=eq.'+id);
  if(!rows.length||rows[0].voided_at)return failure('Atribuição já cancelada ou inexistente.',404);
  const actor=txt(body.actor,160),reason=txt(body.reason,500);
  if(actor.length<2||reason.length<5)return failure('Informe responsável e motivo (mínimo de 5 caracteres).');
  if(op==='voidOpening'){
   const changed=await db<Row[]>('opening_attributions','id=eq.'+id+'&campaign_id=eq.'+camp.id+'&voided_at=is.null','PATCH',{voided_at:new Date().toISOString(),voided_by:actor,edited_by:actor,edit_reason:reason});
   if(!changed.length)return failure('Atribuição já alterada. Atualize a lista.',409);
  }else{
   const quantity=body.quantity as number,donor=txt(body.donor,160),group=txt(body.group,120);
   if(!finite(quantity)||quantity<=0||!donor||!group||!await validGroup(String(camp.id),group))return failure('Preencha quantidade, doador e grupo cadastrado.');
   const changed=await db<Row[]>('opening_attributions','id=eq.'+id+'&campaign_id=eq.'+camp.id+'&voided_at=is.null','PATCH',{quantity,donor_name:donor,group_name:group,edited_by:actor,edit_reason:reason});
   if(!changed.length)return failure('Atribuição já alterada. Atualize a lista.',409);
  }
  return NextResponse.json({ok:true});
 }
 if(op==='applyPoints'){
  const category=txt(body.category,20),points=body.points;
  if(!['needs','gifts'].includes(category)||!finite(points))return failure('Pontuação inválida.');
  const institutions=await db<Row[]>('institutions','select=id&campaign_id=eq.'+camp.id);
  if(!institutions.length)return failure('Cadastre uma instituição antes de configurar os pontos.');
  const ids=institutions.map(i=>String(i.id)).filter(valid);
  if(!ids.length)return failure('Instituições inválidas.');
  if(category==='needs'){
   await db('needs','institution_id=in.('+ids.join(',')+')','PATCH',{points});
  }else{
   await db('gift_requests','institution_id=in.('+ids.join(',')+')&status=in.(available,reserved)','PATCH',{
    points,changed_by:txt(body.actor,160)||'CIPAA',change_reason:'Aplicação em lote de pontuação na campanha'
   });
  }
  return NextResponse.json({ok:true});
 }
 if(op==='addGift'){
  const iid=body.institutionId as string;
  if(!valid(iid)||!await campaignOwnsInstitution(String(camp.id),iid))return failure('Instituição inválida.');
  const beneficiary=txt(body.beneficiary,160),gift=txt(body.giftName,200),points=body.points;
  if(!beneficiary||!gift||!finite(points))return failure('Preencha beneficiário, presente e pontos.');
  await db('gift_requests','','POST',{institution_id:iid,beneficiary,gift_name:gift,details:txt(body.details,500),points});
  return NextResponse.json({ok:true});
 }
 if(op==='editGift'||op==='reserveGift'||op==='deliverGift'||op==='releaseGift'){
  const giftId=body.giftId as string;
  if(!valid(giftId))return failure('Presente inválido.');
  const entries=await db<Row[]>('gift_requests','select=*&id=eq.'+giftId);
  const original=entries[0];
  if(!original||!await campaignOwnsInstitution(String(camp.id),String(original.institution_id)))return failure('Presente não pertence à campanha.',404);
  const actor=txt(body.actor,160),reason=txt(body.reason,500);
  if(actor.length<2||reason.length<5)return failure('Responsável e motivo devem ser informados (mínimo de 5 caracteres).');
  const status=String(original.status);
  const query='id=eq.'+giftId+'&status=eq.'+status;
  let data:Record<string,unknown>={changed_by:actor,change_reason:reason};
  if(op==='editGift'){
   const beneficiary=txt(body.beneficiary,160),gift=txt(body.giftName,200),points=body.points;
   if(!beneficiary||!gift||!finite(points))return failure('Dados do presente inválidos.');
   data={...data,beneficiary,gift_name:gift,details:txt(body.details,500),points};
  }
  if(op==='reserveGift'){
   if(status!=='available')return failure('Este presente já está reservado ou entregue.');
   const donor=txt(body.donor,160),group=txt(body.group,120);
   if(!donor||!group||!await validGroup(String(camp.id),group))return failure('Informe doador e um setor/grupo cadastrado.');
   data={...data,status:'reserved',donor_name:donor,group_name:group,reserved_by:actor,reserved_at:new Date().toISOString()};
  }
  if(op==='deliverGift'){
   if(status!=='reserved')return failure('É necessário reservar o presente antes de confirmar a entrega.');
   data={...data,status:'delivered',delivered_by:actor,delivered_at:new Date().toISOString()};
  }
  if(op==='releaseGift'){
   if(status!=='reserved')return failure('Somente presentes reservados podem ser liberados.');
   data={...data,status:'available',donor_name:null,group_name:null,reserved_by:null,reserved_at:null,delivered_by:null,delivered_at:null};
  }
  const changed=await db<Row[]>('gift_requests',query,'PATCH',data);
  if(!changed.length)return failure('Esse presente foi alterado por outra pessoa. Atualize a página.',409);
  return NextResponse.json({ok:true});
 }
 if(op==='bulkReceiveDonations'){
  const iid=body.institutionId as string;
  if(!valid(iid)||!await campaignOwnsInstitution(String(camp.id),iid))return failure('Instituição inválida.');
  const items=body.items as Array<{name:string;quantity:number;donor:string;group:string;receivedBy:string}>;
  if(!Array.isArray(items)||!items.length||items.length>200)return failure('Importe entre 1 e 200 doações por vez.');
  const needs=await db<Row[]>('needs','select=id,name&institution_id=eq.'+iid+'&import_removed_at=is.null');
  const groups=await db<Row[]>('campaign_groups','select=name&campaign_id=eq.'+camp.id);
  const mapped=[] as Array<Record<string,unknown>>;
  for(let index=0;index<items.length;index++){
   const it=items[index];const itemName=txt(it?.name,150),quantity=it?.quantity,donor=txt(it?.donor,160),group=txt(it?.group,120),receivedBy=txt(it?.receivedBy,160);
   const matched=needs.filter(n=>String(n.name).toLocaleLowerCase('pt-BR')===itemName.toLocaleLowerCase('pt-BR'));
   if(matched.length!==1||!finite(quantity)||quantity<=0||!donor||!group||!receivedBy||!COMPANIES.some(c=>c===group))
     return failure('Verifique material, quantidade, doador, grupo e responsável na linha '+(index+2)+'.');
   mapped.push({campaign_id:camp.id,institution_id:iid,need_id:matched[0].id,quantity,donor_name:donor,group_name:String(groups.find(g=>String(g.name).toLocaleLowerCase('pt-BR')===group.toLocaleLowerCase('pt-BR'))!.name),received_by:receivedBy});
  }
  const batchId=await rpc<string>('create_campaign_import',{p_campaign:camp.id,p_institution:iid,p_kind:'donations',p_rows:mapped,p_actor:txt(body.actor,160)||'CIPAA'});
  return NextResponse.json({ok:true,imported:mapped.length,batchId});
 }
 if(op==='bulkAddGifts'){
  const iid=body.institutionId as string;
  if(!valid(iid)||!await campaignOwnsInstitution(String(camp.id),iid))return failure('Instituição inválida.');
  const items=body.items as Array<{beneficiary:string;giftName:string;details?:string;points:number}>;
  if(!Array.isArray(items)||!items.length||items.length>300)return failure('Importe entre 1 e 300 presentes por vez.');
  const mapped=items.map((x,i)=>({institution_id:iid,beneficiary:txt(x.beneficiary,160),gift_name:txt(x.giftName,200),details:txt(x.details,500),points:x.points,row:i+1}));
  if(mapped.some(x=>!x.beneficiary||!x.gift_name||!finite(x.points)))return failure('Há linhas com beneficiário, presente ou pontos inválidos.');
  const batchId=await rpc<string>('create_campaign_import',{p_campaign:camp.id,p_institution:iid,p_kind:'gifts',p_rows:mapped.map(({row,...rest})=>rest),p_actor:txt(body.actor,160)||'CIPAA'});
  return NextResponse.json({ok:true,imported:mapped.length,batchId});
 }
 if(op==='bulkAddNeeds'){
  const iid=body.institutionId as string;
  if(!valid(iid)||!await campaignOwnsInstitution(String(camp.id),iid))return failure('Instituição inválida.');
  const items=body.items as Array<{name:string;unit:string;target:number;points:number;mode:string;specification?:string}>;
  if(!Array.isArray(items)||!items.length||items.length>300)return failure('Importe entre 1 e 300 materiais por vez.');
  const mapped=items.map(x=>({institution_id:iid,name:txt(x.name,150),unit:txt(x.unit,30)||'unidade(s)',target:x.mode==='free'?0:x.target,points:x.points,mode:x.mode==='free'?'free':'target',specification:txt(x.specification,250)}));
  if(mapped.some(x=>!x.name||!finite(x.target)||(x.mode==='target'&&x.target===0)||!finite(x.points)))return failure('Existem materiais inválidos.');
  const batchId=await rpc<string>('create_campaign_import',{p_campaign:camp.id,p_institution:iid,p_kind:'needs',p_rows:mapped,p_actor:txt(body.actor,160)||'CIPAA'});
  return NextResponse.json({ok:true,imported:mapped.length,batchId});
 }
 if(op==='saveInstitution'){
 const item=body.institution as {id?:string;name:string;description?:string;beneficiaryKind?:string;beneficiaryCount?:number};
 if(!item||!txt(item.name,160))return failure('Informe a instituição.');
 const kind=item.beneficiaryKind||'unspecified';
 const count=item.beneficiaryCount??0;
 if(!['unspecified','children','elderly','people'].includes(kind)||!Number.isInteger(count)||count<0||count>1000000)return failure('Informe um público beneficiado válido.');
 const data={campaign_id:camp.id,name:txt(item.name,160),description:txt(item.description,2000),beneficiary_kind:kind,beneficiary_count:count};
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
 const item=body.need as {name:string;unit:string;target:number;points:number;mode?:string};const iid=body.institutionId as string;
 if(!valid(iid)||!await campaignOwnsInstitution(String(camp.id),iid))return failure('Instituição inválida.');
 if(!item||!txt(item.name,150)||!finite(item.target)||(item.mode!=='free'&&item.target===0)||!finite(item.points)||!['target','free'].includes(item.mode||'target'))return failure('Dados do item inválidos.');
 await db('needs','','POST',{institution_id:iid,name:txt(item.name,150),unit:txt(item.unit,30)||'unidade(s)',target:item.target,points:item.points,mode:item.mode==='free'?'free':'target',specification:txt((item as {specification?:string}).specification,250)});return NextResponse.json({ok:true});
 }
 if(op==='editNeed'){
 const nid=body.needId as string;
 if(!valid(nid))return failure('Item inválido.');
 const existing=await needInfo(nid);
 if(!existing||!await campaignOwnsInstitution(String(camp.id),String(existing.institution_id)))return failure('Item não pertence à campanha.',403);
 const item=body.need as {name:string;unit:string;target:number;points:number;specification?:string;mode?:string};
 if(!item||!txt(item.name,150)||!finite(item.target)||(item.mode!=='free'&&item.target===0)||!finite(item.points)||!['target','free'].includes(item.mode||'target'))return failure('Informe um nome, meta e pontuação válidos.');
 await db('needs','id=eq.'+nid,'PATCH',{name:txt(item.name,150),unit:txt(item.unit,30)||'unidade(s)',target:item.target,points:item.points,mode:item.mode==='free'?'free':'target',specification:txt(item.specification,250)});
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
 if(!await validGroup(String(camp.id),txt(body.group,120)))return failure('Selecione um setor/grupo configurado na campanha.');
 const need=await needInfo(nid);if(!need||!await campaignOwnsInstitution(String(camp.id),String(need.institution_id)))return failure('Item não pertence à campanha.');
 await db('donations','','POST',{campaign_id:camp.id,institution_id:need.institution_id,need_id:nid,quantity,donor_name:txt(body.donor,160),group_name:txt(body.group,160),received_by:txt(body.receivedBy,160)});
 return NextResponse.json({ok:true});
 }
 if(op==='editDonation'||op==='voidDonation'||op==='deleteDonation'){
  const did=body.donationId as string;
  if(!valid(did))return failure('Lançamento inválido.');
  const rows=await db<Row[]>('donations','select=id,need_id,institution_id,quantity,donor_name,group_name,received_by,voided_at&campaign_id=eq.'+camp.id+'&id=eq.'+did);
  const original=rows[0];
  if(!original||original.voided_at)return failure('Este lançamento não existe ou já foi cancelado.',404);
  const actor=txt(body.actor,160);
  const reason=txt(body.reason,500);
  if(actor.length<2||reason.length<5)return failure('Informe seu nome e o motivo da alteração (mínimo 5 caracteres).');
  if(op==='voidDonation'||op==='deleteDonation'){
   const changed=await db<Row[]>('donations','id=eq.'+did+'&campaign_id=eq.'+camp.id+'&voided_at=is.null','PATCH',{
    voided_at:new Date().toISOString(),voided_by:actor,edited_by:actor,edit_reason:reason
   });
   if(!changed.length)return failure('O lançamento já foi alterado por outra pessoa. Atualize a lista.',409);
   return NextResponse.json({ok:true});
  }
  const nid=body.needId as string;
  const quantity=body.quantity as number;
  const donor=txt(body.donor,160),group=txt(body.group,160),receivedBy=txt(body.receivedBy,160);
  if(!valid(nid)||!finite(quantity)||quantity<=0||!donor||!group||!receivedBy)return failure('Dados da correção inválidos.');
  if(!await validGroup(String(camp.id),group))return failure('Selecione um grupo cadastrado na campanha.');
  const need=await needInfo(nid);
  if(!need||!await campaignOwnsInstitution(String(camp.id),String(need.institution_id)))return failure('O item não pertence a esta campanha.',403);
  const changed=await db<Row[]>('donations','id=eq.'+did+'&campaign_id=eq.'+camp.id+'&voided_at=is.null','PATCH',{
   need_id:nid,institution_id:need.institution_id,quantity,
   donor_name:donor,group_name:group,received_by:receivedBy,edited_by:actor,edit_reason:reason
  });
  if(!changed.length)return failure('O lançamento já foi alterado por outra pessoa. Atualize a lista.',409);
  return NextResponse.json({ok:true});
 }
 return failure('Operação não suportada.');
 }catch(err){console.error('Erro administrativo',err);return failure('Não foi possível concluir a operação. Verifique os dados e tente novamente.',500)}
}
