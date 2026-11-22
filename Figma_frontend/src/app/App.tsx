import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Upload, FileText, ArrowRight, AlertTriangle, MessageSquare, Download, X, Plus } from 'lucide-react';
import { api, base, type Document, type Evidence, type Review, type Finding } from './api';
import '../styles/pilot.css';
import { ReviewScorecards, ProjectContext, ExampleEditor } from './ReviewScorecards';

function DocumentPreview({ doc, onClose }: {doc:Document; onClose:()=>void}) {
  return <div className="modal-overlay"><section className="editor" role="dialog" aria-modal="true" aria-label="Document text">
    <div className="section-heading"><div><span className="eyebrow">EXTRACTED DOCUMENT TEXT</span><h2>{doc.name}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}><X/></button></div>
    <p>The model reads this text automatically. These {doc.extraction.chunks.length} source locations belong to this document and let you trace feedback to the original text.</p>
    {doc.extraction.warnings.map(w=><p className="notice" key={w}>{w}</p>)}
    <div className="source-list">{doc.extraction.chunks.map(c=><article key={c.id}><b>{c.location}</b><pre>{c.text}</pre></article>)}</div>
  </section></div>
}

function FindingCard({finding,review,onDecision,onEvidence}: {finding:Finding; review:Review; onDecision:()=>void; onEvidence:(id:string)=>void}) {
  const [reason,setReason]=useState(''); const [disposition,setDisposition]=useState('accepted'); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const history=review.decisions?.filter(d=>d.finding_id===finding.id)??[];
  async function save() {
    setBusy(true);setError('');
    try {await api(`/reviews/${review.id}/findings/${finding.id}/decisions`,{method:'POST',body:JSON.stringify({reason,disposition})});setReason('');onDecision()}catch(e){setError((e as Error).message)}finally{setBusy(false)}
  }
  return <article className="finding"><div className="section-heading"><span className={`badge ${finding.priority.toLowerCase()}`}>{finding.priority} priority</span><span className="muted">{finding.risk_id || 'Review feedback'} · {finding.category}</span></div><h3>{finding.rationale}</h3><p>{finding.action}</p><div className="evidence-links">{finding.evidence_ids.map((id,i)=><button key={id} onClick={()=>onEvidence(id)}><FileText size={14}/> Source {i+1}</button>)}{!finding.evidence_ids.length&&<span className="muted">Supporting evidence missing</span>}</div><p className="muted">{finding.kind.replaceAll('_',' ')} · Rule: {finding.rule}</p>
    {history.map((d,i)=><p className="decision" key={i}><b>{d.disposition}</b>: {d.reason}</p>)}
    <div className="decision-form"><select aria-label="Disposition" value={disposition} onChange={e=>setDisposition(e.target.value)}><option value="accepted">Accept finding</option><option value="dismissed">Dismiss finding</option><option value="annotated">Add annotation</option></select><input aria-label="Decision reason" placeholder="Reason for this decision" value={reason} onChange={e=>setReason(e.target.value)}/><button className="secondary" disabled={busy||!reason.trim()||['queued','running'].includes(review.status)} onClick={save}>Save</button></div>{error&&<p role="alert" className="error">{error}</p>}
  </article>
}

