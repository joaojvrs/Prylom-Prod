// ─── Types ───────────────────────────────────────────────────────────────────

export interface CulturaData {
  ativo: string;
  municipio: string;
  ano: string;
  area_plantada: number;
  area_colheita: number;
  produtividade: number;
  unidade_prod: string;
}

export interface RebanhoData {
  tipo: string;
  quantidade: number;
}

export interface SilviculturaData {
  descricao: string;
  producao: number;
  unidade: string;
}

export interface MesClima {
  mes: string;
  chuva_mm: number;
  temp_c: number;
  temp_max_c: number | null;
  temp_min_c: number | null;
}

export interface ClimaData {
  meses: MesClima[];
  anual: {
    chuva_total: number;
    temp_media: number;
    temp_max: number | null;
    temp_min: number | null;
    umidade: number | null;
    vento_ms: number | null;
    radiacao_mj: number | null;
    et0_anual: number | null;
    koppen: string;
    meses_secos: number;
  };
  lat: number;
  lng: number;
}

export interface MunicipioData {
  populacao: number | null;
  pib_mil_reais: number | null;
  pib_per_capita: number | null;
  ano_populacao: string;
  ano_pib: string;
}

export interface ReservaLegalData {
  area_rl_ha: number | null;
  area_app_ha: number | null;
}

export interface DesmatamentoData {
  total_ha: number;
  qty: number;
  ano_mais_recente: string | null;
}

export interface VegetacaoNativaData {
  area_ha: number;
}

export interface MeioFisicoData {
  elevacao_m: number | null;
  relevo: string | null;
  tipo_solo: string | null;
  aptidao_agricola: string | null;
  rios: string[] | null;
  rodovias: string[] | null;
  cidades_proximas: Array<{ nome: string; km: number; tipo: string }> | null;
}

export type ClassificacaoScore =
  | 'Excelente'
  | 'Muito Bom'
  | 'Bom'
  | 'Regular'
  | 'Atenção'
  | 'Crítico';

export interface ScoreCriterio {
  nome: string;
  pontos: number;
  maxPontos: number;
  descricao: string;
  disponivel: boolean;
}

export interface ScoreData {
  total: number;
  classificacao: ClassificacaoScore;
  criterios: ScoreCriterio[];
}

