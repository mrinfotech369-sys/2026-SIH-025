# IP-SAKTI Sahayak (आईपी-शक्ति सहायक)

**Evidence-Grounded Intellectual Property and Regulatory Intelligence Copilot for Ayurveda**

> Retrieve First. Reason Second. Cite Third. Verify Always.

IP-SAKTI Sahayak is a decision-support platform that helps Ayurveda researchers, startups, MSMEs, and patent and regulatory professionals navigate intellectual property, traditional knowledge, scientific evidence and regulation across **India, the USA and Australia**. Every answer it gives is grounded in retrieved, citable source material. It is *not* a patent agent, lawyer, regulator, medical advisor, TKDL mirror, filing system or approval predictor, and it does not claim to be any of those.

**Repository:** https://github.com/dipanaditya0022-byte/IP-SAKTI-Sahayak

```bash
git clone https://github.com/dipanaditya0022-byte/IP-SAKTI-Sahayak.git
```

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [One-command start](#one-command-start-demo-machine)
- [Running locally](#running-locally)
- [Demo](#demo)
- [Admin console](#admin-console-separate-area-separate-session)
- [Data & source policy](#data--source-policy)
- [Security](#security)
- [Testing](#testing)
- [Known limitations](#known-limitations)

## Features

| Area | What it does |
|---|---|
| Auth & workspaces | Register/login (bcrypt + JWT in an httpOnly cookie), workspace RBAC (OWNER/ADMIN/RESEARCHER/REVIEWER/VIEWER), workspace isolation, CSRF header check, session expiry, brute-force throttling |
| Sign-in | One combined sign-in screen (`/login`, also reachable at `/admin/login`) with a **User / Admin** toggle, User selected by default. Each mode posts to its own endpoint and sets its own scoped session cookie, so the two are never mixed even though the form is shared |
| Admin console | A fully separate area with its own scoped `admin` session cookie — a regular app session never grants access, even for an ADMIN-role account. Covers the system dashboard, users, workspaces, source registry, document management (review/reject/re-index), RAG monitoring, citation verification monitoring, evaluation, escalations (assign + notes), feedback, a filterable audit log with CSV export, and read-only settings |
| Innovation Profiler | 7-step wizard producing a structured profile: technical features, terminology normalisation, and missing information or ambiguities that are flagged rather than invented, with user editing/confirmation at every step |
| Terminology engine | Sanskrit / Hindi / English / botanical / chemical name mapping; ambiguous common names (e.g. *Brahmi*) are flagged for the user to resolve, never silently mapped |
| AI Research Assistant | Multi-turn conversations across 6 research modes, with language/jurisdiction/source filters and structured answers (answer → key points → evidence → status → limitations → next step), copy/regenerate/feedback/flag, and add-to-innovation |
| Hybrid RAG | pgvector dense retrieval + Postgres full-text (BM25-style) + metadata + graph expansion → dedupe → deterministic rerank (relevance, lexical match, jurisdiction, authority tier, freshness, document type, feature match); the full search trace is stored against each answer |
| Citation verification | Claim extraction → citation binding → checks for source/passage existence, authority, jurisdiction, freshness, section/year anchors and semantic support (plus an LLM entailment check when configured) → a verdict of SUPPORTED / PARTIALLY / UNSUPPORTED / CONFLICTING / INSUFFICIENT |
| Safety | An abstention engine, jurisdiction clarification, unsupported-jurisdiction refusal, medical and legal-certainty boundaries, restricted-TKDL refusal, and prompt-injection detection in both queries and ingested documents |
| Conflicts & freshness | Conflicting sources are shown side by side rather than silently merged; superseded documents are excluded unless explicitly requested; every source is labelled Current / Recently checked / Potentially stale / Superseded / Unknown |
| Scientific evidence | Study cards that keep **ingredient-level** evidence separate from **final-formulation** evidence, so one is never mistaken for the other |
| Patents / prior art | Concept search, a feature-to-document matrix with filters, patent-family grouping and review status; overlap with prior art is never presented as a patentability verdict |
| Traditional knowledge | Public/authorised context only, with access limits, attribution, possible-overlap notes and an escalation path |
| Classification & regulatory | A guided questionnaire resolves a provisional category per jurisdiction, surfacing its assumptions, the facts that could change it, and any missing information; includes a Regulatory Passport and an India/USA/Australia comparison table |
| Evidence intelligence | Automatically computed evidence gaps (LOW → CRITICAL), an 8-category risk map, and an interactive evidence graph (React Flow) with provenance on every edge |
| Human review | IP, regulatory, domain and general escalations, each carrying a full evidence packet and a status workflow |
| Reports | A full evidence report with Markdown export and print-to-PDF |
| Corpus & admin | Source registry, document management, a validated upload/ingestion pipeline, ingestion jobs, users, workspaces, system health, and a RAG evaluation dashboard |
| Governance | A computed jurisdiction coverage matrix (Built/Partial/Planned), a provision map, heuristic confidence with visible signals, explicit TKDL status, a structured feedback queue, a corpus update queue with named curators, retention purge, a data-handling page, and cost/latency metrics — see `docs/GAP_CLOSURE.md` for the detailed write-up |
| Audit & observability | An audit trail for every key action (IP addresses stored only as a salted hash), with structured JSON request logs carrying request_id/user/workspace/latency |
| Multilingual | English and Hindi UI; Hindi questions are answered via terminology expansion over the English source corpus, preserving names, section numbers and titles |

## Architecture

```
Browser ──► Next.js 15 (App Router, TanStack Query, Tailwind, React Flow)
              │  /api/* rewritten to FastAPI (single origin; cookie auth)
              ▼
         FastAPI (Pydantic, SQLAlchemy 2, Alembic)
           ├─ api/endpoints   auth, workspaces, innovations, chat, search, review, corpus, admin, evaluations, health
           ├─ services        research pipeline, retrieval, verification, terminology, profile, patents,
           │                  evidence, regulatory, analysis (gaps/risk/graph), packets, ingestion, evaluation, llm, audit
           └─ seed            curated corpus + demo users/workspace/innovation
              ▼
         PostgreSQL 16 + pgvector (HNSW cosine index, GIN tsvector index)
```

- **LLM:** a provider abstraction (`OpenAICompatibleProvider`) covering `ollama` (free, local, private — the default in this repo's `.env`), `gemini`, `groq`, `grok`, `openai` and `deepseek`, plus a `mock` fallback used by default in `.env.example`. Under `mock`, answers are **extractive**: they quote retrieved passages directly and are still run through citation verification. Nothing is synthesised without a traceable source.
- **Embeddings:** `hashing` (the default — offline character/word n-gram hashing at 1024 dimensions), `openai` (`text-embedding-3-small`, also 1024-d) or `bge_m3` (local). DeepSeek has no embeddings API of its own, so it is paired with `hashing` or `openai`.

## Folder structure

```
backend/
  app/{main.py, db.py, schemas.py, core/, api/endpoints/, models/orm.py, services/, seed/}
  alembic/ (migrations)        requirements.txt
rag/embeddings/provider.py     embedding providers (hashing, openai, bge-m3, mock)
rag/, ingestion/               earlier local-store retriever, PDF parser and section-aware chunker (reused by ingestion)
frontend/
  app/ (landing, login, register, app/**)   components/   lib/ (api, i18n, providers, hooks, types)
tests/                          pytest suite incl. the end-to-end integration flow
docker/                         backend & frontend Dockerfiles      docker-compose.yml
```

## One-command start (demo machine)

```bash
scripts/start_all.sh   # Postgres, Ollama (preloads model), migrations/seed, API, UI, public tunnel; keeps the Mac awake
scripts/stop_all.sh
```
Logs are written to `logs/`. The printed public URL (a Cloudflare quick tunnel) only stays reachable while this machine is awake and the script is running.

## Running locally

**Prerequisites:** Python 3.11+ (3.13 tested), Node 20+ (24 tested), Docker (for Postgres).

```bash
cp .env.example .env              # then set JWT_SECRET and SESSION_SECRET to long random strings
docker compose up -d postgres     # Postgres 16 + pgvector on localhost:5433

python3.13 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt

cd backend
../.venv/bin/alembic upgrade head                        # create schema
PYTHONPATH=.:.. ../.venv/bin/python -m app.seed.run      # seed corpus, demo users and demo innovation (--reset to reseed)
PYTHONPATH=.:.. ../.venv/bin/uvicorn app.main:app --port 8000
# API docs: http://localhost:8000/docs

cd ../frontend && npm install && npm run dev             # http://localhost:3000
```

**Everything in Docker:** `docker compose up --build`. The backend container migrates and seeds itself on first boot.

### Enabling a real LLM (recommended)

**Free and private (the default in this repo): local Ollama.** No API key required, and nothing leaves the machine.

```bash
ollama pull qwen2.5:7b      # ~4.7 GB; llama3.2 (2 GB) also works but gives weaker Hindi answers
```
```env
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:7b
```

**Hosted APIs.** All of the following are OpenAI-compatible and need only `LLM_PROVIDER` and `LLM_API_KEY`:

| Provider | Base URL (automatic) | Notes |
|---|---|---|
| `gemini` | Google AI Studio OpenAI endpoint | Free tier; prompts may be used by Google on the free tier |
| `groq` | api.groq.com | Free tier with rate limits; hosted open models |
| `grok` | api.x.ai | xAI, paid |
| `openai` / `deepseek` | — | paid |

Model names change over time; set `LLM_MODEL` to one the provider currently lists. Keep `.env` comments on their own lines, never trailing a value.

Restart the backend and check `GET /health/llm` (or the admin console's System Health tile). With a key configured: answers are synthesised and still verified, Hindi answers are generated in Hindi, Hindi queries are translated for retrieval, every claim gets an LLM entailment check, profile extraction adds AI-suggested features marked *needs confirmation*, and per-query cost is measured. If the provider fails at runtime, the system falls back to extractive mode and says so in the answer.

## Demo

App logins (password `Demo@12345`): `researcher@ipsakti.demo` (Researcher), `reviewer@ipsakti.demo` (Reviewer). The **Explore Demo** link on the landing page pre-fills the researcher login.

**Suggested walkthrough:** Login → Dashboard → *AyuCalm-X (DEMO)* → Profile (note the Brahmi ambiguity and the disease-claim flag) → *Ask about this innovation* (citations, verification, search trace, conflicting sources) → Scientific (ingredient vs. formulation evidence) → Patents (feature matrix, families) → Traditional Knowledge → Classification → Regulatory Passport (India / USA / Australia comparison) → Gaps & Risk → Evidence Graph (click through nodes and edges) → Escalation & Report → export → Audit Trail.

### Admin console (separate area, separate session)

The admin console is a fully separate part of the site, not a tab inside the app. Open **http://localhost:3000/login** (or go straight to `/admin/login`) and select the **Admin** tab — credentials `admin@ipsakti.demo` / `Demo@12345`. It requires its own sign-in even for an ADMIN-role account that is already signed in to the app: choosing **User** and entering the same admin credentials only opens the regular app session, never the console. From inside the app, an ADMIN-role user also sees an "Admin console (separate sign-in)" link at the bottom of the sidebar.

It covers: a system-wide dashboard (analytics, health, retention), Users, Workspaces, Source Registry, Documents (upload, review, reject, re-index), RAG Monitoring (retrieval stats, failed retrievals, abstentions, latency), Citation Verification Monitoring, RAG Evaluation (runs live), Escalations (assign a reviewer, add notes), Feedback, Audit Logs (filterable, with CSV export), and Settings (effective configuration, secrets masked).

For a production deployment, do not rely on the fixed-password demo admin above — set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` and run `PYTHONPATH=backend:. .venv/bin/python -m app.seed.create_admin` once to create or promote a real admin account.

Useful assistant prompts: the six example cards on the empty chat screen cover a factual question, a regulatory question, a cross-jurisdiction question, a Hindi question, a prior-art search and a restricted-TKDL refusal.

## Data & source policy

| Label | Meaning |
|---|---|
| `SEED_SUMMARY` | Short excerpts or close summaries of **real** public instruments and publications. Verify them against the official Gazette, regulator or journal text before relying on them. |
| `DEMO_FICTIONAL` | **Fictional** records: every patent (`DEMO-…` numbers), the two conflicting "DEMO (fictional)" guidance notes, and the AyuCalm-X innovation. |
| `PENDING_REVIEW` | User uploads (Tier 5): workspace-private and unverified. |

Source tiers: 1 official law/regulator · 2 international official · 3 peer-reviewed · 4 secondary/demo · 5 user-provided/unverified. On TKDL: the system has **no** TKDL access and never scrapes or reproduces restricted records.

## Security

- bcrypt password hashing with enforced password rules; JWT carried in an httpOnly SameSite=Lax cookie, or as a Bearer token for API clients.
- `X-Requested-With` header required on cookie-authenticated writes (CSRF defence).
- Workspace isolation enforced on every innovation, conversation, document, report and escalation query; RBAC checked per workspace role; admin-only endpoints gated server-side.
- Pydantic validation on all inputs; SQLAlchemy with bound parameters only, never string-built SQL; React's default escaping, with no raw HTML rendering.
- Upload checks: extension allowlist, magic-byte signature check, size limit, UTF-8 validation, rejection of PDFs carrying JavaScript/Launch actions, text sanitisation, and duplicate-hash detection.
- Retrieved text is always treated as **data**, never as instructions: instruction-like text is flagged at ingestion, down-ranked, labelled in the UI, excluded from key points, and explicitly forbidden from being followed by the LLM prompt.
- Rate limits on chat, search, ingest and reports; standard security headers; restricted CORS; the error envelope never leaks stack traces.
- Structured logs never include request bodies or confidential innovation text.

## Testing

```bash
docker compose up -d postgres
.venv/bin/python -m pytest -q          # uses a separate ipsakti_test database, migrated and seeded automatically
```

60 tests cover (including LLM mode via a fake provider, OCR, coverage, provisions, feedback and lifecycle behaviour):
- auth, RBAC, CSRF and workspace isolation;
- the **user/admin access-rules matrix**: unauthenticated requests redirect to login, USER-role access to admin routes is forbidden, ADMIN-role access is allowed, and user data stays isolated even when viewed from the admin document view;
- upload validation and prompt-injection flagging;
- retrieval relevance, irrelevant-query rejection and jurisdiction filtering;
- supersession handling, and supported/contradicted/unsupported citation and conflict detection;
- clarification requests, TKDL handling, unsupported-jurisdiction refusal and prompt-injection handling;
- medical and legal boundaries, and Hindi-language behaviour;
- the **full end-to-end flow** (user → workspace → innovation → profile → research → verify → patents → regulatory comparison → gaps → escalation → report → audit);
- a run of the evaluation suite itself.

## Known limitations

- The corpus is a curated seed of 40 documents, not a live feed. Statute summaries need independent verification, and the included patents are fictional. Use the admin console's Documents → Ingest New tab to add official documents.
- The default `hashing` embeddings capture shared vocabulary rather than synonyms (terminology expansion covers much of this gap). Use `EMBEDDING_PROVIDER=openai` or `bge_m3` for genuine semantic embeddings. Changing the embedding provider requires reseeding (`--reset`) so stored vectors stay consistent.
- Without an LLM key, answers are extractive quotes rather than synthesised text.
- OCR uses Tesseract (English, plus Hindi when `hin.traineddata` is installed); results below 70% confidence are routed to human validation.
- Rate limiting is in-process; a multi-instance deployment would need Redis.
- Background jobs run inline, since documents are small; longer ingestion jobs would need a dedicated worker.
- Legacy artifacts from an earlier prototype (`backend/db/schema.sql`, `rag/store/*`, `evaluation/`, `scripts/`) are kept for reference only; the Alembic migrations and `app/models/orm.py` are the source of truth.
