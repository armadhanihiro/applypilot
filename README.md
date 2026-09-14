# ApplyPilot

**Evidence-first AI job application agent**

ApplyPilot reads a live job posting, compares its requirements against verified candidate evidence from an uploaded CV, and blocks unsupported claims before they reach a resume or cover letter.

🌐 **Live Demo:** https://applypilot-agent.vercel.app

## Why ApplyPilot

Most AI job application tools focus on making candidates sound better.

The problem is that generative AI can easily exaggerate experience, infer skills that were never stated, or create unsupported claims.

ApplyPilot takes the opposite approach:

> **If candidate evidence cannot support a claim, the AI is not allowed to make it.**

## How It Works

### 1. Upload CV

- The user uploads a PDF resume.
- Text is extracted from the PDF.
- Gemini converts the CV into a structured Candidate Evidence Profile.
- Only explicitly stated skills, experience, projects, education, and achievements are retained.

### 2. READ — Live Job Research

ApplyPilot uses Anakin to retrieve the live job posting.

The retrieval pipeline follows a fallback strategy:

`Job URL → URL Scraper → Search fallback → Agentic Search fallback → Normalized Job Context`

This allows ApplyPilot to work with live job information instead of relying on manually copied job descriptions.

### 3. REASON — Requirement Matching

Job requirements are extracted into structured requirements and compared against candidate evidence.

Each requirement is classified as:

- **Strong** — directly supported by candidate evidence
- **Partial** — some relevant evidence exists, but limitations remain
- **Unsupported** — no sufficient candidate evidence exists

ApplyPilot then calculates an evidence-based fit score rather than artificially inflating candidate suitability.

### 4. VERIFY — Claim Grounding

Before application claims can reach the final output, ApplyPilot verifies them against candidate evidence.

Unsupported requirements are surfaced as application gaps with explicit **Do Not Claim** warnings.

Generated claims also pass through an additional semantic verification layer.

If evidence cannot support a claim, the system rejects it.

### 5. ACT — Grounded Application Pack

Only verified evidence is allowed into the final application materials.

ApplyPilot generates:

- Resume tailoring suggestions
- Evidence-backed selling points
- Application risk analysis
- Explicit gaps and Do Not Claim warnings
- Grounded cover letter
- Copy-ready application materials

## Anakin Integration

Anakin powers ApplyPilot's **live web intelligence and READ layer**.

Instead of asking users to manually copy and paste job descriptions, ApplyPilot starts from a real job URL.

The application uses Anakin through a resilient retrieval pipeline:

`Job URL → URL Scraper → Search fallback → Agentic Search fallback`

The direct URL scraper attempts to retrieve the job posting first.

If direct retrieval is insufficient, ApplyPilot can use Anakin Search as a fallback to discover relevant job information.

For more difficult cases, Agentic Search provides a deeper retrieval strategy for obtaining structured job and company context.

The retrieved content is normalized before being passed into the downstream AI reasoning pipeline.

This means Anakin is not an isolated add-on to the application. It provides the live web grounding required before ApplyPilot can reason about the job.

The overall agentic workflow is:

`READ with Anakin → REASON about candidate fit → VERIFY candidate claims → ACT by generating grounded application materials`

## Architecture

```text
CV PDF
   │
   ▼
PDF Text Extraction
   │
   ▼
Gemini Candidate Evidence Extraction
   │
   ▼
Candidate Evidence Profile
   │
   │                         Live Job URL
   │                              │
   │                              ▼
   │                       Anakin READ Layer
   │                              │
   │                    ┌─────────┴─────────┐
   │                    │                   │
   │               URL Scraper        Search Fallback
   │                                        │
   │                                  Agentic Search
   │                                        │
   │                    └─────────┬─────────┘
   │                              ▼
   │                    Normalized Job Context
   │                              │
   │                              ▼
   │                    Structured Requirements
   │                              │
   └──────────────────────┬───────┘
                          ▼
                   Evidence Reasoning
                          │
                          ▼
              Strong / Partial / Unsupported
                          │
                          ▼
                   Claim Verification
                          │
                          ▼
                Grounded Application Pack
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
      Resume Suggestions       Grounded Cover Letter
```