export interface ReportData {
  numeroPDF: string;
  dataEmissao: string;
  horaEmissao: string;
  usuarioNome: string;
  usuarioEmail: string;
  bioma: string;
  rl_minima_pct: number;
  car: {
    codigo: string;
    nomeImovel: string;
    areaTotal: number;
    municipio: string;
    estado: string;
    situacao: string;
  };
  sigef: {
    numeroCCIR: string;
    situacaoCertificacao: string;
    areaCertificada: number;
  } | null;
  score: ScoreData;
  coordenadas: { lat: number; lng: number } | null;
  embargos: Array<{
    numero: string;
    data: string;
    motivo: string;
    areaEmbargada: number;
    situacao: string;
  }>;
  focosIncendio5Anos: number | null;
  culturasTemporarias: CulturaData[];
  culturasPerma: CulturaData[];
  rebanhos: RebanhoData[];
  silvicultura: SilviculturaData[];
  clima: ClimaData | null;
  municipioData: MunicipioData | null;
  reservaLegal: ReservaLegalData | null;
  desmatamento: DesmatamentoData | null;
  vegetacaoNativa: VegetacaoNativaData | null;
  meioFisico: MeioFisicoData | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const IBGE_SIDRA = 'https://apisidra.ibge.gov.br/values';
const NASA_POWER = 'https://power.larc.nasa.gov/api/temporal/climatology/point';
const SICAR_BASE = 'https://consultapublica.car.gov.br/publico';

const ATIVOS = [
  'Soja', 'Milho', 'Cana-de-açúcar', 'Algodão', 'Café',
  'Laranja', 'Arroz', 'Feijão', 'Trigo', 'Mandioca',
  'Eucalipto', 'Cacau', 'Banana', 'Uva', 'Borracha', 'Tomate', 'Sorgo',
];

const MESES = [
  { nome: 'Jan', chave: 'JAN', dias: 31 },
  { nome: 'Fev', chave: 'FEB', dias: 28 },
  { nome: 'Mar', chave: 'MAR', dias: 31 },
  { nome: 'Abr', chave: 'APR', dias: 30 },
  { nome: 'Mai', chave: 'MAY', dias: 31 },
  { nome: 'Jun', chave: 'JUN', dias: 30 },
  { nome: 'Jul', chave: 'JUL', dias: 31 },
  { nome: 'Ago', chave: 'AUG', dias: 31 },
  { nome: 'Set', chave: 'SEP', dias: 30 },
  { nome: 'Out', chave: 'OCT', dias: 31 },
  { nome: 'Nov', chave: 'NOV', dias: 30 },
  { nome: 'Dez', chave: 'DEC', dias: 31 },
];

const BIOMA_POR_ESTADO: Record<string, { nome: string; rl_pct: number }> = {
  AC: { nome: 'Amazônia',                      rl_pct: 80 },
  AL: { nome: 'Mata Atlântica',                rl_pct: 20 },
  AM: { nome: 'Amazônia',                      rl_pct: 80 },
  AP: { nome: 'Amazônia',                      rl_pct: 80 },
  BA: { nome: 'Caatinga / Cerrado',            rl_pct: 20 },
  CE: { nome: 'Caatinga',                      rl_pct: 20 },
  DF: { nome: 'Cerrado',                       rl_pct: 20 },
  ES: { nome: 'Mata Atlântica',                rl_pct: 20 },
  GO: { nome: 'Cerrado',                       rl_pct: 20 },
  MA: { nome: 'Amazônia / Cerrado',            rl_pct: 80 },
  MG: { nome: 'Cerrado / Mata Atlântica',      rl_pct: 20 },
  MS: { nome: 'Cerrado / Pantanal',            rl_pct: 20 },
  MT: { nome: 'Amazônia / Cerrado',            rl_pct: 80 },
  PA: { nome: 'Amazônia',                      rl_pct: 80 },
  PB: { nome: 'Caatinga',                      rl_pct: 20 },
  PE: { nome: 'Caatinga / Mata Atlântica',     rl_pct: 20 },
  PI: { nome: 'Caatinga / Cerrado',            rl_pct: 20 },
  PR: { nome: 'Mata Atlântica',                rl_pct: 20 },
  RJ: { nome: 'Mata Atlântica',                rl_pct: 20 },
  RN: { nome: 'Caatinga',                      rl_pct: 20 },
  RO: { nome: 'Amazônia',                      rl_pct: 80 },
  RR: { nome: 'Amazônia',                      rl_pct: 80 },
  RS: { nome: 'Pampa / Mata Atlântica',        rl_pct: 20 },
  SC: { nome: 'Mata Atlântica',                rl_pct: 20 },
  SE: { nome: 'Mata Atlântica / Caatinga',     rl_pct: 20 },
  SP: { nome: 'Mata Atlântica / Cerrado',      rl_pct: 20 },
  TO: { nome: 'Cerrado (Amazônia Legal)',      rl_pct: 35 },
};

const APTIDAO_ESTADO: Record<string, string> = {
  AC: 'Restrita (Floresta Amazônica)',
  AL: 'Regular para Lavouras',
  AM: 'Restrita (Floresta Amazônica)',
  AP: 'Restrita (Floresta Amazônica)',
  BA: 'Restrita/Regular (Sertão/Oeste Baiano)',
  CE: 'Restrita para Pastagem (Semiárido)',
  DF: 'Regular para Lavouras (Cerrado)',
  ES: 'Regular para Lavouras',
  GO: 'Boa para Lavouras (Cerrado)',
  MA: 'Regular para Lavouras (MATOPIBA)',
  MG: 'Regular para Lavouras (Cerrado/Mata Atlântica)',
  MS: 'Boa para Lavouras (Cerrado/Pantanal)',
  MT: 'Boa para Lavouras (Cerrado/Amazônia)',
  PA: 'Restrita (Floresta Amazônica)',
  PB: 'Restrita para Pastagem (Semiárido)',
  PE: 'Restrita para Pastagem (Semiárido)',
  PI: 'Regular (MATOPIBA) / Restrita Pastagem (Semiárido)',
  PR: 'Boa para Lavouras (Sul)',
  RJ: 'Regular para Lavouras',
  RN: 'Restrita para Pastagem (Semiárido)',
  RO: 'Regular para Lavouras (Floresta/Cerrado)',
  RR: 'Restrita (Floresta Amazônica)',
  RS: 'Boa para Lavouras (Sul)',
  SC: 'Boa para Lavouras (Sul)',
  SE: 'Regular para Lavouras',
  SP: 'Regular a Boa para Lavouras',
  TO: 'Regular para Lavouras (Cerrado)',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseNum(val: string): number {
  if (!val || val === '-' || val === '...' || val === '0') return 0;
  return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
}

export function extractIbgeCode(carCode: string): string | null {
  const parts = carCode.trim().split('-');
  if (parts.length < 2) return null;
  const code = parts[1];
  return /^\d{7}$/.test(code) ? code : null;
}

export function gerarNumeroPDF(): string {
  const prefixos = ['AA', 'AB', 'AC', 'BA', 'CA'];
  const p = prefixos[Math.floor(Math.random() * prefixos.length)];
  return `${p}${String(Math.floor(Math.random() * 8999) + 1000)}`;
}

// ─── Score — Metodologia Prylom Smart Fazendas ───────────────────────────────
//
// Critério                         Máx.   Descrição
// ─────────────────────────────────────────────────────────────
// 1. Situação do CAR               200    Ativo=200, Pendente=100, Suspenso=30, Cancelado=0
// 2. Embargos IBAMA                250    0=250, 1=80, 2=30, 3+=0
// 3. Certificação SIGEF/INCRA      200    Certificado=200, Não=50, N/D=100(neutro)
// 4. Focos de incêndio (5 anos)    150    0=150, 1-3=120, 4-10=80, 11-20=40, 21+=0, N/D=75(neutro)
// 5. Sobreposições socioambientais 100    N/D → 50 (neutro)
// 6. Passivo ambiental/desmatament 100    N/D → 50 (neutro)
//                               ──────
//                          Total: 1000

export function calcScore(params: {
  situacaoCar: string;
  embargosQtd: number;
  sigefCertificado: boolean | null;
  focos: number | null;
  desmatamento_ha?: number | null;
  area_total?: number;
}): ScoreData {
  const criterios: ScoreCriterio[] = [];

  // 1. Situação CAR (200 pts)
  const s = params.situacaoCar.toLowerCase();
  const ptsCar =
    s.includes('ativo') ? 200 :
    s.includes('pendente') ? 100 :
    s.includes('suspenso') ? 30 : 0;
  criterios.push({
    nome: 'Situação do CAR',
    pontos: ptsCar,
    maxPontos: 200,
    disponivel: true,
    descricao: `Situação: "${params.situacaoCar}". Ativo=200pts · Pendente=100pts · Suspenso=30pts · Cancelado=0pts.`,
  });

  // 2. Embargos IBAMA (250 pts)
  const ptsEmb =
    params.embargosQtd === 0 ? 250 :
    params.embargosQtd === 1 ? 80 :
    params.embargosQtd === 2 ? 30 : 0;
  criterios.push({
    nome: 'Embargos IBAMA',
    pontos: ptsEmb,
    maxPontos: 250,
    disponivel: true,
    descricao: `${params.embargosQtd} embargo(s) encontrado(s). Nenhum=250pts · 1=80pts · 2=30pts · 3+=0pts.`,
  });

  // 3. Certificação SIGEF (200 pts)
  const ptsSigef =
    params.sigefCertificado === null ? 100 :
    params.sigefCertificado ? 200 : 50;
  criterios.push({
    nome: 'Certificação SIGEF / INCRA',
    pontos: ptsSigef,
    maxPontos: 200,
    disponivel: params.sigefCertificado !== null,
    descricao:
      params.sigefCertificado === null
        ? 'Não verificado — pontuação neutra (100pts).'
        : params.sigefCertificado
          ? 'Imóvel certificado no SIGEF/INCRA. (200pts)'
          : 'Imóvel não certificado no SIGEF/INCRA. (50pts)',
  });

  // 4. Focos de Incêndio (150 pts)
  const ptsFocos =
    params.focos === null ? 75 :
    params.focos === 0 ? 150 :
    params.focos <= 3 ? 120 :
    params.focos <= 10 ? 80 :
    params.focos <= 20 ? 40 : 0;
  criterios.push({
    nome: 'Focos de Incêndio (5 anos)',
    pontos: ptsFocos,
    maxPontos: 150,
    disponivel: params.focos !== null,
    descricao:
      params.focos === null
        ? 'Dado não disponível — pontuação neutra (75pts).'
        : `${params.focos} foco(s) detectado(s) nos últimos 5 anos. 0=150pts · 1-3=120pts · 4-10=80pts · 11-20=40pts · 21+=0pts.`,
  });

  // 5. Sobreposições Socioambientais (100 pts) — sem dados → neutro
  criterios.push({
    nome: 'Sobreposições Socioambientais',
    pontos: 50,
    maxPontos: 100,
    disponivel: false,
    descricao:
      'UCs, terras indígenas, quilombolas e assentamentos. Consulta não realizada em tempo real — pontuação neutra (50pts).',
  });

  // 6. Passivo Ambiental / Desmatamento (100 pts)
  const desmatHa  = params.desmatamento_ha ?? null;
  const areaTotal = params.area_total ?? 0;
  const pctDesmat = desmatHa !== null && areaTotal > 0 ? desmatHa / areaTotal : null;
  const ptsDesmat =
    pctDesmat === null ? 50 :
    pctDesmat === 0   ? 100 :
    pctDesmat < 0.05  ? 70 :
    pctDesmat < 0.20  ? 30 : 0;
  criterios.push({
    nome: 'Passivo Ambiental / Desmatamento',
    pontos: ptsDesmat,
    maxPontos: 100,
    disponivel: pctDesmat !== null,
    descricao:
      pctDesmat === null
        ? 'Análise PRODES/DETER e autos de infração. Consulta não realizada em tempo real — pontuação neutra (50pts).'
        : pctDesmat === 0
          ? 'Nenhum polígono de desmatamento detectado no imóvel (SICAR). (100pts)'
          : `${desmatHa!.toFixed(2)} ha desmatados detectados no imóvel (${(pctDesmat * 100).toFixed(1)}% da área). ${
              pctDesmat < 0.05 ? '70pts' : pctDesmat < 0.20 ? '30pts — passivo relevante.' : '0pts — passivo crítico.'
            }`,
  });

  const total = criterios.reduce((sum, c) => sum + c.pontos, 0);
  const classificacao: ClassificacaoScore =
    total >= 800 ? 'Excelente' :
    total >= 650 ? 'Muito Bom' :
    total >= 500 ? 'Bom' :
    total >= 350 ? 'Regular' :
    total >= 200 ? 'Atenção' : 'Crítico';

  return { total, classificacao, criterios };
}

// ─── Geocodificação (Nominatim / OpenStreetMap) ───────────────────────────────

async function fetchCoords(
  municipio: string,
  estado: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${municipio}, ${estado}, Brasil`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`,
      { headers: { 'User-Agent': 'Prylom/1.0' } },
    );
    const data = await res.json();
    if (data.length > 0)
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    return null;
  } catch {
    return null;
  }
}

