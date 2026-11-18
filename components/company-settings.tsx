'use client';
import {useState} from 'react';
import {Campaign,Company} from '@/lib/types';
import {Plus,Trash2,Users,CheckCircle2,Pencil,Save,X} from 'lucide-react';
type Run=(op:string,args:Record<string,unknown>)=>Promise<boolean>;
export default function CompanySettings({campaign,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [newNames,setNewNames]=useState<Record<string,string>>({});
 const [bulkCompany,setBulkCompany]=useState<Company>('');
 const [companyName,setCompanyName]=useState('');
 const [editingCompany,setEditingCompany]=useState<string|null>(null);
 const [editingName,setEditingName]=useState('');
 const [editingActor,setEditingActor]=useState('');
 const [companyActor,setCompanyActor]=useState('');
 const [bulkText,setBulkText]=useState('');
 const [bulkResult,setBulkResult]=useState('');
 const [message,setMessage]=useState('');
 const contacts=campaign.cipaaContacts||[];
 const companies=(campaign.companies||[]).filter(x=>x.active).map(x=>x.name);
 const companyDetails=campaign.companies||[];
 async function createCompany(){
  if(busy||!companyName.trim()||companyActor.trim().length<2)return;
  if(await run('createCompany',{name:companyName.trim(),actor:companyActor.trim()})){setMessage('Empresa cadastrada para todas as campanhas.');setCompanyName('');}
 }
 async function renameCompany(id:string){
  if(busy||editingName.trim().length<2||editingActor.trim().length<2)return;
  if(!window.confirm('Renomear esta empresa em todas as campanhas, doações e reservas já registradas?'))return;
  if(await run('renameCompany',{companyId:id,name:editingName.trim(),actor:editingActor.trim()})){setEditingCompany(null);setEditingActor('');setMessage('Empresa renomeada com o histórico de doações e reservas preservado.');}
 }
 async function add(company:Company){
  const name=(newNames[company]||'').trim();
  if(name.length<3)return;
  if(await run('addCompanyContact',{company,name})){setNewNames(prev=>({...prev,[company]:''}));setMessage('Membro da CIPAA cadastrado para '+company+'.')}
 }
 const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLocaleLowerCase('pt-BR');
 const pastedNames=bulkText.split(/[\r\n\t;]+/).map(n=>n.replace(/\s+/g,' ').trim()).filter(Boolean).filter(n=>!/^nome(?: completo)?$/i.test(n));
 const uniqueNames=Array.from(new Map(pastedNames.map(name=>[normalize(name),name])).values());
 const knownNames=new Set(contacts.filter(person=>person.company===bulkCompany).map(person=>normalize(person.name)));
 const toImport=uniqueNames.filter(name=>!knownNames.has(normalize(name)));
 const invalidNames=toImport.filter(name=>name.length<3||name.length>160);
 async function bulkAdd(){
  if(busy||!bulkCompany||!toImport.length||invalidNames.length||uniqueNames.length>150)return;
  if(!window.confirm('Adicionar '+toImport.length+' integrantes à CIPAA da empresa '+bulkCompany+'?'))return;
  const ok=await run('bulkAddCompanyContacts',{company:bulkCompany,names:toImport});
  if(ok){setBulkResult(toImport.length+' nomes enviados para cadastro em '+bulkCompany+'.');setBulkText('');setMessage('Lista atualizada. Os contatos já podem ser utilizados nas campanhas.')}
 }
 async function remove(id:string,name:string){
  if(!window.confirm('Remover '+name+' da lista de contatos?'))return;
  if(await run('removeCompanyContact',{contactId:id}))setMessage('Contato removido.');
 }
 return <section className="panel company-settings">
  <div className="panel-header"><div><h3><Users size={18}/> Empresas e contatos da CIPAA</h3><p className="muted">Cadastro geral, válido para todas as campanhas. O colaborador verá os representantes da empresa que selecionar.</p></div></div>
  <p className="hint">Esses representantes são compartilhados por todas as campanhas. Ao selecionar sua empresa, o colaborador verá os nomes cadastrados aqui.</p>
  <div className="company-register"><div><strong>Gerenciar empresas</strong><p className="muted">Renomear atualiza os vínculos existentes. Novas empresas ficam disponíveis em todas as campanhas.</p></div><div className="company-register-controls"><label className="donation-v2-field"><span>Responsável pela alteração (CIPAA)</span><input value={companyActor} onChange={e=>setCompanyActor(e.target.value)} placeholder="Seu nome"/></label><label className="donation-v2-field"><span>Adicionar empresa</span><input value={companyName} onChange={e=>setCompanyName(e.target.value)} maxLength={120} placeholder="Nome da nova empresa"/></label><button type="button" className="btn primary" onClick={()=>void createCompany()} disabled={busy||companyActor.trim().length<2||companyName.trim().length<2}><Plus size={16}/> Adicionar empresa</button></div></div>
  <div className="company-settings-grid">{companies.map(company=><div className="company-settings-card" key={company}><div className="company-settings-title"><h4>{company}</h4><button type="button" className="icon-btn" title={'Renomear '+company} aria-label={'Renomear '+company} onClick={()=>{setEditingCompany(companyDetails.find(x=>x.name===company)?.id||null);setEditingName(company);setEditingActor(companyActor)}}><Pencil size={15}/></button></div>{editingCompany===companyDetails.find(x=>x.name===company)?.id&&<div className="company-rename"><label className="donation-v2-field"><span>Novo nome da empresa</span><input aria-label="Novo nome da empresa" value={editingName} maxLength={120} onChange={e=>setEditingName(e.target.value)}/></label><label className="donation-v2-field"><span>Quem está fazendo a alteração? (CIPAA)</span><input value={editingActor} onChange={e=>setEditingActor(e.target.value)} placeholder="Seu nome para auditoria"/></label><p className="hint">A alteração atualiza os registros dessa empresa em todas as campanhas.</p><button className="btn primary" disabled={busy||editingName.trim().length<2||editingActor.trim().length<2} onClick={()=>void renameCompany(editingCompany!)}><Save size={14}/> Salvar nome</button><button className="btn outline" onClick={()=>setEditingCompany(null)}><X size={14}/> Cancelar</button></div>}<p>{contacts.filter(x=>x.company===company).length} {contacts.filter(x=>x.company===company).length===1?'membro cadastrado':'membros cadastrados'}</p><div className="company-contact-list">{contacts.filter(x=>x.company===company).map(person=><div key={person.id}><span>{person.name}</span><button className="icon-btn danger" disabled={busy} title={'Remover '+person.name} aria-label={'Remover '+person.name} onClick={()=>void remove(person.id,person.name)}><Trash2 size={15}/></button></div>)}</div><div className="company-contact-add"><input value={newNames[company]||''} aria-label={'Nome do membro CIPAA de '+company} placeholder="Nome do membro da CIPAA" maxLength={160} onChange={e=>setNewNames(v=>({...v,[company]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void add(company)}}}/><button className="btn outline" disabled={busy||(newNames[company]||'').trim().length<3} onClick={()=>void add(company)}><Plus size={15}/> Adicionar</button></div></div>)}</div>
  <div className="company-bulk-paste">
   <div className="panel-header"><div><h4>Adicionar vários membros de uma vez</h4><p className="muted">Copie uma coluna de nomes do Excel e cole abaixo. Um nome por linha, sem precisar cadastrar individualmente.</p></div></div>
   <div className="company-bulk-fields">
    <label className="donation-v2-field"><span>Empresa</span><select value={bulkCompany} onChange={e=>{setBulkCompany(e.target.value as Company);setBulkResult('')}} ><option value="">Selecione uma empresa</option>{companies.map(company=><option key={company} value={company}>{company}</option>)}</select></label>
    <label className="donation-v2-field"><span>Colar lista de nomes</span><textarea rows={6} placeholder={'Maria da Silva\nJoão Pereira\nAna Souza'} value={bulkText} onChange={e=>{setBulkText(e.target.value);setBulkResult('')}}/></label>
   </div>
   {bulkText.trim()&&<div className="company-bulk-preview">
    <strong>Prévia da importação</strong>
    <p>{toImport.length} nomes novos · {uniqueNames.length-toImport.length} já cadastrados · {pastedNames.length-uniqueNames.length} repetidos na lista</p>
    {invalidNames.length>0&&<p className="company-bulk-warning">{invalidNames.length} nomes inválidos. Revise nomes muito curtos ou maiores que 160 caracteres.</p>}
    {uniqueNames.length>150&&<p className="company-bulk-warning">Limite de 150 nomes por importação.</p>}
    {toImport.length>0&&<div className="company-bulk-names">{toImport.slice(0,10).map(name=><span key={normalize(name)}>{name}</span>)}{toImport.length>10&&<span>+ {toImport.length-10} outros nomes</span>}</div>}
   </div>}
   <button type="button" className="btn primary" onClick={()=>void bulkAdd()} disabled={busy||!bulkCompany||!toImport.length||invalidNames.length>0||uniqueNames.length>150}><Plus size={16}/> Cadastrar {toImport.length} {toImport.length===1?'nome':'nomes'}</button>
   {bulkResult&&<p className="hint">{bulkResult}</p>}
  </div>
  {message&&<p className="donation-notification"><CheckCircle2 size={17}/>{message}</p>}
 </section>;
}
