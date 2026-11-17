'use client';
import {Fragment,useMemo,useState} from 'react';
import {Campaign} from '@/lib/types';
import {Search,Save,RotateCcw,SlidersHorizontal,ChevronDown,ChevronRight} from 'lucide-react';

type Run=(op:string,params:Record<string,unknown>)=>Promise<boolean>;
type Item={id:string;type:'need'|'gift';institution:string;name:string;details:string;points:number};
type ItemGroup={key:string;name:string;institution:string;type:'need'|'gift';members:Item[]};
const fmt=(n:number)=>n.toLocaleString('pt-BR',{maximumFractionDigits:2});
const validValue=(v:string)=>/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(v.trim())&&Number.isFinite(Number(v.replace(',','.')))&&Number(v.replace(',','.'))>=0&&Number(v.replace(',','.'))<=100000;
const clean=(s:string)=>s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
const itemKey=(item:Item)=>item.type+':'+item.id;

export default function PointsEditor({campaign,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [query,setQuery]=useState('');
 const [institutionFilter,setInstitutionFilter]=useState('all');
 const [typeFilter,setTypeFilter]=useState('all');
 const [draft,setDraft]=useState<Record<string,string>>({});
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [actor,setActor]=useState('');
 const [reason,setReason]=useState('Revisão de pontuação da campanha');
 const [notification,setNotification]=useState('');
 const items=useMemo<Item[]>(()=>campaign.institutions.flatMap(inst=>[
  ...inst.needs.map(n=>({id:n.id,type:'need' as const,institution:inst.name,name:n.name,details:n.specification||'',points:n.points})),
  ...(inst.gifts||[]).map(g=>({id:g.id,type:'gift' as const,institution:inst.name,name:g.giftName,details:g.beneficiary+(g.details?' — '+g.details:''),points:g.points}))
 ]),[campaign]);
 const institutions=useMemo(()=>Array.from(new Set(items.map(x=>x.institution))).sort((a,b)=>a.localeCompare(b,'pt-BR')),[items]);
 const groups=useMemo<ItemGroup[]>(()=>{
  const map=new Map<string,ItemGroup>();
  items.forEach(item=>{
   const key=[clean(item.institution),item.type,clean(item.name)].join('|');
   const match=map.get(key);
   if(match)match.members.push(item);
   else map.set(key,{key,name:item.name,institution:item.institution,type:item.type,members:[item]});
  });
  return Array.from(map.values()).sort((a,b)=>a.institution.localeCompare(b.institution,'pt-BR')||a.name.localeCompare(b.name,'pt-BR')||a.type.localeCompare(b.type,'pt-BR'));
 },[items]);
 const filtered=groups.filter(g=>(institutionFilter==='all'||g.institution===institutionFilter)&&(typeFilter==='all'||g.type===typeFilter)&&(!query.trim()||[g.name,g.institution,...g.members.map(m=>m.details)].some(y=>clean(y).includes(clean(query)))));
 const invalid=items.filter(x=>{const v=draft[itemKey(x)];return v!==undefined&&!validValue(v)});
 const changes=items.flatMap(x=>{const v=draft[itemKey(x)];if(v===undefined||!validValue(v))return [];const points=Number(v.replace(',','.'));return points!==x.points?[{id:x.id,type:x.type,points}]:[]});
 const groupPoints=(g:ItemGroup)=>g.members.map(item=>{const value=draft[itemKey(item)];return value===undefined?item.points:validValue(value)?Number(value.replace(',','.')):null;});
 function setGroupPoints(g:ItemGroup,value:string){
  setDraft(current=>{const next={...current};g.members.forEach(item=>{next[itemKey(item)]=value});return next});
  setNotification('');
 }
 async function save(){
  if(busy||invalid.length||!changes.length||actor.trim().length<2||reason.trim().length<5)return;
  if(!window.confirm('Atualizar '+changes.length+' pontuações? Isso pode recalcular o ranking, inclusive das doações já registradas.'))return;
  const ok=await run('updateItemPoints',{items:changes,actor:actor.trim(),reason:reason.trim()});
  if(ok){setDraft({});setNotification(changes.length+' pontuação(ões) atualizada(s). A alteração foi registrada para auditoria.')}
 }
 return <section className="points-editor-section">
  <div className="points-editor-heading"><div><h3>Pontuação por item</h3><p>Itens iguais da mesma instituição aparecem agrupados. Definir os pontos de um grupo aplica o valor a todos os seus registros.</p></div><span>{items.length} registros · {groups.length} grupos</span></div>
  <div className="points-editor-filters">
   <label className="points-editor-search"><Search size={17}/><input aria-label="Buscar itens" placeholder="Buscar item, presente ou beneficiário" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <label className="points-editor-select"><span>Instituição</span><select value={institutionFilter} onChange={e=>setInstitutionFilter(e.target.value)}><option value="all">Todas as instituições</option>{institutions.map(x=><option value={x} key={x}>{x}</option>)}</select></label>
   <label className="points-editor-select"><span>Tipo</span><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">Todos</option><option value="need">Materiais</option><option value="gift">Presentes</option></select></label>
  </div>
  <div className="points-editor-count"><SlidersHorizontal size={14}/> {filtered.length} grupos encontrados · {filtered.reduce((n,g)=>n+g.members.length,0)} registros</div>
  <div className="points-editor-scroll"><table className="points-editor-table"><thead><tr><th>Instituição</th><th>Tipo</th><th>Material / presente</th><th className="points-editor-num">Atual</th><th className="points-editor-num">Nova pontuação</th></tr></thead><tbody>
  {filtered.map(g=>{
   const values=groupPoints(g);
   const uniform=values.every(v=>v===values[0]);
   const oldUniform=g.members.every(x=>x.points===g.members[0].points);
   const dirty=g.members.some(x=>draft[itemKey(x)]!==undefined&&validValue(draft[itemKey(x)])&&Number(draft[itemKey(x)].replace(',','.'))!==x.points);
   const bad=g.members.some(x=>draft[itemKey(x)]!==undefined&&!validValue(draft[itemKey(x)]));
   const opened=expanded[g.key]===true;
   const showValue=uniform&&values[0]!==null?String(values[0]):'';
   return <Fragment key={g.key}><tr> className={bad?'points-editor-invalid':dirty?'points-editor-dirty':''}>
    <td>{g.institution}</td><td><span className={'points-editor-type '+(g.type==='gift'?'gift':'')}>{g.type==='gift'?'Presente':'Material'}</span></td>
    <td className="points-editor-item"><div className="points-group-label"><strong>{g.name}</strong>{g.members.length>1&&<span className="points-group-count">{g.members.length} registros</span>}</div>{g.members.length>1?<button type="button" className="points-group-expand" aria-expanded={opened} onClick={()=>setExpanded(e=>({...e,[g.key]:!opened}))}>{opened?<ChevronDown size={14}/>:<ChevronRight size={14}/>} {opened?'Ocultar pessoas / registros':'Ver pessoas / registros'}</button>:g.members[0].details&&<small>{g.members[0].details}</small>}</td>
    <td className="points-editor-num">{oldUniform?fmt(g.members[0].points):<span className="points-group-mixed">Valores diferentes</span>}</td>
    <td className="points-editor-num"><input type="number" min="0" max="100000" step="any" aria-label={'Pontuação para todos os registros de '+g.name+' — '+g.institution} placeholder={uniform?'':'Definir'} value={showValue} onChange={e=>setGroupPoints(g,e.target.value)}/>{dirty&&<small className="points-editor-changed">Alterado</small>}</td>
   </tr>
   {opened&&g.members.length>1&&g.members.map(item=>{
    const k=itemKey(item),v=draft[k]===undefined?String(item.points):draft[k];
    return <tr key={k} className={'points-group-member '+(draft[k]!==undefined&&validValue(v)&&Number(v.replace(',','.'))!==item.points?'points-editor-dirty':'')}><td colSpan={2}><span className="points-group-individual">Registro individual</span></td><td className="points-editor-item"><strong>{item.details||item.name}</strong></td><td className="points-editor-num">{fmt(item.points)}</td><td className="points-editor-num"><input type="number" min="0" max="100000" step="any" aria-label={'Pontuação individual de '+(item.details||item.name)} value={v} onChange={e=>{setDraft(d=>({...d,[k]:e.target.value}));setNotification('')}}/></td></tr>
   })}
   </Fragment>;
  })}
  {!filtered.length&&<tr><td colSpan={5} className="points-editor-empty">Nenhum item encontrado.</td></tr>}
  </tbody></table></div>
  <div className="points-editor-save"><div><strong>{changes.length} {changes.length===1?'registro alterado':'registros alterados'}</strong><small>{invalid.length?invalid.length+' valor(es) inválido(s). Use valores entre 0 e 100.000.':'As mudanças só são aplicadas após confirmar.'}</small></div><div className="points-editor-actions"><button className="btn outline" disabled={busy||!Object.keys(draft).length} onClick={()=>setDraft({})}><RotateCcw size={16}/> Descartar</button><button className="btn primary" disabled={busy||!changes.length||invalid.length>0||actor.trim().length<2||reason.trim().length<5} onClick={()=>void save()}><Save size={16}/> Salvar alterações</button></div></div>
  {Object.keys(draft).length>0&&<div className="points-editor-audit"><label className="donation-v2-field"><span>Seu nome (CIPAA) *</span><input value={actor} placeholder="Responsável" onChange={e=>setActor(e.target.value)}/></label><label className="donation-v2-field"><span>Motivo *</span><input value={reason} onChange={e=>setReason(e.target.value)}/></label></div>}
  {notification&&<p className="donation-notification">{notification}</p>}
 </section>;
}