// ─── IBGE SIDRA — Lavouras Temporárias (tabela 1612) ─────────────────────────

async function fetchCulturasTemp(ibgeCode: string): Promise<CulturaData[]> {
  try {
    const res = await fetch(
      `${IBGE_SIDRA}/t/1612/n6/${ibgeCode}/v/all/p/last%201/c81/all`,
    );
    if (!res.ok) return [];
    const rows = await res.json();
    const map: Record<string, CulturaData> = {};

    for (const d of rows) {
      if (d.V === 'Valor') continue;
      const ativo = (d.D4N || '').split(' (')[0].split('*')[0].trim();
      const val = parseNum(d.V);
      const varNome = (d.D2N || '').toLowerCase();
      if (!ATIVOS.some(a => ativo.includes(a)) || val === 0) continue;
      if (!map[ativo])
        map[ativo] = { ativo, municipio: d.D1N, ano: d.D3N, area_plantada: 0, area_colheita: 0, produtividade: 0, unidade_prod: '' };
      if (varNome.includes('plantada')) map[ativo].area_plantada = val;
      else if (varNome.includes('colhida') || varNome.includes('colheita')) map[ativo].area_colheita = val;
      else if (varNome.includes('rendimento') || varNome.includes('produtividade')) {
        map[ativo].produtividade = val;
        map[ativo].unidade_prod = d.MN || 'kg/ha';
      }
    }

    return Object.values(map)
      .map(i => {
        if (!i.area_colheita && i.area_plantada) i.area_colheita = i.area_plantada;
        if (!i.area_plantada && i.area_colheita) i.area_plantada = i.area_colheita;
        return i;
      })
      .filter(i => i.produtividade > 0)
      .sort((a, b) => b.produtividade - a.produtividade);
  } catch {
    return [];
  }
}

