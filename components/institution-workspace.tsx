'use client';
import {useEffect,useMemo,useState} from 'react';
import {Building2,Plus,Gift,PackageCheck,Upload,Settings2,Search,Save,Pencil,Trash2,X,ArrowRight,CheckCircle2} from 'lucide-react';
import {Campaign,Institution,Need} from '@/lib/types';
import CampaignExtras from '@/components/campaign-extras';

type Run=(op:string,params:Record<string,unknown>)=>Promise<boolean>;
type Section='gifts'|'materials'|'import'|'details';
const tabs:{id:Section;label:string;icon:React.ElementType}[]=[
 {id:'gifts',label:'Presentes',icon:Gift},{id:'materials',label:'Materiais',icon:PackageCheck},
 {id:'import',label:'Importar',icon:Upload},{id:'details',label:'Dados',icon:Settings2}
];
export default function InstitutionWorkspace({campaign:c,run,busy}:{campaign:Campaign;run:Run;busy:boolean}){
 const [selectedId,setSelectedId]=useState('');
 const [section,setSection]=useState<Section>('gifts');
 const [newInstitution,setNewInstitution]=useState('');
 const [addingInstitution,setAddingInstitution]=useState(false);
 const [institutionSearch,setInstitutionSearch]=useState('');
 const [itemSearch,setItemSearch]=useState('');
 const [name,setName]=useState('');
 const [description,setDescription]=useState('');
 const [beneficiaryKind,setBeneficiaryKind]=useState<'unspecified'|'children'|'elderly'|'people'>('unspecified');
 const [beneficiaryCount,setBeneficiaryCount]=useState(0);
 const [editingNeed,setEditingNeed]=useState<Need|null>(null);
 const [newMaterial,setNewMaterial]=useState(false);
 const [materialName,setMaterialName]=useState('');
 const [spec,setSpec]=useState('');
 const [mode,setMode]=useState<'target'|'free'>('target');
 const [target,setTarget]=useState(10);
 const [unit,setUnit]=useState('unidade(s)');
 const [points,setPoints]=useState(1);
 const [notice,setNotice]=useState('');
 const current=c.institutions.find(i=>i.id===selectedId)||c.institutions[0];
 const selected=current?.id||'';
 const stats=useMemo(()=>({gifts:(current?.gifts||[]).length,available:(current?.gifts||[]).filter(g=>g.status==='available').length,reserved:(current?.gifts||[]).filter(g=>g.status==='reserved').length,delivered:(current?.gifts||[]).filter(g=>g.status==='delivered').length,materials:current?.needs.length||0}),[current]);
 useEffect(()=>{setName(current?.name||'');setDescription(current?.description||'');setBeneficiaryKind(current?.beneficiaryKind||'unspecified');setBeneficiaryCount(current?.beneficiaryCount||0);setEditingNeed(null);setNewMaterial(false);setNotice('')},[selected]);
 function choose(id:string){setSelectedId(id);setSection('gifts');setItemSearch('');}
 async function addInstitution(){
  if(!newInstitution.trim()||busy)return;
  const ok=await run('saveInstitution',{institution:{name:newInstitution.trim(),description:''}});
  if(ok){setNewInstitution('');setAddingInstitution(false);setNotice('Instituição cadastrada. Selecione-a na lista para começar.')}
 }
 async function saveInstitution(){
  if(!current||!name.trim()||busy)return;
  if(await run('saveInstitution',{institution:{id:current.id,name:name.trim(),description:description.trim(),beneficiaryKind,beneficiaryCount}}))setNotice('Informações da instituição atualizadas.');
 }
 async function deleteInstitution(){
  if(!current||busy||!window.confirm('Excluir '+current.name+'? A exclusão só é permitida quando não há doações ou registros vinculados.'))return;
  if(await run('deleteInstitution',{institutionId:current.id})){setSelectedId('');setNotice('Instituição removida.')}
 }
 function openMaterial(n?:Need){setEditingNeed(n||null);setMaterialName(n?.name||'');setSpec(n?.specification||'');setMode(n?.mode||'target');setTarget(n?.target||10);setUnit(n?.unit||'unidade(s)');setPoints(n?.points??1);setNewMaterial(true)}
 async function saveMaterial(){
  if(!current||!materialName.trim()||busy||!Number.isFinite(points)||points<0||(!Number.isFinite(target))||(mode==='target'&&target<=0))return;
  const payload={name:materialName.trim(),specification:spec.trim(),mode,target:mode==='free'?0:target,unit,points};
  const ok=await run(editingNeed?'editNeed':'addNeed',editingNeed?{needId:editingNeed.id,need:payload}:{institutionId:current.id,need:payload});
  if(ok){setNewMaterial(false);setEditingNeed(null);setNotice(editingNeed?'Material atualizado.':'Material cadastrado.')}
 }
 async function deleteMaterial(n:Need){if(busy||!window.confirm('Excluir '+n.name+'? Materiais com registros de doação não podem ser removidos.'))return;
  if(await run('deleteNeed',{needId:n.id}))setNotice('Material removido.');
 }
 const filteredInstitutions=c.institutions.filter(i=>i.name.toLocaleLowerCase('pt-BR').includes(institutionSearch.toLocaleLowerCase('pt-BR')));
 const filteredMaterials=(current?.needs||[]).filter(n=>[n.name,n.specification||''].join(' ').toLocaleLowerCase('pt-BR').includes(itemSearch.toLocaleLowerCase('pt-BR')));
 return <div className="iw-root">
  <div className="section-heading"><div><h2>Instituições e itens</h2><p className="muted">Selecione uma instituição e gerencie tudo sem sair desta tela.</p></div></div>
  <div className="iw-workspace">
   <aside className="iw-sidebar" aria-label="Instituições desta campanha">
    <div className="iw-sidebar-head"><strong>Instituições</strong><span>{c.institutions.length}</span></div>
    <label className="iw-search"><Search size={16}/><input placeholder="Buscar instituição" aria-label="Buscar instituição" value={institutionSearch} onChange={e=>setInstitutionSearch(e.target.value)}/></label>
    <div className="iw-institution-list">{filteredInstitutions.map(i=><button type="button" key={i.id} aria-current={current?.id===i.id?'page':undefined} className={'iw-institution-item '+(current?.id===i.id?'active':'')} onClick={()=>choose(i.id)}>
      <span className="iw-institution-icon"><Building2 size={18}/></span><span className="iw-institution-copy"><strong>{i.name}</strong><small>{(i.gifts||[]).length} presentes · {i.needs.length} materiais</small></span><ArrowRight size={16} className="iw-side-arrow"/>
    </button>)}{!filteredInstitutions.length&&<p className="iw-sidebar-empty">Nenhuma instituição encontrada.</p>}</div>
    {addingInstitution?<div className="iw-add-form"><input placeholder="Nome da instituição" maxLength={160} autoFocus value={newInstitution} onChange={e=>setNewInstitution(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void addInstitution()}}}/><div><button className="btn primary" disabled={busy||!newInstitution.trim()} onClick={()=>void addInstitution()}><Save size={15}/> Salvar</button><button className="btn outline" onClick={()=>setAddingInstitution(false)}>Cancelar</button></div></div>:<button type="button" className="iw-add-button" onClick={()=>setAddingInstitution(true)}><Plus size={17}/> Nova instituição</button>}
   </aside>
   <div className="iw-content">
    {current?<><header className="iw-header"><div className="iw-header-title"><span className="iw-header-icon"><Building2 size={23}/></span><div><span className="iw-kicker">INSTITUIÇÃO SELECIONADA</span><h3>{current.name}</h3><p>{current.description||'Cadastre informações e organize os itens desta instituição.'}</p></div></div><button className="btn outline" onClick={()=>setSection('details')}><Settings2 size={16}/> Editar dados</button></header>
      <div className="iw-stats">
       <div><span>Presentes</span><strong>{stats.gifts}</strong></div>
       <div><span>Disponíveis</span><strong>{stats.available}</strong></div>
       <div><span>Reservados</span><strong>{stats.reserved}</strong></div>
       <div><span>Entregues</span><strong>{stats.delivered}</strong></div>
       <div><span>Materiais</span><strong>{stats.materials}</strong></div>
      </div>
      <div className="iw-tabs" role="tablist" aria-label="Gerenciamento da instituição">{tabs.map(t=><button type="button" role="tab" aria-selected={section===t.id} className={section===t.id?'active':''} key={t.id} onClick={()=>setSection(t.id)}><t.icon size={16}/>{t.label}</button>)}</div>
      <div className="iw-tab-content">
       {section==='gifts'&&<CampaignExtras key={current.id+'-gifts'} campaign={c} run={run} busy={busy} institutionId={current.id} section="gifts"/>}
       {section==='import'&&<CampaignExtras key={current.id+'-import'} campaign={c} run={run} busy={busy} institutionId={current.id} section="import"/>}
       {section==='materials'&&<section className="iw-items-section">
         <div className="iw-section-heading"><div><h3>Materiais e arrecadações</h3><p className="muted">Configure metas ou arrecadações livres de itens como leite, fraldas e alimentos.</p></div><button className="btn primary" onClick={()=>openMaterial()}><Plus size={17}/> Novo material</button></div>
         <label className="iw-search iw-item-search"><Search size={16}/><input aria-label="Buscar materiais" placeholder="Buscar material..." value={itemSearch} onChange={e=>setItemSearch(e.target.value)}/></label>
         {filteredMaterials.length?<div className="iw-table-scroll"><table className="iw-table"><thead><tr><th>Material</th><th>Modalidade</th><th>Recebido</th><th>Pontos</th><th>Ações</th></tr></thead><tbody>{filteredMaterials.map(n=><tr key={n.id}><td><strong>{n.name}</strong>{n.specification&&<small>{n.specification}</small>}</td><td>{n.mode==='free'?'Livre (sem meta)':n.target.toLocaleString('pt-BR')+' '+n.unit}</td><td>{n.received.toLocaleString('pt-BR')}</td><td>{n.points.toLocaleString('pt-BR')}</td><td><div className="iw-actions"><button className="icon-btn" aria-label={'Editar '+n.name} title="Editar" onClick={()=>openMaterial(n)}><Pencil size={16}/></button><button className="icon-btn danger" aria-label={'Excluir '+n.name} title="Excluir" onClick={()=>void deleteMaterial(n)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>:<div className="iw-empty"><PackageCheck size={29}/><h4>{current.needs.length?'Nenhum item encontrado':'Nenhum material cadastrado'}</h4><p>Adicione materiais com meta ou arrecadações livres para esta instituição.</p></div>}
        </section>}
       {section==='details'&&<section className="iw-items-section"><div className="iw-section-heading"><div><h3>Dados da instituição</h3><p className="muted">Essas informações ajudam os colaboradores a conhecer a instituição atendida.</p></div></div><div className="iw-details-form"><label className="donation-v2-field"><span>Nome da instituição</span><input maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label><label className="donation-v2-field"><span>Descrição e orientações</span><textarea rows={5} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)}/></label><label className="donation-v2-field"><span>Tipo de público beneficiado</span><select value={beneficiaryKind} onChange={e=>setBeneficiaryKind(e.target.value as typeof beneficiaryKind)}><option value="unspecified">Ainda não informado</option><option value="children">Crianças</option><option value="elderly">Pessoas idosas</option><option value="people">Público misto / outras faixas etárias</option></select></label><label className="donation-v2-field"><span>Quantidade de beneficiários</span><input type="number" min="0" step="1" value={beneficiaryCount} onChange={e=>setBeneficiaryCount(Number(e.target.value))}/></label><p className="hint">Esta informação aparece na seção "Quem vamos ajudar" do portal público. Informe pessoas atendidas, não a quantidade de materiais ou presentes.</p><div className="iw-details-actions"><button className="btn primary" disabled={busy||!name.trim()||!Number.isInteger(beneficiaryCount)||beneficiaryCount<0} onClick={()=>void saveInstitution()}><Save size={17}/> Salvar dados</button><button className="btn outline" disabled={busy} onClick={()=>void deleteInstitution()}><Trash2 size={16}/> Excluir instituição</button></div><p className="hint">A exclusão só deve ser usada para cadastros sem registros de doação ou presentes vinculados.</p></div></section>}
      </div>
     </>:<div className="iw-empty iw-no-institution"><Building2 size={39}/><h3>Cadastre uma instituição para começar</h3><p>Depois você poderá adicionar presentes, materiais, informações e importar dados.</p><button className="btn primary" onClick={()=>setAddingInstitution(true)}><Plus size={17}/> Nova instituição</button></div>}
   </div>
  </div>
  {notice&&<div className="donation-notification iw-notice"><CheckCircle2 size={18}/>{notice}<button onClick={()=>setNotice('')}>Fechar</button></div>}
  {newMaterial&&<div className="donation-dialog-backdrop" role="presentation" onClick={()=>setNewMaterial(false)}><section className="donation-dialog" role="dialog" aria-modal="true" aria-label={editingNeed?'Editar material':'Novo material'} onClick={e=>e.stopPropagation()}>
    <div className="panel-header"><div><h3>{editingNeed?'Editar material':'Novo material'}</h3><p className="muted">Instituição: {current?.name}</p></div><button className="icon-btn" title="Fechar" onClick={()=>setNewMaterial(false)}><X size={20}/></button></div>
    <div className="donation-v2-grid"><label className="donation-v2-field"><span>Nome do material</span><input placeholder="Ex.: Leite" value={materialName} onChange={e=>setMaterialName(e.target.value)}/></label><label className="donation-v2-field"><span>Modalidade</span><select value={mode} onChange={e=>{const value=e.target.value as 'target'|'free';setMode(value);if(value==='target'&&target<=0)setTarget(10)}}><option value="target">Com meta</option><option value="free">Arrecadação livre (sem meta)</option></select></label><label className="donation-v2-field"><span>Unidade de medida</span><select value={unit} onChange={e=>setUnit(e.target.value)}>{Array.from(new Set(['unidade(s)','litros','kg','cesta(s)','pacotes','R$','kit(s)',unit])).map(v=><option value={v} key={v}>{v}</option>)}</select></label>{mode==='target'&&<label className="donation-v2-field"><span>Meta</span><input type="number" min="0.01" step="any" value={target} onChange={e=>setTarget(Number(e.target.value))}/></label>}<label className="donation-v2-field"><span>Pontos por unidade</span><input type="number" min="0" step="any" value={points} onChange={e=>setPoints(Number(e.target.value))}/></label><label className="donation-v2-field"><span>Especificação (opcional)</span><input value={spec} onChange={e=>setSpec(e.target.value)} placeholder="Ex.: Leite integral 1L"/></label></div>
    <div className="donation-v2-actions"><button className="btn primary" disabled={busy||!materialName.trim()||points<0||(mode==='target'&&target<=0)} onClick={()=>void saveMaterial()}><Save size={17}/> {editingNeed?'Salvar alterações':'Adicionar material'}</button><button className="btn outline" onClick={()=>setNewMaterial(false)}>Cancelar</button></div>
   </section></div>}
 </div>;
}
