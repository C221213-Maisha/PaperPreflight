# Builds fixtures/results.zip, shaped like a Kaggle "Save Version" output zip. Run with: python3 test/make_results_zip.py
import json, os, zipfile
here = os.path.dirname(os.path.abspath(__file__))
nb = {"nbformat": 4, "nbformat_minor": 5, "metadata": {}, "cells": [
    {"cell_type": "code", "execution_count": 1, "source": ["latency()"], "metadata": {},
     "outputs": [{"output_type": "stream", "name": "stdout", "text": ["latency 15.2 ms\n"]}]}]}
with zipfile.ZipFile(os.path.join(here, "fixtures", "results.zip"), "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("kaggle/working/metrics.csv", "model,f1,throughput\nours,0.98547,41.27\nbaseline,0.9101,38.0\n")
    z.writestr("kaggle/working/gain.txt", "gain over baseline: 7.41\n")
    z.writestr("kaggle/working/run.ipynb", json.dumps(nb))
    z.writestr("kaggle/working/broken.ipynb", "{not json")
    z.writestr("kaggle/working/plots/confusion.png", b"\x89PNG\r\n\x1a\n" + b"\0" * 64)
    z.writestr("kaggle/working/model.pt", b"\0" * 1024)
    z.writestr("__MACOSX/kaggle/._metrics.csv", b"\0" * 10)
    z.writestr("kaggle/working/", "")
print("wrote fixtures/results.zip")
