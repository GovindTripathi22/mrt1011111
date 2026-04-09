import zipfile
import xml.etree.ElementTree as ET
import os

def get_docx_text(path):
    """
    Extracts text from a .docx file without external dependencies.
    """
    WORD_NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    TEXT = WORD_NAMESPACE + 't'
    PARA = WORD_NAMESPACE + 'p'
    
    with zipfile.ZipFile(path) as docx:
        xml_content = docx.read('word/document.xml')
    
    tree = ET.fromstring(xml_content)
    paragraphs = []
    for paragraph in tree.iter(PARA):
        texts = [node.text
                 for node in paragraph.iter(TEXT)
                 if node.text]
        if texts:
            paragraphs.append(''.join(texts))

    return '\n'.join(paragraphs)

if __name__ == '__main__':
    docx_path = r"C:\Users\swara\Downloads\Refined Category Structure with products and product card instructions - with links (1).docx"
    if os.path.exists(docx_path):
        text = get_docx_text(docx_path)
        # Use utf-8 for output
        import sys
        sys.stdout.reconfigure(encoding='utf-8')
        print(text)
    else:
        print(f"File not found: {docx_path}")
