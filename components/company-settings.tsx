'use client';
import {useEffect,useState} from 'react';
import {Campaign,COMPANIES,Company} from '@/lib/types';
import {CalendarDays,Plus,Trash2,Users,CheckCircle2} from 'lucide-react';
type Run=(op:string,args:Record<string,unknown>)=>Promise<boolean>;
export default function CompanySettings({campaign,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [deadline,setDeadline]=useState(campaign.giftDeliveryDeadline||'');
 const [newNames,setNewNames]=useState<Record<string,string>>({});
 const [message,setMessage]=useState('');
 useEffect(()=>setDeadline(campaign.giftDeliveryDeadline||''),[campaign.id,campaign.giftDeliveryDeadline]);
 const contacts=campaign.cipaaContacts||[];
 async function saveDeadline(){
  if(await run('setGiftDeadline',{deadline})){setMessage('Prazo de entrega atualizado.')}
 }
 async function add(company:Company){
  const name=(newNames[company]||'').trim();
  if(name.length<3)return;
  if(await run('addCompanyContact',{company,name})){setNewNames(prev=>({...prev,[company]:''}));setMessage('Membro da CIPAA cadastrado para '+company+'.')}
 }
 async function remove(id:string,name:string){
  if(!window.confirm('Remover '+name+' da lista de contatos?'))return;
  if(await run('removeCompanyContact',{contactId:id}))setMessage('Contato removido.');
 }
 return <section className="panel company-settings">
  <div className="panel-header"><div><h3><Users size={18}/> Empresas e contatos da CIPAA</h3><p className="muted">A classificação é por empresa. Ao adotar um presente, o colaborador verá os contatos da CIPAA da empresa escolhida.</p></div></div>
  <div className="company-settings-deadline"><label className="donation-v2-field"><span><CalendarDays size={15}/> Data-limite para entregar os presentes</span><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label><button className="btn primary" disabled={busy||deadline===(campaign.giftDeliveryDeadline||'')} onClick={()=>void saveDeadline()}>Salvar prazo</button></div>
  <p className="hint">O prazo de entrega é diferente do encerramento da campanha. A reserva pública só fica disponível depois que houver um prazo válido e pelo menos um contato CIPAA cadastrado na empresa escolhida.</p>
  <div className="company-settings-grid">{COMPANIES.map(company=><div className="company-settings-card" key={company}><h4>{company}</h4><p>{contacts.filter(x=>x.company===company).length} {contacts.filter(x=>x.company===company).length===1?'membro cadastrado':'membros cadastrados'}</p><div className="company-contact-list">{contacts.filter(x=>x.company===company).map(person=><div key={person.id}><span>{person.name}</span><button className="icon-btn danger" disabled={busy} title={'Remover '+person.name} aria-label={'Remover '+person.name} onClick={()=>void remove(person.id,person.name)}><Trash2 size={15}/></button></div>)}</div><div className="company-contact-add"><input value={newNames[company]||''} aria-label={'Nome do membro CIPAA de '+company} placeholder="Nome do membro da CIPAA" maxLength={160} onChange={e=>setNewNames(v=>({...v,[company]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void add(company)}}}/><button className="btn outline" disabled={busy||(newNames[company]||'').trim().length<3} onClick={()=>void add(company)}><Plus size={15}/> Adicionar</button></div></div>)}</div>
  {message&&<p className="donation-notification"><CheckCircle2 size={17}/>{message}</p>}
 </section>;
}
