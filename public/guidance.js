// Prewritten guidance for every rule: why the issue matters and how to fix it.
// Fixed text, so it needs no network and no keys, and it is the same every time.

const G = [
  // Consistency
  [/^Abstract number not found in the paper/, "Reviewers compare the abstract with the results first. A number that appears only in the abstract looks like a typo or a result from an older draft.", "Copy the final value from your results section or table, or remove the number from the abstract."],
  [/^Abstract number matches only after rounding/, "The abstract and the body show the same result at different precision. Careful readers notice, and it can look like two different results.", "Round the value the same way in both places, usually to the precision used in your tables."],
  [/^Abstract number not in any table/, "Headline numbers are easiest to trust when readers can find them in a table with the full comparison.", "Add the value to the main results table, or point to where it comes from in the text."],
  [/^Reference to an undefined label/, "An undefined label prints as ?? in the compiled PDF, which reviewers read as an unfinished paper.", "Add the matching \\label to the figure, table or section, or correct the spelling in \\ref."],
  [/^Reference to a missing figure or table/, "The text points readers to a figure or table that does not exist, so they cannot check the claim.", "Fix the number in the text, or add the missing figure or table."],
  [/^Label is never referenced/, "Figures and tables that the text never mentions look unfinished, and many venues require every float to be cited.", "Mention it in the text where it supports a point, for example \"as shown in Fig. 2\", or remove it."],
  [/^Caption is never referenced in the text/, "Every figure and table should support a point in the text. One that is never mentioned is easy to miss and can look like leftover material.", "Refer to it in the paragraph it supports, or remove it."],
  [/^Figure or table without a caption/, "Without a caption the figure or table has no number, so the text cannot refer to it and readers cannot tell what it shows.", "Add a caption that says what is shown and what the reader should notice."],
  [/^More (images|tables) than (figure|table) captions/, "Some figures or tables may be missing captions, which makes them hard to refer to.", "Check that every real figure and table has a numbered caption. Layout tables used only for spacing can be ignored."],
  [/^Citation key not in bibliography/, "A citation with no matching entry prints as [?] or a bold key in the PDF, which looks careless.", "Add the entry to your .bib file, or fix the key so it matches an existing entry."],
  [/^Citation without a reference entry/, "Readers cannot find the source behind this citation number.", "Add the missing entry to the reference list, or renumber the citation."],
  [/^(Bibliography|Reference) entry never cited/, "Most venues ask that every listed reference is cited in the text. Uncited entries can look like padding.", "Cite it where it is relevant, or remove it from the reference list."],
  [/^Bibliography file not included/, "Citation keys can only be checked when the .bib file is available.", "Attach your .bib file in the settings. It is read on your device."],
  [/^No bibliography found|^No reference list found/, "Citations without a reference list cannot be followed by readers.", "Add the reference list, or check that the bibliography command is present."],
  [/^Author-year citations not cross-checked/, "Author and year citations cannot be matched entry by entry from the text alone.", "Attach your .bib file, or check these citations by hand before you submit."],

  // Format
  [/^Abstract is over the word limit/, "Submission systems often reject abstracts that are too long, and editors notice.", "Cut background sentences first, then merge results into one sentence with the key numbers."],
  [/^Citation inside the abstract/, "The abstract is often read on its own, where a citation number means nothing.", "Name the work in words if it matters, or move the citation to the introduction."],
  [/^No abstract found/, "Every venue requires an abstract, and the checker uses it to compare numbers.", "Add an abstract at the top. In LaTeX use the abstract environment."],
  [/^No keywords found/, "Many templates ask for keywords or index terms, which help with reviewer assignment.", "Add four to six keywords if your venue's template has a place for them."],
  [/^Over the page limit/, "Papers over the limit can be desk rejected without review.", "Tighten figures and tables first, then shorten related work. Do not shrink fonts or margins."],
  [/^Page count not available/, "The page limit can only be checked from a file with real pages.", "Upload the compiled PDF to check the page limit."],
  [/^(Missing section|Required section missing)/, "Reviewers and venue checklists expect this section. Leaving it out can cost points or lead to a desk rejection.", "Add the section, even if it is short."],
  [/^Sections out of order/, "Readers expect the usual order, and some venues require it.", "Move the section so the paper follows the expected structure."],
  [/^Layout override/, "Changing the template's margins or spacing is one of the most common reasons for desk rejection.", "Remove the override and make space by editing the text instead."],
  [/^Document class does not match the venue/, "The class sets the page layout the venue expects. A different class changes fonts, margins and columns.", "Start from the venue's official template and move your content into it."],
  [/^Venue style package not loaded/, "The venue's style package sets the official layout, header and line numbers.", "Load the venue's style package as shown in its template."],
  [/^Bibliography style does not match the venue/, "Reference formatting is part of the venue's rules and reviewers notice when it is off.", "Use the bibliography style that ships with the venue's template."],
  [/^Citation style does not match the venue|^Mixed citation styles/, "Mixing citation styles, or using one the venue does not use, looks inconsistent.", "Use one citation style throughout, the one your venue asks for."],
  [/^Several fonts in the body/, "Mixed body fonts often come from pasted text and look unpolished.", "Select the body text and apply the Normal style, or clear formatting on pasted paragraphs."],
  [/^Template: comparison skipped/, "Layout rules can only be compared when the paper and the template are the same kind of file.", "Compare a Word paper with a Word template, or LaTeX with LaTeX."],
  [/^Template: (page size|margins|column count) differ/, "Page size, margins and columns are fixed by the venue. A mismatch is visible at a glance.", "Copy the page setup from the template, or move your content into the template file."],
  [/^Template: (body font|body size) differ/, "The venue's body font and size are part of its rules and affect the page count.", "Apply the template's body style to your text instead of formatting it by hand."],
  [/^Template: (document class|class options) differ/, "The class and its options set the layout the venue expects.", "Use the same \\documentclass line as the template."],
  [/^Template: packages not loaded/, "The template may rely on these packages for its layout or commands.", "Check whether you need them. Load the ones that set layout or required commands."],
  [/^Template: (sections not found|section order differs)/, "The template shows the sections the venue expects, in its order.", "Add the missing sections and follow the template's order."],
  [/^Template: styles not in the template/, "Custom styles can carry fonts and spacing the venue does not allow.", "Switch those paragraphs to the template's own styles."],

  // Clean-up
  [/^Placeholder left/, "A TODO or ?? in a submitted paper tells reviewers the draft is not finished.", "Finish or delete the note, then search the file for TODO, FIXME and ?? once more."],
  [/^Highlighted text left/, "Highlights are working notes. In a submission they look unfinished.", "Resolve the highlighted text and remove the highlight."],
  [/^Unresolved tracked changes/, "Tracked changes can show deleted text and author names to reviewers, which can break anonymity.", "Accept or reject all changes, then turn tracking off."],
  [/^Comments left in the document/, "Comments can reveal author names and internal discussion, and may break anonymous review.", "Resolve and delete every comment before you export the file."],

  // Experiment results
  [/^Result differs from your outputs/, "The number in the paper is close to one your experiments produced but does not match it, even after rounding. It may come from an older run or be a typo.", "Copy the value from your final run, or rerun and update the paper. Make sure the notebook or file you attached is the final one."],
  [/^Result not found in your outputs/, "This number does not appear in the files you attached. That is expected for values quoted from other papers.", "If it is your own result, attach the notebook or file that produced it, or check the value."],
  [/^Notebook has no saved outputs/, "Without saved outputs there is nothing to compare your results with.", "Run the notebook and save it with outputs, or attach the results files instead."],
  [/^Notebook has error outputs/, "A cell that failed means later results may come from an older run.", "Fix the error, restart the kernel and run all cells from the top."],
  [/^Notebook cells ran out of order/, "Results from cells run out of order may not be reproducible by others.", "Restart the kernel, run all cells from top to bottom and save."],
  [/^Notebook has cells that never ran/, "Cells that never ran may hold steps your reported results depend on.", "Run all cells from the top, or delete cells you do not need."],
  [/^Results file has no numbers/, "This file has nothing to compare with the paper.", "Attach the file that holds your final metrics."],
  [/^Images in your results are not checked/, "Plots cannot be compared with fixed rules.", "Check that each figure in the paper matches the latest plot from your final run."],
];

