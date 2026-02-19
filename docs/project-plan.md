# Scaffold Project Plan

## Data Integration: Common Data Set and School Websites

### The Problem

The current prompt template relies on Claude's training data for admission rates, financial aid statistics, and program details. This works but has two weaknesses:

1. **Staleness.** Training data has a cutoff. Admission rates shift year to year. Financial aid policies change. A family paying $50 deserves current numbers, not numbers from two years ago.
2. **Verifiability.** When we cite an admit rate or a net price, we should be able to point to a source. "Based on Emory's 2024-2025 Common Data Set, Section C" is more trustworthy than "based on what we know about Emory."

### What Is the Common Data Set (CDS)?

The Common Data Set is a standardized survey that most U.S. colleges publish annually. It includes:

- **Section B:** Enrollment and persistence (retention rates, graduation rates)
- **Section C:** First-time, first-year admission statistics (admit rate, yield, test score ranges, GPA distribution)
- **Section D:** Transfer admission
- **Section G:** Annual expenses (tuition, room/board, fees by residency)
- **Section H:** Financial aid (% receiving aid, average award, % of need met, average net price by income bracket)
- **Section I:** Instructional faculty and class size

Sections C, G, and H are the most valuable for Scaffold. They provide the exact numbers we need for admit rate adjustments, cost modeling, and the Monte Carlo simulation parameters.

### What We'd Pull from School Websites

Beyond the CDS, each school's website has:

- Current net price calculator results (can be scraped or manually checked)
- Specific program pages (honors programs, writing programs, debate teams)
- Financial aid policies (meets full need? no-loan policies? QuestBridge partnership?)
- Application deadlines and requirements
- Diversity statistics and cultural resources
- Specific scholarship programs and eligibility criteria

### How to Integrate This Into the Product

**Option A: Pre-loaded data (simpler, good enough for launch)**

Build a reference database of CDS data and key website info for the ~100-150 schools most likely to appear in Scaffold plans. Update it annually when new CDS releases come out (typically fall/winter). Inject relevant school data into the prompt alongside the family's intake form, so Claude has current numbers to work with rather than relying on training data.

Pros: Simple, maintainable, works with current architecture (prompt template + Claude API call)
Cons: Limited to pre-loaded schools, requires annual manual updates

**Option B: Live retrieval (more complex, more accurate)**

At generation time, retrieve the CDS and key website data for each school Claude recommends. This could work via:
- Web scraping / API calls to pull CDS PDFs and parse them
- A tool-use approach where Claude requests specific school data during generation
- A RAG (retrieval-augmented generation) setup with an indexed CDS database

Pros: Always current, covers any school, no manual updates
Cons: Significantly more engineering, parsing CDS PDFs is non-trivial (format varies by school), adds latency to generation

**Recommended approach for launch:** Option A. Build a spreadsheet or JSON file with CDS data for the top 150 schools. Include it in the prompt context for each generation. Plan the architecture to support Option B later.

### Specific Data Points to Capture Per School

| Field | CDS Section | Example (Emory) |
|-------|------------|-----------------|
| Admit rate (overall) | C1 | 11.2% |
| Admit rate (ED/EA if available) | C1 | 18.5% ED |
| Middle 50% SAT | C9 | 1450-1540 |
| Middle 50% ACT | C9 | 33-35 |
| Middle 50% GPA | C12 | 3.8-4.0 |
| Tuition and fees (in-state if public) | G1 | $59,000 |
| Room and board | G1 | $17,500 |
| % of need met (average) | H2 | 100% |
| Average need-based grant | H2 | $54,000 |
| Average net price ($0-48K income) | H2/NPC | $3,200 |
| Average net price ($48-75K income) | H2/NPC | $5,100 |
| Average net price ($75-110K income) | H2/NPC | $12,400 |
| Meets full demonstrated need? | H2 | Yes |
| No-loan policy? | Website | Yes (<$75K) |
| QuestBridge partner? | Website | Yes |
| Honors program? | Website | No (Oxford College is separate) |
| Notable programs (writing, debate, etc.) | Website | Creative Writing MFA, forensics |

### Priority Schools for Initial Database

Start with the schools that appear most frequently across the five test families:

**Appears in 3+ family plans:** UGA, Georgia Tech, Emory, Vanderbilt, Georgia State, Morehouse, Howard, Spelman, Davidson

**Appears in 2 family plans:** UT Austin, Rice, Texas A&M, Tulane, Oberlin, Denison, University of Richmond, Berea, Oregon State, University of Oregon, Portland State

**Expand to:** All QuestBridge partner schools (~50), all HBCUs with >2,000 enrollment (~30), all state flagships (50), and the top 50 liberal arts colleges. That gets you to ~150 schools with some overlap.

### Next Steps

1. Decide on Option A vs. Option B (recommendation: A for launch)
2. Build the data template (spreadsheet or JSON schema)
3. Pull CDS data for the first 50 schools (start with the test family schools)
4. Add a step in the generation pipeline that injects relevant school data into the prompt
5. Add a citation format to the output (e.g., "Source: Emory CDS 2024-2025, Section H2") so families can verify the numbers
6. Plan the annual update process (who updates, when, how)

### Open Questions

- Should we show the CDS source citations in the final document, or keep them behind the scenes? (Recommendation: show them. Transparency builds trust, especially for first-gen families who don't know what to Google.)
- How many schools should the database cover at launch? (Recommendation: 100-150 covers the vast majority of plans)
- Should we build a tool for Claude to query the database mid-generation, or just inject all relevant data upfront? (Recommendation: inject upfront for simplicity. The prompt context window is large enough.)
