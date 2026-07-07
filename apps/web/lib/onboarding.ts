/** Agentic onboarding pipeline: link → catalog → interview → sandbox → live. */
import 'server-only';
import {
  getDb,
  importProducts,
  insertFact,
  setFactEmbedding,
  setTenantToneProfile,
  setTenantStatus,
  getTenantMeta,
} from '@khodkar/db';
import {
  DbRetriever,
  CatalogResponder,
  makeCustomerAgent,
  indexTenantCatalog,
} from '@khodkar/agent';
import { crawlSite, type Fetcher } from '@khodkar/crawler';
import { getPreset, type VerticalPreset } from '@khodkar/presets';
import type { Vertical, ToneProfile } from '@khodkar/shared';
import { embedder } from './embeddings.js';
import { ensureWebChannel } from './widget.js';

export interface CrawlSummary {
  source: string;
  products: number;
  warnings: string[];
}

/** Step 1 — crawl the site, import its catalog, and index it for RAG. */
export async function crawlAndImport(
  tenantId: string,
  url: string,
  fetcher?: Fetcher,
): Promise<CrawlSummary> {
  const result = await crawlSite(url, fetcher ? { fetcher } : {});
  await importProducts(
    getDb(),
    tenantId,
    result.products.map((p) => ({
      sku: p.sku,
      title: p.title,
      price: p.price,
      rentPrice: p.rentPrice ?? null,
      deposit: p.deposit ?? null,
      stock: p.stock,
      images: p.images,
      attrs: p.attrs,
    })),
  );
  const idx = await indexTenantCatalog(getDb(), tenantId, embedder);
  return { source: result.source, products: idx.products, warnings: result.warnings.slice(0, 5) };
}

/** The interview questions for a tenant's vertical (gaps to fill). */
export async function getInterviewPlan(
  tenantId: string,
): Promise<{ vertical: string; status: string; questions: VerticalPreset['onboardingQuestions'] }> {
  const meta = await getTenantMeta(getDb(), tenantId);
  if (!meta) return { vertical: '', status: 'onboarding', questions: [] };
  const preset = getPreset(meta.vertical as Vertical);
  return { vertical: meta.vertical, status: meta.status, questions: preset?.onboardingQuestions ?? [] };
}

export interface InterviewAnswer {
  question: string;
  answer: string;
}

/** Step 2 — store interview answers as facts and build the tone profile. */
export async function submitInterview(
  tenantId: string,
  params: { answers: InterviewAnswer[]; toneStyle?: ToneProfile['style']; toneSamples?: string[] },
): Promise<{ facts: number }> {
  const db = getDb();
  let facts = 0;
  for (const a of params.answers) {
    const q = a.question.trim();
    const ans = a.answer.trim();
    if (!q || !ans) continue;
    const id = await insertFact(db, { tenantId, q, a: ans });
    const [emb] = await embedder.embed([`${q} ${ans}`]);
    if (emb) await setFactEmbedding(db, id, emb);
    facts++;
  }

  const tone: ToneProfile = {
    style: params.toneStyle ?? 'friendly',
    samples: (params.toneSamples ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 3),
  };
  await setTenantToneProfile(db, tenantId, tone);
  return { facts };
}

export interface SandboxReply {
  action: 'send' | 'draft' | 'block';
  reply: string;
  proposedText: string;
}

/** Step 3 — sandbox: answer a test message from the tenant's catalog/facts. */
export async function sandboxReply(tenantId: string, text: string): Promise<SandboxReply> {
  const agent = makeCustomerAgent({
    retriever: new DbRetriever(getDb(), tenantId, embedder),
    responder: new CatalogResponder(),
  });
  const r = await agent.respond(text);
  return { action: r.action, reply: r.toCustomer, proposedText: r.ownerDraft ?? r.toCustomer };
}

/** Step 4 — go live: activate and provision the web-widget channel. */
export async function activateTenant(tenantId: string): Promise<void> {
  await setTenantStatus(getDb(), tenantId, 'active');
  await ensureWebChannel(tenantId);
}