export default function App() {
  const [projects,setProjects]=useState<{id:string;name:string;context?:Record<string,string>}[]>([]);const [project,setProject]=useState(''); const [name,setName]=useState('');
  const [docs,setDocs]=useState<Document[]>([]);const [role,setRole]=useState('assessment');const [editor,setEditor]=useState<Document|null>(null);
  const [review,setReview]=useState<Review|null>(null);const [history,setHistory]=useState<Review[]>([]);const [evidence,setEvidence]=useState<Evidence|null>(null);
  const [capable,setCapable]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState(''); const [question,setQuestion]=useState(''); const [chatBusy,setChatBusy]=useState(false);
  const [messages,setMessages]=useState<{question:string;answer:string;evidence:Evidence[]}[]>([]);const uploadRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{api('/health').then(h=>{setCapable(h.capabilities?.includes('recommendations-v1')===true)}).catch(()=>{})},[]);
  useEffect(()=>{api('/projects').then(setProjects).catch(e=>setError('Backend unavailable. Start the local services. '+e.message))},[]);
  useEffect(()=>{setDocs([]);setReview(null);setHistory([]);setMessages([]);setError('');setEvidence(null);setEditor(null);if(!project)return; let active=true;
    Promise.all([api(`/projects/${project}/documents`),api(`/projects/${project}/reviews`)]).then(([d,r])=>{if(active){setDocs(d);setHistory(r)}}).catch(e=>{if(active)setError(e.message)}); return()=>{active=false};
  },[project]);
  useEffect(()=>{if(!review||!['queued','running'].includes(review.status))return;let active=true; const timer=setInterval(()=>api(`/reviews/${review.id}`).then(r=>{if(active)setReview(r)}).catch(e=>{if(active)setError(e.message)}),2000);return()=>{active=false;clearInterval(timer)}},[review?.id,review?.status]);
  const latest=docs.filter(d=>!docs.some(other=>other.name===d.name&&other.version>d.version));
  async function refreshDocs(){setDocs(await api(`/projects/${project}/documents`))}
  async function create(){setBusy(true);setError('');try{const p=await api('/projects',{method:'POST',body:JSON.stringify({name})});setProjects([p,...projects]);setProject(p.id);setName('')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function upload(files:FileList|null){if(!files)return;setBusy(true);setError('');try{for(const file of Array.from(files)){const body=new FormData();body.append('file',file);body.append('role',role);await api(`/projects/${project}/documents`,{method:'POST',body})}await refreshDocs()}catch(e){setError((e as Error).message);await refreshDocs().catch(()=>{})}finally{setBusy(false);if(uploadRef.current)uploadRef.current.value=''}}
  async function start(){setBusy(true);setError('');try{const r=await api(`/projects/${project}/reviews`,{method:'POST'});setReview(r);setMessages([]);setHistory([r,...history])}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  async function loadReview(id:string){setError('');try{setReview(await api(`/reviews/${id}`));setMessages([])}catch(e){setError((e as Error).message)}}
  function showEvidence(id:string){const found=[...(review?.result?.sources||[]),...docs.flatMap(d=>d.extraction.chunks)].find(c=>c.id===id);if(found)setEvidence(found);else setError('Source evidence could not be found.')}
  async function chat(){if(!review)return;setChatBusy(true);try{const response=await api(`/projects/${project}/chat`,{method:'POST',body:JSON.stringify({question,job_id:review.id})});setMessages([...messages,{question,...response}]);setQuestion('')}catch(e){setError((e as Error).message)}finally{setChatBusy(false)}}
  return <main className="pilot"><header className="topbar"><div className="brand"><span className="brand-icon"><ShieldCheck/></span><div><b>Validation Assistant</b><small>Life sciences · Risk assessment review</small></div></div><span className="badge">LOCAL PILOT</span></header>
    <div className="hero"><span className="eyebrow">EVIDENCE FIRST. HUMAN REVIEW.</span><h1>Confidence starts with<br/><em>a closer look.</em></h1><p>Upload your assessment. Get feedback on risks, gaps, and opportunities to improve it.</p></div>
    <div className="workspace"><div className="notice"><AlertTriangle size={18}/><span>The model reads your document and returns suggested improvements with source citations. Requirements and SOPs can add context. No manual risk rows are needed. Feedback is a draft for your review.</span></div>
      {error&&<div role="alert" className="error">{error}</div>}
      <section className="panel">{!capable&&<p className="notice">The backend needs the recommendation update. Restart or rebuild the API and worker before starting a new review.</p>}<div className="section-heading"><h2>Review workspace</h2><span className="step">01 / PROJECT</span></div><div className="project-form"><select aria-label="Select project" value={project} disabled={busy||chatBusy} onChange={e=>setProject(e.target.value)}><option value="">Select a project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><span>or</span><input aria-label="Project name" placeholder="New project name" value={name} onChange={e=>setName(e.target.value)}/><button className="primary" disabled={busy||!name.trim()} onClick={create}>Create project <Plus size={16}/></button></div></section>
      {project&&<><section className="panel"><ProjectContext key={project} project={project} initial={projects.find(p=>p.id===project)?.context} onSaved={context=>setProjects(projects.map(p=>p.id===project?{...p,context}:p))}/></section><section className="panel"><div className="section-heading"><div><span className="step">02 / DOCUMENT PACKAGE</span><h2>Build the evidence</h2></div><select aria-label="Document role" value={role} onChange={e=>setRole(e.target.value)}><option value="assessment">Risk assessment</option><option value="requirements">Requirements</option><option value="methodology">Methodology / SOP</option><option value="reference">Reference</option><option value="example_accepted">Accepted example</option><option value="example_rejected">Rejected example</option></select></div>
        <label className={`upload-zone ${busy?'disabled':''}`}><Upload size={30}/><b>{busy?'Working…':'Choose documents to upload'}</b><span>PDF, DOCX, XLSX or TXT · Up to 20 MB each</span><input ref={uploadRef} type="file" accept=".pdf,.docx,.xlsx,.txt" multiple disabled={busy} onChange={e=>upload(e.target.files)}/></label>
        <div className="documents">{latest.map(d=><div className="document" key={d.id}><FileText/><div className="document-name"><b>{d.name}</b><small>{d.role} · Version {d.version} · {d.extraction.chunks.length} source locations</small></div><span className={`badge ${d.extraction.chunks.length?'confirmed':''}`}>{d.extraction.chunks.length?'Ready to review':'No readable text'}</span><button className="secondary" onClick={()=>setEditor(d)}>View text</button><a href={`${base}/documents/${d.id}/original`} aria-label={`Download ${d.name}`}><Download size={18}/></a></div>)}</div>
        <details><summary>Optional example library ({latest.filter(d=>d.role.startsWith('example_')).length})</summary><p>Upload accepted or rejected examples using the document role selector. No default examples are included.</p>{latest.filter(d=>d.role.startsWith('example_')).map(d=><ExampleEditor key={d.id} doc={d} onSaved={refreshDocs}/>)}</details><div className="review-start"><p className="muted">Upload an assessment and start review. Supporting requirements and SOPs are optional. Longer documents take more time on a local model.</p><button className="primary" disabled={!capable||busy||!latest.some(d=>d.role==='assessment')||!latest.some(d=>d.role==='assessment'&&d.extraction.chunks.some(c=>c.text.trim()))||!!review&&['queued','running'].includes(review.status)} onClick={start}>Review document <ArrowRight size={17}/></button></div>
      </section>
      <section className="panel"><div className="section-heading"><div><span className="step">03 / REVIEW</span><h2>Findings & evidence</h2></div><select aria-label="Review history" value={review?.id??''} onChange={e=>loadReview(e.target.value)}><option value="" disabled>Previous reviews</option>{history.map((r,i)=><option key={r.id} value={r.id}>Review {history.length-i} · {r.id.slice(0,8)}</option>)}</select></div>
        {!review&&<div className="empty"><ShieldCheck size={36}/><p>Your review will appear here.</p><small>Upload an assessment to get started.</small></div>}
        {review&&<><div aria-live="polite" className="review-status"><span className="badge">{review.status}</span><b>{review.stage}</b>{['queued','running'].includes(review.status)&&<span className="spinner"/>}</div>{review.error&&<p className="error">{review.error}</p>}
          {review.result&&<><div className="stats"><div><strong>{review.result.sections_reviewed ?? review.result.rows_reviewed}{review.result.sections_total!==undefined?` / ${review.result.sections_total}`:''}</strong><span>{review.result.sections_total!==undefined?'Source locations read':'Legacy risk rows checked'}</span></div><div><strong>{review.result.findings.length}</strong><span>Draft findings</span></div><div><strong>{review.result.semantic_reviews.length}</strong><span>Review passes</span></div></div>
          {review.result.scorecards&&<ReviewScorecards cards={review.result.scorecards} criteria={review.result.criteria||[]} onEvidence={showEvidence}/>}
          {review.result.limitations.length>0&&<div className="notice"><div><b>Review limitations</b><ul>{review.result.limitations.map((l,i)=><li key={i}>{l}</li>)}</ul></div></div>}
          {review.result.notes?.map((note,i)=><p className="muted" key={i}>{note}</p>)}
          {review.result.summary&&<p className="review-summary">{review.result.summary}</p>}
          <div className="export-links"><a href={`${base}/reviews/${review.id}/export?format=html`}><Download size={16}/> HTML report</a><a href={`${base}/reviews/${review.id}/export?format=json`}><Download size={16}/> JSON report</a></div>
          {review.result.findings.map(f=><FindingCard key={review.id+f.id} finding={f} review={review} onDecision={()=>loadReview(review.id)} onEvidence={showEvidence}/>)}
          {!review.result.findings.length&&<p>{['queued','running'].includes(review.status)?'Reading your document. Feedback appears as each pass finishes.':'No findings returned. Review the coverage and limitations before drawing conclusions.'}</p>}
          <details><summary>Semantic review rationale</summary>{review.result.semantic_reviews.map((r,i)=><p key={i}><b>{r.stage ?? r.risk_id}:</b> {r.assessment}</p>)}</details>
          <div className="chat"><h3><MessageSquare size={18}/> Ask about this review’s documents</h3><p className="muted">Answers use evidence from this review’s document versions.</p>{messages.map((m,i)=><article key={i}><b>{m.question}</b><p>{m.answer}</p>{m.evidence.map(e=><button key={e.id} onClick={()=>setEvidence(e)}>{e.location}</button>)}</article>)}<div className="chat-form"><input aria-label="Question" placeholder="What evidence supports the mitigation?" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!chatBusy&&question.trim())chat()}}/><button className="primary" disabled={chatBusy||!question.trim()} onClick={chat}>{chatBusy?'Thinking…':'Ask'}</button></div></div>
          </>}
        </>}
      </section></>}
    </div><footer>Validation Assistant · Local testing workspace · Human judgment remains essential</footer>
    {editor&&<DocumentPreview key={editor.id} doc={editor} onClose={()=>setEditor(null)}/>}
    {evidence&&<div className="modal-overlay"><section className="evidence-modal" role="dialog" aria-modal="true" aria-label="Source evidence"><div className="section-heading"><h2>{evidence.location}</h2><button className="icon-button" aria-label="Close evidence" onClick={()=>setEvidence(null)}><X/></button></div><p className="muted">{evidence.kind} · {evidence.document_name}</p>{evidence.url&&<a href={evidence.url} target="_blank" rel="noreferrer">Official source</a>}<pre>{evidence.text}</pre></section></div>}
  </main>
}
