# Validation Assistant — local pilot

Reviews functional risk assessment packages using deterministic FMEA checks and a local model for semantic review. This is an illustrative testing tool, not a validated compliance system. The original Figma source components remain in `Figma_frontend/src/app/components`; the active application is `src/app/App.tsx`.

## Start locally

Prerequisites: Docker Desktop, Node 20+, and Ollama. The default generation model is a provisional 7B quantized model; benchmark it on your Mac before client testing. The model tags are explicit, and actual model digests are recorded per run. No hosted inference is used.

```sh
ollama pull qwen2.5:7b-instruct-q4_K_M
ollama pull nomic-embed-text:v1.5
# Start Ollama if its desktop application is not already serving.
ollama serve
```

In another terminal, from this directory:

```sh
docker compose up --build -d
cd Figma_frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. API documentation: http://127.0.0.1:8000/docs. All published service ports bind to localhost. Ollama is addressed through `host.docker.internal` from the containers. If Ollama cannot be reached from Docker Desktop, use the native API/worker option below rather than exposing Ollama to your LAN.

### Native API and worker (alternative)

```sh
docker compose up -d db
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/uvicorn backend.api:app --host 127.0.0.1 --port 8000
# In another terminal:
.venv/bin/python -m backend.worker
```

Default database: `postgresql://validation:validation@localhost:5432/validation`. Override `DATABASE_URL`, `STORAGE_PATH`, `OLLAMA_URL`, `OLLAMA_MODEL`, and `OLLAMA_EMBED_MODEL` as needed. Credentials are local-development defaults. The embedder must produce 768 dimensions. Schema initialization is idempotent on startup; future schema changes need explicit migrations.

## Try the synthetic package

1. Create a project. Upload `samples/assessment.txt` as **Risk assessment**, `samples/requirements.txt` as **Requirements**, and `samples/methodology.txt` as **Methodology / SOP**.
2. Inspect and confirm each extraction. TXT tables use pipe separators. DOCX and XLSX tables map recognized headers; PDF pages are preserved and require manual risk-row mapping.
3. Start review. Expected deterministic findings: RA-001 score should be 60 and class High; RA-003 links to missing URS-999; URS-003 has no linked risk row.
4. Inspect source evidence, accept/dismiss/annotate findings with reasons, and export HTML or JSON. Chat uses only the selected review's document versions.

Scores use **illustrative FMEA v1**: integer severity × probability × detectability, each 1–5; Low 1–19, Medium 20–49, High 50–125. Higher detectability means harder to detect. Uploading a client SOP does **not** change these rules. Client methodology onboarding must add and test an approved profile before client scoring is used.

## Behavior and limitations

- Originals, hashes, versions, evidence locations, confirmed rows, profile snapshots, model digests, semantic evidence, and reviewer events are persisted. Reports include the run snapshot and reviewer history.
- A new upload with the same filename creates a new version. New reviews select the latest version of every filename. Prior runs retain their snapshot.
- Jobs use row locking, a renewable lease, bounded attempts, and atomic result replacement. Worker interruption permits recovery after ten minutes; model errors yield incomplete results with deterministic findings retained.
- Missing requirements, extraction warnings, missing methodology, or unavailable/invalid model responses produce an **incomplete** review. “Completed” means the processing finished, not that a system is compliant.
- PDF OCR is not implemented. Encrypted PDFs and legacy DOC are rejected. XLSX formulas are preserved and flagged for manual confirmation; the tool does not execute spreadsheet formulas or macros.
- The local pilot has no authentication and must remain on localhost. Evidence and exports may contain sensitive text; no document contents should be sent to external services.
- Retrieval combines PostgreSQL full-text search with pgvector cosine distance through reciprocal-rank fusion. It is scoped to project and snapshot document IDs. Requirement/risk/mitigation links are stored in a relationship table; a dedicated GraphRAG engine is not used.
- Model evidence IDs are checked, but citation validity alone does not prove a claim is supported. Human review and expert evaluation remain necessary. Embedded document instructions are treated as untrusted data; models have no tools.
- Large paragraphs/pages are truncated at the inference boundary. Inspect evidence and split overly long documents before semantic evaluation. The pilot supports at most 500 risk rows per run and 20 MB per upload.

## Validation

```sh
.venv/bin/python -m pytest backend/tests -q
cd Figma_frontend
npm run typecheck
npm run build
```

With the API/database running, `.venv/bin/python scripts/smoke.py` creates and queues a synthetic package. Full live validation additionally requires Ollama and the worker: check progress recovery, report output, chat citations, and reviewer decisions in the browser.

Before client use, benchmark: expert-labeled semantic precision/recall, unsupported-claim rate, rating-rationale disagreements, model failures, total runtime and peak memory. Include adversarial document instructions, contradictory evidence, and two-project isolation cases. Compare graph traversal against the hybrid baseline only when representative multi-hop cases exist.

## AWS migration boundary

Keep API, worker, and PostgreSQL as separate services. Replace local storage with an S3 adapter and provide an approved private inference endpoint. Add identity, authorization and tenant isolation, retention policies, audited administrative access, backups/restore tests, monitoring, secrets management, deployment migrations, and formal qualification before production. The current event table is application history, not an immutable regulatory audit trail.

### Database integration suite

Run only against a disposable, otherwise idle test database (the test creates persistent synthetic records):

```sh
RUN_DB_TESTS=1 .venv/bin/python -m pytest backend/tests/test_integration.py -q
```

This verifies queue reclaim, deterministic findings, evidence indexing/retrieval, immutable review snapshots, reviewer decisions, exports, and cross-project chat rejection. Inference is stubbed to isolate orchestration; it does not validate model quality.
