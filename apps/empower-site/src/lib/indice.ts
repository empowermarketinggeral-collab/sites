// Índice de Posição: cálculo, perfil, fit e dados para o CRM (Big Boss).
// Regras do briefing: total = soma/45×100; dimensão = soma/9×100; as duas
// dimensões mais fracas desempatam pela ordem D1 > D2 > D4 > D3 > D5.

export interface Dimension { id: string; name: string; block: string; questions: unknown[] }
export interface Profile { min: number; tag: string; name: string; text: string }
export interface IndiceConfig {
  dimensions: Dimension[];
  profiles: Profile[];
  tieBreak: string[];
  focusSectors: string[];
}
export type Qualification = Record<'setor' | 'faturacao' | 'papel' | 'objetivo_12m' | 'intencao', string>;

export interface IndiceResult {
  total: number;
  byDimension: { id: string; name: string; score: number }[];
  weakest: [Dimension, Dimension];
  profile: Profile;
}

/** answers: 15 pontos (0–3), pela ordem das perguntas (3 por dimensão). */
export function computeIndice(config: IndiceConfig, answers: number[]): IndiceResult {
  if (answers.length !== config.dimensions.length * 3 || answers.some((a) => !(a >= 0 && a <= 3))) {
    throw new Error('Respostas incompletas.');
  }
  const sum = answers.reduce((a, b) => a + b, 0);
  const total = Math.round((sum / 45) * 100);
  const byDimension = config.dimensions.map((d, i) => {
    const s = answers[i * 3] + answers[i * 3 + 1] + answers[i * 3 + 2];
    return { id: d.id, name: d.name, score: Math.round((s / 9) * 100) };
  });
  const rank = (id: string) => config.tieBreak.indexOf(id);
  const sorted = [...byDimension].sort((a, b) => a.score - b.score || rank(a.id) - rank(b.id));
  const dim = (id: string) => config.dimensions.find((d) => d.id === id)!;
  const profile = [...config.profiles].sort((a, b) => b.min - a.min).find((p) => total >= p.min)!;
  return { total, byDimension, weakest: [dim(sorted[0].id), dim(sorted[1].id)], profile };
}

/** fit:icp-sim / icp-talvez / icp-nao, conforme a tabela de encaminhamento. */
export function computeFit(config: IndiceConfig, q: Qualification): 'icp-sim' | 'icp-talvez' | 'icp-nao' {
  if (q.faturacao === '<100k') return 'icp-nao';
  const bigEnough = q.faturacao === '250k-1M' || q.faturacao === '>1M';
  const decisionMaker = q.papel === 'fundador' || q.papel === 'direcao';
  if (config.focusSectors.includes(q.setor) && bigEnough && decisionMaker) return 'icp-sim';
  return 'icp-talvez';
}

export interface Contact { firstName: string; email: string; brand: string; site: string; newsletter: boolean }

/** Corpo para a função lead-intake do Big Boss (máx. 10 tags e 20 campos). */
export function buildLeadPayload(config: IndiceConfig, q: Qualification, answers: number[], c: Contact, source: string) {
  const r = computeIndice(config, answers);
  const fit = computeFit(config, q);
  const tags = [
    `setor:${q.setor}`,
    `fit:${fit}`,
    'diagnostico:concluido',
    `diagnostico:${r.profile.tag}`,
  ];
  if (q.intencao === 'Este trimestre') tags.push('sinal:intencao-alta');
  if (c.newsletter) tags.push('newsletter:ativo');

  const custom_fields: Record<string, string> = {
    nome_marca: c.brand,
    indice_total: String(r.total),
    ...Object.fromEntries(r.byDimension.map((d) => [`indice_${d.id}`, String(d.score)])),
    dimensao_fraca_1: r.weakest[0].name,
    dimensao_fraca_2: r.weakest[1].name,
    indice_dimensao_fraca_1: String(r.byDimension.find((d) => d.id === r.weakest[0].id)!.score),
    perfil: r.profile.name,
    texto_perfil: r.profile.text,
    bloco_dimensao_fraca_1: r.weakest[0].block,
    bloco_dimensao_fraca_2: r.weakest[1].block,
    objetivo_12m: q.objetivo_12m,
    intencao: q.intencao,
    faturacao: q.faturacao,
    papel: q.papel,
  };
  if (c.site) custom_fields.site_instagram = c.site;

  return {
    first_name: c.firstName,
    email: c.email,
    source,
    tags,
    consent_email: c.newsletter,
    custom_fields,
    result: r,
  };
}
