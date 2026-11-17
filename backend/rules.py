"""Pure, reproducible checks independent of inference and storage."""
from collections import Counter
from .profile import PROFILE, classify

FIELDS = ['risk_id', 'requirement_id', 'failure_mode', 'impact', 'severity', 'probability',
          'detectability', 'risk_score', 'risk_class', 'mitigation']

def review(rows, requirements, profile=PROFILE):
    findings = []
    def add(code, row, note, priority='Medium', action='Correct the assessment and re-review.'):
        findings.append({'code': code, 'category': 'Deterministic', 'priority': priority,
                         'rationale': note, 'action': action, 'evidence_ids': row.get('evidence_ids', []),
                         'risk_id': row.get('risk_id'), 'rule': profile['id'], 'kind': 'inconsistency'})
    counts = Counter(str(r.get('risk_id')) for r in rows if r.get('risk_id'))
    for row in rows:
        for field in FIELDS:
            if row.get(field) is None or str(row[field]).strip() == '':
                add('missing_field', row, f'Missing {field}.')
        if counts[str(row.get('risk_id'))] > 1:
            add('duplicate_id', row, f"Duplicate risk identifier {row['risk_id']}.")
        if requirements and row.get('requirement_id') not in requirements:
            add('broken_requirement', row, f"Requirement {row.get('requirement_id')} was not found in the requirements package.")
        ratings = []
        for field in ['severity', 'probability', 'detectability']:
            value = row.get(field)
            if isinstance(value, bool) or not str(value).isascii() or not str(value).isdigit() or not profile['rating_min'] <= int(value) <= profile['rating_max']:
                add('invalid_rating', row, f'{field} must be an integer from 1 to 5; received {value!r}.')
            else:
                ratings.append(int(value))
        if len(ratings) == 3:
            score = ratings[0] * ratings[1] * ratings[2]
            if str(row.get('risk_score')) != str(score):
                add('incorrect_score', row, f'Expected score {score}; recorded {row.get("risk_score")}.', 'High')
            expected = classify(score, profile)
            if str(row.get('risk_class', '')).casefold() != expected.casefold():
                add('incorrect_class', row, f'Expected {expected} at score {score}; recorded {row.get("risk_class")}.', 'High')
    mapped = {r.get('requirement_id') for r in rows}
    for req, evidence in requirements.items():
        if req not in mapped:
            add('uncovered_requirement', {'requirement_id': req, 'evidence_ids': evidence},
                f'{req} has no linked risk row. Confirm applicability or add an assessment.')
    if not requirements:
        findings.append({'code': 'missing_requirements', 'category': 'Coverage', 'priority': 'High',
                         'kind': 'missing_evidence', 'rationale': 'No confirmed requirements are available; coverage cannot be assessed.',
                         'action': 'Upload and confirm supporting requirements.', 'evidence_ids': [], 'rule': profile['id']})
    return findings