// ─── IBGE SIDRA — Lavouras Permanentes (tabela 1613) ─────────────────────────

async function fetchCulturasPerma(ibgeCode: string): Promise<CulturaData[]> {
  try {
    const res = await fetch(
      `${IBGE_SIDRA}/t/1613/n6/${ibgeCode}/v/all/p/last%201/c82/all`,
    );
    if (!res.ok) return [];
    const rows = await res.json();
    const map: Record<string, CulturaData> = {};

    for (const d of rows) {
      if (d.V === 'Valor') continue;
      const ativo = (d.D4N || '').split(' (')[0].split('*')[0].trim();
      const val = parseNum(d.V);
      const varNome = (d.D2N || '').toLowerCase();
      if (!ATIVOS.some(a => ativo.includes(a)) || val === 0) continue;
      if (!map[ativo])
        map[ativo] = { ativo, municipio: d.D1N, ano: d.D3N, area_plantada: 0, area_colheita: 0, produtividade: 0, unidade_prod: '' };
      if (varNome.includes('colheita') || varNome.includes('colhida')) {
        map[ativo].area_colheita = val;
        map[ativo].area_plantada = val;
      } else if (varNome.includes('rendimento') || varNome.includes('produtividade')) {
        map[ativo].produtividade = val;
        map[ativo].unidade_prod = d.MN || 'kg/ha';
      }
    }

    return Object.values(map)
      .filter(i => i.produtividade > 0)
      .sort((a, b) => b.produtividade - a.produtividade);
  } catch {
    return [];
  }
}

// ─── IBGE SIDRA — Rebanhos (tabela 3939) ─────────────────────────────────────

async function fetchRebanhos(ibgeCode: string): Promise<RebanhoData[]> {
  try {
    const res = await fetch(
      `${IBGE_SIDRA}/t/3939/n6/${ibgeCode}/v/105/p/last%201/c79/all`,
    );
    if (!res.ok) return [];
    const rows = await res.json();
    const result: RebanhoData[] = [];

    for (const d of rows) {
      if (d.V === 'Valor') continue;
      const tipo = (d.D4N || '').trim();
      const qtd = parseNum(d.V);
      if (tipo && qtd > 0) result.push({ tipo, quantidade: qtd });
    }

    return result.sort((a, b) => b.quantidade - a.quantidade);
  } catch {
    return [];
  }
}

// ─── IBGE SIDRA — Silvicultura (tabela 289) ───────────────────────────────────

async function fetchSilvicultura(ibgeCode: string): Promise<SilviculturaData[]> {
  try {
    const res = await fetch(
      `${IBGE_SIDRA}/t/289/n6/${ibgeCode}/v/142/p/last%201/c80/all`,
    );
    if (!res.ok) return [];
    const rows = await res.json();
    const result: SilviculturaData[] = [];

    for (const d of rows) {
      if (d.V === 'Valor') continue;
      const desc = (d.D4N || '').trim();
      const prod = parseNum(d.V);
      if (desc) result.push({ descricao: desc, producao: prod, unidade: d.MN || 'm³' });
    }

    return result;
  } catch {
    return [];
  }
}

// ─── IBGE SIDRA — Dados Municipais: PIB e População ─────────────────────────

