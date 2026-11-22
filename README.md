# Validation Assistant — local document review pilot

Upload a functional risk assessment and let a local model read it and return feedback on risks, gaps, ambiguities, contradictions, unsupported ratings, weak mitigations, and opportunities to improve the document. Findings include a priority, explanation, suggested improvement, and source citations. No manual risk rows or extraction confirmation are required.

The original Figma components remain in `Figma_frontend/src/app/components`; the active application is `src/app/App.tsx`.

## Start locally

Prerequisites: Docker Desktop, Node 20+, and Ollama. Pull these two models once:

```sh
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama pull nomic-embed-text:v1.5
```

Open the Ollama application, or run `ollama serve` if it is not already serving. An “address already in use” message normally means it is already running; `ollama list` checks connectivity.

From the project directory:

```sh
docker compose up --build -d
cd Figma_frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. API documentation: http://127.0.0.1:8000/docs. Ollama stays on your Mac; the containers address it through `host.docker.internal`. Published ports bind to localhost. PostgreSQL uses host port **5433** to avoid conflicts with existing installations; containers connect internally to `db:5432`.

After backend code changes, rerun `docker compose up --build -d`. Existing uploads and review history remain in Docker volumes. Refresh the browser for frontend changes.

### Native API and worker (alternative)

If Ollama cannot be reached from Docker Desktop, run the API and worker natively:

```sh
docker compose up -d db
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/uvicorn backend.api:app --host 127.0.0.1 --port 8000
# In another terminal, from the project directory:
.venv/bin/python -m backend.worker
```

Use one API and one worker deployment at a time. Native connections default to `postgresql://validation:validation@localhost:5433/validation`. Override `DATABASE_URL`, `STORAGE_PATH`, `OLLAMA_URL`, `OLLAMA_MODEL`, or `OLLAMA_EMBED_MODEL` as needed. Credentials are local testing defaults. The embedder must produce 768 dimensions.

## Review a document

1. Create or select a project and upload an assessment with the **Risk assessment** role. PDF, DOCX, XLSX, and TXT are supported.
2. Expand **System context and Part 11 applicability**, enter what you know and save. Unknown values are allowed. Optionally add requirements, methodology/SOPs, and reference documents. They provide context; an assessment alone is enough to start.
3. Optionally upload **Accepted example** or **Rejected example** documents. In the example library, add the acceptance/rejection reason, system context and methodology, then save. Disable any example you do not want in future reviews. No example library is pre-populated.
4. Click **Review document**. “View text” is an optional preview of extracted text. Source locations are passages within uploaded documents, not separate documents to create.
5. Follow the reading progress. Feedback appears as passes finish. Each finding links to source text. Wait until processing finishes before saving reviewer decisions.
6. Accept, dismiss, or annotate feedback with a reason; export HTML or JSON; ask follow-up questions through document chat.

Use `samples/assessment.txt` to try the workflow. Optional supporting files are `samples/requirements.txt` and `samples/methodology.txt`. Model feedback varies; a vague mitigation such as “Improve logging” is a useful review case.

Previously uploaded documents work without re-uploading or mapping rows. Old reviews retain their original snapshots and findings; start a new review to use the document reviewer.

## Recommendation scores and regulatory sources

Each new review has two independent scorecards: **Document quality** (12 criteria) and **21 CFR Part 11 alignment** (18 criteria). Each criterion receives one outcome: satisfactory, needs review, identified gap, not applicable, or unevaluated. Scores use equal weights across the first three outcomes only. Excluded and unevaluated counts remain visible; a zero denominator displays no percentage. Incomplete results are provisional. These are document-review proportions, not probabilities of compliance. Reviewer decisions preserve the original scores.

The full-document pass runs first. Criterion assessment then uses relevant bounded excerpts, the document summary, saved system context, and optional examples. Missing evidence or unknown applicability should lead to questions, not an assertion of noncompliance. Technical failures produce unevaluated outcomes. Inspect the checklist to see all rationales and suggested modifications, including optional enhancements where justified.

`backend/regulatory_sources.json` bundles official [21 CFR Part 11 text](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11) and [FDA Scope and Application guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application), retrieved November 21, 2026. Guidance is identified as nonbinding and separate from the regulation. This is a pinned reference, not a live regulatory feed. Updating it requires verifying the official sources and changing its version. Each job snapshots the source text/hash, checklist definitions/version, project context, selected example metadata, document versions, and inference settings. Previous jobs retain their prior references.

