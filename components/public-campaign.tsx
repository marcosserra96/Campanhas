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
 const {store,ready,error}=useStore();
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
 const scores=c.publicRanking||ranking(c,store.donations);
 const institutionalAudience=c.institutions.map(i=>({id:i.id,name:i.name,kind:i.beneficiaryKind||'unspecified',count:i.beneficiaryCount||0}));
 const children=institutionalAudience.filter(i=>i.kind==='children').reduce((sum,i)=>sum+i.count,0);
 const elderly=institutionalAudience.filter(i=>i.kind==='elderly').reduce((sum,i)=>sum+i.count,0);
 const totalPeople=institutionalAudience.reduce((sum,i)=>sum+i.count,0);
 const dateRange=[date(c.start),c.end?date(c.end):'sem prazo definido'].join(' até ');
 const isChristmas=c.id==='natal-2026';
 return <div className="collab" style={{'--collab-accent':c.accent} as React.CSSProperties}>
  <header className="collab-header"><div className="collab-header-inner">
   <Link href="/" aria-label="Página inicial" className="collab-brand">
    <img src="/brand/energisa.svg" alt="Energisa" className="collab-logo-energisa"/>
    <span className="collab-brand-rule"/>
    <img src="/brand/cipaa.svg" alt="CIPAA Segurança" className="collab-logo-cipaa"/>
   </Link>
  </div></header>
  <main className="collab-content">
   <section className={"collab-hero "+(c.banner?"with-campaign-art":"")} style={c.banner?{backgroundImage:"linear-gradient(90deg,rgba(5,33,55,.97) 0%,rgba(5,37,58,.84) 40%,rgba(5,37,58,.12) 73%),url("+JSON.stringify(c.banner)+")"}:undefined}>
    <div className="collab-hero-body">
     <div className="collab-kicker"><Gift size={16}/> {c.subtitle||'Uma iniciativa da CIPAA'}</div>
     <h1>{c.title}</h1>
     <p>{c.description}</p>
     <div className="collab-hero-meta"><span><CalendarDays size={16}/>{dateRange}</span>{totalPeople>0&&<span><HeartHandshake size={17}/>{number(totalPeople)} pessoas beneficiadas</span>}</div>
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
     <div className="collab-stat"><span className="collab-stat-icon green"><PackageCheck size={23}/></span><span>Itens recebidos</span><strong>{number(summary.received)}</strong><small>Materiais com meta e presentes entregues</small></div>
     <div className="collab-stat"><span className="collab-stat-icon orange"><Gift size={23}/></span><span>Ainda precisamos</span><strong>{number(pending)}</strong><small>Metas de materiais e presentes</small></div>
    </div>
   </section>
   <section className="collab-section collab-materials" id="materiais">
    <div className="collab-section-title"><div><span className="collab-eyebrow">SUA AJUDA FAZ A DIFERENÇA</span><h2>Escolha uma instituição para ajudar</h2><p>Veja os presentes disponíveis e outras formas de contribuir. Para adotar, procure um membro da CIPAA.</p></div><div className="collab-left-count"><HeartHandshake size={18}/>{c.institutions.length} {c.institutions.length===1?'instituição':'instituições'}</div></div>
    <div className="collab-institution-accordion">
     {c.institutions.map(inst=>{
       const targeted=inst.needs.filter(n=>n.mode!=='free');
       const free=inst.needs.filter(n=>n.mode==='free');
       const gifts=inst.gifts||[];
       const target=targeted.reduce((sum,n)=>sum+n.target,0)+gifts.length;
       const received=targeted.reduce((sum,n)=>sum+n.received,0)+gifts.filter(g=>g.status==='delivered').length;
       const materialMissing=targeted.reduce((sum,n)=>sum+Math.max(0,n.target-n.received),0);
       const giftAvailable=gifts.filter(g=>g.status==='available').length;
       const giftReserved=gifts.filter(g=>g.status==='reserved').length;
       const giftDelivered=gifts.filter(g=>g.status==='delivered').length;
       const isOpen=openInstitution===inst.id;
       const visible=inst.needs.filter(n=>(n.mode==='free'||filter==='all'||(filter==='pending'?!isDone(n):isDone(n)))&&[n.name,n.specification||''].join(' ').toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')));
       return <article className={'collab-institution-accordion-card '+(isOpen?'is-expanded':'')} key={inst.id}>
        <button type="button" className="collab-institution-trigger" onClick={()=>{setOpenInstitution(isOpen?null:inst.id);setFilter('pending');setSearch('')}} aria-expanded={isOpen} aria-controls={'institution-details-'+inst.id}>
         <span className="collab-institution-symbol"><HeartHandshake size={27}/></span>
         <span className="collab-institution-summary"><strong>{inst.name}</strong>{inst.description&&<small>{inst.description}</small>}{target>0?<span className="collab-institution-track"><span className="collab-meter slim"><span style={{width:percentage(received,target)+'%'}}/></span><span>{number(received)} de {number(target)} concluídos</span></span>:<span className="gift-text-mini">Arrecadações sem meta definida</span>}</span>
         <span className="collab-institution-totals">
          {targeted.length>0&&<span className="collab-institution-quantity"><strong>{number(materialMissing)}</strong><small>{materialMissing===0?'Meta de materiais atingida':'materiais faltando'}</small></span>}
          {gifts.length>0&&<span className="collab-institution-quantity gifts"><strong>{number(giftAvailable)}</strong><small>{giftAvailable===1?'presente disponível':'presentes disponíveis'}</small></span>}
          {gifts.length>0&&(giftReserved>0||giftDelivered>0)&&<span className="collab-institution-secondary">{giftReserved>0&&<small>{number(giftReserved)} reservados</small>}{giftDelivered>0&&<small>{number(giftDelivered)} entregues</small>}</span>}
          {free.length>0&&<span className="collab-institution-secondary"><small>{free.length===1?'1 arrecadação livre':free.length+' arrecadações livres'}</small></span>}
          {!targeted.length&&!gifts.length&&!free.length&&<span className="collab-institution-secondary"><small>Informações em preparação</small></span>}
         </span>
         <span className="collab-institution-expand" aria-hidden="true">{isOpen?<ChevronUp size={20}/>:<ChevronDown size={20}/>}</span>
        </button>
        {isOpen&&<div className="collab-institution-details" id={'institution-details-'+inst.id}>
         {gifts.length>0&&<section className="gift-public-section">
          <div className="gift-public-heading"><div><h3><Gift size={21}/> Presentes para adoção</h3><p>Cada pessoa escolheu um presente. Consulte os disponíveis e procure a CIPAA para reservar o que deseja adotar.</p></div><span>{gifts.filter(g=>g.status==='available').length} disponíveis</span></div>
          <div className="gift-public-instructions"><Info size={18}/><span><strong>Como participar:</strong> escolha um presente disponível e informe sua escolha a um membro da CIPAA. A comissão registra sua reserva e confirma a entrega quando receber o presente.</span></div>
          <div className="gift-public-grid">{gifts.map(g=><article className={'gift-public-card '+g.status} key={g.id}><div className="gift-public-card-top"><span className="gift-public-icon"><Gift size={20}/></span><span className="gift-public-status">{g.status==='available'?'Disponível':g.status==='reserved'?'Reservado':'Entregue'}</span></div><strong>{g.beneficiary}</strong><span>{g.giftName}</span>{g.details&&<small>{g.details}</small>}{c.showItemPoints&&<small className="collab-item-points">{number(g.points)} {g.points===1?'ponto':'pontos'} ao entregar</small>}</article>)}</div>
         </section>}
         {inst.needs.length>0&&<section className="gift-other-materials"><div className="collab-institution-details-head"><div><h3>Outras formas de ajudar</h3><p>Para fazer uma doação, entregue o material a um membro da CIPAA.</p></div><div className="collab-institution-filters"><div className="collab-tabs" role="group" aria-label="Filtrar materiais"><button className={filter==='pending'?'selected':''} onClick={()=>setFilter('pending')}>Pendentes</button><button className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>Todos</button><button className={filter==='done'?'selected':''} onClick={()=>setFilter('done')}>Concluídos</button></div><label className="collab-search"><Search size={17}/><input aria-label="Buscar materiais desta instituição" placeholder="Buscar item..." value={search} onChange={e=>setSearch(e.target.value)}/></label></div></div>
         <div className="collab-need-list">{visible.map(n=>{const left=Math.max(0,n.target-n.received),p=percentage(n.received,n.target),done=n.mode!=='free'&&isDone(n);return <div className={'collab-need '+(done?'completed':'')} key={n.id}>
          <div className="collab-need-icon">{done?<CheckCircle2 size={21}/>:<School size={21}/>}</div>
          <div className="collab-need-body"><h3>{n.name}</h3>{n.specification&&<p>{n.specification}</p>}{c.showItemPoints&&<p className="collab-item-points">{number(n.points)} {n.points===1?'ponto':'pontos'} por {n.unit}</p>}{n.mode==='free'?<p className="gift-free-label">Arrecadação livre · sem meta</p>:<div className="collab-need-track"><div className="collab-meter slim"><span style={{width:p+'%'}}/></div><span>{number(n.received)} de {number(n.target)} recebidos</span></div>}</div>
          <div className={'collab-need-remaining '+(done?'complete':'')}><strong>{n.mode==='free'?number(n.received):done?<Check size={22}/>:number(left)}</strong><span>{n.mode==='free'?n.unit+' recebidos':done?'Meta atingida':(n.unit==='unidade(s)'?'unidades faltando':n.unit+' faltando')}</span></div>
         </div>})}{!visible.length&&<div className="collab-empty"><CheckCircle2 size={34}/><h3>Nenhum material encontrado.</h3><p>Experimente outro filtro.</p></div>}</div></section>}
         <div className="collab-list-bottom"><Info size={16}/><span>Todas as reservas e os registros de doações são feitos exclusivamente pela CIPAA.</span></div>
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
     <div className="collab-section-title compact"><div><span className="collab-eyebrow">QUEM VAMOS AJUDAR</span><h2>Por trás de cada doação, uma história</h2><p>Conheça o público atendido por cada instituição da campanha.</p></div></div>
     <div className="collab-beneficiary-card">
      {totalPeople>0?<><div className="collab-beneficiary-hero"><div className="collab-beneficiary-icon"><Users size={31}/></div><div><strong>{number(totalPeople)}</strong><span>pessoas beneficiadas na campanha</span></div></div>
      <div className="collab-audience-summary">{children>0&&<span><strong>{number(children)}</strong> crianças</span>}{elderly>0&&<span><strong>{number(elderly)}</strong> idosos</span>}</div>
      <div className="collab-beneficiary-institution-list">{institutionalAudience.map(i=><div className="collab-beneficiary-institution" key={i.id}><div className="collab-beneficiary-institution-head"><Heart size={18}/><strong>{i.name}</strong><span>{i.count>0?<><b>{number(i.count)}</b> {i.kind==='children'?'crianças':i.kind==='elderly'?'pessoas idosas':'beneficiários'}</>:'Público não informado'}</span></div></div>)}</div>
      <p className="collab-beneficiary-note">Cada instituição tem necessidades diferentes. Escolha uma delas para saber como contribuir.</p></>:<div className="collab-ranking-empty"><HeartHandshake size={35}/><p>Os dados sobre o público beneficiado serão disponibilizados pela CIPAA.</p><div className="collab-institutions">{institutionalAudience.map(i=><div key={i.id} className="collab-institution-name"><Heart size={17}/>{i.name}</div>)}</div></div>}
     </div>
    </section>
   </div>
   <section className="collab-cta"><span className="collab-cta-icon"><HeartHandshake size={34}/></span><div><h2>Que tal fazer parte dessa corrente?</h2><p>Separe os materiais que puder e entregue a um membro da CIPAA. Seu gesto ajuda a transformar histórias.</p></div><a href="#materiais">Ver materiais <ArrowUpRight size={18}/></a></section>
  </main>
  <footer className="collab-footer"><div><span>CIPAA • Energisa</span><span>Juntos fazemos a diferença.</span></div><small>O ranking considera as doações registradas após a configuração da campanha. O saldo inicial não atribui pontos a equipes.</small></footer>
 </div>;
}
