'use client';
import {useMemo,useState} from 'react';
import {Campaign} from '@/lib/types';
import PointsEditor from '@/components/points-editor';
import {Download,Upload,FileSpreadsheet,CheckCircle2,Info,ShieldCheck} from 'lucide-react';
type Run=(op:string,params:Record<string,unknown>)=>Promise<boolean>;
type PointItem={id:string;type:'need'|'gift';institution:string;name:string;details:string;points:number};
type Change={id:string;type:'need'|'gift';institution:string;name:string;oldPoints:number;points:number};
const csvCell=(value:string|number)=>{const s=String(value??'');return /[;"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
function parseCSV(text:string){
 const clean=text.replace(/^\uFEFF/,'');const header=clean.split(/\r?\n/,1)[0]||'';
 const separator=(header.match(/\t/g)||[]).length>0?'\t':(header.match(/;/g)||[]).length>=(header.match(/,/g)||[]).length?';':',';
 const rows:string[][]=[];let row:string[]=[],value='',quoted=false;
 for(let i=0;i<clean.length;i++){
  const char=clean[i];
  if(char==='"'){if(quoted&&clean[i+1]==='"'){value+='"';i++}else quoted=!quoted}
  else if(char===separator&&!quoted){row.push(value.trim());value=''}
  else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&clean[i+1]==='\n')i++;row.push(value.trim());if(row.some(v=>v!==''))rows.push(row);row=[];value=''}
  else value+=char;
 }
 if(quoted)throw Error('O arquivo tem aspas não fechadas.');
 row.push(value.trim());if(row.some(v=>v!==''))rows.push(row);
 return rows;
}
export default function PointsWorkbook({campaign,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [fileName,setFileName]=useState('');
 const [changes,setChanges]=useState<Change[]>([]);
 const [error,setError]=useState('');
 const [actor,setActor]=useState('');
 const [reason,setReason]=useState('Atualização de pontuação da campanha');
 const [success,setSuccess]=useState('');
 const all=useMemo<PointItem[]>(()=>campaign.institutions.flatMap(inst=>[
  ...inst.needs.map(n=>({id:n.id,type:'need' as const,institution:inst.name,name:n.name,details:n.specification||'',points:n.points})),
  ...(inst.gifts||[]).map(g=>({id:g.id,type:'gift' as const,institution:inst.name,name:g.giftName,details:g.beneficiary+(g.details?' — '+g.details:''),points:g.points}))
 ]),[campaign]);
 function exportCSV(){
  const headers=['Tipo','Instituição','Item / presente','Detalhes / beneficiário','Código do item','Pontos atuais','Nova pontuação'];
  const rows=all.map(x=>[x.type==='need'?'Material':'Presente',x.institution,x.name,x.details,x.id,String(x.points).replace('.',','),'']);
  const body=[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob(['\uFEFF'+body],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='pontuacao-'+campaign.id+'.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
 }
 async function readFile(file:File|undefined){
  setChanges([]);setError('');setSuccess('');setFileName(file?.name||'');
  if(!file)return;
  try{
   if(file.size>2_000_000)throw Error('Arquivo muito grande. Use a planilha de pontuação exportada pelo portal.');
   const rows=parseCSV(await file.text());
   const header=rows.shift()?.map(s=>s.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim())||[];
   const codeCol=header.findIndex(h=>h==='codigo do item');
   const typeCol=header.findIndex(h=>h==='tipo');
   const pointsCol=header.findIndex(h=>h==='nova pontuacao');
   if(codeCol<0||typeCol<0||pointsCol<0)throw Error('O arquivo precisa conter as colunas Tipo, Código do item e Nova pontuação. Baixe o modelo novamente.');
   const lookup=new Map(all.map(item=>[item.type+':'+item.id,item]));
   const updates:Change[]=[];const seen=new Set<string>();const issues:string[]=[];
   rows.forEach((row,index)=>{
    const value=(row[pointsCol]||'').trim();if(!value)return;
    const type=row[typeCol]?.trim().toLocaleLowerCase('pt-BR')==='presente'?'gift':row[typeCol]?.trim().toLocaleLowerCase('pt-BR')==='material'?'need':null;
    const code=(row[codeCol]||'').trim();const key=type+':'+code;
    const existing=lookup.get(key);
    if(!type||!existing){issues.push('Linha '+(index+2)+': tipo ou código não pertence à campanha.');return}
    if(seen.has(key)){issues.push('Linha '+(index+2)+': código duplicado.');return}
    seen.add(key);
    const normalized=value.replace(/\s/g,'').replace(',','.');
    const n=Number(normalized);
    if(!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)||!Number.isFinite(n)||n<0||n>100000){issues.push('Linha '+(index+2)+': pontuação inválida.');return}
    if(existing.points!==n)updates.push({id:existing.id,type:existing.type,institution:existing.institution,name:existing.name,oldPoints:existing.points,points:n});
   });
   if(issues.length)throw Error(issues.slice(0,5).join(' ')+(issues.length>5?' E mais '+(issues.length-5)+' erros.':''));
   setChanges(updates);
   if(!updates.length)setSuccess('Arquivo validado. Nenhuma pontuação foi alterada.');
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível ler a planilha.')}
 }
 async function apply(){
  if(!changes.length||actor.trim().length<2||reason.trim().length<5||busy)return;
  if(!window.confirm('Atualizar '+changes.length+' pontuações da campanha? O ranking poderá ser recalculado, inclusive para doações já registradas.'))return;
  const ok=await run('updateItemPoints',{items:changes.map(x=>({id:x.id,type:x.type,points:x.points})),actor:actor.trim(),reason:reason.trim()});
  if(ok){setSuccess(changes.length+' pontuações enviadas para atualização. Histórico de auditoria preservado.');setChanges([]);setFileName('')}
 }
 return <section className="panel points-workbook">
  <PointsEditor key={campaign.id} campaign={campaign} run={run} busy={busy}/>
  <details className="points-csv-details"><summary><FileSpreadsheet size={18}/> Exportar ou importar pelo Excel <span>Opção para alterações em lote</span></summary><div className="points-csv-content">
  <div className="panel-header"><div><h3><FileSpreadsheet size={19}/> Planilha de pontuações</h3><p className="muted">Todos os materiais e presentes em um arquivo único, independentemente da instituição.</p></div><span className="pill">{all.length} itens</span></div>
  <div className="points-workflow">
   <div className="points-workflow-step"><span className="points-step-number">1</span><div><strong>Baixe a relação completa</strong><p>Abra no Excel. Preencha somente a coluna <b>Nova pontuação</b>; mantenha os códigos dos itens.</p><button className="btn outline" disabled={!all.length} onClick={exportCSV}><Download size={17}/> Exportar pontuações (CSV para Excel)</button></div></div>
   <div className="points-workflow-step"><span className="points-step-number">2</span><div><strong>Importe o arquivo preenchido</strong><p>As linhas em branco não serão modificadas. A importação altera apenas os pontos.</p><label className="points-file-picker"><Upload size={16}/> {fileName||'Selecionar CSV preenchido'}<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={e=>{void readFile(e.target.files?.[0]);e.target.value=''}}/></label></div></div>
  </div>
  {error&&<p className="notice points-import-error">{error}</p>}
  {success&&<p className="donation-notification"><CheckCircle2 size={17}/>{success}</p>}
  {changes.length>0&&<div className="points-import-review"><div className="panel-header"><div><h4>{changes.length} pontuações serão atualizadas</h4><p className="muted">Confira a prévia antes de confirmar. Outros campos da campanha não serão alterados.</p></div></div><div className="donation-v2-table-scroll"><table><thead><tr><th>Instituição</th><th>Item</th><th>Antes</th><th>Depois</th></tr></thead><tbody>{changes.slice(0,50).map(x=><tr key={x.type+x.id}><td>{x.institution}</td><td>{x.name}</td><td>{x.oldPoints.toLocaleString('pt-BR')}</td><td><strong>{x.points.toLocaleString('pt-BR')}</strong></td></tr>)}</tbody></table></div>{changes.length>50&&<p className="hint">Mostrando as primeiras 50 alterações de {changes.length}.</p>}<div className="points-import-fields"><label className="donation-v2-field"><span>Responsável CIPAA *</span><input value={actor} onChange={e=>setActor(e.target.value)} placeholder="Seu nome"/></label><label className="donation-v2-field"><span>Motivo *</span><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ex.: revisão das regras de pontuação"/></label></div><button className="btn primary" disabled={busy||actor.trim().length<2||reason.trim().length<5} onClick={()=>void apply()}><ShieldCheck size={17}/> Confirmar atualização de {changes.length} itens</button></div>}
  <p className="hint"><Info size={14}/> O arquivo contém os nomes para facilitar a revisão, mas o sistema usa os códigos para atualizar somente os itens corretos. A alteração é auditada.</p>
  </div></details>
 </section>;
}
