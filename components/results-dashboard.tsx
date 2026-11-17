'use client';
import {useMemo,useState} from 'react';
import {Campaign,Donation,ranking,progress} from '@/lib/types';
import {BarChart3,Building2,CheckCircle2,Gift,PackageCheck,Trophy,TrendingUp,Clock3,Users,ArrowUpRight,Info} from 'lucide-react';
type Props={campaign:Campaign;donations:Donation[]};
const fmt=(value:number)=>value.toLocaleString('pt-BR',{maximumFractionDigits:2});
export default function ResultsDashboard({campaign:c,donations}:Props){
 const [institutionId,setInstitutionId]=useState('all');
 const [rankingLimit,setRankingLimit]=useState(5);
 const filtered=c.institutions.filter(i=>institutionId==='all'||i.id===institutionId);
 const stats=useMemo(()=>{
  const targeted=filtered.flatMap(i=>i.needs.filter(n=>n.mode!=='free'));
  const free=filtered.flatMap(i=>i.needs.filter(n=>n.mode==='free').map(n=>({...n,institution:i.name})));
  const gifts=filtered.flatMap(i=>i.gifts||[]);
  const donated=donations.filter(d=>d.campaignId===c.id&&(institutionId==='all'||d.institutionId===institutionId));
  return {targeted,free,gifts,donated,target:targeted.reduce((sum,n)=>sum+n.target,0),received:targeted.reduce((sum,n)=>sum+n.received,0),available:gifts.filter(g=>g.status==='available').length,reserved:gifts.filter(g=>g.status==='reserved').length,delivered:gifts.filter(g=>g.status==='delivered').length,attributions:donated.filter(d=>d.source==='opening').length,newDonations:donated.filter(d=>d.source!=='opening').length};
 },[filtered,donations,c.id,institutionId]);
 const scores=useMemo(()=>{
  const scope:Campaign={...c,institutions:filtered};
  return ranking(scope,stats.donated);
 },[c,filtered,stats.donated]);
 const largest=Math.max(1,...scores.map(x=>x.score));
 const recent=stats.donated.filter(d=>d.source!=='opening').slice().sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,7);
 const needsIndex=new Map(c.institutions.flatMap(i=>i.needs.map(n=>[n.id,n.name] as const)));
 const critical=filtered.flatMap(i=>i.needs.filter(n=>n.mode!=='free'&&n.target>0&&n.received<n.target).map(n=>({id:n.id,name:n.name,institution:i.name,target:n.target,received:n.received}))).sort((a,b)=>(a.received/a.target)-(b.received/b.target)).slice(0,5);
 const totalGoal=stats.target+stats.gifts.length;
 const doneGoal=stats.received+stats.delivered;
 return <div className="results-v2">
  <header className="results-v2-heading"><div><span className="results-eyebrow"><BarChart3 size={15}/> ACOMPANHAMENTO DA CAMPANHA</span><h2>Resultados da arrecadação</h2><p>Entregas confirmadas, presentes e classificação das empresas, em uma única visão.</p></div><label className="results-filter"><span>Visualizar</span><select value={institutionId} onChange={e=>setInstitutionId(e.target.value)} aria-label="Filtrar resultados por instituição"><option value="all">Todas as instituições</option>{c.institutions.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label></header>
  <div className="results-v2-metrics">
   <article className="results-metric-card"><div className="results-metric-head"><span>Materiais recebidos</span><PackageCheck size={20}/></div><strong>{fmt(stats.received)}</strong><small>De {fmt(stats.target)} previstos com meta</small><div className="results-meter"><span style={{width:progress(stats.received,stats.target)+'%'}}/></div></article>
   <article className="results-metric-card"><div className="results-metric-head"><span>Presentes entregues</span><Gift size={20}/></div><strong>{fmt(stats.delivered)} <span>/ {fmt(stats.gifts.length)}</span></strong><small>{fmt(stats.available)} disponíveis · {fmt(stats.reserved)} reservados</small><div className="results-meter"><span style={{width:progress(stats.delivered,stats.gifts.length)+'%'}}/></div></article>
   <article className="results-metric-card"><div className="results-metric-head"><span>Atingimento das metas</span><TrendingUp size={20}/></div><strong>{progress(doneGoal,totalGoal)}%</strong><small>Materiais com meta e presentes entregues</small><div className="results-meter"><span style={{width:progress(doneGoal,totalGoal)+'%'}}/></div></article>
   <article className="results-metric-card"><div className="results-metric-head"><span>Entregas registradas</span><CheckCircle2 size={20}/></div><strong>{fmt(stats.newDonations)}</strong><small>{fmt(stats.attributions)} identificações do saldo inicial</small><span className="results-metric-note">Lançamentos ativos, não unidades</span></article>
  </div>
  <div className="results-v2-columns">
   <section className="panel results-panel results-ranking">
    <div className="results-panel-heading"><div><span className="results-small-label"><Trophy size={15}/> PARTICIPAÇÃO</span><h3>Classificação das empresas</h3><p>{c.rankingMode==='points'?'Ranking por pontos':'Ranking por quantidade de itens'}</p></div><span className="results-pill">{scores.length} empresas</span></div>
    {scores.length?<><div className="results-ranking-list">{scores.slice(0,rankingLimit).map((item,index)=><div key={item.name} className={'results-rank '+(index===0?'leader':'')}><div className="results-rank-top"><span className="results-rank-pos">{index+1}º</span><strong>{item.name}</strong><b>{fmt(item.score)} <small>{c.rankingMode==='points'?'pts':'itens'}</small></b></div><div className="results-rank-meter"><span style={{width:Math.max(0,Math.min(100,item.score/largest*100))+'%'}}/></div></div>)}</div>{scores.length>5&&<button className="results-show-all" onClick={()=>setRankingLimit(n=>n===5?scores.length:5)}>{rankingLimit===5?'Ver classificação completa':'Mostrar apenas os 5 primeiros'} <ArrowUpRight size={15}/></button>}</>:<div className="results-empty"><Trophy size={30}/><strong>Nenhum empresa pontuou ainda</strong><p>O ranking aparecerá após a primeira entrega vinculada a uma empresa.</p></div>}
   </section>
   <section className="panel results-panel">
    <div className="results-panel-heading"><div><span className="results-small-label"><Building2 size={15}/> INSTITUIÇÕES</span><h3>Progresso por instituição</h3><p>Metas de materiais e presentes, em indicadores separados.</p></div></div>
    <div className="results-institution-list">{filtered.map(i=>{
      const eligible=i.needs.filter(n=>n.mode!=='free');const target=eligible.reduce((v,n)=>v+n.target,0);const received=eligible.reduce((v,n)=>v+n.received,0);
      const gifts=i.gifts||[];
      return <article className="results-institution" key={i.id}><div className="results-institution-name"><strong>{i.name}</strong><span>{eligible.length} materiais · {gifts.length} presentes</span></div>{target>0&&<div className="results-institution-line"><div><span>Materiais</span><b>{fmt(received)} / {fmt(target)}</b></div><div className="results-meter"><span style={{width:progress(received,target)+'%'}}/></div></div>}{gifts.length>0&&<div className="results-institution-line"><div><span>Presentes entregues</span><b>{gifts.filter(g=>g.status==='delivered').length} / {gifts.length}</b></div><div className="results-meter gift-meter"><span style={{width:progress(gifts.filter(g=>g.status==='delivered').length,gifts.length)+'%'}}/></div></div>}{!target&&!gifts.length&&<p className="results-quiet">Nenhuma meta definida. As arrecadações livres aparecem abaixo.</p>}</article>
    })}{filtered.length===0&&<p className="results-quiet">Não há instituições cadastradas.</p>}</div>
   </section>
  </div>
  <div className="results-v2-columns bottom">
   <section className="panel results-panel"><div className="results-panel-heading"><div><span className="results-small-label"><PackageCheck size={15}/> PRIORIDADES</span><h3>Materiais que precisam de atenção</h3><p>Menor percentual de meta atingida, sem misturar unidades diferentes.</p></div></div>
   {critical.length?<div className="results-critical-list">{critical.map(n=><div className="results-critical" key={n.id}><div><strong>{n.name}</strong><small>{n.institution}</small></div><span><b>{fmt(Math.max(0,n.target-n.received))}</b> faltando</span></div>)}</div>:<div className="results-empty"><CheckCircle2 size={28}/><strong>Sem materiais pendentes</strong><p>As metas dos materiais cadastrados estão concluídas.</p></div>}
   </section>
   <section className="panel results-panel"><div className="results-panel-heading"><div><span className="results-small-label"><Clock3 size={15}/> MOVIMENTAÇÃO</span><h3>Últimas entregas</h3><p>Doações ativas registradas pela CIPAA.</p></div></div>
   {recent.length?<div className="results-recent-list">{recent.map(d=><div className="results-recent" key={d.id}><span className="results-recent-icon"><PackageCheck size={17}/></span><div><strong>{d.donor}</strong><small>{needsIndex.get(d.needId)||'Material'} · {d.group}</small></div><div className="results-recent-side"><b>{fmt(d.quantity)}</b><small>{new Date(d.date).toLocaleDateString('pt-BR')}</small></div></div>)}</div>:<div className="results-empty"><Clock3 size={30}/><strong>Sem entregas recentes</strong><p>As novas doações registradas aparecerão aqui.</p></div>}
   </section>
  </div>
  {stats.free.length>0&&<section className="panel results-panel results-free"><div className="results-panel-heading"><div><span className="results-small-label"><Info size={15}/> SEM META</span><h3>Arrecadações livres</h3><p>Valores acumulados apresentados por material e unidade, sem somar litros, quilos e peças.</p></div></div><div className="results-free-grid">{stats.free.map(n=><div key={n.id} className="results-free-item"><span>{n.institution}</span><strong>{n.name}</strong><div><b>{fmt(n.received)}</b><small>{n.unit} recebidos</small></div></div>)}</div></section>}
  <p className="results-footer-note"><Info size={15}/> Os resultados refletem os registros ativos. Reservar um presente não contabiliza pontos; a pontuação entra após a confirmação da entrega.</p>
 </div>;
}
