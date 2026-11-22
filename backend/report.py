"""Readable, self-contained review export, with escaped source text."""
import html
import json


def report(job):
    esc = lambda value: html.escape(str(value))
    result = job['result']
    body = ['<!doctype html><meta charset="utf-8"><title>RA recommendation report</title>',
        '<style>body{font:16px system-ui;max-width:1050px;margin:40px auto;padding:20px;color:#28213e}article{border:1px solid #ddd;padding:16px;margin:16px 0;border-radius:10px}table{border-collapse:collapse;width:100%}th,td{padding:12px;text-align:left;border-bottom:1px solid #ddd}pre{white-space:pre-wrap;overflow-wrap:anywhere}h1,h2{color:#60429b}</style>',
        '<h1>Risk assessment recommendations</h1><p>Draft evidence-based feedback for human review. Percentages describe checklist outcomes, not certification of operational compliance.</p>',
        f"<p>Review: {esc(job['id'])} · Status: {esc(job['status'])}</p>",
        f"<p>{esc(result.get('summary', ''))}</p>"]
    for category, card in result.get('scorecards', {}).items():
        body.append('<h2>' + ('Document quality' if category == 'quality' else '21 CFR Part 11 alignment') + '</h2>')
        body.append('<p>' + ('Provisional' if card['provisional'] else 'Draft assessment') + f" · {card['denominator']} evaluated applicable criteria</p><table>")
        for status, value in card['percentages'].items():
            body.append(f"<tr><th>{esc(status.replace('_',' '))}</th><td>{'—' if value is None else str(value)+'%'}</td></tr>")
        body.append(f"</table><p>Not applicable: {card['counts']['not_applicable']} · Unevaluated: {card['counts']['unevaluated']}</p>")
    for label in ('limitations','notes'):
        body.append(f'<h2>{label.title()}</h2><ul>')
        body.extend(f'<li>{esc(n)}</li>' for n in result.get(label, []))
        body.append('</ul>')
    body.append('<h2>Checklist outcomes</h2>')
    for criterion in result.get('criteria', []):
        body.append(f"<article><h3>{esc(criterion['title'])}</h3><b>{esc(criterion['status'])}</b><p>{esc(criterion['rationale'])}</p><p>{esc(criterion['action'])}</p><p>Sources: {esc(', '.join(criterion['evidence_ids']))}</p></article>")
    body.append('<h2>Recommendations</h2>')
    for finding in result.get('findings', []):
        body.append(f"<article><h3>{esc(finding['priority'])}: {esc(finding['rationale'])}</h3><p>{esc(finding['action'])}</p><p>Sources: {esc(', '.join(finding['evidence_ids']))}</p>")
        for decision in job.get('decisions', []):
            if decision['finding_id'] == finding['id']:
                body.append(f"<p>Reviewer {esc(decision['disposition'])}: {esc(decision['reason'])}</p>")
        body.append('</article>')
    body.append('<h2>Source evidence</h2>')
    for source in result.get('sources', []):
        body.append(f"<details><summary>{esc(source['id'])} · {esc(source.get('kind', 'document'))} · {esc(source.get('document_name', ''))} · {esc(source['location'])}</summary><pre>{esc(source['text'])}</pre></details>")
    body.append('<details><summary>Complete provenance and snapshot</summary><pre>' + esc(json.dumps(job,default=str,indent=2)) + '</pre></details>')
    return ''.join(body)