export async function fetchMunicipio(ibgeCode: string): Promise<MunicipioData> {
  const empty: MunicipioData = {
    populacao: null, pib_mil_reais: null, pib_per_capita: null,
    ano_populacao: '—', ano_pib: '—',
  };

  try {
    // PIB (tabela 5938): v/6575 = PIB R$1.000, v/513 = PIB per capita R$1,00
    const [resPop, resPib] = await Promise.all([
      fetch(`${IBGE_SIDRA}/t/6579/n6/${ibgeCode}/v/93/p/last%201`),
      fetch(`${IBGE_SIDRA}/t/5938/n6/${ibgeCode}/v/6575,513/p/last%201`),
    ]);

    const result = { ...empty };

    if (resPop.ok) {
      const rows = await resPop.json();
      const row = rows.find((r: any) => r.V !== 'Valor');
      if (row) {
        result.populacao = parseNum(row.V) || null;
        result.ano_populacao = row.D3N ?? '—';
      }
    }

    if (resPib.ok) {
      const rows = await resPib.json();
      for (const row of rows) {
        if (row.V === 'Valor') continue;
        const varId = row.D2C ?? '';
        if (varId === '6575') {
          result.pib_mil_reais = parseNum(row.V) || null;
          result.ano_pib = row.D3N ?? '—';
        } else if (varId === '513') {
          result.pib_per_capita = parseNum(row.V) || null;
        }
      }
    }

    return result;
  } catch {
    return empty;
  }
}

// ─── SICAR — Reserva Legal e APP ─────────────────────────────────────────────

export async function fetchReservaLegal(carCodigo: string): Promise<ReservaLegalData> {
  const empty: ReservaLegalData = { area_rl_ha: null, area_app_ha: null };
  try {
    const cod = encodeURIComponent(carCodigo.trim());
    const [resRL, resAPP] = await Promise.all([
      fetch(`${SICAR_BASE}/imoveis/${cod}/reservaslegais`),
      fetch(`${SICAR_BASE}/imoveis/${cod}/apps`),
    ]);

    const result = { ...empty };

    if (resRL.ok) {
      const geojson = await resRL.json();
      const features = geojson?.features ?? (Array.isArray(geojson) ? geojson : []);
      const total = features.reduce((sum: number, f: any) => {
        const area = parseFloat(f?.properties?.num_area ?? f?.properties?.area ?? 0);
        return sum + (isNaN(area) ? 0 : area);
      }, 0);
      if (total > 0) result.area_rl_ha = parseFloat(total.toFixed(4));
    }

    if (resAPP.ok) {
      const geojson = await resAPP.json();
      const features = geojson?.features ?? (Array.isArray(geojson) ? geojson : []);
      const total = features.reduce((sum: number, f: any) => {
        const area = parseFloat(f?.properties?.num_area ?? f?.properties?.area ?? 0);
        return sum + (isNaN(area) ? 0 : area);
      }, 0);
      if (total > 0) result.area_app_ha = parseFloat(total.toFixed(4));
    }

    return result;
  } catch {
    return empty;
  }
}

// ─── SICAR — Desmatamentos detectados no imóvel ───────────────────────────────

export async function fetchDesmatamentos(carCodigo: string): Promise<DesmatamentoData | null> {
  try {
    const cod = encodeURIComponent(carCodigo.trim());
    const res = await fetch(`${SICAR_BASE}/imoveis/${cod}/desmatamentos`);
    if (!res.ok) return null;
    const geojson = await res.json();
    const features = geojson?.features ?? (Array.isArray(geojson) ? geojson : []);
    if (features.length === 0) return { total_ha: 0, qty: 0, ano_mais_recente: null };

    let total = 0;
    let anoMaisRecente: string | null = null;
    for (const f of features) {
      const area = parseFloat(
        f?.properties?.num_area ?? f?.properties?.des_area ?? f?.properties?.area ?? 0,
      );
      if (!isNaN(area)) total += area;
      const data =
        f?.properties?.dat_referencia ??
        f?.properties?.dat_deteccao ??
        f?.properties?.dat_publicacao ??
        null;
      if (data && (!anoMaisRecente || String(data) > String(anoMaisRecente))) {
        anoMaisRecente = String(data);
      }
    }
    return { total_ha: parseFloat(total.toFixed(4)), qty: features.length, ano_mais_recente: anoMaisRecente };
  } catch {
    return null;
  }
}

// ─── SICAR — Vegetação Nativa ─────────────────────────────────────────────────

export async function fetchVegetacaoNativa(carCodigo: string): Promise<VegetacaoNativaData | null> {
  try {
    const cod = encodeURIComponent(carCodigo.trim());
    const res = await fetch(`${SICAR_BASE}/imoveis/${cod}/vegetacaonativa`);
    if (!res.ok) return null;
    const geojson = await res.json();
    const features = geojson?.features ?? (Array.isArray(geojson) ? geojson : []);
    if (features.length === 0) return null;

    let total = 0;
    for (const f of features) {
      const area = parseFloat(
        f?.properties?.num_area ?? f?.properties?.veg_area ?? f?.properties?.area ?? 0,
      );
      if (!isNaN(area)) total += area;
    }
    if (total === 0) return null;
    return { area_ha: parseFloat(total.toFixed(4)) };
  } catch {
    return null;
  }
}

