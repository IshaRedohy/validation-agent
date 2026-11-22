import { useState } from 'react';
import { api, type Document } from './api';

export type Criterion = {id:string;category:string;title:string;status:string;rationale:string;action:string;evidence_ids:string[]};
export type Scorecard = {counts:Record<string,number>;percentages:Record<string,number|null>;denominator:number;total:number;provisional:boolean};
const labels:Record<string,string>={satisfactory:'Satisfactory',needs_review:'Needs review',identified_gap:'Identified gap',not_applicable:'Not applicable',unevaluated:'Unevaluated'};
export function ReviewScorecards({cards,criteria,onEvidence}:{cards:Record<string,Scorecard>;criteria:Criterion[];onEvidence:(id:string)=>void}) {
  return <><div className="scorecards">{Object.entries(cards).map(([category,card])=><section className="scorecard" key={category}>
    <h3>{category==='quality'?'Document quality':'21 CFR Part 11 alignment'}</h3><span className="badge">{card.provisional?'Provisional':'Draft assessment'}</span>
    <div className="stats">{Object.entries(card.percentages).map(([status,value])=><div key={status}><strong>{value===null?'—':`${value}%`}</strong><span>{labels[status]}</span></div>)}</div>
    <p className="muted">{card.denominator} evaluated applicable criteria · {card.counts.not_applicable} not applicable · {card.counts.unevaluated} unevaluated</p>
  </section>)}</div><p className="muted">Equal weight per criterion. These percentages describe document evidence, not a system’s compliance probability. Reviewer decisions do not change the original scores.</p>
  <details><summary>Inspect checklist outcomes and suggested modifications</summary>{criteria.map(c=><article className="finding" key={c.id}><span className="badge">{labels[c.status]}</span><h3>{c.title}</h3><p>{c.rationale}</p><p>{c.action}</p><div className="evidence-links">{c.evidence_ids.map((id,i)=><button key={id} onClick={()=>onEvidence(id)}>Source {i+1}</button>)}</div></article>)}</details></>
}
export function ProjectContext({project,initial,onSaved}:{project:string;initial?:Record<string,string>;onSaved:(value:Record<string,string>)=>void}) {
  const [value,setValue]=useState(initial||{intended_use:'',regulated_records:'unknown',electronic_signatures:'unknown',system_access:'unknown'});
  const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  async function save(){setBusy(true);try{const saved=await api(`/projects/${project}/context`,{method:'PUT',body:JSON.stringify(value)});onSaved(saved);setMessage('Saved for future reviews.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
  return <details><summary>System context and Part 11 applicability</summary><p>Unknown is fine. Missing context will be flagged for review.</p><label>Intended use<input aria-label="Intended use" value={value.intended_use||''} onChange={e=>setValue({...value,intended_use:e.target.value})}/></label>
    <div className="project-form">{[['regulated_records','FDA-regulated electronic records'],['electronic_signatures','Electronic signatures'],['system_access','System access']].map(([key,label])=><label key={key}>{label}<select aria-label={label} value={value[key]||'unknown'} onChange={e=>setValue({...value,[key]:e.target.value})}>{(key==='system_access'?['unknown','closed','open']:['unknown','yes','no']).map(v=><option key={v}>{v}</option>)}</select></label>)}<button className="secondary" disabled={busy} onClick={save}>Save context</button></div><p role="status">{message}</p></details>
}
export function ExampleEditor({doc,onSaved}:{doc:Document;onSaved:()=>void}){
  const [value,setValue]=useState(doc.example_metadata||{reason:'',system_context:'',methodology:'',enabled:true});const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  async function save(){setBusy(true);try{await api(`/documents/${doc.id}/example`,{method:'PUT',body:JSON.stringify(value)});onSaved();setMessage('Saved for future reviews.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
  return <details className="finding"><summary>{doc.name} · {doc.role==='example_accepted'?'Accepted':'Rejected'} example</summary><p>An outcome label alone is background information. Add the reason and relevant context for meaningful comparisons.</p>{(['reason','system_context','methodology'] as const).map(key=><label key={key}>{key.replace('_',' ')}<input aria-label={`${doc.name} ${key}`} value={value[key]||''} onChange={e=>setValue({...value,[key]:e.target.value})}/></label>)}<label><input type="checkbox" checked={value.enabled!==false} onChange={e=>setValue({...value,enabled:e.target.checked})}/> Include in future reviews</label><button disabled={busy} className="secondary" onClick={save}>Save example</button><p role="status">{message}</p></details>
}
