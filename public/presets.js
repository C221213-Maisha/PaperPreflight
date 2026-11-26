// Venue presets. Values are typical for recent calls for papers and are meant as a starting point.
// Every field can be overridden in the interface. Confirm limits against the current call before submitting.
//
// cite:      "numeric", "author-year" or "any"
// cls:       expected LaTeX document class (null if the venue ships a package instead)
// pkg:       regular expression for the venue package name, for venues that use \usepackage{...}
// bibstyle:  regular expression for acceptable \bibliographystyle values (null means any)
// required:  sections the venue requires, as [label, regex, severity]
// refsOut:   references do not count toward the page limit

export const PRESETS = [
  { id: "none", name: "No venue", pages: null, abstract: 250, cite: "any", cls: null, pkg: null, bibstyle: null, required: [], refsOut: true,
    note: "General checks only. Pick a venue to add its rules." },
  { id: "ieee", name: "IEEE conference", pages: null, abstract: 250, cite: "numeric", cls: "IEEEtran", pkg: null, bibstyle: /^IEEEtran/i, required: [], refsOut: false,
    note: "Page limits differ per conference, so set yours. IEEE asks for numbered citations." },
  { id: "acm", name: "ACM (acmart)", pages: null, abstract: 0, cite: "any", cls: "acmart", pkg: null, bibstyle: /^ACM-Reference-Format$/i, required: [], refsOut: true,
    note: "Page limits differ per venue, so set yours. CCS concepts and keywords are usually required." },
  { id: "neurips", name: "NeurIPS", pages: 9, abstract: 0, cite: "any", cls: "article", pkg: /^neurips_\d{4}$/i, bibstyle: null, refsOut: true,
    required: [["Paper checklist", /checklist/i, "warn"]],
    note: "Nine content pages. References, appendix and the checklist do not count." },
  { id: "icml", name: "ICML", pages: 8, abstract: 0, cite: "author-year", cls: "article", pkg: /^icml\d{4}$/i, bibstyle: /^icml\d{4}$/i, refsOut: true,
    required: [["Impact statement", /impact statement|broader impact/i, "warn"]],
    note: "Eight pages for the main text. References and appendix do not count." },
  { id: "acl-long", name: "ACL long paper", pages: 8, abstract: 200, cite: "author-year", cls: "article", pkg: /^acl$/i, bibstyle: /^acl_natbib$/i, refsOut: true,
    required: [["Limitations", /^\W*(\d+\.?\s*)?limitations?\b/i, "error"]],
    note: "Eight pages. A Limitations section is mandatory and does not count toward the limit." },
  { id: "acl-short", name: "ACL short paper", pages: 4, abstract: 200, cite: "author-year", cls: "article", pkg: /^acl$/i, bibstyle: /^acl_natbib$/i, refsOut: true,
    required: [["Limitations", /^\W*(\d+\.?\s*)?limitations?\b/i, "error"]],
    note: "Four pages. A Limitations section is mandatory and does not count toward the limit." },
  { id: "lncs", name: "Springer LNCS", pages: null, abstract: 250, cite: "numeric", cls: "llncs", pkg: null, bibstyle: /^splncs/i, required: [], refsOut: false,
    note: "Page limits are set by each event and usually include references." },
  { id: "elsevier", name: "Elsevier journal", pages: null, abstract: 250, cite: "any", cls: "elsarticle", pkg: null, bibstyle: /^elsarticle/i, required: [], refsOut: true,
    note: "Most journals have no page limit. Check the guide for authors for highlights and abstract length." },
];

export const presetById = (id) => PRESETS.find((p) => p.id === id) || PRESETS[0];
