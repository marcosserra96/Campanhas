'use client';
import {useMemo,useState} from 'react';
import {Campaign,GiftRequest} from '@/lib/types';
import {Gift,Plus,CheckCircle2,Undo2,Pencil,Upload,Download,Info,Save,ShieldCheck} from 'lucide-react';
type Run=(op:string,params:Record<string,unknown>)=>Promise<boolean>;
export default function CampaignExtras({campaign:c,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [iid,setIid]=useState('');
 const [beneficiary,setBeneficiary]=useState('');
 const [giftName,setGiftName]=useState('');
 const [details,setDetails]=useState('');
 const [points,setPoints]=useState(10);
 const [selected,setSelected]=useState<GiftRequest|null>(null);
 const [donor,setDonor]=useState('');
 const [group,setGroup]=useState('');
 const [actor,setActor]=useState('');
 const [reason,setReason]=useState('');
 const [edit,setEdit]=useState(false);
 const [bulkMode,setBulkMode]=useState<'gifts'|'needs'|'donations'>('gifts');
 const [bulkText,setBulkText]=useState('');
 const [bulkIid,setBulkIid]=useState('');
 const [message,setMessage]=useState('');
 const all=c.institutions.flatMap(i=>(i.gifts||[]).map(g=>({...g,institution:i.name})));
 const chosen=c.institutions.find(i=>i.id===(iid||c.institutions[0]?.id));
 const preview=useMemo(()=>{
  const lines=bulkText.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
  if(!lines.length)return [] as string[][];
  const separator=(lines[0].match(/\t/g)||[]).length>0?'\t':(lines[0].match(/;/g)||[]).length>=(lines[0].match(/,/g)||[]).length?';':',';
  function cells(line:string){const out:string[]=[];let buffer='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){buffer+='"';i++}else quoted=!quoted}else if(ch===separator&&!quoted){out.push(buffer.trim());buffer=''}else buffer+=ch}out.push(buffer.trim());return out}
  const data=lines.map(cells);return data.slice(1);
 },[bulkText]);
 const validRows=preview.filter(x=>{
  if(bulkMode==='gifts')return Boolean(x[0]&&x[1]&&Number.isFinite(Number((x[3]||'10').replace(',','.')))&&Number((x[3]||'10').replace(',','.'))>=0);
  if(bulkMode==='donations')return Boolean(x[0]&&Number((x[1]||'0').replace(',','.'))>0&&x[2]&&x[3]&&x[4]);
  return Boolean(x[0]&&x[1]&&((x[2]||'target').toLowerCase()==='free'||Number((x[3]||'0').replace(',','.'))>0)&&Number.isFinite(Number((x[4]||'1').replace(',','.'))));
 });
 function startGift(g:GiftRequest){setSelected(g);setEdit(false);setDonor(g.donor||'');setGroup(g.group||'');setActor('');setReason('');setBeneficiary(g.beneficiary);setGiftName(g.giftName);setDetails(g.details);setPoints(g.points)}
 async function createGift(){const institutionId=iid||c.institutions[0]?.id;if(!institutionId||!beneficiary.trim()||!giftName.trim()||busy)return;
  if(await run('addGift',{institutionId,beneficiary:beneficiary.trim(),giftName:giftName.trim(),details:details.trim(),points})){setBeneficiary('');setGiftName('');setDetails('');setMessage('Presente cadastrado.')}
 }
 async function changeGift(op:string){if(!selected||busy||actor.trim().length<2||reason.trim().length<5)return;
  const ok=await run(op,{giftId:selected.id,actor:actor.trim(),reason:reason.trim(),donor:donor.trim(),group,beneficiary:beneficiary.trim(),giftName:giftName.trim(),details:details.trim(),points});
  if(ok){setSelected(null);setEdit(false);setMessage(op==='reserveGift'?'Presente reservado.':op==='deliverGift'?'Entrega confirmada e pontuação creditada.':op==='releaseGift'?'Reserva liberada.':'Presente atualizado.')}
 }
 function downloadModel(){const text=bulkMode==='gifts'?'Beneficiario;Presente;Detalhes;Pontos\nDona Maria;Cobertor;Tamanho casal;10\nSr Jose;Chinelo;Numero 40;10\n':bulkMode==='donations'?'Material;Quantidade;Doador;Grupo;Recebido por\nLeite;12;Joao Silva;DESC;Maria CIPAA\n':'Material;Unidade;Modalidade;Meta;Pontos;Observacao\nLeite;litros;free;0;1;Arrecadacao livre\nFraldas;pacotes;target;200;1;Tamanho G\n';
 const blob=new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='modelo-'+bulkMode+'.csv';a.click();URL.revokeObjectURL(url)}
 async function importData(){
  if(busy||!bulkIid||!preview.length||preview.length>(bulkMode==='donations'?200:300)||validRows.length!==preview.length)return;
  const items=preview.map(x=>bulkMode==='gifts'
   ?{beneficiary:x[0],giftName:x[1],details:x[2]||'',points:Number((x[3]||'10').replace(',','.'))}
   :bulkMode==='donations'
    ?{name:x[0],quantity:Number((x[1]||'0').replace(',','.')),donor:x[2],group:x[3],receivedBy:x[4]}
    :{name:x[0],unit:x[1]||'unidade(s)',mode:x[2]?.toLowerCase()==='free'?'free':'target',target:Number((x[3]||'0').replace(',','.')),points:Number((x[4]||'1').replace(',','.')),specification:x[5]||''});
  if(!window.confirm('Importar '+items.length+' registros para '+c.institutions.find(i=>i.id===bulkIid)?.name+'? '+(bulkMode==='donations'?'Doações importadas aumentarão o total recebido e os pontos, portanto não importe saldos iniciais já contabilizados.':'Revise os dados para evitar duplicidades.')))return;
  const op=bulkMode==='gifts'?'bulkAddGifts':bulkMode==='donations'?'bulkReceiveDonations':'bulkAddNeeds';
  const ok=await run(op,{institutionId:bulkIid,items});
  if(ok){setBulkText('');setMessage(items.length+' registros importados com sucesso.')}
 }
 return <div className="campaign-extras">
 <section className="panel">
  <div className="panel-header"><div><h3><Gift size={19}/> Presentes para adoção</h3><p className="muted">Um presente por beneficiário. Somente a CIPAA reserva e confirma entregas.</p></div><span className="pill">{all.length} presentes</span></div>
  <div className="gift-admin-summary"><span><b>{all.filter(g=>g.status==='available').length}</b> disponíveis</span><span><b>{all.filter(g=>g.status==='reserved').length}</b> reservados</span><span><b>{all.filter(g=>g.status==='delivered').length}</b> entregues</span></div>
  <h4>Cadastrar presente</h4><div className="donation-v2-grid">
   <label className="donation-v2-field"><span>Instituição</span><select value={iid||c.institutions[0]?.id||''} onChange={e=>setIid(e.target.value)}>{c.institutions.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
   <label className="donation-v2-field"><span>Beneficiário ou identificação</span><input placeholder="Ex.: Dona Maria — 78 anos" value={beneficiary} onChange={e=>setBeneficiary(e.target.value)}/></label>
   <label className="donation-v2-field"><span>Presente desejado</span><input placeholder="Ex.: Cobertor" value={giftName} onChange={e=>setGiftName(e.target.value)}/></label>
   <label className="donation-v2-field"><span>Detalhes (opcional)</span><input placeholder="Ex.: Tamanho, cor, numeração" value={details} onChange={e=>setDetails(e.target.value)}/></label>
   <label className="donation-v2-field"><span>Pontos ao entregar</span><input type="number" min="0" step="any" value={points} onChange={e=>setPoints(Number(e.target.value))}/></label>
  </div><div className="donation-v2-actions"><button className="btn primary" disabled={busy||!c.institutions.length||!beneficiary.trim()||!giftName.trim()||points<0} onClick={()=>void createGift()}><Plus size={17}/> Adicionar presente</button></div>
  {all.length>0&&<div className="gift-admin-list">{c.institutions.map(i=>(i.gifts||[]).length>0&&<div key={i.id} className="gift-admin-institution"><strong>{i.name}</strong>{(i.gifts||[]).map(g=><div key={g.id} className="gift-admin-row"><div><b>{g.beneficiary}</b><span>{g.giftName}{g.details?' · '+g.details:''}</span><small>{g.status==='available'?'Disponível':g.status==='reserved'?'Reservado':'Entregue'} · {g.points} pontos</small></div><button className="btn outline" onClick={()=>startGift(g)}><Pencil size={15}/> {g.status==='available'?'Gerenciar':'Detalhes'}</button></div>)}</div>)}</div>}
 </section>
 <section className="panel campaign-import">
  <div className="panel-header"><div><h3><Upload size={18}/> Importar dados em lote</h3><p className="muted">Prepare a tabela no Excel, copie e cole aqui, ou importe um CSV salvo pelo Excel.</p></div></div>
  <div className="campaign-import-toolbar"><label className="donation-v2-field"><span>Tipo de importação</span><select value={bulkMode} onChange={e=>{setBulkMode(e.target.value as 'gifts'|'needs'|'donations');setBulkText('')}}><option value="gifts">Lista de presentes</option><option value="needs">Materiais, metas e pontos</option><option value="donations">Doações recebidas (novos registros)</option></select></label><label className="donation-v2-field"><span>Instituição de destino</span><select value={bulkIid} onChange={e=>setBulkIid(e.target.value)}><option value="">Selecione a instituição</option>{c.institutions.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label></div>
  <button type="button" className="btn outline" onClick={downloadModel}><Download size={17}/> Baixar modelo CSV para Excel</button>
  <label className="donation-v2-field campaign-import-input"><span>Colar tabela do Excel (inclua a primeira linha de títulos)</span><textarea rows={6} placeholder={bulkMode==='gifts'?'Beneficiario;Presente;Detalhes;Pontos\nDona Maria;Cobertor;Tamanho casal;10' :bulkMode==='donations'?'Material;Quantidade;Doador;Grupo;Recebido por\nLeite;12;João;DESC;Maria CIPAA':'Material;Unidade;Modalidade;Meta;Pontos;Observacao\nLeite;litros;free;0;1;Sem meta'} value={bulkText} onChange={e=>setBulkText(e.target.value)}/></label>
  <label className="campaign-import-file"><Upload size={16}/> Ou selecionar arquivo CSV<input type="file" accept=".csv,text/csv,text/plain" onChange={async e=>{const f=e.target.files?.[0];if(f)setBulkText(await f.text());e.target.value=''}}/></label>
  {preview.length>0&&<div className="campaign-import-preview"><b>Prévia: {preview.length} linhas · {validRows.length} válidas</b><div className="donation-v2-table-scroll"><table><tbody>{preview.slice(0,5).map((row,i)=><tr key={i}>{row.map((col,k)=><td key={k}>{col}</td>)}</tr>)}</tbody></table></div>{preview.length!==validRows.length&&<p className="notice">Revise as linhas incompletas antes de importar.</p>}</div>}
  <button className="btn primary" disabled={busy||!bulkIid||!preview.length||preview.length>(bulkMode==='donations'?200:300)||validRows.length!==preview.length} onClick={()=>void importData()}><CheckCircle2 size={17}/> Confirmar importação de {preview.length} registros</button><p className="hint">Limite de 300 por importação. A importação adiciona registros. Para identificar doações antigas já contabilizadas, use a área de saldo inicial em Registrar doação, e não a importação de doações.</p>
 </section>
 {message&&<p className="donation-notification"><CheckCircle2 size={18}/>{message}</p>}
 {selected&&<div className="donation-dialog-backdrop" onClick={()=>setSelected(null)}><section role="dialog" aria-modal="true" aria-label="Gerenciar presente" className="donation-dialog" onClick={e=>e.stopPropagation()}><div className="panel-header"><div><h3>{selected.beneficiary}: {selected.giftName}</h3><p className="muted">{selected.status==='available'?'Disponível para adoção':selected.status==='reserved'?'Aguardando entrega':'Presente entregue'}</p></div><button className="icon-btn" onClick={()=>setSelected(null)}>Fechar</button></div>
  {selected.status==='reserved'&&<p className="gift-admin-reserved">Reservado por <b>{selected.donor}</b> · {selected.group}</p>}
  {selected.status==='delivered'&&<p className="gift-admin-reserved">Entregue por <b>{selected.donor}</b> · {selected.group}</p>}
  {edit&&<div className="donation-v2-grid"><label className="donation-v2-field"><span>Beneficiário</span><input value={beneficiary} onChange={e=>setBeneficiary(e.target.value)}/></label><label className="donation-v2-field"><span>Presente</span><input value={giftName} onChange={e=>setGiftName(e.target.value)}/></label><label className="donation-v2-field"><span>Detalhes</span><input value={details} onChange={e=>setDetails(e.target.value)}/></label><label className="donation-v2-field"><span>Pontos</span><input type="number" min="0" value={points} onChange={e=>setPoints(Number(e.target.value))}/></label></div>}
  {selected.status==='available'&&!edit&&<div className="donation-v2-grid"><label className="donation-v2-field"><span>Nome de quem adotou o presente</span><input value={donor} onChange={e=>setDonor(e.target.value)}/></label><label className="donation-v2-field"><span>Setor / grupo</span><select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Selecione</option>{c.groups?.map(g=><option key={g.id} value={g.name}>{g.name}</option>)}</select></label></div>}
  <div className="donation-v2-audit-inputs"><label className="donation-v2-field"><span>Responsável CIPAA</span><input value={actor} onChange={e=>setActor(e.target.value)} placeholder="Seu nome"/></label><label className="donation-v2-field"><span>Motivo / observação</span><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ex.: Reserva solicitada pelo colaborador"/></label></div>
  <div className="donation-v2-actions">{selected.status==='available'&&!edit&&<button className="btn primary" disabled={busy||!donor.trim()||!group} onClick={()=>void changeGift('reserveGift')}><Gift size={17}/> Reservar presente</button>}{selected.status==='reserved'&&!edit&&<><button className="btn primary" disabled={busy} onClick={()=>void changeGift('deliverGift')}><CheckCircle2 size={17}/> Confirmar entrega</button><button className="btn outline" disabled={busy} onClick={()=>void changeGift('releaseGift')}><Undo2 size={17}/> Liberar reserva</button></>}{!edit&&<button className="btn outline" onClick={()=>setEdit(true)}><Pencil size={16}/> Editar dados</button>}{edit&&<button className="btn primary" disabled={busy||!beneficiary.trim()||!giftName.trim()} onClick={()=>void changeGift('editGift')}><Save size={16}/> Salvar edição</button>}</div><p className="hint">Alterações exigem responsável e motivo e ficam registradas para auditoria. Pontos são creditados apenas após a entrega.</p>
 </section></div>}
 </div>;
}