## Evidence-First Safety

ApplyPilot is designed around one core invariant:

> **No candidate claim without candidate evidence.**

The system deliberately prevents the AI from turning assumptions into application claims.

Examples of claims ApplyPilot can refuse to make include:

- Industry experience not found in the CV
- Unverified years of professional experience
- Technologies never mentioned by the candidate
- Work authorization not stated in candidate evidence
- Seniority inferred from unrelated experience
- Leadership experience that was never explicitly demonstrated
- Production experience inferred only from a listed technology

Instead of hiding these weaknesses, ApplyPilot surfaces them.

The AI is explicitly allowed to say:

> **Do not claim this.**

## Example Result

When analysing a real Junior Full Stack Developer role, ApplyPilot produced an evidence-based fit score of **39%**.

The analysis identified:

- **1 Strong** requirement
- **5 Partial** requirements
- **3 Unsupported** requirements
- **7 Verified** application claims

Rather than exaggerating the candidate's suitability, ApplyPilot explicitly identified unsupported areas such as:

- Australian strata industry experience
- Verified duration of professional software development experience
- Australian work authorization when not stated in the uploaded CV

Those gaps were prevented from becoming unsupported application claims.

The resulting application pack contained only evidence-backed resume recommendations and cover letter content.

## Defense in Depth

ApplyPilot does not rely on a single LLM prompt to prevent hallucinations.

The system uses multiple layers:

**1. Evidence Extraction**

Candidate information is extracted from the uploaded CV under strict instructions not to infer missing experience.

**2. Requirement-to-Evidence Reasoning**

Every job requirement is mapped against available candidate evidence.

**3. Deterministic Evidence Guard**

Evidence returned by the reasoning layer must exist in the candidate evidence pool.

**4. Semantic Claim Verification**

Generated application claims are checked again before being approved.

**5. Grounded Material Generation**

Final resume suggestions and cover letter content are generated only from claims that passed verification.

The design principle is:

> **LLM proposes. Deterministic systems enforce.**

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### AI & Agent Layer

- Gemini API
- Anakin URL Scraper
- Anakin Search
- Anakin Agentic Search

### Processing & Verification

- PDF resume parsing
- Structured candidate evidence extraction
- Requirement-to-evidence matching
- Semantic claim verification
- Deterministic evidence guardrails

### Infrastructure & Testing

- Vercel
- Vitest
- GitHub

## Gemini Usage

Gemini is used for structured reasoning tasks including:

- Candidate evidence extraction from CV text
- Job requirement extraction
- Requirement-to-evidence reasoning
- Semantic claim verification
- Application strategy generation

Gemini is constrained by ApplyPilot's evidence architecture rather than being allowed to freely invent candidate facts.

## Anakin Usage

Anakin handles the live web component of ApplyPilot.

Its responsibilities include:

- Reading live job URLs
- Retrieving job posting content
- Search-based fallback retrieval
- Agentic Search fallback
- Supplying current web context to the reasoning pipeline

This separation allows each system to focus on what it does best:

**Anakin retrieves live web evidence.**

**Gemini reasons over structured evidence.**

**ApplyPilot's verification layer decides what claims are allowed.**

## Testing

ApplyPilot includes automated tests covering core safety and application-generation behavior, including:

- Evidence verification
- Source handling
- Source normalization
- Application pack generation
- Claim verification
- Grounded application material generation

The verification system is designed to **fail closed**.

If evidence is missing or a claim cannot be verified, the system rejects the claim rather than assuming it is correct.

## Run Locally

Clone the repository and install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
ANAKIN_API_KEY=your_anakin_api_key
GEMINI_API_KEY=your_gemini_api_key
```

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Production

ApplyPilot is deployed on Vercel:

https://applypilot-agent.vercel.app

## Hackathon

Built for **Anakin Forge 2026**.

ApplyPilot demonstrates an agentic workflow operating on a real-world problem:

**READ → REASON → VERIFY → ACT**

The project combines live web retrieval, structured AI reasoning, deterministic evidence enforcement, and useful application generation into a single end-to-end agent.

---

Built by **Armadhani Hiro Juni Permana**