'use client';
import {useMemo,useState} from 'react';
import {Campaign} from '@/lib/types';
import {Search,Save,RotateCcw,SlidersHorizontal} from 'lucide-react';

type Run=(op:string,params:Record<string,unknown>)=>Promise<boolean>;
type Item={id:string;type:'need'|'gift';institution:string;name:string;details:string;points:number};
const fmt=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const validValue=(v:string)=>/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(v.trim())&&Number.isFinite(Number(v.replace(',','.')))&&Number(v.replace(',','.'))>=0&&Number(v.replace(',','.'))<=100000;

export default function PointsEditor({campaign,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [query,setQuery]=useState('');
 const [institutionFilter,setInstitutionFilter]=useState('all');
 const [typeFilter,setTypeFilter]=useState('all');
 const [draft,setDraft]=useState<Record<string,string>>({});
 const [actor,setActor]=useState('');
 const [reason,setReason]=useState('Revisão de pontuação da campanha');
 const [notification,setNotification]=useState('');
 const items=useMemo<Item[]>(()=>campaign.institutions.flatMap(inst=>[
  ...inst.needs.map(n=>({id:n.id,type:'need' as const,institution:inst.name,name:n.name,details:n.specification||'',points:n.points})),
  ...(inst.gifts||[]).map(g=>({id:g.id,type:'gift' as const,institution:inst.name,name:g.giftName,details:g.beneficiary+(g.details?' — '+g.details:''),points:g.points}))
 ]),[campaign]);
 const institutions=useMemo(()=>Array.from(new Set(items.map(x=>x.institution))).sort((a,b)=>a.localeCompare(b,'pt-BR')),[items]);
 const filtered=items.filter(x=>(institutionFilter==='all'||x.institution===institutionFilter)&&(typeFilter==='all'||x.type===typeFilter)&&[x.name,x.details,x.institution].some(y=>y.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'))));
 const invalid=items.filter(x=>{const v=draft[x.type+':'+x.id];return v!==undefined&&!validValue(v)});
 const changes=items.flatMap(x=>{const v=draft[x.type+':'+x.id];if(v===undefined||!validValue(v))return [];const points=Number(v.replace(',','.'));return points!==x.points?[{id:x.id,type:x.type,points}]:[]});
 async function save(){
  if(busy||invalid.length||!changes.length||actor.trim().length<2||reason.trim().length<5)return;
  if(!window.confirm('Atualizar '+changes.length+' pontuações? Isso pode recalcular o ranking, inclusive das doações já registradas.'))return;
  const ok=await run('updateItemPoints',{items:changes,actor:actor.trim(),reason:reason.trim()});
  if(ok){setDraft({});setNotification(changes.length+' pontuação(ões) atualizada(s). A alteração foi registrada para auditoria.')}
 }
 return <section className="points-editor-section">
  <div className="points-editor-heading"><div><h3>Pontuação por item</h3><p>Consulte e edite os valores diretamente na tabela. Nenhuma alteração é salva automaticamente.</p></div><span>{items.length} itens</span></div>
  <div className="points-editor-filters">
   <label className="points-editor-search"><Search size={17}/><input aria-label="Buscar itens" placeholder="Buscar item, presente ou beneficiário" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <label className="points-editor-select"><span>Instituição</span><select value={institutionFilter} onChange={e=>setInstitutionFilter(e.target.value)}><option value="all">Todas as instituições</option>{institutions.map(x=><option value={x} key={x}>{x}</option>)}</select></label>
   <label className="points-editor-select"><span>Tipo</span><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">Todos</option><option value="need">Materiais</option><option value="gift">Presentes</option></select></label>
  </div>
  <div className="points-editor-count"><SlidersHorizontal size={14}/> {filtered.length} itens encontrados</div>
  <div className="points-editor-scroll"><table className="points-editor-table"><thead><tr><th>Instituição</th><th>Tipo</th><th>Material / presente</th><th className="points-editor-num">Atual</th><th className="points-editor-num">Nova pontuação</th></tr></thead><tbody>
  {filtered.map(x=>{const key=x.type+':'+x.id;const v=draft[key]===undefined?String(x.points):draft[key];const dirty=draft[key]!==undefined&&validValue(v)&&Number(v.replace(',','.'))!==x.points;const bad=draft[key]!==undefined&&!validValue(v);return <tr key={key} className={bad?'points-editor-invalid':dirty?'points-editor-dirty':''}><td>{x.institution}</td><td><span className={'points-editor-type '+(x.type==='gift'?'gift':'')}>{x.type==='gift'?'Presente':'Material'}</span></td><td className="points-editor-item"><strong>{x.name}</strong>{x.details&&<small>{x.details}</small>}</td><td className="points-editor-num">{fmt(x.points)}</td><td className="points-editor-num"><input type="number" min="0" max="100000" step="any" aria-label={'Pontuação para '+x.name+' — '+x.institution} value={v} onChange={e=>{setDraft(d=>({...d,[key]:e.target.value}));setNotification('')}}/>{dirty&&<small className="points-editor-changed">Alterado</small>}</td></tr>})}
  {!filtered.length&&<tr><td colSpan={5} className="points-editor-empty">Nenhum item encontrado.</td></tr>}
  </tbody></table></div>
  <div className="points-editor-save"><div><strong>{changes.length} {changes.length===1?'item alterado':'itens alterados'}</strong><small>{invalid.length?invalid.length+' valor(es) inválido(s). Use valores entre 0 e 100.000.':'As mudanças só são aplicadas após confirmar.'}</small></div><div className="points-editor-actions"><button className="btn outline" disabled={busy||!Object.keys(draft).length} onClick={()=>setDraft({})}><RotateCcw size={16}/> Descartar</button><button className="btn primary" disabled={busy||!changes.length||invalid.length>0||actor.trim().length<2||reason.trim().length<5} onClick={()=>void save()}><Save size={16}/> Salvar alterações</button></div></div>
  {Object.keys(draft).length>0&&<div className="points-editor-audit"><label className="donation-v2-field"><span>Seu nome (CIPAA) *</span><input value={actor} placeholder="Responsável" onChange={e=>setActor(e.target.value)}/></label><label className="donation-v2-field"><span>Motivo *</span><input value={reason} onChange={e=>setReason(e.target.value)}/></label></div>}
  {notification&&<p className="donation-notification">{notification}</p>}
 </section>;
}
