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
}

export interface ClimaData {
  meses: MesClima[];
  anual: { chuva_total: number; temp_media: number };
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

  // 6. Passivo Ambiental / Desmatamento (100 pts) — sem dados → neutro
  criterios.push({
    nome: 'Passivo Ambiental / Desmatamento',
    pontos: 50,
    maxPontos: 100,
    disponivel: false,
    descricao:
      'Análise PRODES/DETER e autos de infração. Consulta não realizada em tempo real — pontuação neutra (50pts).',
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

// ─── NASA POWER — Climatologia Histórica ─────────────────────────────────────

async function fetchClima(lat: number, lng: number): Promise<ClimaData | null> {
  try {
    const params = new URLSearchParams({
      parameters: 'PRECTOTCORR,T2M',
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
      chuva_mm: parseFloat(
        ((p.PRECTOTCORR?.[m.chave] ?? 0) * m.dias).toFixed(1),
      ),
      temp_c: parseFloat((p.T2M?.[m.chave] ?? 0).toFixed(1)),
    }));

    return {
      meses,
      anual: {
        chuva_total: parseFloat(
          ((p.PRECTOTCORR?.ANN ?? 0) * 365).toFixed(0),
        ),
        temp_media: parseFloat((p.T2M?.ANN ?? 0).toFixed(1)),
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

  const [coords, cultsTemp, cultsPerma, rebanhos, silvicultura, focos, municipioData, reservaLegal] =
    await Promise.all([
      fetchCoords(car.municipio, car.estado),
      ibgeCode ? fetchCulturasTemp(ibgeCode) : Promise.resolve([]),
      ibgeCode ? fetchCulturasPerma(ibgeCode) : Promise.resolve([]),
      ibgeCode ? fetchRebanhos(ibgeCode) : Promise.resolve([]),
      ibgeCode ? fetchSilvicultura(ibgeCode) : Promise.resolve([]),
      ibgeCode ? fetchFocos(ibgeCode) : Promise.resolve(null),
      ibgeCode ? fetchMunicipio(ibgeCode) : Promise.resolve(null),
      fetchReservaLegal(car.codigo),
    ]);

  const clima = coords ? await fetchClima(coords.lat, coords.lng) : null;

  const sigef = propertyResult.sigef ?? null;
  const sigefCert = sigef
    ? sigef.situacaoCertificacao?.toLowerCase().includes('certific') ?? false
    : null;

  const score = calcScore({
    situacaoCar: car.situacao,
    embargosQtd: propertyResult.embargos.length,
    sigefCertificado: sigefCert,
    focos,
  });

  return {
    numeroPDF: gerarNumeroPDF(),
    dataEmissao: now.toLocaleDateString('pt-BR'),
    horaEmissao: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    usuarioNome: usuario.email.split('@')[0],
    usuarioEmail: usuario.email,
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
  };
}
