import io
import unittest
from pathlib import Path
from backend.extract import extract

class ExtractTests(unittest.TestCase):
    def test_txt_and_locations(self):
        data=extract('assessment.txt',Path('samples/assessment.txt').read_bytes())
        self.assertEqual(len(data['rows']),3)
        self.assertEqual(data['rows'][0]['risk_id'],'RA-001')
        self.assertTrue(set(data['rows'][0]['evidence_ids']) <= {c['id'] for c in data['chunks']})
    def test_unsupported(self):
        with self.assertRaises(ValueError): extract('old.doc',b'old')
    def test_docx_table(self):
        from docx import Document
        doc=Document();doc.add_paragraph('URS-001 requirement')
        t=doc.add_table(rows=2,cols=3)
        for c,v in zip(t.rows[0].cells,['Risk ID','Requirement ID','Impact']):c.text=v
        for c,v in zip(t.rows[1].cells,['RA-1','URS-001','Quality']):c.text=v
        b=io.BytesIO();doc.save(b);data=extract('test.docx',b.getvalue())
        self.assertEqual(data['rows'][0]['impact'],'Quality')
        self.assertEqual(data['chunks'][-1]['location'],'Table 1, row 2')
    def test_xlsx_formula_preserved(self):
        from openpyxl import Workbook
        book=Workbook();s=book.active;s.title='Risks'
        s.append(['risk_id','requirement_id','risk_score']);s.append(['RA-1','URS-1','=2*3*4'])
        b=io.BytesIO();book.save(b);data=extract('test.xlsx',b.getvalue())
        self.assertEqual(data['rows'][0]['risk_score'],'=2*3*4')
        self.assertTrue(data['warnings'])
        self.assertEqual(data['chunks'][1]['location'],'Risks!A2:C2')
    def test_empty_pdf_requires_ocr(self):
        from pypdf import PdfWriter
        writer=PdfWriter();writer.add_blank_page(width=100,height=100)
        b=io.BytesIO();writer.write(b);data=extract('scan.pdf',b.getvalue())
        self.assertTrue(any('OCR' in w for w in data['warnings']))
        self.assertEqual(data['chunks'],[])