The app does not rely on the model's remembered regulatory knowledge. Accepted/rejected examples are project-scoped comparisons, not regulatory authority. Examples without reasons are background only. Hybrid lexical/vector retrieval selects example excerpts; lexical fallback is reported if embeddings are unavailable. Excerpts are limited, so comparisons are not exhaustive reviews of every example.

## How review works

- Every readable assessment passage is sent to the model in bounded batches. Long passages are split without dropping text; their original evidence IDs and locations are preserved.
- Section summaries are reviewed hierarchically for cross-section inconsistencies. Detailed findings are retained throughout synthesis. Summarization can lose nuance, so the original evidence remains available for human review.
- Supporting document excerpts are selected as context. This is not an exhaustive standalone review of every reference document.
- The reviewer uses the document's stated methodology when discussing scores. It does not impose the pilot's former illustrative FMEA scale. Apparent numerical issues are suggestions to verify, not certified calculations. The legacy scoring utilities remain independently tested but are not applied to document reviews.
- Missing requirements or SOPs do not block standalone review. Unreadable content, invalid model output/citations, or a model failure produce an incomplete result with available findings and coverage retained.
- Model versions/digests, source hashes/versions, review evidence, and reviewer decisions are recorded. Original uploads and prior run snapshots are preserved.
- Model review does not depend on embeddings. After review, the worker builds local embeddings for project-scoped chat; indexing failures are reported separately. Chat combines hybrid keyword/vector retrieval from the selected review’s document versions with its frozen regulatory/example sources; lexical fallback supports chat when embeddings are unavailable.

## Limitations

This is a testing pilot with draft feedback, not a validated compliance system. The 7B model still needs expert evaluation for quality, unsupported claims, and runtime on this Mac.

Scanned PDFs require OCR before upload. Legacy DOC and encrypted PDFs are rejected. PDF reading covers extracted text, not visual layout or image-only content. Spreadsheet formulas are preserved as text; formulas and macros are not executed. Maximum upload size is 20 MB, with 5,000 source locations per document.

The model has no tools; document text and generated summaries are treated as untrusted data. Citation IDs are validated against supplied evidence. Valid citation IDs do not by themselves prove a claim is correct. Do not infer approval from a “completed” processing status.

Keep this single-user pilot on localhost. It has no authentication or client isolation beyond project-scoped retrieval. Avoid external inference services unless explicitly approved for the documents involved. Current application history is not an immutable regulatory audit trail.

Generation requests allow 15 minutes by default; set `OLLAMA_GENERATION_TIMEOUT` (seconds) and rebuild services to change this. Embedding requests retain their shorter timeout. Jobs have renewable leases and bounded retries. The lease exceeds the generation timeout by two minutes (with a ten-minute minimum), so a slow generation request cannot be reclaimed while it is still within its allowed time. A worker interruption permits recovery after that lease expires. Partial findings are checkpointed; retry processing may regenerate them. Reviewer decisions are accepted only for finished reviews.

## Validation

```sh
.venv/bin/python -m pytest backend/tests -q
cd Figma_frontend
npm run typecheck
npm run build
```

Tests also cover score denominators, unknown applicability, failed/unsupported criterion outputs, separate regulation/guidance citations, snapshot preservation, and optional examples. Tests cover prose-only uploads without rows/confirmation, full passage coverage across 223 source locations and long pages, partial model failure, fabricated citations, and the legacy deterministic scoring utilities.

With the API/database running, `.venv/bin/python scripts/smoke.py` creates and queues a synthetic package. For an otherwise idle disposable PostgreSQL database with pgvector:

```sh
RUN_DB_TESTS=1 .venv/bin/python -m pytest backend/tests/test_integration.py -q
```

The integration suite stubs inference to test job reclaim, evidence indexing, snapshots, decisions, exports, and project isolation. Full model quality and speed require a live Ollama benchmark against expert-reviewed examples; successful automated tests do not establish review accuracy.

## AWS migration boundary

Keep API, worker, and PostgreSQL as separate services. Replace local storage with an S3 adapter and provide an approved inference endpoint. Add identity, authorization, client isolation, retention policies, audited administrative access, backups/restore tests, monitoring, secrets management, deployment migrations, and qualification before production. Evaluate a dedicated GraphRAG engine only against representative cross-document cases that the current reviewer handles poorly.