const REPORTING = {
  "Dataset description": ["Reviewers need to know what the model was trained and tested on to judge the results.", "Name the dataset and give its source, size and class balance."],
  "Train, validation and test split": ["Without a clear split, readers cannot tell whether test data leaked into training or tuning.", "State how the data was split, the sizes, and whether the split is the standard one."],
  "Random seeds or repeated runs": ["A single run can be lucky. Reviewers ask how stable the result is.", "Report results over several seeds, with the mean and standard deviation."],
  "Baselines": ["A result means little without something to compare it with.", "Compare against at least one strong, recent baseline under the same setup."],
  "Hyperparameters": ["Others cannot reproduce your results without the training settings.", "List learning rate, batch size, epochs and optimizer, in the text or the appendix."],
  "Significance testing": ["Small gains may be noise. Reviewers increasingly ask for evidence that a gain is real.", "Add a significance test, confidence intervals or the variance across runs."],
  "Ablation study": ["Reviewers want to know which part of the method is responsible for the gain.", "Remove one component at a time and report how the results change."],
  "Limitations": ["Many venues require a limitations section, and naming limits yourself builds trust.", "Add a short paragraph on where the method may fail and what was not tested."],
  "Leakage safeguards": ["Overlap between training and test data inflates results, and reviewers look for it.", "Explain how duplicates or near duplicates across splits were ruled out."],
  "Code and data availability": ["Reproducibility checklists ask where the code and data can be found.", "Link the code and data, or say why they cannot be shared."],
};

// Returns { why, fix } for a finding title, or null.
export function guidanceFor(title) {
  const t = String(title || "").replace(/^\d+ more: /, "");
  const r = t.match(/^Reporting gap: (.+)$/);
  if (r) { const g = REPORTING[r[1]]; return g ? { why: g[0], fix: g[1] } : null; }
  for (const [re, why, fix] of G) if (re.test(t)) return { why, fix };
  return null;
}
