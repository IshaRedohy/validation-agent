export const base = '/api/v1';
export async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : `Request failed (${response.status})`);
  }
  return response.json();
}
export type Evidence = { id: string; text: string; location: string };
export type RiskRow = Record<string, string | number | string[]> & { evidence_ids: string[] };
export type Document = { id: string; name: string; version: number; role: string; confirmed: boolean;
  extraction: { chunks: Evidence[]; rows: RiskRow[]; requirements: Record<string,string[]>; warnings: string[] } };
export type Finding = { id: string; risk_id?: string; category: string; priority: string; rationale: string;
  action: string; evidence_ids: string[]; kind: string; rule: string };
export type Review = { id: string; status: string; stage: string; error?: string; decisions?: {finding_id:string; disposition:string; reason:string}[];
  result?: { findings: Finding[]; rows_reviewed: number; limitations: string[];
    semantic_reviews: {risk_id:string; assessment:string; sufficient_evidence:boolean}[] } };