// ─── Classificação Climática de Köppen (derivada dos dados NASA POWER) ────────

function classificarKoppen(meses: { chuva_mm: number; temp_c: number }[]): string {
  if (meses.length < 12) return 'Nao classificavel';
  const totalAnual = meses.reduce((s, m) => s + m.chuva_mm, 0);
  const tempMedia  = meses.reduce((s, m) => s + m.temp_c, 0) / 12;
  const tempMinMes = Math.min(...meses.map(m => m.temp_c));
  const tempMaxMes = Math.max(...meses.map(m => m.temp_c));
  const chuvaMinMes = Math.min(...meses.map(m => m.chuva_mm));

  // Tropical: mes mais frio >= 18 °C
  if (tempMinMes >= 18) {
    if (chuvaMinMes >= 60) return 'Af — Tropical Equatorial';
    if (chuvaMinMes >= 100 - totalAnual / 25) return 'Am — Tropical de Monsao';
    return 'Aw — Tropical de Savana';
  }

  // Limiar de aridez (Thornthwaite simplificado)
  const chuvaVerao = [9, 10, 11, 0, 1, 2].reduce((s, i) => s + meses[i].chuva_mm, 0);
  const pctVerao   = totalAnual > 0 ? chuvaVerao / totalAnual : 0;
  const limiarArid = pctVerao >= 0.70 ? 20 * (tempMedia + 14)
                   : pctVerao <= 0.30 ? 20 * tempMedia
                   : 20 * (tempMedia + 7);
  if (totalAnual < limiarArid / 2) return 'BWh — Arido Quente';
  if (totalAnual < limiarArid)
    return tempMedia >= 18 ? 'BSh — Semiarido Quente' : 'BSk — Semiarido Frio';

  // Temperado (C): inverno = mai-ago (hemisfério sul), verao = out-mar
  const invMin = Math.min(...[3, 4, 5, 6, 7, 8].map(i => meses[i].chuva_mm));
  const verMax = Math.max(...[9, 10, 11, 0, 1, 2].map(i => meses[i].chuva_mm));
  if (invMin < verMax / 10)
    return tempMaxMes >= 22 ? 'Cwa — Subtropical de Monsao' : 'Cwb — Subtropical de Altitude';
  return tempMaxMes >= 22 ? 'Cfa — Subtropical Umido' : 'Cfb — Oceanico Temperado';
}

// ─── NASA POWER — Climatologia Histórica ─────────────────────────────────────

async function fetchClima(lat: number, lng: number): Promise<ClimaData | null> {
  try {
    const params = new URLSearchParams({
      parameters: 'PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,RH2M,WS10M,ALLSKY_SFC_SW_DWN,EVPTRNS',
      community: 'AG',
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      format: 'JSON',
    });
    const res = await fetch(`${NASA_POWER}?${params}`);
    if (!res.ok) return null;
    const json = await res.json();
    const p = json?.properties?.parameter;
    if (!p) return null;

    const meses: MesClima[] = MESES.map(m => ({
      mes: m.nome,
      chuva_mm: parseFloat(((p.PRECTOTCORR?.[m.chave] ?? 0) * m.dias).toFixed(1)),
      temp_c: parseFloat((p.T2M?.[m.chave] ?? 0).toFixed(1)),
      temp_max_c: p.T2M_MAX ? parseFloat((p.T2M_MAX[m.chave] ?? 0).toFixed(1)) : null,
      temp_min_c: p.T2M_MIN ? parseFloat((p.T2M_MIN[m.chave] ?? 0).toFixed(1)) : null,
    }));

    const et0Raw = p.EVPTRNS?.ANN ?? null;

    return {
      meses,
      anual: {
        chuva_total: parseFloat(((p.PRECTOTCORR?.ANN ?? 0) * 365).toFixed(0)),
        temp_media: parseFloat((p.T2M?.ANN ?? 0).toFixed(1)),
        temp_max: p.T2M_MAX?.ANN != null ? parseFloat(Number(p.T2M_MAX.ANN).toFixed(1)) : null,
        temp_min: p.T2M_MIN?.ANN != null ? parseFloat(Number(p.T2M_MIN.ANN).toFixed(1)) : null,
        umidade: p.RH2M?.ANN != null ? parseFloat(Number(p.RH2M.ANN).toFixed(1)) : null,
        vento_ms: p.WS10M?.ANN != null ? parseFloat(Number(p.WS10M.ANN).toFixed(2)) : null,
        radiacao_mj: p.ALLSKY_SFC_SW_DWN?.ANN != null ? parseFloat(Number(p.ALLSKY_SFC_SW_DWN.ANN).toFixed(1)) : null,
        et0_anual: et0Raw != null ? parseFloat((et0Raw * 365).toFixed(0)) : null,
        koppen: classificarKoppen(meses),
        meses_secos: meses.filter(m => m.chuva_mm < 60).length,
      },
      lat,
      lng,
    };
  } catch {
    return null;
  }
}

// ─── INPE — Focos de Incêndio (últimos 5 anos) ───────────────────────────────

