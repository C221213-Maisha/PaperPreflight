"""Builds a small three page PDF fixture with reportlab, with known issues for the PDF tests."""
import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

here = os.path.join(os.path.dirname(__file__), "fixtures"); os.makedirs(here, exist_ok=True)
c = canvas.Canvas(os.path.join(here, "paper.pdf"), pagesize=letter)
W, H = letter
y = H - 72
def line(t, size=10, gap=13, font="Times-Roman"):
    global y
    c.setFont(font, size); c.drawString(72, y, t); y -= gap
def space(n=10):
    global y; y -= n
def page():
    global y
    c.setFont("Times-Roman", 9); c.drawString(W / 2, 40, str(c.getPageNumber())); c.showPage(); y = H - 72

line("Robust Claim Verification", 16, 24, "Times-Bold")
line("Abstract", 11, 15, "Times-Bold")
line("We present a verifier that reaches 91.4% accuracy and improves recall by 3.2 points over strong")
line("baselines on three benchmarks while staying fast enough for interactive use by editors.")
space()
line("1 Introduction", 12, 17, "Times-Bold")
line("Claim verification matters for editors [1]. Our system is shown in Fig. 1 and Fig. 2, and the main")
line("results are listed in Table 1. Prior systems [2] struggle with multi-hop evidence and cross-docu-")
line("ment reasoning, which motivates this work.")
space()
line("2 Method", 12, 17, "Times-Bold")
line("We train a retriever and a verifier jointly with a shared encoder and a contrastive objective.")
line("Figure 1: Overview of the pipeline.", 9, 12)
page()
line("3 Experiments", 12, 17, "Times-Bold")
line("We use the dataset with a fixed train, validation and test split and five random seeds. We com-")
line("pare against baselines [3], [4]. Accuracy is 91.38 on average with a standard deviation of 0.4.")
line("Table 1: Main results.", 9, 12)
line("Ours 91.38 Baseline 88.1", 10, 13)
space()
line("4 Conclusion", 12, 17, "Times-Bold")
line("We presented a verifier and showed gains in accuracy across the benchmarks we studied.")
page()
line("References", 12, 17, "Times-Bold")
line("[1] A. Author. Checking claims. 2020.")
line("[2] B. Author. Evidence retrieval at scale for long documents and noisy sources. 2021.")
line("[3] C. Author. A strong baseline. 2022.")
page()
c.save()
print("pdf fixture ok")
