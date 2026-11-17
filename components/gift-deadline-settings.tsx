'use client';
import {useEffect,useState} from 'react';
import {Campaign} from '@/lib/types';
import {CalendarDays,Save,CheckCircle2} from 'lucide-react';
type Run=(op:string,params:Record<string,unknown>)=>Promise<boolean>;
export default function GiftDeadlineSettings({campaign,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [deadline,setDeadline]=useState(campaign.giftDeliveryDeadline||'');
 const [message,setMessage]=useState('');
 useEffect(()=>{setDeadline(campaign.giftDeliveryDeadline||'');setMessage('')},[campaign.id,campaign.giftDeliveryDeadline]);
 async function save(){
  if(await run('setGiftDeadline',{deadline}))setMessage('Prazo de entrega salvo para esta campanha.');
 }
 return <section className="panel company-settings">
  <div className="panel-header"><div><h3><CalendarDays size={18}/> Prazo de entrega dos presentes</h3><p className="muted">Esse prazo pertence apenas à campanha {campaign.title}. Os contatos para entrega são definidos em Configurações do portal.</p></div></div>
  <div className="company-settings-deadline"><label className="donation-v2-field"><span>Data-limite para entregar os presentes</span><input type="date" value={deadline} onChange={e=>{setDeadline(e.target.value);setMessage('')}}/></label><button className="btn primary" disabled={busy||deadline===(campaign.giftDeliveryDeadline||'')} onClick={()=>void save()}><Save size={16}/> Salvar prazo</button></div>
  <p className="hint">Para permitir a adoção pública, esta campanha precisa ter uma data válida e a empresa escolhida pelo colaborador precisa ter pelo menos um contato da CIPAA cadastrado em Configurações.</p>
  {message&&<p className="donation-notification"><CheckCircle2 size={17}/>{message}</p>}
 </section>;
}
