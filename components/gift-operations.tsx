'use client';
import {useState} from 'react';
import {Campaign,GiftRequest} from '@/lib/types';
import {Gift,CheckCircle2,Undo2,X,ShieldCheck} from 'lucide-react';
type Run=(op:string,params:Record<string,unknown>)=>Promise<boolean>;
export default function GiftOperations({campaign:c,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [institution,setInstitution]=useState('');
 const [giftId,setGiftId]=useState('');
 const [donor,setDonor]=useState('');
 const [group,setGroup]=useState('');
 const [actor,setActor]=useState('');
 const [reason,setReason]=useState('');
 const [info,setInfo]=useState('');
 const chosen=c.institutions.find(i=>i.id===institution);
 const selected=chosen?.gifts?.find(g=>g.id===giftId);
 const gifts=c.institutions.flatMap(i=>i.gifts||[]);
 if(!gifts.length)return null;
 function pick(g:GiftRequest){setGiftId(g.id);setDonor(g.donor||'');setGroup(g.group||'');setReason('');}
 async function act(op:'reserveGift'|'deliverGift'|'releaseGift'){
  if(!selected||busy||actor.trim().length<2||reason.trim().length<5)return;
  if(op==='reserveGift'&&(!donor.trim()||!c.groups?.some(g=>g.name===group)))return;
  if(op==='releaseGift'&&!window.confirm('Liberar este presente e cancelar a reserva? O histórico ficará registrado.'))return;
  const ok=await run(op,{giftId:selected.id,donor:donor.trim(),group,actor:actor.trim(),reason:reason.trim()});
  if(ok){setInfo(op==='reserveGift'?'Presente reservado. Aguarde a entrega.':op==='deliverGift'?'Presente entregue. Pontos contabilizados.':'Reserva liberada.');setGiftId('');setReason('');}
 }
 return <section className="panel gift-operations">
  <div className="panel-header"><div><h3><Gift size={19}/> Reserva e recebimento de presentes</h3><p className="muted">A CIPAA registra as reservas e dá baixa somente quando receber os presentes.</p></div><span className="pill">{gifts.filter(g=>g.status==='reserved').length} aguardando entrega</span></div>
  {info&&<div className="donation-notification"><CheckCircle2 size={17}/>{info}<button onClick={()=>setInfo('')}>Fechar</button></div>}
  <div className="donation-v2-grid">
   <label className="donation-v2-field"><span>Instituição</span><select value={institution} onChange={e=>{setInstitution(e.target.value);setGiftId('')}}><option value="">Selecione a instituição</option>{c.institutions.filter(i=>(i.gifts||[]).length>0).map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
   <label className="donation-v2-field"><span>Presente solicitado</span><select value={giftId} disabled={!institution} onChange={e=>{const g=chosen?.gifts?.find(g=>g.id===e.target.value);if(g)pick(g);else setGiftId('')}}><option value="">Selecione um presente</option>{chosen?.gifts?.map(g=><option value={g.id} key={g.id}>{g.beneficiary} — {g.giftName} ({g.status==='available'?'Disponível':g.status==='reserved'?'Reservado':'Entregue'})</option>)}</select></label>
  </div>
  {selected&&<div className="gift-operations-details"><div className="gift-operations-state"><strong>{selected.beneficiary}</strong><span>{selected.giftName}{selected.details?' · '+selected.details:''}</span><small>{selected.status==='available'?'Disponível para reserva':selected.status==='reserved'?'Aguardando entrega':'Entrega concluída'} · {selected.points} pontos após entrega</small></div>
  {selected.status==='available'&&<div className="donation-v2-grid"><label className="donation-v2-field"><span>Colaborador que vai doar</span><input value={donor} onChange={e=>setDonor(e.target.value)} placeholder="Nome do colaborador"/></label><label className="donation-v2-field"><span>Setor / grupo</span><select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Selecione o setor/grupo</option>{c.groups?.map(g=><option value={g.name} key={g.id}>{g.name}</option>)}</select></label></div>}
  {selected.status!=='available'&&<p className="gift-reserved-by">Adoção registrada: <strong>{selected.donor}</strong> · {selected.group}</p>}
  {selected.status!=='delivered'&&<><div className="donation-v2-grid"><label className="donation-v2-field"><span>Responsável CIPAA</span><input value={actor} onChange={e=>setActor(e.target.value)} placeholder="Seu nome"/></label><label className="donation-v2-field"><span>Motivo / observação</span><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ex.: Reserva solicitada pelo colaborador"/></label></div><div className="donation-v2-actions">{selected.status==='available'?<button className="btn primary" disabled={busy||!donor.trim()||!group||actor.trim().length<2||reason.trim().length<5} onClick={()=>void act('reserveGift')}><Gift size={16}/> Registrar reserva</button>:<><button className="btn primary" disabled={busy||actor.trim().length<2||reason.trim().length<5} onClick={()=>void act('deliverGift')}><CheckCircle2 size={16}/> Confirmar recebimento</button><button className="btn outline" disabled={busy||actor.trim().length<2||reason.trim().length<5} onClick={()=>void act('releaseGift')}><Undo2 size={16}/> Liberar reserva</button></>}</div></>}
  {selected.status==='delivered'&&<p className="gift-delivered-message"><ShieldCheck size={18}/> Entrega confirmada. Os pontos já estão no ranking.</p>}
  </div>}
  {!c.groups?.length&&<p className="notice soft">Cadastre os grupos em Campanhas → Pontuação antes de reservar presentes.</p>}
 </section>;
}
