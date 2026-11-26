"""Builds two small .docx fixtures by hand so tests need no Word."""
import zipfile, os
NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
def run(t, font="Calibri", sz=22, extra=""):
    return f'<w:r><w:rPr><w:rFonts w:ascii="{font}" w:hAnsi="{font}"/><w:sz w:val="{sz}"/>{extra}</w:rPr><w:t xml:space="preserve">{t}</w:t></w:r>'
def para(runs, style=None):
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    return f"<w:p>{ppr}{runs}</w:p>"
def styles(font, sz, ids):
    s = "".join(f'<w:style w:type="paragraph" w:styleId="{i}"><w:name w:val="{i}"/></w:style>' for i in ids)
    return f'<w:styles {NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="{font}"/><w:sz w:val="{sz}"/></w:rPr></w:rPrDefault></w:docDefaults>{s}</w:styles>'
def build(path, body, sect, sty, pages=None, comments=0):
    doc = f'<?xml version="1.0"?><w:document {NS}><w:body>{body}{sect}</w:body></w:document>'
    ct = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>'
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", ct)
        z.writestr("word/document.xml", doc)
        z.writestr("word/styles.xml", sty)
        if pages: z.writestr("docProps/app.xml", f"<Properties><Pages>{pages}</Pages></Properties>")
        if comments: z.writestr("word/comments.xml", f"<w:comments {NS}>" + "".join(f'<w:comment w:id="{i}"/>' for i in range(comments)) + "</w:comments>")

here = os.path.join(os.path.dirname(__file__), "fixtures"); os.makedirs(here, exist_ok=True)
dash = "\u2014"
intro = "Fake news spreads quickly. See Fig. 1 and Table II. Prior work [2], [5] is limited, and many studies skip careful evaluation of how models behave on unseen sources."
paper = "".join([
    para(run("Fast Fake News Detection"), "Title"),
    para(run(f"Abstract{dash}We propose a model that reaches 98.55% F1 with 15 ms inference [1]. It beats baselines by 7.6 points.")),
    para(run("Keywords: fake news, transformers")),
    para(run("I. INTRODUCTION"), "Heading1"),
    para(run(intro, "Arial", 22)),
    para(run("II. METHOD"), "Heading1"),
    para(run("We use a dual encoder with knowledge graph cross attention over every input document pair.", "Cambria", 22)),
    para('<w:r><w:drawing></w:drawing></w:r>'), para('<w:r><w:drawing></w:drawing></w:r>'), para('<w:r><w:drawing></w:drawing></w:r>'),
    para(run("Fig. 1. Architecture of the model."), "Caption"),
    para(run("Fig. 2. Training curve."), "Caption"),
    para(run("III. EXPERIMENTS"), "Heading1"),
    para(run("We train on the dataset with an 80/10/10 split and compare against baselines. Learning rate 2e-5, batch size 16, 5 epochs. Results are in Table III. This paragraph uses a custom style and is long enough to carry weight in the font count."), "MyBody"),
    para(run("TABLE II. Results"), "Caption"),
    para(run("Check this number later", extra='<w:highlight w:val="yellow"/>')),
    '<w:p><w:ins w:id="1" w:author="A">' + run("new text") + '</w:ins><w:del w:id="2" w:author="A"><w:r><w:delText>old text</w:delText></w:r></w:del></w:p>',
    para(run("IV. CONCLUSION"), "Heading1"),
    para(run("We presented a model and its evaluation across several sources, with room for future work.")),
    para(run("REFERENCES"), "Heading1"),
    para(run("[1] Li et al. 2020.")), para(run("[2] Wang et al. 2019.")), para(run("[3] Chen et al. 2018.")),
])
build(os.path.join(here, "paper.docx"), paper,
      '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/><w:cols w:num="1"/></w:sectPr>',
      styles("Calibri", 22, ["Title", "Heading1", "Caption", "MyBody"]), pages=5, comments=1)
tpl = para(run("Title of the paper", "Times New Roman", 20), "Title") + para(run("Body text in the template.", "Times New Roman", 20))
build(os.path.join(here, "template.docx"), tpl,
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="907" w:bottom="1080" w:left="907"/><w:cols w:num="2"/></w:sectPr>',
      styles("Times New Roman", 20, ["Title", "Heading1", "Caption"]))
print("fixtures ok")
