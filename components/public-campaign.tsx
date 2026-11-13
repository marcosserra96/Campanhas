'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useStore} from '@/components/store-provider';
import {total,progress,ranking,Need} from '@/lib/types';
import {Gift,HeartHandshake,Trophy,CalendarDays,Heart,ArrowDown,CheckCircle2,PackageCheck,Search,RefreshCw,MapPin,ChevronDown,ChevronUp,Users,Check,ArrowUpRight,School,Info} from 'lucide-react';

function number(n:number){return n.toLocaleString('pt-BR',{maximumFractionDigits:2})}
function date(value:string){return value?new Date(value+'T12:00:00').toLocaleDateString('pt-BR'):'—'}
function percentage(received:number,target:number){return progress(received,target)}
function isDone(n:Need){return n.received>=n.target}
export default function PublicCampaign({id}:{id:string}){
 const {store,ready,error,refresh}=useStore();
 const [filter,setFilter]=useState<'pending'|'all'|'done'>('pending');
 const [search,setSearch]=useState('');
 const [openInstitution,setOpenInstitution]=useState<string|null>(null);
 const [expanded,setExpanded]=useState(false);
 if(!ready)return <div className="collab-loading"><RefreshCw size={24}/><p>Carregando dados da campanha…</p></div>;
 const c=store.campaigns.find(x=>x.id===id);
 if(!c)return <div className="public-404"><h1>Campanha indisponível</h1><p>{error||'Esta campanha ainda não foi publicada pela CIPAA.'}</p><Link href="/">Voltar ao início</Link></div>;
 const summary=total(c);
 const pct=percentage(summary.received,summary.target);
 const pending=Math.max(0,summary.target-summary.received);
 const scores=ranking(c,store.donations);
 const beneficiaries=c.beneficiaries||[];
 const children=beneficiaries.reduce((sum,b)=>sum+b.girls+b.boys,0);
 const dateRange=[date(c.start),c.end?date(c.end):'sem prazo definido'].join(' até ');
 const isChristmas=c.id==='natal-2026';
 return <div className="collab" style={{'--collab-accent':c.accent} as React.CSSProperties}>
  <header className="collab-header"><div className="collab-header-inner">
   <Link href="/" aria-label="Página inicial" className="collab-brand">
    <img src="/brand/energisa.svg" alt="Energisa" className="collab-logo-energisa"/>
    <span className="collab-brand-rule"/>
    <img src="/brand/cipaa.svg" alt="CIPAA Segurança" className="collab-logo-cipaa"/>
   </Link>
   <div className="collab-header-right"><span className="collab-live"><span className="collab-live-dot"/>{c.status==='closed'?'Campanha encerrada':'Campanha solidária'}</span><button className="collab-refresh" onClick={()=>void refresh()} title="Atualizar informações" aria-label="Atualizar informações"><RefreshCw size={17}/></button></div>
  </div></header>
  <main className="collab-content">
   <section className={"collab-hero "+(c.banner?"with-campaign-art":"")} style={c.banner?{backgroundImage:"linear-gradient(90deg,rgba(5,33,55,.97) 0%,rgba(5,37,58,.84) 40%,rgba(5,37,58,.12) 73%),url("+JSON.stringify(c.banner)+")"}:undefined}>
    <div className="collab-hero-body">
     <div className="collab-kicker"><Gift size={16}/> {c.subtitle||'Uma iniciativa da CIPAA'}</div>
     <h1>{c.title}</h1>
     <p>{c.description}</p>
     <div className="collab-hero-meta"><span><CalendarDays size={16}/>{dateRange}</span>{children>0&&<span><HeartHandshake size={17}/>{children} crianças beneficiadas</span>}</div>
     <a href="#materiais" className="collab-primary-action">Veja o que ainda precisamos <ArrowDown size={17}/></a>
    </div>
    <div className={'collab-hero-visual '+(c.banner?'has-banner':'')}>
     {c.banner?<div className="collab-art-credit" aria-hidden="true"/>:<div className="collab-hero-graphic"><span className="collab-graphic-orb"><Gift size={110} strokeWidth={1.15}/></span><span>{isChristmas?'Natal é tempo de compartilhar.':'Faça parte dessa corrente do bem.'}</span></div>}
    </div>
   </section>
   {c.status==='draft'&&<div className="collab-alert"><Info size={17}/> Esta campanha está em rascunho. As informações são uma prévia.</div>}
   <section className="collab-impact" aria-label="Resumo da arrecadação">
    <div className="collab-impact-intro"><span className="collab-eyebrow">JUNTOS, CADA VEZ MAIS PERTO</span><div className="collab-impact-line"><h2>O impacto das nossas doações</h2><span>Dados atualizados automaticamente</span></div></div>
    <div className="collab-impact-cards">
     <div className="collab-impact-main"><div className="collab-impact-main-top"><div><span className="collab-impact-label">Meta alcançada</span><strong>{pct}%</strong></div><span className="collab-impact-emblem"><Heart size={25}/></span></div><div className="collab-meter" role="progressbar" aria-label="Progresso da campanha" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{width:pct+'%'}}/></div><div className="collab-impact-foot"><span>{number(summary.received)} recebidos</span><span>Meta de {number(summary.target)}</span></div></div>
     <div className="collab-stat"><span className="collab-stat-icon green"><PackageCheck size={23}/></span><span>Itens recebidos</span><strong>{number(summary.received)}</strong><small>Já fazem parte desta corrente</small></div>
     <div className="collab-stat"><span className="collab-stat-icon orange"><Gift size={23}/></span><span>Ainda precisamos</span><strong>{number(pending)}</strong><small>Unidades para completar a meta</small></div>
    </div>
   </section>
   <section className="collab-section collab-materials" id="materiais">
    <div className="collab-section-title"><div><span className="collab-eyebrow">SUA AJUDA FAZ A DIFERENÇA</span><h2>Escolha uma instituição para ajudar</h2><p>Veja o que cada instituição precisa e acompanhe o progresso das doações.</p></div><div className="collab-left-count"><HeartHandshake size={18}/>{c.institutions.length} {c.institutions.length===1?'instituição':'instituições'}</div></div>
    <div className="collab-institution-accordion">
     {c.institutions.map(inst=>{
       const target=inst.needs.reduce((sum,n)=>sum+n.target,0);
       const received=inst.needs.reduce((sum,n)=>sum+n.received,0);
       const missing=Math.max(0,target-received);
       const pendingItems=inst.needs.filter(n=>!isDone(n)).length;
       const isOpen=openInstitution===inst.id;
       const visible=inst.needs.filter(n=>(filter==='all'||(filter==='pending'?!isDone(n):isDone(n)))&&[n.name,n.specification||''].join(' ').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))).sort((a,b)=>filter==='all'?Number(isDone(a))-Number(isDone(b)):0);
       return <article className={'collab-institution-accordion-card '+(isOpen?'is-expanded':'')} key={inst.id}>
        <button type="button" className="collab-institution-trigger" onClick={()=>{setOpenInstitution(isOpen?null:inst.id);setFilter('pending');setSearch('')}} aria-expanded={isOpen} aria-controls={'institution-details-'+inst.id}>
         <span className="collab-institution-symbol"><HeartHandshake size={27}/></span>
         <span className="collab-institution-summary"><strong>{inst.name}</strong>{inst.description&&<small>{inst.description}</small>}<span className="collab-institution-track"><span className="collab-meter slim"><span style={{width:percentage(received,target)+'%'}}/></span><span>{number(received)} de {number(target)} recebidos</span></span></span>
         <span className="collab-institution-totals"><strong>{number(missing)}</strong><small>{missing===0?'Meta atingida':'unidades faltando'}</small><em>{pendingItems} {pendingItems===1?'item pendente':'itens pendentes'}</em></span>
         <span className="collab-institution-expand" aria-hidden="true">{isOpen?<ChevronUp size={20}/>:<ChevronDown size={20}/>}</span>
        </button>
        {isOpen&&<div className="collab-institution-details" id={'institution-details-'+inst.id}>
         <div className="collab-institution-details-head"><div><h3>O que esta instituição ainda precisa?</h3><p>Você pode doar itens separados, sem precisar completar um kit.</p></div><div className="collab-institution-filters"><div className="collab-tabs" role="group" aria-label="Filtrar materiais"><button className={filter==='pending'?'selected':''} onClick={()=>setFilter('pending')}>Pendentes</button><button className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>Todos</button><button className={filter==='done'?'selected':''} onClick={()=>setFilter('done')}>Concluídos</button></div><label className="collab-search"><Search size={17}/><input aria-label="Buscar materiais desta instituição" placeholder="Buscar item..." value={search} onChange={e=>setSearch(e.target.value)}/></label></div></div>
         <div className="collab-need-list">{visible.map(n=>{const left=Math.max(0,n.target-n.received),p=percentage(n.received,n.target),done=isDone(n);return <div className={'collab-need '+(done?'completed':'')} key={n.id}>
          <div className="collab-need-icon">{done?<CheckCircle2 size={21}/>:<School size={21}/>}</div>
          <div className="collab-need-body"><h3>{n.name}</h3>{n.specification&&<p>{n.specification}</p>}<div className="collab-need-track"><div className="collab-meter slim"><span style={{width:p+'%'}}/></div><span>{number(n.received)} de {number(n.target)} recebidos</span></div></div>
          <div className={'collab-need-remaining '+(done?'complete':'')}><strong>{done?<Check size={22}/>:number(left)}</strong><span>{done?'Meta atingida':(n.unit==='unidade(s)'?'unidades faltando':n.unit+' faltando')}</span></div>
         </div>})}{!visible.length&&<div className="collab-empty"><CheckCircle2 size={34}/><h3>{filter==='done'?'Nenhum item concluído ainda.':'Nenhum material encontrado.'}</h3><p>Experimente outro filtro ou busca.</p></div>}</div>
         <div className="collab-list-bottom"><Info size={16}/><span>Quantidades atualizadas conforme os registros da CIPAA. Entregue sua doação a um membro da comissão.</span></div>
        </div>}
       </article>;
     })}
     {!c.institutions.length&&<div className="collab-empty"><HeartHandshake size={35}/><h3>Instituições em breve</h3><p>A CIPAA divulgará as instituições participantes aqui.</p></div>}
    </div>
   </section>
   <div className="collab-lower">
    <section className="collab-team">
     <div className="collab-section-title compact"><div><span className="collab-eyebrow">SOLIDARIEDADE EM EQUIPE</span><h2>Ranking da solidariedade <Trophy size={23}/></h2><p>Acompanhe quem está mobilizando mais doações.</p></div></div>
     <div className="collab-ranking"><div className="collab-ranking-head"><span>Classificação por {c.rankingBy}</span><span>{c.rankingMode==='points'?'Pontos':'Itens'}</span></div>{scores.length?scores.slice(0,expanded?20:5).map((x,index)=><div className="collab-ranking-row" key={x.name}><div className={'collab-rank-number rank-'+index}>{index+1}º</div><strong>{x.name}</strong><b>{number(x.score)}</b></div>):<div className="collab-ranking-empty"><Trophy size={39}/><h3>A disputa solidária vai começar!</h3><p>As equipes aparecerão aqui depois das primeiras doações registradas pelos membros da CIPAA.</p></div>}
     {scores.length>5&&<button className="collab-more" onClick={()=>setExpanded(!expanded)}>{expanded?'Ver menos':'Ver mais equipes'} {expanded?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>}</div>
    </section>
    <section className="collab-beneficiaries">
     <div className="collab-section-title compact"><div><span className="collab-eyebrow">QUEM VAMOS AJUDAR</span><h2>Por trás de cada doação, uma história</h2><p>{children>0?'Conheça o público beneficiado pela campanha.':'Cada doação ajuda as instituições atendidas.'}</p></div></div>
     <div className="collab-beneficiary-card">
      {children>0?<><div className="collab-beneficiary-hero"><div className="collab-beneficiary-icon"><Users size={31}/></div><div><strong>{number(children)}</strong><span>crianças beneficiadas</span></div></div><div className="collab-beneficiary-pills">{beneficiaries.map(b=><span key={b.label}>{b.label} <b>{b.girls+b.boys}</b></span>)}</div><p className="collab-beneficiary-note">O objetivo é garantir mais acolhimento e oportunidades para cada criança.</p></>:<div className="collab-ranking-empty"><HeartHandshake size={35}/><p>As informações sobre o público beneficiado serão compartilhadas pela CIPAA.</p></div>}
      {c.institutions.length>0&&<div className="collab-institutions"><span>INSTITUIÇÕES ATENDIDAS</span>{c.institutions.map(i=><div key={i.id} className="collab-institution-name"><Heart size={17}/><span>{i.name}</span></div>)}</div>}
     </div>
    </section>
   </div>
   <section className="collab-cta"><span className="collab-cta-icon"><HeartHandshake size={34}/></span><div><h2>Que tal fazer parte dessa corrente?</h2><p>Separe os materiais que puder e entregue a um membro da CIPAA. Seu gesto ajuda a transformar histórias.</p></div><a href="#materiais">Ver materiais <ArrowUpRight size={18}/></a></section>
  </main>
  <footer className="collab-footer"><div><span>CIPAA • Energisa</span><span>Juntos fazemos a diferença.</span></div><small>O ranking considera as doações registradas após a configuração da campanha. O saldo inicial não atribui pontos a equipes.</small></footer>
 </div>;
}
