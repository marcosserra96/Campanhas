'use client';
import {useEffect,useMemo,useState} from 'react';
import {Campaign,Donation} from '@/lib/types';
import OpeningBalanceManager from '@/components/opening-balance-manager';
import GiftOperations from '@/components/gift-operations';
import {CheckCircle2,ClipboardCheck,History,Pencil,RotateCcw,Search,ShieldCheck,Trash2,X,PackageCheck,Info,Save} from 'lucide-react';

type Action=(op:string,params:Record<string,unknown>)=>Promise<boolean>;
type Audit={id:string;source?:'new'|'opening'|'gift';donation_id:string;event_type:string;changed_at:string;changed_by:string;reason:string;before_data:Record<string,unknown>|null;after_data:Record<string,unknown>|null};
type Props={campaign:Campaign;donations:Donation[];busy:boolean;run:Action};
const num=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const date=(value:string)=>new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
export default function DonationManager({campaign:c,donations,busy,run}:Props){
 const [activeSection,setActiveSection]=useState<'materials'|'gifts'|'opening'|'history'>('materials');
 const [institutionId,setInstitutionId]=useState('');
 const [needId,setNeedId]=useState('');
 const [quantity,setQuantity]=useState(1);
 const [donor,setDonor]=useState('');
 const [group,setGroup]=useState('');
 const [receiver,setReceiver]=useState('');
 const [successful,setSuccessful]=useState(false);
 const [editing,setEditing]=useState<Donation|null>(null);
 const [canceling,setCanceling]=useState<Donation|null>(null);
 const [editInstitution,setEditInstitution]=useState('');
 const [editNeed,setEditNeed]=useState('');
 const [editQuantity,setEditQuantity]=useState(1);
 const [editDonor,setEditDonor]=useState('');
 const [editGroup,setEditGroup]=useState('');
 const [editReceiver,setEditReceiver]=useState('');
 const [editor,setEditor]=useState('');
 const [reason,setReason]=useState('');
 const [showAudit,setShowAudit]=useState(false);
 const [audit,setAudit]=useState<Audit[]>([]);
 const [auditLoading,setAuditLoading]=useState(false);
 const [auditError,setAuditError]=useState('');
 const [search,setSearch]=useState('');
 const needs=useMemo(()=>c.institutions.flatMap(i=>i.needs.map(n=>({...n,institution:i.name,institutionId:i.id}))),[c]);
 const current=useMemo(()=>donations.filter(d=>d.source!=='opening'),[donations]);
 const allocations=useMemo(()=>donations.filter(d=>d.source==='opening'),[donations]);
 const groups=c.groups||[];
 const members=useMemo(()=>Array.from(new Set(current.map(d=>d.receivedBy).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'pt-BR')),[current]);
 const institutionItems=c.institutions.find(i=>i.id===institutionId)?.needs||[];
 const selected=needs.find(n=>n.id===needId);
 const valid=Boolean(institutionId&&institutionItems.some(n=>n.id===needId)&&quantity>0&&Number.isFinite(quantity)&&donor.trim()&&groups.some(g=>g.name===group)&&receiver.trim());
 const canEdit=Boolean(editor.trim().length>=2&&reason.trim().length>=5&&editNeed&&editQuantity>0&&editDonor.trim()&&groups.some(g=>g.name===editGroup)&&editReceiver.trim());
 const canCancel=Boolean(editor.trim().length>=2&&reason.trim().length>=5);
 const visible=current.filter(d=>[d.donor,d.group,needs.find(n=>n.id===d.needId)?.name||''].some(v=>v.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))));
 useEffect(()=>{try{const saved=window.localStorage.getItem('cipaa-last-receiver');if(saved)setReceiver(saved)}catch{}},[]);
 async function loadAudit(){
  setAuditLoading(true);setAuditError('');
  try{const res=await fetch('/api/admin/audit?campaign='+encodeURIComponent(c.id),{cache:'no-store'});
    const body=await res.json();if(!res.ok)throw Error(body.error||'Falha ao carregar auditoria');
    setAudit(body.history||[]);
  }catch(e){setAuditError(e instanceof Error?e.message:'Falha ao carregar auditoria')}
  finally{setAuditLoading(false)}
 }
 async function receive(){
  if(!valid||busy)return;
  const remaining=selected?selected.target-selected.received:0;
  if(selected&&selected.mode!=='free'&&quantity>remaining&&!window.confirm('A quantidade ultrapassa a meta ainda pendente deste material. Deseja registrar mesmo assim?'))return;
  const ok=await run('receiveDonation',{needId,quantity,donor:donor.trim(),group:group.trim(),receivedBy:receiver.trim()});
  if(ok){try{localStorage.setItem('cipaa-last-receiver',receiver.trim())}catch{}setNeedId('');setQuantity(1);setSuccessful(true);if(showAudit)void loadAudit()}
 }
 function startEdit(d:Donation){
  setEditing(d);setCanceling(null);setEditInstitution(d.institutionId);setEditNeed(d.needId);setEditQuantity(d.quantity);setEditDonor(d.donor);setEditGroup(d.group);setEditReceiver(d.receivedBy);setEditor(receiver||'');setReason('');
 }
 function startCancel(d:Donation){
  setCanceling(d);setEditing(null);setEditor(receiver||'');setReason('');
 }
 async function saveEdit(){
  if(!editing||!canEdit||busy)return;
  const ok=await run('editDonation',{donationId:editing.id,needId:editNeed,quantity:editQuantity,donor:editDonor.trim(),group:editGroup.trim(),receivedBy:editReceiver.trim(),actor:editor.trim(),reason:reason.trim()});
  if(ok){setEditing(null);setReason('');if(showAudit)void loadAudit()}
 }
 async function confirmCancel(){
  if(!canceling||!canCancel||busy)return;
  if(!window.confirm('Cancelar esta doação? O lançamento permanecerá no histórico e deixará de contar nas metas e no ranking.'))return;
  const ok=await run('voidDonation',{donationId:canceling.id,actor:editor.trim(),reason:reason.trim()});
  if(ok){setCanceling(null);setReason('');if(showAudit)void loadAudit()}
 }
 const selectedEdit=needs.find(n=>n.id===editNeed);
 const giftCount=c.institutions.flatMap(i=>i.gifts||[]).filter(g=>g.status==='reserved').length;
 const openingPending=c.institutions.flatMap(i=>i.needs).reduce((sum,n)=>sum+(n.openingReceived||0),0)-allocations.reduce((sum,d)=>sum+d.quantity,0);
 const sections=[{id:'materials' as const,title:'Receber materiais',subtitle:'Registrar entregas',icon:PackageCheck,count:0},
 {id:'gifts' as const,title:'Presentes',subtitle:'Reservar e dar baixa',icon:Gift,count:giftCount},
 {id:'opening' as const,title:'Doações anteriores',subtitle:'Identificar saldos',icon:Archive,count:Math.max(0,openingPending)},
 {id:'history' as const,title:'Registros e auditoria',subtitle:'Consultar e corrigir',icon:History,count:current.length}];
 return <div className="donations-v2 donation-workspace">
  <header className="section-heading donation-workspace-title"><div><h2>Registrar doações</h2><p className="muted">Escolha o que deseja fazer. Cada operação tem sua própria área, sem formulários misturados.</p></div></header>
  <div className="donation-workspace-stats"><div><PackageCheck size={19}/><span><strong>{current.length.toLocaleString('pt-BR')}</strong> registros de materiais</span></div><div><Gift size={19}/><span><strong>{giftCount.toLocaleString('pt-BR')}</strong> presentes aguardando entrega</span></div><div><Archive size={19}/><span><strong>{Math.max(0,openingPending).toLocaleString('pt-BR')}</strong> unidades antigas sem identificação</span></div></div>
  <nav className="donation-workspace-tabs" aria-label="Operações de doações">{sections.map(section=><button type="button" key={section.id} className={activeSection===section.id?'selected':''} aria-current={activeSection===section.id?'page':undefined} onClick={()=>setActiveSection(section.id)}><section.icon size={19}/><span><strong>{section.title}</strong><small>{section.subtitle}</small></span>{section.count>0&&<em>{section.count.toLocaleString('pt-BR')}</em>}</button>)}</nav>
  {activeSection==='materials'&&<>
  {successful&&<div className="donation-notification"><CheckCircle2 size={20}/><span>Doação registrada. Você pode lançar outro item do mesmo colaborador.</span><button onClick={()=>{setDonor('');setGroup('');setSuccessful(false)}}>Novo doador</button></div>}
  <section className="panel donation-v2-card">
   <div className="donation-v2-heading"><span><PackageCheck size={22}/></span><div><h3>Nova entrega</h3><p>Informe o material, a quantidade e quem participou.</p></div></div>
   <div className="donation-v2-grid">
    <label className="donation-v2-field"><span>Instituição <b>*</b></span><select value={institutionId} onChange={e=>{setInstitutionId(e.target.value);setNeedId('');setSuccessful(false)}}><option value="">Selecione a instituição</option>{c.institutions.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
    <label className="donation-v2-field"><span>Material recebido <b>*</b></span><select value={needId} disabled={!institutionId} onChange={e=>{setNeedId(e.target.value);setSuccessful(false)}}><option value="">{institutionId?'Selecione o material':'Escolha uma instituição primeiro'}</option>{institutionItems.map(n=><option key={n.id} value={n.id}>{n.name}{n.specification?' — '+n.specification:''}</option>)}</select></label>
    <label className="donation-v2-field"><span>Quantidade <b>*</b></span><input type="number" min="0.01" step="any" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
    <label className="donation-v2-field"><span>Colaborador que doou <b>*</b></span><input placeholder="Nome do colaborador" value={donor} onChange={e=>setDonor(e.target.value)}/></label>
    <label className="donation-v2-field"><span>{'Setor ou grupo ('+c.rankingBy+')'} <b>*</b></span><select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Selecione o setor/grupo</option>{groups.map(g=><option value={g.name} key={g.id}>{g.name}</option>)}</select></label>
    <label className="donation-v2-field"><span>Membro da CIPAA que recebeu <b>*</b></span><input list="cipaa-members" placeholder="Nome do responsável" value={receiver} onChange={e=>setReceiver(e.target.value)}/><datalist id="cipaa-members">{members.map(m=><option value={m} key={m}/>)}</datalist></label>
   </div>
   {!groups.length&&<p className="notice soft">Antes de registrar doações, cadastre os setores/grupos em <strong>Campanhas → Pontuação</strong>.</p>}
   {selected&&<div className="donation-v2-material"><Info size={17}/><span>{selected.name}: {selected.mode==='free'?<strong>Arrecadação livre · {num(selected.received)} {selected.unit} já recebidos</strong>:<span><strong>{num(Math.max(0,selected.target-selected.received))} {selected.unit} faltando</strong> para completar a meta</span>}</span></div>}
   <div className="donation-v2-actions"><button className="btn primary" disabled={busy||!valid} onClick={()=>void receive()}><CheckCircle2 size={18}/>{busy?'Salvando...':'Registrar recebimento'}</button><button className="btn outline" onClick={()=>{setInstitutionId('');setNeedId('');setQuantity(1);setDonor('');setGroup('');setSuccessful(false)}} type="button">Limpar doador</button></div>
   <p className="donation-v2-footnote">Seu nome como membro da CIPAA fica preenchido neste navegador para agilizar as próximas entregas.</p>
  </section>
  </>}
  {activeSection==='gifts'&&<GiftOperations campaign={c} run={run} busy={busy}/>}
  {activeSection==='opening'&&<OpeningBalanceManager campaign={c} attributions={allocations} run={run} busy={busy} onUpdate={()=>{if(showAudit)void loadAudit()}}/>}
  {activeSection==='history'&&<>
  <section className="panel donation-v2-list">
   <div className="panel-header"><div><h3>Doações registradas</h3><p className="muted">Corrija erros ou cancele um lançamento informando o motivo.</p></div><span className="pill">{current.length} registros ativos</span></div>
   <div className="donation-v2-toolbar"><label className="donation-v2-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar doador, grupo ou material" aria-label="Buscar doações"/></label><button className="btn outline" onClick={()=>{setShowAudit(!showAudit);if(!showAudit)void loadAudit()}}><History size={17}/>{showAudit?'Fechar auditoria':'Ver auditoria'}</button></div>
   <div className="donation-v2-table-scroll"><table><thead><tr><th>Data</th><th>Doador / grupo</th><th>Material</th><th>Qtd.</th><th>Ações</th></tr></thead><tbody>{visible.slice(0,75).map(d=><tr key={d.id}><td>{date(d.date)}</td><td><strong>{d.donor}</strong><small>{d.group}</small></td><td>{needs.find(n=>n.id===d.needId)?.name||'Material não encontrado'}</td><td><b>{num(d.quantity)}</b></td><td><div className="donation-row-buttons"><button onClick={()=>startEdit(d)} title="Editar registro"><Pencil size={15}/> Editar</button><button onClick={()=>startCancel(d)} title="Cancelar registro"><Trash2 size={15}/> Cancelar</button></div></td></tr>)}{visible.length===0&&<tr><td colSpan={5} className="donation-v2-empty">Nenhuma doação encontrada.</td></tr>}</tbody></table></div>
   {visible.length>75&&<p className="hint">Mostrando os 75 registros mais recentes. Use a busca para localizar outros.</p>}
  </section>
  {showAudit&&<section className="panel donation-v2-audit"><div className="panel-header"><div><h3><ShieldCheck size={19}/> Histórico de auditoria</h3><p className="muted">As alterações e cancelamentos são registrados no Supabase e não podem ser apagados pelo portal.</p></div><button className="btn outline" disabled={auditLoading} onClick={()=>void loadAudit()}><RotateCcw size={15}/> Atualizar</button></div>{auditLoading?<p className="muted">Carregando histórico...</p>:auditError?<p className="notice">{auditError}</p>:audit.length?audit.map(ev=><details key={ev.id} className="audit-event"><summary><span className="audit-event-status">{ev.source==='opening'?'Saldo inicial • ':ev.source==='gift'?'Presente • ':''}{ev.event_type==='created'?'Criação':ev.event_type==='edited'?'Correção':ev.event_type==='voided'?'Cancelamento':ev.event_type==='reserved'?'Reserva':ev.event_type==='delivered'?'Entrega':ev.event_type==='released'?'Reserva liberada':'Alteração'}</span><strong>{ev.changed_by}</strong><small>{date(ev.changed_at)}</small></summary><p><b>Motivo:</b> {ev.reason}</p><div className="audit-snapshots">{ev.before_data&&<div><b>Antes</b><p>{String(ev.before_data.donor_name||'')} · {String(ev.before_data.group_name||'')}</p>{ev.source==='gift'?<><p>Presente: {String(ev.before_data.gift_name||'')}</p><p>Beneficiário: {String(ev.before_data.beneficiary||'')}</p><p>Status: {String(ev.before_data.status||'')}</p></>:<><p>{num(Number(ev.before_data.quantity||0))} unidade(s) · {needs.find(n=>n.id===ev.before_data?.need_id)?.name||'Material anterior'}</p><p>Recebido por: {String(ev.before_data.received_by||'')}</p></>}</div>}{ev.after_data&&<div><b>Depois</b><p>{String(ev.after_data.donor_name||'')} · {String(ev.after_data.group_name||'')}</p>{ev.source==='gift'?<><p>Presente: {String(ev.after_data.gift_name||'')}</p><p>Beneficiário: {String(ev.after_data.beneficiary||'')}</p><p>Status: {String(ev.after_data.status||'')}</p></>:<><p>{num(Number(ev.after_data.quantity||0))} unidade(s) · {needs.find(n=>n.id===ev.after_data?.need_id)?.name||'Material atual'}</p><p>Recebido por: {String(ev.after_data.received_by||'')}</p></>}</div>}</div></details>):<p className="muted">Nenhuma alteração registrada até o momento.</p>}</section>}
  </>}
  {(editing||canceling)&&<div className="donation-dialog-backdrop" role="presentation" onClick={()=>{setEditing(null);setCanceling(null)}}><section className="donation-dialog" role="dialog" aria-modal="true" aria-label={editing?'Editar doação':'Cancelar doação'} onClick={e=>e.stopPropagation()}><div className="panel-header"><div><h3>{editing?'Corrigir doação':'Cancelar doação'}</h3><p className="muted">A alteração ficará registrada no histórico de auditoria.</p></div><button className="icon-btn" aria-label="Fechar" onClick={()=>{setEditing(null);setCanceling(null)}}><X size={19}/></button></div>
   {editing&&<div className="donation-v2-grid"><label className="donation-v2-field"><span>Instituição</span><select value={editInstitution} onChange={e=>{setEditInstitution(e.target.value);setEditNeed('')}}><option value="">Selecione a instituição</option>{c.institutions.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label><label className="donation-v2-field"><span>Material</span><select value={editNeed} disabled={!editInstitution} onChange={e=>setEditNeed(e.target.value)}><option value="">Selecione</option>{c.institutions.find(i=>i.id===editInstitution)?.needs.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label><label className="donation-v2-field"><span>Quantidade</span><input type="number" min="0.01" step="any" value={editQuantity} onChange={e=>setEditQuantity(Number(e.target.value))}/></label><label className="donation-v2-field"><span>Doador</span><input value={editDonor} onChange={e=>setEditDonor(e.target.value)}/></label><label className="donation-v2-field"><span>Grupo</span><select value={editGroup} onChange={e=>setEditGroup(e.target.value)}><option value="">Selecione um grupo</option>{groups.map(g=><option key={g.id} value={g.name}>{g.name}</option>)}</select></label><label className="donation-v2-field"><span>Quem recebeu</span><input value={editReceiver} onChange={e=>setEditReceiver(e.target.value)}/></label></div>}
   {editing&&selectedEdit&&<p className="hint">Material selecionado: {selectedEdit.name}</p>}
   {canceling&&<p className="donation-v2-cancel-text">A doação de <strong>{num(canceling.quantity)} unidade(s)</strong> feita por <strong>{canceling.donor}</strong> deixará de contar nos resultados. O histórico será mantido.</p>}
   <div className="donation-v2-audit-inputs"><label className="donation-v2-field"><span>Seu nome (responsável pela alteração) *</span><input value={editor} onChange={e=>setEditor(e.target.value)} placeholder="Nome do membro da CIPAA"/></label><label className="donation-v2-field"><span>Motivo da {editing?'correção':'cancelamento'} *</span><textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ex.: Quantidade digitada incorretamente"/></label></div>
   <div className="donation-v2-actions"><button className="btn primary" disabled={busy||(editing?!canEdit:!canCancel)} onClick={()=>editing?void saveEdit():void confirmCancel()}><Save size={17}/>{busy?'Salvando...':editing?'Salvar correção':'Confirmar cancelamento'}</button><button className="btn outline" onClick={()=>{setEditing(null);setCanceling(null)}}>Voltar</button></div>
   </section></div>}
 </div>;
}
