import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Upload, FileText, ArrowRight, AlertTriangle, MessageSquare, Download, X, Plus } from 'lucide-react';
import { api, base, type Document, type Evidence, type RiskRow, type Review, type Finding } from './api';
import '../styles/pilot.css';

const fields = ['risk_id','requirement_id','failure_mode','impact','severity','probability','detectability','risk_score','risk_class','mitigation'];

function DocumentEditor({ doc, onSave, onClose }: {doc:Document; onSave:()=>void; onClose:()=>void}) {
  const [rows,setRows] = useState<RiskRow[]>(doc.extraction.rows);
  const [requirements,setRequirements] = useState(Object.entries(doc.extraction.requirements).map(([id, evidence])=>({id,evidence})));
  const [error,setError] = useState('');
  const [saving,setSaving] = useState(false);
  async function save() {
    setSaving(true);setError('');
    try {
      if (requirements.some(r=>!r.id.trim()) || new Set(requirements.map(r=>r.id)).size !== requirements.length) throw new Error('Requirement identifiers must be nonempty and unique.');
      await api(`/documents/${doc.id}/confirmation`, {method:'PUT',body:JSON.stringify({rows, requirements:Object.fromEntries(requirements.map(r=>[r.id,r.evidence]))})});
      onSave();
    } catch(e) {setError((e as Error).message)} finally {setSaving(false)}
  }
  return <div className="modal-overlay"><section className="editor" role="dialog" aria-modal="true" aria-label="Confirm document extraction">
    <div className="section-heading"><div><span className="eyebrow">CONFIRM EXTRACTION</span><h2>{doc.name}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X/></button></div>
    <p>Check the extracted values against the source. Corrections apply to future reviews; previous reviews keep their original snapshot.</p>
    {doc.extraction.warnings.map(w=><p className="notice" key={w}>{w}</p>)}
    <details><summary>Source evidence ({doc.extraction.chunks.length} locations)</summary><div className="source-list">{doc.extraction.chunks.map(c=><article key={c.id}><b>{c.location}</b><pre>{c.text}</pre></article>)}</div></details>
    {doc.role==='assessment' && <><div className="table-scroll"><table><thead><tr>{fields.map(f=><th key={f}>{f.replaceAll('_',' ')}</th>)}<th>Source evidence</th><th/></tr></thead><tbody>{rows.map((row,index)=><tr key={index}>
      {fields.map(f=><td key={f}><input aria-label={`${f} row ${index+1}`} value={String(row[f]??'')} onChange={e=>setRows(rows.map((r,i)=>i===index?{...r,[f]:e.target.value}:r))}/></td>)}
      <td><select aria-label={`Evidence row ${index+1}`} value={row.evidence_ids[0]??''} onChange={e=>setRows(rows.map((r,i)=>i===index?{...r,evidence_ids:[e.target.value]}:r))}><option value="">Choose source</option>{doc.extraction.chunks.map(c=><option value={c.id} key={c.id}>{c.location}</option>)}</select></td>
      <td><button onClick={()=>setRows(rows.filter((_,i)=>i!==index))}>Remove</button></td>
    </tr>)}</tbody></table></div><button className="secondary" onClick={()=>setRows([...rows,{...Object.fromEntries(fields.map(f=>[f,''])),evidence_ids:[]} as RiskRow])}><Plus size={15}/> Add risk row</button></>}
    {doc.role==='requirements' && <div>{requirements.map((r,i)=><div className="requirement-row" key={i}><input aria-label="Requirement identifier" value={r.id} onChange={e=>setRequirements(requirements.map((v,n)=>n===i?{...v,id:e.target.value}:v))}/><select aria-label="Requirement evidence" value={r.evidence[0]??''} onChange={e=>setRequirements(requirements.map((v,n)=>n===i?{...v,evidence:[e.target.value]}:v))}><option value="">Choose source</option>{doc.extraction.chunks.map(c=><option value={c.id} key={c.id}>{c.location}</option>)}</select><button onClick={()=>setRequirements(requirements.filter((_,n)=>n!==i))}>Remove</button></div>)}<button className="secondary" onClick={()=>setRequirements([...requirements,{id:'',evidence:[]}])}>Add requirement</button></div>}
    <p className="muted">Scoring profile: illustrative FMEA v1. Uploaded methodology text is reference evidence; it does not automatically change the scoring formula.</p>
    {error&&<p role="alert" className="error">{error}</p>}
    <button className="primary" disabled={saving} onClick={save}>{saving?'Saving…':'Confirm extracted content'}</button>
  </section></div>
}

