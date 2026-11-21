from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as E
for name in ['export.xlsx','processed.xlsx','report.docx']:
 p=Path('qa')/name
 with ZipFile(p) as z:
  assert z.testzip() is None
  for n in z.namelist():
   if n.endswith('.xml') or n.endswith('.rels'):E.fromstring(z.read(n))
  assert '[Content_Types].xml' in z.namelist()
print('PASS: generated Office ZIP CRC and XML well-formedness; this does not replace desktop Excel/Word validation.')
