"""Location-preserving extraction; table interpretation is confirmed by the reviewer."""
import io
import re
import uuid
from .rules import FIELDS

ALIASES = {'risk id': 'risk_id', 'requirement id': 'requirement_id', 'failure mode': 'failure_mode',
           'risk score': 'risk_score', 'risk class': 'risk_class', 'rpn': 'risk_score',
           'severity': 'severity', 'probability': 'probability', 'detectability': 'detectability',
           'impact': 'impact', 'mitigation': 'mitigation'}

def extract(name, data):
    chunks, tables, warnings = [], [], []
    def add(text, location):
        if not str(text).strip(): return None
        ident = str(uuid.uuid4())
        chunks.append({'id': ident, 'text': str(text), 'location': location})
        return ident
    suffix = name.rsplit('.', 1)[-1].lower()
    if suffix == 'txt':
        text = data.decode('utf-8-sig')
        for n, line in enumerate(text.splitlines(), 1):
            ident = add(line, f'Line {n}')
            if '|' in line:
                tables.append(([x.strip() for x in line.split('|')], ident))
    elif suffix == 'pdf':
        from pypdf import PdfReader
        doc = PdfReader(io.BytesIO(data))
        if doc.is_encrypted: raise ValueError('Encrypted PDFs are unsupported. Upload an unlocked copy.')
        for n, page in enumerate(doc.pages, 1):
            text = page.extract_text() or ''
            add(text, f'Page {n}')
            if len(text.strip()) < 20: warnings.append(f'Page {n}: insufficient text; OCR or manual transcription required.')
        warnings.append('PDF risk rows require manual mapping and confirmation; page text is preserved.')
    elif suffix == 'docx':
        from docx import Document
        doc = Document(io.BytesIO(data))
        for n, p in enumerate(doc.paragraphs, 1): add(p.text, f'Paragraph {n}')
        for n, table in enumerate(doc.tables, 1):
            tables.append(([], None))
            for r, row in enumerate(table.rows, 1):
                values = [c.text for c in row.cells]
                ident = add(' | '.join(values), f'Table {n}, row {r}')
                tables.append((values, ident))
    elif suffix == 'xlsx':
        from openpyxl import load_workbook
        from openpyxl.utils import get_column_letter
        book = load_workbook(io.BytesIO(data), data_only=False, read_only=True)
        for sheet in book:
            tables.append(([], None))
            for row in sheet.iter_rows():
                values = [str(c.value) if c.value is not None else '' for c in row]
                if not any(values): continue
                ident = add(' | '.join(values), f'{sheet.title}!A{row[0].row}:{get_column_letter(len(row))}{row[0].row}')
                tables.append((values, ident))
                if any(v.startswith('=') for v in values):
                    warnings.append(f'{sheet.title} row {row[0].row}: formula preserved; confirm the displayed numeric value manually.')
        book.close()
    else:
        raise ValueError('Supported formats: PDF, DOCX, XLSX, TXT. Convert legacy DOC before upload.')
    rows, header = [], None
    for values, ident in tables:
        if not values: header = None; continue
        normalized = [ALIASES.get(v.strip().lower().replace('_', ' '), '') for v in values]
        if 'risk_id' in normalized and 'requirement_id' in normalized:
            header = normalized; continue
        if header:
            row = {key: value for key, value in zip(header, values) if key in FIELDS}
            if any(row.values()): rows.append({**row, 'evidence_ids': [ident]})
    requirements = {}
    for chunk in chunks:
        for req in re.findall(r'\b(?:URS|FR|REQ)-[A-Za-z0-9]+\b', chunk['text']):
            requirements.setdefault(req, []).append(chunk['id'])
    if any(len(c['text']) > 6000 for c in chunks):
        warnings.append('Some source locations exceed the model context allowance; semantic review uses excerpts. Split the document into smaller sections for full coverage.')
    if not chunks: warnings.append('No readable content was extracted.')
    return {'chunks': chunks, 'rows': rows, 'requirements': requirements, 'warnings': list(dict.fromkeys(warnings))}
