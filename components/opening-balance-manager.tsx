'use client';
import {useMemo,useState} from 'react';
import {Campaign,Donation} from '@/lib/types';
import {Archive,CheckCircle2,Pencil,ShieldCheck,Trash2,X} from 'lucide-react';
type Action=(op:string,params:Record<string,unknown>)=>Promise<boolean>;
type Props={campaign:Campaign;attributions:Donation[];run:Action;busy:boolean;onUpdate?:()=>void};
const fmt=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});
export default function OpeningBalanceManager({campaign:c,attributions,run,busy,onUpdate}:Props){
 const [institution,setInstitution]=useState('');
 const [need,setNeed]=useState('');
 const [quantity,setQuantity]=useState(1);
 const [donor,setDonor]=useState('');
 const [group,setGroup]=useState('');
 const [actor,setActor]=useState('');
 const [editing,setEditing]=useState<Donation|null>(null);
 const [editQuantity,setEditQuantity]=useState(1);
 const [editDonor,setEditDonor]=useState('');
 const [editGroup,setEditGroup]=useState('');
 const [editActor,setEditActor]=useState('');
 const [reason,setReason]=useState('');
 const [message,setMessage]=useState('');
 const items=useMemo(()=>c.institutions.flatMap(i=>i.needs.filter(n=>(n.openingReceived||0)>0).map(n=>({...n,institution:i.name,institutionId:i.id}))),[c]);
 const alloc=useMemo(()=>new Map(items.map(n=>[n.id,attributions.filter(a=>a.needId===n.id).reduce((sum,a)=>sum+a.quantity,0)])),[items,attributions]);
 const unassigned=items.reduce((sum,n)=>sum+Math.max(0,(n.openingReceived||0)-(alloc.get(n.id)||0)),0);
 const selected=items.find(n=>n.id===need);
 const available=selected?Math.max(0,(selected.openingReceived||0)-(alloc.get(selected.id)||0)):0;
 const groups=c.groups||[];
 const canRegister=Boolean(need&&quantity>0&&quantity<=available&&donor.trim()&&group&&actor.trim().length>=2&&groups.some(g=>g.name===group));
 async function assign(){
  if(!canRegister||busy)return;
  if(await run('attributeOpening',{needId:need,quantity,donor:donor.trim(),group,actor:actor.trim()})){
    setMessage('Origem identificada e salva! O total recebido permanece inalterado.');
    setNeed('');setQuantity(1);setDonor('');onUpdate?.();
  }
 }
 function startEdit(d:Donation){setEditing(d);setEditQuantity(d.quantity);setEditDonor(d.donor);setEditGroup(d.group);setEditActor(actor||d.receivedBy||'');setReason('')}
 async function saveEdit(){
  if(!editing||busy||!editDonor.trim()||!groups.some(g=>g.name===editGroup)||!editActor.trim()||reason.trim().length<3||editQuantity<=0)return;
  if(await run('editOpening',{attributionId:editing.id,quantity:editQuantity,donor:editDonor.trim(),group:editGroup,actor:editActor.trim(),reason:reason.trim()})){setEditing(null);setMessage('Identificação corrigida com registro de auditoria.');onUpdate?.()}
 }
 async function cancel(){
  if(!editing||busy||!editActor.trim()||reason.trim().length<3)return;
  if(!window.confirm('Cancelar esta identificação? A quantidade voltará a ficar sem doador identificado, mas continuará no saldo inicial.'))return;
  if(await run('voidOpening',{attributionId:editing.id,actor:editActor.trim(),reason:reason.trim()})){setEditing(null);setMessage('Identificação cancelada. O total arrecadado continua igual.');onUpdate?.()}
 }
 if(!items.length)return null;
 return <section className="panel opening-panel">
  <div className="panel-header"><div><div className="opening-eyebrow"><Archive size={17}/> SALDO ANTERIOR À IMPLANTAÇÃO</div><h3>Identificar doações já recebidas</h3><p className="muted">Esses itens já estão contabilizados. Informe quem doou, sem registrá-los novamente como novas entregas.</p></div><span className="opening-count">{fmt(unassigned)} sem identificação</span></div>
  {message&&<div className="donation-notification"><CheckCircle2 size={18}/>{message}<button onClick={()=>setMessage('')}>Fechar</button></div>}
  <div className="opening-inventory">{items.map(n=>{const assigned=alloc.get(n.id)||0,free=Math.max(0,(n.openingReceived||0)-assigned);return <button type="button" className={'opening-stock '+(need===n.id?'selected':'')} key={n.id} onClick={()=>{setInstitution(n.institutionId);setNeed(n.id);setQuantity(Math.min(1,free))}}><strong>{n.name}</strong><small>{n.institution}</small><span><b>{fmt(free)}</b> sem doador de {fmt(n.openingReceived||0)} recebidos</span></button>})}</div>
  <div className="opening-form"><h4>Identificar uma entrega anterior</h4><div className="donation-v2-grid">
   <label className="donation-v2-field"><span>Instituição</span><select value={institution} onChange={e=>{setInstitution(e.target.value);setNeed('')}}><option value="">Escolha a instituição</option>{c.institutions.filter(i=>i.needs.some(n=>(n.openingReceived||0)>0)).map(i=><option value={i.id} key={i.id}>{i.name}</option>)}</select></label>
   <label className="donation-v2-field"><span>Material já recebido</span><select value={need} disabled={!institution} onChange={e=>setNeed(e.target.value)}><option value="">Selecione o material</option>{items.filter(n=>n.institutionId===institution).map(n=><option value={n.id} key={n.id}>{n.name} — {fmt(Math.max(0,(n.openingReceived||0)-(alloc.get(n.id)||0)))} sem identificação</option>)}</select></label>
   <label className="donation-v2-field"><span>Quantidade dessa pessoa</span><input type="number" min="0.01" step="any" max={available} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
   <label className="donation-v2-field"><span>Nome do doador</span><input value={donor} placeholder="Quem realizou essa entrega?" onChange={e=>setDonor(e.target.value)}/></label>
   <label className="donation-v2-field"><span>Empresa</span><select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Selecione uma empresa</option>{groups.map(g=><option value={g.name} key={g.id}>{g.name}</option>)}</select></label>
   <label className="donation-v2-field"><span>Responsável CIPAA pela identificação</span><input value={actor} placeholder="Seu nome" onChange={e=>setActor(e.target.value)}/></label>
  </div>{selected&&<p className="hint">{fmt(available)} unidade(s) desse material ainda sem doador identificado. É possível dividir esse saldo entre várias pessoas.</p>}
  {!groups.length&&<p className="notice soft">Antes de identificar as entregas, verifique as empresas em Campanhas → Pontuação.</p>}
  <button type="button" className="btn primary" disabled={!canRegister||busy} onClick={()=>void assign()}><CheckCircle2 size={16}/> Vincular doador ao saldo inicial</button>
  </div>
  {attributions.length>0&&<div className="opening-history"><h4>Identificações feitas</h4><div className="donation-v2-table-scroll"><table><thead><tr><th>Doador</th><th>Empresa</th><th>Material</th><th>Quantidade</th><th>Ação</th></tr></thead><tbody>{attributions.map(a=><tr key={a.id}><td>{a.donor}</td><td>{a.group}</td><td>{items.find(n=>n.id===a.needId)?.name||'Material'}</td><td>{fmt(a.quantity)}</td><td><button className="btn outline" onClick={()=>startEdit(a)}><Pencil size={15}/> Corrigir</button></td></tr>)}</tbody></table></div></div>}
  {editing&&<div className="donation-dialog-backdrop" onClick={()=>setEditing(null)}><div className="donation-dialog" role="dialog" aria-modal="true" aria-label="Corrigir identificação" onClick={e=>e.stopPropagation()}><div className="panel-header"><div><h3>Corrigir identificação anterior</h3><p className="muted">A alteração será registrada para auditoria.</p></div><button className="icon-btn" aria-label="Fechar" onClick={()=>setEditing(null)}><X size={18}/></button></div><div className="donation-v2-grid">
   <label className="donation-v2-field"><span>Doador</span><input value={editDonor} onChange={e=>setEditDonor(e.target.value)}/></label>
   <label className="donation-v2-field"><span>Quantidade</span><input type="number" min="0.01" step="any" value={editQuantity} onChange={e=>setEditQuantity(Number(e.target.value))}/></label>
   <label className="donation-v2-field"><span>Empresa</span><select value={editGroup} onChange={e=>setEditGroup(e.target.value)}><option value="">Selecione</option>{groups.map(g=><option key={g.id} value={g.name}>{g.name}</option>)}</select></label>
   <label className="donation-v2-field"><span>Responsável pela correção</span><input value={editActor} onChange={e=>setEditActor(e.target.value)}/></label>
   <label className="donation-v2-field donation-v2-wide"><span>Motivo da alteração</span><textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ex.: Nome incorreto" minLength={3}/></label>
   </div>{reason.trim().length>0&&reason.trim().length<3&&<p className="hint" role="status">Informe pelo menos 3 caracteres no motivo da alteração.</p>}<div className="donation-v2-actions"><button className="btn primary" disabled={busy||!editDonor.trim()||!editActor.trim()||reason.trim().length<3||editQuantity<=0||!groups.some(g=>g.name===editGroup)} onClick={()=>void saveEdit()}><ShieldCheck size={17}/> Salvar correção</button><button className="btn outline danger-text" disabled={busy||!editActor.trim()||reason.trim().length<3} onClick={()=>void cancel()}><Trash2 size={16}/> Desfazer identificação</button></div></div></div>}
 </section>;
}
