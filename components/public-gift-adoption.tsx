'use client';
import {useState} from 'react';
import {Campaign,GiftRequest,COMPANIES,Company} from '@/lib/types';
import {useStore} from '@/components/store-provider';
import {Gift,CalendarDays,Users,CheckCircle2,X,Info,ShieldCheck} from 'lucide-react';

function fullDate(value:string){return value?new Date(value+'T12:00:00').toLocaleDateString('pt-BR'):'não informada'}
const nameValid=(value:string)=>value.trim().replace(/\s+/g,' ').length>=5&&value.trim().split(/\s+/).length>=2;
export default function PublicGiftAdoption({campaign,gifts}:{campaign:Campaign;gifts:GiftRequest[]}){
 const {refresh}=useStore();
 const [selected,setSelected]=useState<GiftRequest|null>(null);
 const [company,setCompany]=useState<Company|''>('');
 const [fullName,setFullName]=useState('');
 const [agreed,setAgreed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState(false);
 const deadline=campaign.giftDeliveryDeadline||'';
 const now=new Date();
 const today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 const deadlineOpen=Boolean(deadline&&deadline>=today);
 const contacts=(campaign.cipaaContacts||[]).filter(c=>c.company===company);
 function open(gift:GiftRequest){setSelected(gift);setCompany('');setFullName('');setAgreed(false);setError('');setSuccess(false)}
 function close(){setSelected(null);setSuccess(false);setError('')}
 async function reserve(){
  if(!selected||busy||!company||!nameValid(fullName)||!deadlineOpen||!contacts.length||!agreed)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({giftId:selected.id,company,fullName:fullName.trim().replace(/\s+/g,' ')})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Não foi possível reservar este presente.');
   setSuccess(true);
   try{await refresh()}catch{}
  }catch(e){setError(e instanceof Error?e.message:'Erro ao reservar o presente.');try{await refresh()}catch{}}
  finally{setBusy(false)}
 }
 return <>
 <div className="gift-public-grid">{gifts.map(g=><article className={'gift-public-card '+g.status} key={g.id}>
  <div className="gift-public-card-top"><span className="gift-public-icon"><Gift size={20}/></span><span className="gift-public-status">{g.status==='available'?'Disponível':g.status==='reserved'?'Reservado':'Entregue'}</span></div>
  <strong>{g.beneficiary}</strong><span>{g.giftName}</span>{g.details&&<small>{g.details}</small>}
  {campaign.showItemPoints&&<small className="collab-item-points">{g.points.toLocaleString('pt-BR')} {g.points===1?'ponto':'pontos'} ao entregar</small>}
  {g.status==='available'&&<button type="button" className="gift-public-adopt-button" disabled={!deadlineOpen} onClick={()=>open(g)}>{deadlineOpen?'Quero adotar este presente':'Reserva ainda indisponível'}</button>}
 </article>)}</div>
 {selected&&<div className="gift-adopt-backdrop" onClick={close}><section className="gift-adopt-modal" role="dialog" aria-modal="true" aria-label="Adotar presente" onClick={e=>e.stopPropagation()}>
  <div className="gift-adopt-modal-head"><div><span className="gift-adopt-eyebrow">ADOÇÃO SOLIDÁRIA</span><h3>{success?'Presente reservado!':'Adotar este presente'}</h3></div><button type="button" aria-label="Fechar janela" className="icon-btn" onClick={close}><X size={20}/></button></div>
  <div className="gift-adopt-selected"><Gift size={22}/><div><strong>{selected.beneficiary}</strong><span>{selected.giftName}{selected.details?' · '+selected.details:''}</span></div></div>
  {success?<div className="gift-adopt-success"><CheckCircle2 size={34}/><h4>Obrigado por participar!</h4><p>Sua adoção está reservada. Agora é só entregar o presente até <strong>{fullDate(deadline)}</strong>.</p><div className="gift-adopt-contact-box"><strong>Procure os membros da CIPAA — {company}:</strong>{contacts.map(c=><span key={c.id}>{c.name}</span>)}</div><p><strong>Não poderá ajudar?</strong> Avise um desses membros da CIPAA o quanto antes. Somente a comissão poderá cancelar sua reserva e liberar o presente para outra pessoa.</p><button type="button" className="gift-adopt-confirm" onClick={close}>Concluir</button></div>:
  <>
   <div className="gift-adopt-fields"><label><span>Empresa em que trabalha *</span><select value={company} onChange={e=>{setCompany(e.target.value as Company|'');setAgreed(false)}}><option value="">Selecione sua empresa</option>{COMPANIES.map(c=><option value={c} key={c}>{c}</option>)}</select></label><label><span>Seu nome completo *</span><input autoComplete="name" maxLength={160} placeholder="Nome e sobrenome" value={fullName} onChange={e=>setFullName(e.target.value)}/></label></div>
   <div className="gift-adopt-deadline"><CalendarDays size={18}/><div><strong>Entrega até {fullDate(deadline)}</strong><small>A CIPAA confirmará o recebimento e os pontos após a entrega.</small></div></div>
   {company&&<div className="gift-adopt-contact-box"><div className="gift-adopt-contact-heading"><Users size={17}/><strong>Quem procurar na CIPAA — {company}</strong></div>{contacts.length?contacts.map(c=><span key={c.id}>{c.name}</span>):<p>A CIPAA ainda não informou os responsáveis dessa empresa. Selecione outra empresa apenas se ela for a sua ou aguarde a atualização.</p>}</div>}
   <label className="gift-adopt-agreement"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>Comprometo-me a entregar o presente até <strong>{fullDate(deadline)}</strong>. Se não puder ajudar, avisarei um membro da CIPAA para cancelar minha reserva e liberar o presente.</span></label>
   {error&&<div className="gift-adopt-error" role="alert"><Info size={17}/>{error}</div>}
   <button type="button" className="gift-adopt-confirm" disabled={busy||!company||!contacts.length||!nameValid(fullName)||!agreed||!deadlineOpen} onClick={()=>void reserve()}><ShieldCheck size={18}/>{busy?'Confirmando reserva...':'Confirmar adoção'}</button>
   <p className="gift-adopt-privacy">Seu nome e sua empresa serão usados para a reserva e ficarão disponíveis apenas à CIPAA, não na lista pública.</p>
  </>}
 </section></div>}
 </>;
}