function FindingCard({finding,review,onDecision,onEvidence}: {finding:Finding; review:Review; onDecision:()=>void; onEvidence:(id:string)=>void}) {
  const [reason,setReason]=useState(''); const [disposition,setDisposition]=useState('accepted'); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const history=review.decisions?.filter(d=>d.finding_id===finding.id)??[];
  async function save() {
    setBusy(true);setError('');
    try {await api(`/reviews/${review.id}/findings/${finding.id}/decisions`,{method:'POST',body:JSON.stringify({reason,disposition})});setReason('');onDecision()}catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  return <article className="finding"><div className="section-heading"><span className={`badge ${finding.priority.toLowerCase()}`}>{finding.priority} priority</span><span className="muted">{finding.risk_id || 'Package coverage'} · {finding.category}</span></div><h3>{finding.rationale}</h3><p>{finding.action}</p><div className="evidence-links">{finding.evidence_ids.map((id,i)=><button key={id} onClick={()=>onEvidence(id)}><FileText size={14}/> Source {i+1}</button>)}{!finding.evidence_ids.length&&<span className="muted">Supporting evidence missing</span>}</div><p className="muted">{finding.kind.replaceAll('_',' ')} · Rule: {finding.rule}</p>
    {history.map((d,i)=><p className="decision" key={i}><b>{d.disposition}</b>: {d.reason}</p>)}
    <div className="decision-form"><select aria-label="Disposition" value={disposition} onChange={e=>setDisposition(e.target.value)}><option value="accepted">Accept finding</option><option value="dismissed">Dismiss finding</option><option value="annotated">Add annotation</option></select><input aria-label="Decision reason" placeholder="Reason for this decision" value={reason} onChange={e=>setReason(e.target.value)}/><button className="secondary" disabled={busy||!reason.trim()} onClick={save}>Save</button></div>{error&&<p role="alert" className="error">{error}</p>}
  </article>
}

export default function App() {
  const [projects,setProjects]=useState<{id:string;name:string}[]>([]);const [project,setProject]=useState(''); const [name,setName]=useState('');
  const [docs,setDocs]=useState<Document[]>([]);const [role,setRole]=useState('assessment');const [editor,setEditor]=useState<Document|null>(null);
  const [review,setReview]=useState<Review|null>(null);const [history,setHistory]=useState<Review[]>([]);const [evidence,setEvidence]=useState<Evidence|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState(''); const [question,setQuestion]=useState(''); const [chatBusy,setChatBusy]=useState(false);
  const [messages,setMessages]=useState<{question:string;answer:string;evidence:Evidence[]}[]>([]);const uploadRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{api('/projects').then(setProjects).catch(e=>setError('Backend unavailable. Start the local services. '+e.message))},[]);
  useEffect(()=>{setDocs([]);setReview(null);setHistory([]);setMessages([]);setError('');setEvidence(null);setEditor(null);if(!project)return; let active=true;
    Promise.all([api(`/projects/${project}/documents`),api(`/projects/${project}/reviews`)]).then(([d,r])=>{if(active){setDocs(d);setHistory(r)}}).catch(e=>{if(active)setError(e.message)}); return()=>{active=false};
  },[project]);
  useEffect(()=>{if(!review||!['queued','running'].includes(review.status))return;let active=true; const timer=setInterval(()=>api(`/reviews/${review.id}`).then(r=>{if(active)setReview(r)}).catch(e=>{if(active)setError(e.message)}),2000);return()=>{active=false;clearInterval(timer)}},[review?.id,review?.status]);
  const latest=docs.filter(d=>!docs.some(other=>other.name===d.name&&other.version>d.version));
  async function refreshDocs(){setDocs(await api(`/projects/${project}/documents`));setEditor(null)}
  async function create(){setBusy(true);setError('');try{const p=await api('/projects',{method:'POST',body:JSON.stringify({name})});setProjects([p,...projects]);setProject(p.id);setName('')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function upload(files:FileList|null){if(!files)return;setBusy(true);setError('');try{for(const file of Array.from(files)){const body=new FormData();body.append('file',file);body.append('role',role);await api(`/projects/${project}/documents`,{method:'POST',body})}await refreshDocs()}catch(e){setError((e as Error).message);await refreshDocs().catch(()=>{})}finally{setBusy(false);if(uploadRef.current)uploadRef.current.value=''}}
  async function start(){setBusy(true);setError('');try{const r=await api(`/projects/${project}/reviews`,{method:'POST'});setReview(r);setMessages([]);setHistory([r,...history])}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function loadReview(id:string){setError('');try{setReview(await api(`/reviews/${id}`));setMessages([])}catch(e){setError((e as Error).message)}}
  function showEvidence(id:string){const found=docs.flatMap(d=>d.extraction.chunks).find(c=>c.id===id);if(found)setEvidence(found);else setError('Source evidence could not be found.')}
  async function chat(){if(!review)return;setChatBusy(true);try{const response=await api(`/projects/${project}/chat`,{method:'POST',body:JSON.stringify({question,job_id:review.id})});setMessages([...messages,{question,...response}]);setQuestion('')}catch(e){setError((e as Error).message)}finally{setChatBusy(false)}}
  return <main className="pilot"><header className="topbar"><div className="brand"><span className="brand-icon"><ShieldCheck/></span><div><b>Validation Assistant</b><small>Life sciences · Risk assessment review</small></div></div><span className="badge">LOCAL PILOT</span></header>
    <div className="hero"><span className="eyebrow">EVIDENCE FIRST. HUMAN REVIEW.</span><h1>Confidence starts with<br/><em>a closer look.</em></h1><p>Review risks, verify calculations, and trace every finding back to its source.</p></div>
    <div className="workspace"><div className="notice"><AlertTriangle size={18}/><span>Testing with illustrative FMEA v1 · Severity × probability × detectability (1–5). Low: 1–19, medium: 20–49, high: 50–125. Higher detectability means harder to detect. Results are draft findings, not compliance approval.</span></div>
      {error&&<div role="alert" className="error">{error}</div>}
      <section className="panel"><div className="section-heading"><h2>Review workspace</h2><span className="step">01 / PROJECT</span></div><div className="project-form"><select aria-label="Select project" value={project} disabled={busy||chatBusy} onChange={e=>setProject(e.target.value)}><option value="">Select a project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><span>or</span><input aria-label="Project name" placeholder="New project name" value={name} onChange={e=>setName(e.target.value)}/><button className="primary" disabled={busy||!name.trim()} onClick={create}>Create project <Plus size={16}/></button></div></section>
      {project&&<><section className="panel"><div className="section-heading"><div><span className="step">02 / DOCUMENT PACKAGE</span><h2>Build the evidence</h2></div><select aria-label="Document role" value={role} onChange={e=>setRole(e.target.value)}><option value="assessment">Risk assessment</option><option value="requirements">Requirements</option><option value="methodology">Methodology / SOP</option><option value="reference">Reference</option></select></div>
        <label className={`upload-zone ${busy?'disabled':''}`}><Upload size={30}/><b>{busy?'Working…':'Choose documents to upload'}</b><span>PDF, DOCX, XLSX or TXT · Up to 20 MB each</span><input ref={uploadRef} type="file" accept=".pdf,.docx,.xlsx,.txt" multiple disabled={busy} onChange={e=>upload(e.target.files)}/></label>
        <div className="documents">{latest.map(d=><div className="document" key={d.id}><FileText/><div className="document-name"><b>{d.name}</b><small>{d.role} · Version {d.version} · {d.extraction.chunks.length} source locations</small></div><span className={`badge ${d.confirmed?'confirmed':''}`}>{d.confirmed?'Confirmed':'Needs confirmation'}</span><button className="secondary" onClick={()=>setEditor(d)}>{d.confirmed?'Inspect':'Review extraction'}</button><a href={`${base}/documents/${d.id}/original`} aria-label={`Download ${d.name}`}><Download size={18}/></a></div>)}</div>
        <div className="review-start"><p className="muted">Confirm each document before starting. New runs use the latest version of each filename.</p><button className="primary" disabled={busy||!latest.some(d=>d.role==='assessment')||latest.some(d=>!d.confirmed)||!!review&&['queued','running'].includes(review.status)} onClick={start}>Review package <ArrowRight size={17}/></button></div>
      </section>
      <section className="panel"><div className="section-heading"><div><span className="step">03 / REVIEW</span><h2>Findings & evidence</h2></div><select aria-label="Review history" value={review?.id??''} onChange={e=>loadReview(e.target.value)}><option value="" disabled>Previous reviews</option>{history.map((r,i)=><option key={r.id} value={r.id}>Review {history.length-i} · {r.id.slice(0,8)}</option>)}</select></div>
        {!review&&<div className="empty"><ShieldCheck size={36}/><p>Your review will appear here.</p><small>Upload and confirm an assessment to get started.</small></div>}
        {review&&<><div aria-live="polite" className="review-status"><span className="badge">{review.status}</span><b>{review.stage}</b>{['queued','running'].includes(review.status)&&<span className="spinner"/>}</div>{review.error&&<p className="error">{review.error}</p>}
          {review.result&&<><div className="stats"><div><strong>{review.result.rows_reviewed}</strong><span>Risk rows checked</span></div><div><strong>{review.result.findings.length}</strong><span>Draft findings</span></div><div><strong>{review.result.semantic_reviews.length}</strong><span>Semantic reviews</span></div></div>
          {review.result.limitations.length>0&&<div className="notice"><div><b>Review limitations</b><ul>{review.result.limitations.map((l,i)=><li key={i}>{l}</li>)}</ul></div></div>}
          <div className="export-links"><a href={`${base}/reviews/${review.id}/export?format=html`}><Download size={16}/> HTML report</a><a href={`${base}/reviews/${review.id}/export?format=json`}><Download size={16}/> JSON report</a></div>
          {review.result.findings.map(f=><FindingCard key={review.id+f.id} finding={f} review={review} onDecision={()=>loadReview(review.id)} onEvidence={showEvidence}/>)}
          {!review.result.findings.length&&<p>No findings returned. Review the coverage and limitations before drawing conclusions.</p>}
          <details><summary>Semantic review rationale</summary>{review.result.semantic_reviews.map((r,i)=><p key={i}><b>{r.risk_id}:</b> {r.assessment}</p>)}</details>
          <div className="chat"><h3><MessageSquare size={18}/> Ask about this review’s documents</h3><p className="muted">Answers use evidence from this review’s document versions.</p>{messages.map((m,i)=><article key={i}><b>{m.question}</b><p>{m.answer}</p>{m.evidence.map(e=><button key={e.id} onClick={()=>setEvidence(e)}>{e.location}</button>)}</article>)}<div className="chat-form"><input aria-label="Question" placeholder="What evidence supports the mitigation?" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!chatBusy&&question.trim())chat()}}/><button className="primary" disabled={chatBusy||!question.trim()} onClick={chat}>{chatBusy?'Thinking…':'Ask'}</button></div></div>
          </>}
        </>}
      </section></>}
    </div><footer>Validation Assistant · Local testing workspace · Human judgment remains essential</footer>
    {editor&&<DocumentEditor key={editor.id} doc={editor} onSave={refreshDocs} onClose={()=>setEditor(null)}/>}
    {evidence&&<div className="modal-overlay"><section className="evidence-modal" role="dialog" aria-modal="true" aria-label="Source evidence"><div className="section-heading"><h2>{evidence.location}</h2><button className="icon-button" aria-label="Close evidence" onClick={()=>setEvidence(null)}><X/></button></div><pre>{evidence.text}</pre></section></div>}
  </main>
}
