'use client';
import {useState} from 'react';
import {Campaign,COMPANIES,Company} from '@/lib/types';
import {Plus,Trash2,Users,CheckCircle2} from 'lucide-react';
type Run=(op:string,args:Record<string,unknown>)=>Promise<boolean>;
export default function CompanySettings({campaign,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [newNames,setNewNames]=useState<Record<string,string>>({});
 const [message,setMessage]=useState('');
 const contacts=campaign.cipaaContacts||[];
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
  <div className="panel-header"><div><h3><Users size={18}/> Empresas e contatos da CIPAA</h3><p className="muted">Cadastro geral, válido para todas as campanhas. O colaborador verá os representantes da empresa que selecionar.</p></div></div>
  <p className="hint">Esses representantes são compartilhados por todas as campanhas. Ao selecionar sua empresa, o colaborador verá os nomes cadastrados aqui.</p>
  <div className="company-settings-grid">{COMPANIES.map(company=><div className="company-settings-card" key={company}><h4>{company}</h4><p>{contacts.filter(x=>x.company===company).length} {contacts.filter(x=>x.company===company).length===1?'membro cadastrado':'membros cadastrados'}</p><div className="company-contact-list">{contacts.filter(x=>x.company===company).map(person=><div key={person.id}><span>{person.name}</span><button className="icon-btn danger" disabled={busy} title={'Remover '+person.name} aria-label={'Remover '+person.name} onClick={()=>void remove(person.id,person.name)}><Trash2 size={15}/></button></div>)}</div><div className="company-contact-add"><input value={newNames[company]||''} aria-label={'Nome do membro CIPAA de '+company} placeholder="Nome do membro da CIPAA" maxLength={160} onChange={e=>setNewNames(v=>({...v,[company]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void add(company)}}}/><button className="btn outline" disabled={busy||(newNames[company]||'').trim().length<3} onClick={()=>void add(company)}><Plus size={15}/> Adicionar</button></div></div>)}</div>
  {message&&<p className="donation-notification"><CheckCircle2 size={17}/>{message}</p>}
 </section>;
}
