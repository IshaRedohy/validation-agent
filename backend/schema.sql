CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS projects (id uuid PRIMARY KEY, name text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS documents (
 id uuid PRIMARY KEY, project_id uuid REFERENCES projects(id), name text NOT NULL, role text NOT NULL,
 sha256 text NOT NULL, version integer NOT NULL, storage_key text NOT NULL, extraction jsonb NOT NULL,
 confirmed boolean DEFAULT false, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chunks (
 id uuid PRIMARY KEY, document_id uuid REFERENCES documents(id), project_id uuid REFERENCES projects(id),
 location text NOT NULL, content text NOT NULL, embedding vector(768), embedding_model text,
 search tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);
CREATE INDEX IF NOT EXISTS chunks_search ON chunks USING gin(search);
CREATE TABLE IF NOT EXISTS jobs (
 id uuid PRIMARY KEY, project_id uuid REFERENCES projects(id), status text NOT NULL DEFAULT 'queued',
 stage text DEFAULT 'Queued', attempts integer DEFAULT 0, lease_until timestamptz,
 snapshot jsonb NOT NULL, result jsonb, error text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS decisions (
 id bigserial PRIMARY KEY, job_id uuid REFERENCES jobs(id), finding_id text NOT NULL,
 disposition text NOT NULL, reason text NOT NULL, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events (
 id bigserial PRIMARY KEY, project_id uuid REFERENCES projects(id), kind text NOT NULL,
 payload jsonb NOT NULL, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS relationships (
 job_id uuid REFERENCES jobs(id), source text NOT NULL, relation text NOT NULL, target text NOT NULL,
 evidence_ids jsonb NOT NULL, PRIMARY KEY(job_id, source, relation, target)
);
