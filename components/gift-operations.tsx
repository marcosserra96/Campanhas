'use client';
import {useMemo,useState} from 'react';
import {Campaign,GiftRequest,COMPANIES,Company} from '@/lib/types';
import {Gift,CheckCircle2,Undo2,X,ShieldCheck,Search,Plus,CalendarDays,PackageCheck,Clock3,UserRound,Building2,ChevronDown} from 'lucide-react';

type Run=(op:string,params:Record<string,unknown>)=>Promise<boolean>;
type Entry={gift:GiftRequest;institution:string};
type PendingAction={entry:Entry;type:'deliverGift'|'releaseGift'};
const dateLabel=(value?:string)=>value?new Date(value).toLocaleDateString('pt-BR'):'Não informado';
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');

export default function GiftOperations({campaign:c,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [company,setCompany]=useState<'all'|Company>('all');
 const [view,setView]=useState<'reserved'|'delivered'>('reserved');
 const [search,setSearch]=useState('');
 const [pending,setPending]=useState<PendingAction|null>(null);
 const [actor,setActor]=useState('');
 const [reason,setReason]=useState('');
 const [message,setMessage]=useState('');
 const [manual,setManual]=useState(false);
 const [manualInstitution,setManualInstitution]=useState('');
 const [manualGift,setManualGift]=useState('');
 const [manualDonor,setManualDonor]=useState('');
 const [manualCompany,setManualCompany]=useState<Company|''>('');
 const [manualActor,setManualActor]=useState('');
 const [manualReason,setManualReason]=useState('Reserva realizada pela CIPAA');

 const entries=useMemo<Entry[]>(()=>c.institutions.flatMap(institution=>(institution.gifts||[]).map(gift=>({gift,institution:institution.name}))),[c.institutions]);
 const reserved=entries.filter(x=>x.gift.status==='reserved');
 const delivered=entries.filter(x=>x.gift.status==='delivered');
 const available=entries.filter(x=>x.gift.status==='available');
 const companyCount=(name:Company)=>reserved.filter(x=>x.gift.group===name).length;
 const visible=entries.filter(({gift,institution})=>gift.status===view&&(company==='all'||gift.group===company)&&[gift.donor||'',gift.beneficiary,gift.giftName,gift.details,institution].some(s=>normalize(s).includes(normalize(search.trim())))).sort((a,b)=>view==='reserved'?new Date(a.gift.reservedAt||0).getTime()-new Date(b.gift.reservedAt||0).getTime():new Date(b.gift.deliveredAt||0).getTime()-new Date(a.gift.deliveredAt||0).getTime());
 const selectedManual=c.institutions.find(i=>i.id===manualInstitution)?.gifts?.find(g=>g.id===manualGift);
 function openAction(entry:Entry,type:PendingAction['type']){
  setPending({entry,type});setReason(type==='deliverGift'?'Presente recebido e conferido pela CIPAA':'Colaborador informou que não poderá realizar a entrega');setMessage('');
 }
 async function confirmAction(){
  if(!pending||busy||actor.trim().length<2||reason.trim().length<5)return;
  if(pending.type==='releaseGift'&&!window.confirm('Liberar o presente de '+pending.entry.gift.beneficiary+'? Ele voltará a ficar disponível para adoção.'))return;
  const ok=await run(pending.type,{giftId:pending.entry.gift.id,actor:actor.trim(),reason:reason.trim()});
  if(ok){setMessage(pending.type==='deliverGift'?'Recebimento confirmado. O presente foi marcado como entregue e os pontos contabilizados.':'Reserva cancelada. O presente já pode ser adotado novamente.');setPending(null);setReason('');}
 }
 async function reserveManual(){
  if(!selectedManual||selectedManual.status!=='available'||!manualDonor.trim()||!manualCompany||manualActor.trim().length<2||manualReason.trim().length<5||busy)return;
  const ok=await run('reserveGift',{giftId:selectedManual.id,donor:manualDonor.trim(),group:manualCompany,actor:manualActor.trim(),reason:manualReason.trim()});
  if(ok){setMessage('Reserva registrada pela CIPAA. O presente aparece na lista de recebimentos da empresa selecionada.');setManual(false);setManualGift('');setManualDonor('');setManualReason('Reserva realizada pela CIPAA');setCompany(manualCompany);setView('reserved');}
 }
 if(!entries.length)return <section className="panel gift-operations"><h3>Recebimento de presentes</h3><p className="muted">Não há presentes cadastrados nesta campanha.</p></section>;
 return <section className="panel gift-operations gift-receiving">
  <header className="gift-receiving-head">
   <div><span className="gift-receiving-eyebrow"><Gift size={15}/> CONTROLE DE ADOÇÕES</span><h3>Recebimento de presentes</h3><p>Consulte quem assumiu cada presente e confirme a entrega quando chegar à CIPAA.</p></div>
   <button className="btn outline" type="button" onClick={()=>setManual(v=>!v)}><Plus size={16}/>{manual?'Fechar cadastro':'Reservar pela CIPAA'}</button>
  </header>
  <div className="gift-receiving-stats"><div><Clock3 size={18}/><span><strong>{reserved.length}</strong> aguardando entrega</span></div><div><PackageCheck size={18}/><span><strong>{delivered.length}</strong> entregues</span></div><div><Gift size={18}/><span><strong>{available.length}</strong> disponíveis</span></div></div>
  {message&&<div className="donation-notification" role="status"><CheckCircle2 size={18}/><span>{message}</span><button type="button" onClick={()=>setMessage('')}>Fechar</button></div>}
  {manual&&<div className="gift-receiving-manual"><div className="gift-receiving-subhead"><h4>Registrar uma reserva manualmente</h4><p>Use quando a pessoa solicitar a adoção diretamente a um membro da CIPAA.</p></div><div className="donation-v2-grid"><label className="donation-v2-field"><span>Instituição</span><select value={manualInstitution} onChange={e=>{setManualInstitution(e.target.value);setManualGift('')}}><option value="">Selecione</option>{c.institutions.filter(i=>(i.gifts||[]).some(g=>g.status==='available')).map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label><label className="donation-v2-field"><span>Presente disponível</span><select value={manualGift} disabled={!manualInstitution} onChange={e=>setManualGift(e.target.value)}><option value="">Selecione</option>{c.institutions.find(i=>i.id===manualInstitution)?.gifts?.filter(g=>g.status==='available').map(g=><option key={g.id} value={g.id}>{g.beneficiary} — {g.giftName}</option>)}</select></label><label className="donation-v2-field"><span>Nome completo do colaborador</span><input value={manualDonor} onChange={e=>setManualDonor(e.target.value)} placeholder="Nome e sobrenome"/></label><label className="donation-v2-field"><span>Empresa</span><select value={manualCompany} onChange={e=>setManualCompany(e.target.value as Company|'')}><option value="">Selecione</option>{COMPANIES.map(x=><option value={x} key={x}>{x}</option>)}</select></label><label className="donation-v2-field"><span>Responsável CIPAA</span><input value={manualActor} onChange={e=>setManualActor(e.target.value)} placeholder="Seu nome"/></label><label className="donation-v2-field"><span>Observação</span><input value={manualReason} onChange={e=>setManualReason(e.target.value)}/></label></div><div className="donation-v2-actions"><button className="btn primary" disabled={busy||!selectedManual||manualDonor.trim().length<5||!manualCompany||manualActor.trim().length<2||manualReason.trim().length<5} onClick={()=>void reserveManual()}><Gift size={16}/> Registrar reserva</button><button className="btn outline" onClick={()=>setManual(false)}>Cancelar</button></div></div>}
  <nav className="gift-company-tabs" aria-label="Filtrar reservas por empresa">
   <button type="button" className={company==='all'?'active':''} onClick={()=>setCompany('all')}>Todas <span>{reserved.length}</span></button>
   {COMPANIES.map(name=><button type="button" key={name} className={company===name?'active':''} onClick={()=>setCompany(name)}>{name}<span>{companyCount(name)}</span></button>)}
  </nav>
  <div className="gift-receiving-toolbar"><div className="gift-receiving-status-tabs"><button type="button" className={view==='reserved'?'active':''} onClick={()=>setView('reserved')}><Clock3 size={15}/> Aguardando entrega</button><button type="button" className={view==='delivered'?'active':''} onClick={()=>setView('delivered')}><CheckCircle2 size={15}/> Já entregues</button></div><label className="gift-receiving-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar doador, idoso ou presente" aria-label="Buscar presentes"/></label></div>
  {visible.length?<div className="gift-receiving-list">{visible.map(entry=>{
   const g=entry.gift;
   return <article className="gift-receiving-item" key={g.id}>
    <div className="gift-receiving-main"><div className="gift-receiving-donor"><UserRound size={19}/><div><span>QUEM SE COMPROMETEU</span><strong>{g.donor||'Doador não identificado'}</strong><small><Building2 size={12}/>{g.group||'Empresa não informada'}</small></div></div><div className="gift-receiving-target"><span>PARA QUEM / PRESENTE</span><strong>{g.beneficiary}</strong><p>{g.giftName}{g.details?' · '+g.details:''}</p><small>{entry.institution}</small></div></div>
    <div className="gift-receiving-side"><div className="gift-receiving-date"><CalendarDays size={14}/>{view==='reserved'?'Reservado em ':'Entregue em '}{dateLabel(view==='reserved'?g.reservedAt:g.deliveredAt)}</div>{view==='reserved'?<div className="gift-receiving-actions"><button type="button" className="btn primary" onClick={()=>openAction(entry,'deliverGift')} disabled={busy}><CheckCircle2 size={16}/> Confirmar recebimento</button><button type="button" className="btn outline" onClick={()=>openAction(entry,'releaseGift')} disabled={busy}><Undo2 size={15}/> Liberar reserva</button></div>:<span className="gift-receiving-done"><ShieldCheck size={16}/> Entrega confirmada</span>}</div>
   </article>
  })}</div>:<div className="gift-receiving-empty"><Gift size={30}/><h4>{search?'Nenhum presente corresponde à busca':view==='reserved'?'Nenhuma entrega pendente':'Nenhuma entrega confirmada'}</h4><p>{search?'Tente outro nome ou retire o filtro.':view==='reserved'?'As próximas adoções aparecerão aqui automaticamente.':'As entregas confirmadas pela CIPAA aparecerão nesta área.'}</p></div>}
  {pending&&<div className="donation-dialog-backdrop gift-receiving-modal-backdrop" onClick={()=>setPending(null)}><section className="donation-dialog gift-receiving-modal" role="dialog" aria-modal="true" aria-label={pending.type==='deliverGift'?'Confirmar recebimento do presente':'Liberar reserva'} onClick={e=>e.stopPropagation()}><div className="panel-header"><div><h3>{pending.type==='deliverGift'?'Confirmar recebimento':'Liberar reserva'}</h3><p className="muted">{pending.type==='deliverGift'?'Confira os dados antes de registrar a entrega.':'O presente voltará a ficar disponível para adoção.'}</p></div><button className="icon-btn" onClick={()=>setPending(null)} aria-label="Fechar"><X size={20}/></button></div><div className="gift-receiving-confirm-details"><div><span>Colaborador</span><strong>{pending.entry.gift.donor}</strong></div><div><span>Empresa</span><strong>{pending.entry.gift.group}</strong></div><div><span>Beneficiário</span><strong>{pending.entry.gift.beneficiary}</strong></div><div><span>Presente</span><strong>{pending.entry.gift.giftName}</strong></div></div><label className="donation-v2-field"><span>Seu nome (responsável CIPAA) *</span><input value={actor} onChange={e=>setActor(e.target.value)} placeholder="Quem está confirmando?"/></label><label className="donation-v2-field"><span>Observação / motivo *</span><textarea rows={2} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="donation-v2-actions"><button className={pending.type==='deliverGift'?'btn primary':'btn outline'} disabled={busy||actor.trim().length<2||reason.trim().length<5} onClick={()=>void confirmAction()}>{pending.type==='deliverGift'?<CheckCircle2 size={17}/>:<Undo2 size={17}/>} {pending.type==='deliverGift'?'Confirmar entrega e pontuação':'Liberar presente'}</button><button className="btn outline" onClick={()=>setPending(null)}>Cancelar</button></div></section></div>}
 </section>;
}