async function fetchFocos(ibgeCode: string): Promise<number | null> {
  try {
    const fim = new Date().toISOString().split('T')[0];
    const ini = new Date(Date.now() - 5 * 365.25 * 24 * 3600 * 1000)
      .toISOString()
      .split('T')[0];
    const url =
      `https://queimadas.dgi.inpe.br/queimadas/ams/focos/api/focos/` +
      `?municipio_id=${ibgeCode}&data_inicio=${ini}&data_fim=${fim}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data === 'number') return data;
    if (Array.isArray(data)) return data.length;
    if (data?.total !== undefined) return Number(data.total);
    return null;
  } catch {
    return null;
  }
}

// ─── OpenTopoData — Elevação média (SRTM 30m) ────────────────────────────────

async function fetchElevacao(lat: number, lng: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.opentopodata.org/v1/srtm30m?locations=${lat.toFixed(5)},${lng.toFixed(5)}`,
      { signal: AbortSignal.timeout(18000) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const elev = json?.results?.[0]?.elevation;
    return typeof elev === 'number' ? Math.round(elev) : null;
  } catch {
    return null;
  }
}

// ─── SoilGrids (ISRIC) — Tipo de Solo (WRB) ──────────────────────────────────

async function fetchTipoSolo(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://rest.soilgrids.org/soilgrids/v2.0/classification/query` +
      `?lon=${lng.toFixed(5)}&lat=${lat.toFixed(5)}&number_classes=1`,
      { signal: AbortSignal.timeout(25000) },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const nome = json?.properties?.data?.wrb_class_name;
    return typeof nome === 'string' && nome ? nome : null;
  } catch {
    return null;
  }
}

// ─── EMBRAPA WFS — Aptidão Agrícola (com fallback por estado) ────────────────

async function fetchAptidaoAgricola(lat: number, lng: number, estado?: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://geoinfo.cnps.embrapa.br/geoserver/wfs` +
      `?service=WFS&version=1.1.0&request=GetFeature` +
      `&typeName=aptidao:aptidao_agricola_br` +
      `&outputFormat=application/json&maxFeatures=1` +
      `&CQL_FILTER=INTERSECTS(the_geom,POINT(${lng.toFixed(5)}+${lat.toFixed(5)}))`,
      { signal: AbortSignal.timeout(18000) },
    );
    if (res.ok) {
      const json = await res.json();
      const props = json?.features?.[0]?.properties;
      if (props) {
        const valor = props.LEGENDA ?? props.CLASSE ?? props.legenda ?? props.classe ?? null;
        if (valor) return valor as string;
      }
    }
  } catch {
    // fall through to estado fallback
  }
  if (estado) {
    const uf = estado.toUpperCase().trim();
    const fallback = APTIDAO_ESTADO[uf];
    if (fallback) return `${fallback} (estimativa por UF)`;
  }
  return null;
}

// ─── Overpass API — Rios próximos (50km) ─────────────────────────────────────

async function fetchRios(lat: number, lng: number): Promise<string[] | null> {
  try {
    const query =
      `[out:json][timeout:30];` +
      `(way["waterway"="river"](around:50000,${lat.toFixed(5)},${lng.toFixed(5)}););` +
      `out tags;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(35000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const nomes: string[] = [];
    for (const el of json?.elements ?? []) {
      const nome = el?.tags?.name ?? el?.tags?.['name:pt'];
      if (nome && !nomes.includes(nome)) nomes.push(nome);
    }
    return nomes.length > 0 ? nomes.slice(0, 8) : null;
  } catch {
    return null;
  }
}

// ─── Distância haversine (km) ─────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─── Overpass API — Rodovias próximas (100km) ─────────────────────────────────

async function fetchRodovias(lat: number, lng: number): Promise<string[] | null> {
  try {
    const query =
      `[out:json][timeout:20];` +
      `(way["highway"~"motorway|trunk|primary"](around:100000,${lat.toFixed(5)},${lng.toFixed(5)}););` +
      `out tags;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const vias = new Set<string>();
    for (const el of json?.elements ?? []) {
      const ref  = el?.tags?.ref;
      const name = el?.tags?.name;
      if (ref) vias.add(name ? `${ref} — ${name}` : ref);
    }
    return vias.size > 0 ? [...vias].slice(0, 8) : null;
  } catch {
    return null;
  }
}

// ─── Overpass API — Cidades/municípios próximos (200km) ──────────────────────

async function fetchCidadesProximas(
  lat: number,
  lng: number,
): Promise<Array<{ nome: string; km: number; tipo: string }> | null> {
  try {
    const query =
      `[out:json][timeout:20];` +
      `(node["place"~"city|town"](around:200000,${lat.toFixed(5)},${lng.toFixed(5)}););` +
      `out body;`;
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const cidades: Array<{ nome: string; km: number; tipo: string }> = [];
    for (const el of json?.elements ?? []) {
      const nome = el?.tags?.name ?? el?.tags?.['name:pt'];
      if (!nome || el.lat == null || el.lon == null) continue;
      const tipo = el?.tags?.place === 'city' ? 'Cidade' : 'Municipio';
      const km   = haversineKm(lat, lng, el.lat, el.lon);
      cidades.push({ nome, km, tipo });
    }
    cidades.sort((a, b) => a.km - b.km);
    return cidades.length > 0 ? cidades.slice(0, 6) : null;
  } catch {
    return null;
  }
}

// ─── Compositor Meio Físico ───────────────────────────────────────────────────

async function fetchMeioFisico(lat: number, lng: number, estado?: string): Promise<MeioFisicoData> {
  const [rElev, rSolo, rApt, rRios, rRodov, rCidades] = await Promise.allSettled([
    fetchElevacao(lat, lng),
    fetchTipoSolo(lat, lng),
    fetchAptidaoAgricola(lat, lng, estado),
    fetchRios(lat, lng),
    fetchRodovias(lat, lng),
    fetchCidadesProximas(lat, lng),
  ]);
  const elevacao_m       = rElev.status   === 'fulfilled' ? rElev.value   : null;
  const tipo_solo        = rSolo.status   === 'fulfilled' ? rSolo.value   : null;
  const aptidao_agricola = rApt.status    === 'fulfilled' ? rApt.value    : null;
  const rios             = rRios.status   === 'fulfilled' ? rRios.value   : null;
  const rodovias         = rRodov.status  === 'fulfilled' ? rRodov.value  : null;
  const cidades_proximas = rCidades.status === 'fulfilled' ? rCidades.value : null;

  const relevo =
    elevacao_m === null ? null :
    elevacao_m < 200    ? 'Plano' :
    elevacao_m < 400    ? 'Suave Ondulado' :
    elevacao_m < 700    ? 'Ondulado' : 'Forte Ondulado';
  return { elevacao_m, relevo, tipo_solo, aptidao_agricola, rios, rodovias, cidades_proximas };
}

// ─── Orquestrador principal ───────────────────────────────────────────────────

export async function gerarDadosRelatorio(
  propertyResult: {
    car?: {
      codigo: string;
      nomeImovel: string;
      areaTotal: number;
      municipio: string;
      estado: string;
      situacao: string;
    };
    sigef?: {
      numeroCCIR: string;
      situacaoCertificacao: string;
      areaCertificada: number;
    };
    embargos: Array<{
      numero: string;
      data: string;
      motivo: string;
      areaEmbargada: number;
      situacao: string;
    }>;
  },
  usuario: { email: string },
): Promise<ReportData> {
  const car = propertyResult.car;
  if (!car) throw new Error('Dados do CAR não disponíveis para gerar o relatório.');

  const ibgeCode = extractIbgeCode(car.codigo);
  const now = new Date();

  const [coords, cultsTemp, cultsPerma, rebanhos, silvicultura, focos, municipioData, reservaLegal, desmatamento, vegetacaoNativa] =
    await Promise.all([
      fetchCoords(car.municipio, car.estado),
      ibgeCode ? fetchCulturasTemp(ibgeCode) : Promise.resolve([]),
      ibgeCode ? fetchCulturasPerma(ibgeCode) : Promise.resolve([]),
      ibgeCode ? fetchRebanhos(ibgeCode) : Promise.resolve([]),
      ibgeCode ? fetchSilvicultura(ibgeCode) : Promise.resolve([]),
      ibgeCode ? fetchFocos(ibgeCode) : Promise.resolve(null),
      ibgeCode ? fetchMunicipio(ibgeCode) : Promise.resolve(null),
      fetchReservaLegal(car.codigo),
      fetchDesmatamentos(car.codigo),
      fetchVegetacaoNativa(car.codigo),
    ]);

  const [clima, meioFisico] = coords
    ? await Promise.all([
        fetchClima(coords.lat, coords.lng),
        fetchMeioFisico(coords.lat, coords.lng, car.estado),
      ])
    : [null, null];

  const sigef = propertyResult.sigef ?? null;
  const sigefCert = sigef
    ? sigef.situacaoCertificacao?.toLowerCase().includes('certific') ?? false
    : null;

  const score = calcScore({
    situacaoCar: car.situacao,
    embargosQtd: propertyResult.embargos.length,
    sigefCertificado: sigefCert,
    focos,
    desmatamento_ha: desmatamento?.total_ha ?? null,
    area_total: car.areaTotal,
  });

  const biomaInfo = BIOMA_POR_ESTADO[car.estado.toUpperCase().trim()] ?? { nome: 'Nao identificado', rl_pct: 20 };

  return {
    numeroPDF: gerarNumeroPDF(),
    dataEmissao: now.toLocaleDateString('pt-BR'),
    horaEmissao: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    usuarioNome: usuario.email.split('@')[0],
    usuarioEmail: usuario.email,
    bioma: biomaInfo.nome,
    rl_minima_pct: biomaInfo.rl_pct,
    car,
    sigef,
    score,
    coordenadas: coords,
    embargos: propertyResult.embargos,
    focosIncendio5Anos: focos,
    culturasTemporarias: cultsTemp,
    culturasPerma: cultsPerma,
    rebanhos,
    silvicultura,
    clima,
    municipioData: municipioData ?? null,
    reservaLegal,
    desmatamento: desmatamento ?? null,
    vegetacaoNativa: vegetacaoNativa ?? null,
    meioFisico: meioFisico ?? null,
  };
}
