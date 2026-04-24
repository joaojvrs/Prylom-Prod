import React, { useState, useCallback, useRef, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { AppLanguage, AppCurrency } from '../types';
import { supabase } from '../supabaseClient';
import SmartFazendaPDF from './SmartFazendaPDF';
import { gerarDadosRelatorio } from '../services/smartFazendaReport';
 
interface Props {
  onBack: () => void;
  t: any;
  lang: AppLanguage;
  currency: AppCurrency;
}
 
// ─── Types ────────────────────────────────────────────────────────────────────
 
type InputType = 'cpf' | 'cnpj' | 'car' | 'coordinates' | 'unknown';
 
interface CarData {
  codigo: string;
  nomeImovel: string;
  areaTotal: number;
  municipio: string;
  estado: string;
  situacao: string;
  kmlUrl?: string;
}
 
interface SigefData {
  numeroCCIR: string;
  situacaoCertificacao: string;
  areaCertificada: number;
}
 
interface Embargo {
  numero: string;
  data: string;
  motivo: string;
  areaEmbargada: number;
  situacao: string;
}
 
interface PropertyResult {
  car?: CarData;
  sigef?: SigefData;
  embargos: Embargo[];
  vinculados?: string[];
  kmlDisponivel: boolean;
  kml?: string;
}
 
type QueryStatus = 'idle' | 'loading' | 'success' | 'error';
 
type IntencaoConsulta = 'vender' | 'comprar' | 'duvidas';
 
interface StepStatus {
  sicar: 'idle' | 'loading' | 'done' | 'error';
  sigef: 'idle' | 'loading' | 'done' | 'error';
  ibama: 'idle' | 'loading' | 'done' | 'error';
}
 
interface PropriedadeFormatada {
  texto: string;
  temEmbargos: boolean;
  temKml: boolean;
  secoes: {
    propriedade: string;
    documentacao: string;
    embargos: string;
  };
}
 
interface ErroFormatado {
  modulo: string;
  mensagem: string;
  timestamp: string;
  badge: string;
}
 
interface MudancaDetectada {
  campo: string;
  anterior: string;
  atual: string;
}
 
interface AlertaMonitoramento {
  titulo: string;
  subtitulo: string;
  mudancas: MudancaDetectada[];
  timestamp: string;
  texto: string;
}
 
interface MonitoredProperty {
  id: string;
  input: string;
  label: string;
  addedAt: string;
  lastCheck: string;
  status: 'ok' | 'alert';
  codigoCar: string;
  snapshot?: PropertyResult;
  ultimaVerificacaoIso?: string;
}
 
// ─── Utilities ────────────────────────────────────────────────────────────────
 
function detectInputType(raw: string): InputType {
  const clean = raw.replace(/\D/g, '');
  if (/^\d{11}$/.test(clean)) return 'cpf';
  if (/^\d{14}$/.test(clean)) return 'cnpj';
  if (/^[A-Z]{2}-\d{7}-[A-Z0-9]{4}(\.[A-Z0-9]{4}){7}$/i.test(raw.trim())) return 'car';
  if (/^[A-Z]{2}-\d{7}-[A-Z0-9]{32}$/i.test(raw.trim())) return 'car';
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(raw.trim())) return 'coordinates';
  return 'unknown';
}
 
function formatCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
 
function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}
 
// ─── Formatters ───────────────────────────────────────────────────────────────
 
function formatarPropriedade(
  car: CarData | undefined,
  sigef: SigefData | undefined,
  embargos: Embargo[]
): PropriedadeFormatada {
  const secProp = car
    ? [
        '🌾 DADOS DA PROPRIEDADE',
        `📍 Nome: ${car.nomeImovel}`,
        `📐 Área: ${car.areaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} hectares`,
        `🏙️ Município/UF: ${car.municipio} — ${car.estado}`,
        `📋 CAR: ${car.codigo}`,
        `✅ Situação CAR: ${car.situacao}`,
      ].join('\n')
    : '🌾 DADOS DA PROPRIEDADE\n— Não disponível';
 
  const secDoc = sigef
    ? [
        '🗺️ DOCUMENTAÇÃO',
        `📄 CCIR: ${sigef.numeroCCIR}`,
        `🔬 SIGEF: ${sigef.situacaoCertificacao}`,
      ].join('\n')
    : '🗺️ DOCUMENTAÇÃO\n— Não disponível';
 
  const linhasEmbargos = embargos.length === 0
    ? ['✅ Nenhum embargo ativo']
    : embargos.map((e, i) =>
        `  ${i + 1}. Auto nº ${e.numero} | ${e.data}\n     ${e.motivo} | ${e.areaEmbargada.toLocaleString('pt-BR')} ha | ${e.situacao}`
      );
  const secEmb = [`${embargos.length > 0 ? '🚨' : '✅'} EMBARGOS`, ...linhasEmbargos].join('\n');
  const secKml = car?.kmlUrl ? '📎 KML disponível para download' : '';
  const texto = [secProp, secDoc, secEmb, secKml].filter(Boolean).join('\n\n');
 
  return {
    texto,
    temEmbargos: embargos.length > 0,
    temKml: !!car?.kmlUrl,
    secoes: { propriedade: secProp, documentacao: secDoc, embargos: secEmb },
  };
}
 
function formatarErro(modulo: string, mensagem: string): ErroFormatado {
  const moduloUpper = modulo.toUpperCase();
  return {
    modulo: moduloUpper,
    mensagem,
    timestamp: new Date().toLocaleString('pt-BR'),
    badge: `Erro ${moduloUpper}`,
  };
}
 
function formatarAlertaMonitoramento(
  propriedade: { label: string; input: string },
  mudancas: MudancaDetectada[]
): AlertaMonitoramento {
  const timestamp = new Date().toLocaleString('pt-BR');
  const linhasMudancas = mudancas.map(
    m => `  • ${m.campo}: "${m.anterior}" → "${m.atual}"`
  );
  const texto = [
    `⚠️ ALERTA DE MONITORAMENTO — ${timestamp}`,
    `Propriedade: ${propriedade.label}`,
    `Identificador: ${propriedade.input}`,
    '',
    'Mudanças detectadas:',
    ...linhasMudancas,
  ].join('\n');
 
  return {
    titulo: `Mudança detectada em ${propriedade.label}`,
    subtitulo: `${mudancas.length} alteração${mudancas.length > 1 ? 'ões' : ''} em ${timestamp}`,
    mudancas,
    timestamp,
    texto,
  };
}
 
// ─── Constants ────────────────────────────────────────────────────────────────
 
const SICAR_BASE    = 'https://consultapublica.car.gov.br/publico';
const GEOSERVER_WFS = 'https://geoserver.car.gov.br/geoserver/wfs';
const SIGEF_BASE    = 'https://sigef.incra.gov.br/api';
 
const EDGE_FN_URL       = 'https://fqvfwnxfsswbggkzetre.supabase.co/functions/v1/smart-action';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
 
// ─── Cache ────────────────────────────────────────────────────────────────────
 
const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_LS_KEY = 'prylom_rural_cache_v2';

function loadCache(): Map<string, { data: PropertyResult; ts: number }> {
  try {
    const raw = localStorage.getItem(CACHE_LS_KEY);
    if (!raw) return new Map();
    const obj: Record<string, { data: PropertyResult; ts: number }> = JSON.parse(raw);
    const now = Date.now();
    const m = new Map<string, { data: PropertyResult; ts: number }>();
    for (const [k, v] of Object.entries(obj)) {
      if (now - v.ts <= CACHE_TTL) m.set(k, v);
    }
    return m;
  } catch { return new Map(); }
}

function persistCache(m: Map<string, { data: PropertyResult; ts: number }>) {
  try {
    const obj: Record<string, { data: PropertyResult; ts: number }> = {};
    for (const [k, v] of m.entries()) obj[k] = v;
    localStorage.setItem(CACHE_LS_KEY, JSON.stringify(obj));
  } catch {}
}

const cache = loadCache();

function getCached(key: string): PropertyResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); persistCache(cache); return null; }
  return entry.data;
}

function setCached(key: string, data: PropertyResult) {
  cache.set(key, { data, ts: Date.now() });
  persistCache(cache);
}
 
// ─── Fetch helper ─────────────────────────────────────────────────────────────
 
async function fetchWithRetry(url: string, attempts = 3, timeout = 10000): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) return res;
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
 
const SICAR_STATUS_MAP: Record<string, string> = {
  AT: 'Ativo',
  PE: 'Pendente',
  SU: 'Suspenso',
  CA: 'Cancelado',
};
 
// ─── SICAR ────────────────────────────────────────────────────────────────────
 
async function buscarPorCAR(codigoCAR: string): Promise<CarData> {
  const codigo = codigoCAR.trim();
  const url = `${SICAR_BASE}/imoveis/search?text=${encodeURIComponent(codigo)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const geojson = await res.json();
    const feature = geojson?.features?.[0];
    if (!feature) throw new Error('Propriedade não encontrada no SICAR.');
    const p = feature.properties ?? {};
    const estado = codigo.split('-')[0] ?? '--';
    return {
      codigo:     p.codigo    ?? codigo,
      nomeImovel: p.municipio ? `Imóvel em ${p.municipio}` : 'Não informado',
      areaTotal:  parseFloat(p.area ?? 0),
      municipio:  p.municipio ?? 'Não informado',
      estado,
      situacao:   SICAR_STATUS_MAP[p.status] ?? p.status ?? 'Não informado',
      kmlUrl:     `${SICAR_BASE}/imovel/exportarKml/${encodeURIComponent(codigo)}`,
    };
  } catch (err: any) {
    if (err.message?.includes('não encontrada')) throw err;
    throw new Error('SICAR indisponível no momento. Tente novamente em instantes.');
  }
}
 
async function buscarPorCoordenadas(lat: number, lng: number): Promise<Partial<CarData>> {
  const params = new URLSearchParams({
    service:      'WFS',
    request:      'GetFeature',
    typeName:     'car:imovel',
    CQL_FILTER:   `INTERSECTS(geometry,POINT(${lng} ${lat}))`,
    outputFormat: 'application/json',
    maxFeatures:  '1',
  });
  const url = `${GEOSERVER_WFS}?${params}`;
  try {
    const res = await fetchWithRetry(url, 3, 10000);
    const geojson = await res.json();
    const feature = geojson?.features?.[0];
    if (!feature) throw new Error('Nenhuma propriedade encontrada para as coordenadas informadas.');
    const p = feature.properties ?? {};
    const codigo = p.cod_imovel ?? p.codigoCar ?? '';
    return {
      codigo,
      nomeImovel: p.nom_imovel    ?? p.nomeImovel ?? 'Não informado',
      areaTotal:  parseFloat(p.num_area ?? p.areaImovel ?? 0),
      municipio:  p.nom_municipio ?? p.municipio  ?? 'Não informado',
      estado:     p.sig_estado    ?? p.siglaUf    ?? '--',
      situacao:   SICAR_STATUS_MAP[p.ind_status]  ?? p.ind_status ?? 'Não informado',
      kmlUrl:     codigo ? `${SICAR_BASE}/imovel/exportarKml/${encodeURIComponent(codigo)}` : undefined,
    };
  } catch (err: any) {
    if (err.message?.includes('Nenhuma propriedade')) throw err;
    throw new Error('GeoServer SICAR indisponível no momento. Tente novamente em instantes.');
  }
}
 
function gerarKML(result: PropertyResult, inputOriginal: string, inputType: InputType): string {
  const { car, sigef, embargos } = result;
  const nome = car?.codigo ?? inputOriginal.trim();
  const descricao = [
    car ? `Nome: ${car.nomeImovel}` : '',
    car ? `Município/UF: ${car.municipio} — ${car.estado}` : '',
    car ? `Área Total: ${car.areaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha` : '',
    car ? `Situação CAR: ${car.situacao}` : '',
    sigef ? `CCIR: ${sigef.numeroCCIR}` : '',
    sigef ? `Certificação SIGEF: ${sigef.situacaoCertificacao}` : '',
    embargos.length > 0 ? `Embargos IBAMA: ${embargos.length} ativo(s)` : 'Embargos IBAMA: nenhum',
  ].filter(Boolean).join('&#10;');
 
  let geometria = '';
  if (inputType === 'coordinates') {
    const [lat, lng] = inputOriginal.split(',').map(s => parseFloat(s.trim()));
    const areaHa = car?.areaTotal ?? 1;
    const areaSqMeters = areaHa * 10000;
    const side = Math.sqrt(areaSqMeters);
    const dLat = side / 111000;
    const dLng = side / (111000 * Math.cos((lat * Math.PI) / 180));
    const hLat = dLat / 2;
    const hLng = dLng / 2;
    geometria = `
    <MultiGeometry>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${(lng - hLng).toFixed(6)},${(lat - hLat).toFixed(6)},0
              ${(lng + hLng).toFixed(6)},${(lat - hLat).toFixed(6)},0
              ${(lng + hLng).toFixed(6)},${(lat + hLat).toFixed(6)},0
              ${(lng - hLng).toFixed(6)},${(lat + hLat).toFixed(6)},0
              ${(lng - hLng).toFixed(6)},${(lat - hLat).toFixed(6)},0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </MultiGeometry>`;
  }
 
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>${nome}</name>
    <description>${descricao}</description>${geometria}
  </Placemark>
</kml>`;
}
 
// ─── SIGEF ────────────────────────────────────────────────────────────────────
 
function parseSigefParcela(item: any): SigefData {
  const situacaoMap: Record<string, string> = {
    AT: 'Certificado', CA: 'Cancelado',
    PE: 'Pendente',    AN: 'Em Análise', NU: 'Nulo',
  };
  const rawSit = item.situacao ?? item.status ?? '';
  return {
    numeroCCIR:           item.numero_ccir ?? item.ccir ?? '—',
    situacaoCertificacao: situacaoMap[rawSit] ?? rawSit ?? 'Não informado',
    areaCertificada:      parseFloat(item.area_total_validada ?? item.area ?? 0),
  };
}
 
async function buscarSIGEFPorCAR(codigoCAR: string): Promise<SigefData> {
  const url = `${SIGEF_BASE}/parcela/?codigo_imovel_car=${encodeURIComponent(codigoCAR.trim())}`;
  try {
    const res  = await fetchWithRetry(url, 3, 10000);
    const data = await res.json();
    const item = data?.results?.[0] ?? (Array.isArray(data) ? data[0] : null);
    if (!item) throw new Error('Parcela não encontrada no SIGEF para o código CAR informado.');
    return parseSigefParcela(item);
  } catch (err: any) {
    if (err.message?.includes('não encontrada')) throw err;
    throw new Error('SIGEF/INCRA indisponível no momento. Tente novamente em instantes.');
  }
}
 
// ─── Edge Function ────────────────────────────────────────────────────────────
 
async function consultarViaEdge(raw: string): Promise<{
  car?: CarData;
  sigef?: SigefData;
  embargos: Embargo[];
  vinculados?: string[];
  kmlDisponivel: boolean;
  kml?: string;
  erros: Record<string, string>;
}> {
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey':        SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ input: raw }),
  });
 
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro na Edge Function.' }));
    throw new Error(err.error ?? 'Erro ao consultar propriedade.');
  }
 
  return res.json();
}
 
// ─── Orquestrador principal ───────────────────────────────────────────────────
 
async function consultarPropriedade(
  raw: string,
  onStep: (step: keyof StepStatus, status: 'loading' | 'done' | 'error') => void,
  forceRefresh = false
): Promise<PropertyResult> {
  const cacheKey = raw.trim().toLowerCase();
 
  // forceRefresh ignora o cache — usado pelo botão Atualizar do monitoramento
  if (!forceRefresh) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  } else {
    cache.delete(cacheKey);
  }
 
  const tipo = detectInputType(raw);
 
  // CAR — tudo via Edge Function
  if (tipo === 'car') {
    onStep('sicar', 'loading');
    onStep('sigef', 'loading');
    onStep('ibama', 'loading');
 
    const data = await consultarViaEdge(raw);
 
    onStep('sicar', data.erros?.sicar ? 'error' : 'done');
    onStep('sigef', data.erros?.sigef ? 'error' : 'done');
    onStep('ibama', data.erros?.ibama ? 'error' : 'done');
 
    const result: PropertyResult = {
      car:           data.car,
      sigef:         data.sigef,
      embargos:      data.embargos ?? [],
      kmlDisponivel: !!data.kmlDisponivel,
      kml:           data.kml,
    };
    setCached(cacheKey, result);
    return result;
  }
 
  // CPF/CNPJ — tudo via Edge Function
  if (tipo === 'cpf' || tipo === 'cnpj') {
    onStep('sicar', 'loading');
    onStep('sigef', 'loading');
    onStep('ibama', 'loading');
 
    const data = await consultarViaEdge(raw);
 
    onStep('sicar', data.erros?.sicar ? 'error' : 'done');
    onStep('sigef', data.erros?.sigef ? 'error' : 'done');
    onStep('ibama', data.erros?.ibama ? 'error' : 'done');
 
    const result: PropertyResult = {
      car:           data.car,
      sigef:         data.sigef,
      embargos:      data.embargos ?? [],
      vinculados:    data.vinculados,
      kmlDisponivel: !!data.kmlDisponivel,
      kml:           data.kml,
    };
    setCached(cacheKey, result);
    return result;
  }
 
  // Coordenadas — SICAR no frontend, SIGEF + IBAMA via Edge Function
  let carData:   CarData | undefined;
  let sigefData: SigefData | undefined;
  let embargos:  Embargo[] = [];
 
  onStep('sicar', 'loading');
  try {
    if (tipo === 'coordinates') {
      const [lat, lng] = raw.split(',').map(Number);
      carData = await buscarPorCoordenadas(lat, lng) as CarData;
    } else {
      carData = await buscarPorCAR(raw);
    }
    onStep('sicar', 'done');
  } catch (e: any) {
    console.error('[SICAR] erro:', e.message);
    onStep('sicar', 'error');
  }
 
  onStep('sigef', 'loading');
  onStep('ibama', 'loading');
  try {
    const data = await consultarViaEdge(
      JSON.stringify({
        __ibama_only: true,
        municipio:    carData?.municipio ?? '',
        estado:       carData?.estado    ?? '',
        nomeImovel:   carData?.nomeImovel ?? '',
        codigoCAR:    carData?.codigo    ?? raw,
      })
    );
    sigefData = data.sigef;
    embargos  = data.embargos ?? [];
    onStep('sigef', data.erros?.sigef ? 'error' : 'done');
    onStep('ibama', data.erros?.ibama ? 'error' : 'done');
  } catch (e: any) {
    console.error('[SIGEF/IBAMA] erro:', e.message);
    onStep('sigef', 'error');
    onStep('ibama', 'error');
  }
 
  const result: PropertyResult = {
    car:           carData,
    sigef:         sigefData,
    embargos,
    kmlDisponivel: !!carData?.kmlUrl,
  };
 
  setCached(cacheKey, result);
  return result;
}
 
// ─── Supabase helpers ─────────────────────────────────────────────────────────
 
function compararSnapshots(anterior: PropertyResult, atual: PropertyResult): MudancaDetectada[] {
  const mudancas: MudancaDetectada[] = [];
 
  if (anterior.car?.situacao !== atual.car?.situacao && atual.car?.situacao) {
    mudancas.push({
      campo: 'Situação CAR',
      anterior: anterior.car?.situacao ?? '—',
      atual: atual.car?.situacao,
    });
  }
 
  if (anterior.car && atual.car && Math.abs(anterior.car.areaTotal - atual.car.areaTotal) > 1) {
    mudancas.push({
      campo: 'Área Total',
      anterior: `${anterior.car.areaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha`,
      atual: `${atual.car.areaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha`,
    });
  }
 
  const idsAnteriores = new Set(anterior.embargos.map(e => e.numero));
  const novos = atual.embargos.filter(e => !idsAnteriores.has(e.numero));
  if (novos.length > 0) {
    mudancas.push({
      campo: 'Novos Embargos',
      anterior: `${anterior.embargos.length} embargo(s)`,
      atual: `${atual.embargos.length} embargo(s) (+${novos.length} novo(s))`,
    });
  }
 
  for (const emb of atual.embargos) {
    const ant = anterior.embargos.find(e => e.numero === emb.numero);
    if (ant && ant.situacao !== emb.situacao) {
      mudancas.push({
        campo: `Embargo #${emb.numero}`,
        anterior: ant.situacao,
        atual: emb.situacao,
      });
    }
  }
 
  return mudancas;
}
 
async function salvarConsulta(
  userId: string | null,
  userEmail: string | null,
  input: string,
  tipoInput: InputType,
  intencao: IntencaoConsulta,
  resultado: PropertyResult
): Promise<void> {
  const { car, sigef, embargos, vinculados } = resultado;
  const { error } = await supabase
    .from('rural_consultas_historico')
    .insert({
      user_id:           userId,
      user_email:        userEmail,
      input_original:    input,
      tipo_input:        tipoInput,
      intencao,
      nome_imovel:       car?.nomeImovel   ?? null,
      codigo_car:        car?.codigo       ?? null,
      area_total:        car?.areaTotal    ?? null,
      municipio:         car?.municipio    ?? null,
      estado:            car?.estado       ?? null,
      situacao_car:      car?.situacao     ?? null,
      ccir:              sigef?.numeroCCIR              ?? null,
      situacao_sigef:    sigef?.situacaoCertificacao    ?? null,
      area_certificada:  sigef?.areaCertificada         ?? null,
      qtd_embargos:      embargos.length,
      embargos:          embargos.length > 0 ? embargos : null,
      cars_vinculados:   vinculados ?? null,
      resultado,
      created_at:        new Date().toISOString(),
    });
  if (error) console.error('[Consulta] salvarConsulta erro:', error.message);
}
 
async function salvarPropriedade(
  userId: string,
  codigoCAR: string,
  label: string,
  inputOriginal: string,
  snapshot: PropertyResult
): Promise<string | null> {
  const { data, error } = await supabase
    .from('rural_propriedades_monitoradas')
    .upsert(
      {
        user_id:            userId,
        codigo_car:         codigoCAR,
        label,
        input_original:     inputOriginal,
        snapshot,
        ultima_verificacao: new Date().toISOString(),
      },
      { onConflict: 'user_id,codigo_car' }
    )
    .select('id')
    .single();
 
  if (error) { console.error('[Monitor] salvarPropriedade erro:', error.message); return null; }
  return data?.id ?? null;
}
 
async function listarPropriedadesMonitoradas(userId: string): Promise<MonitoredProperty[]> {
  const { data, error } = await supabase
    .from('rural_propriedades_monitoradas')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
 
  if (error) { console.error('[Monitor] listarPropriedadesMonitoradas erro:', error.message); return []; }
 
  return (data ?? []).map(row => ({
    id:                   row.id,
    input:                row.input_original,
    label:                row.label,
    addedAt:              new Date(row.created_at).toLocaleDateString('pt-BR'),
    lastCheck:            new Date(row.ultima_verificacao).toLocaleDateString('pt-BR'),
    status:               'ok' as const,
    codigoCar:            row.codigo_car,
    snapshot:             row.snapshot as PropertyResult,
    ultimaVerificacaoIso: row.ultima_verificacao,
  }));
}
 
async function removerPropriedade(userId: string, propriedadeId: string): Promise<void> {
  const { error } = await supabase
    .from('rural_propriedades_monitoradas')
    .delete()
    .eq('id', propriedadeId)
    .eq('user_id', userId);
  if (error) console.error('[Monitor] removerPropriedade erro:', error.message);
}
 
// ─── Sub-components ───────────────────────────────────────────────────────────
 
const StepIndicator: React.FC<{ steps: StepStatus }> = ({ steps }) => {
  const items = [
    { key: 'sicar', label: 'SICAR' },
    { key: 'sigef', label: 'SIGEF / INCRA' },
    { key: 'ibama', label: 'IBAMA' },
  ] as const;
 
  const statusText: Record<string, string> = {
    idle: 'aguardando', loading: 'consultando', done: 'verificado', error: 'indisponível',
  };
  const statusColor: Record<string, string> = {
    idle:    'border-gray-200 text-gray-400 bg-white',
    loading: 'border-amber-300 text-amber-700 bg-amber-50',
    done:    'border-emerald-300 text-emerald-700 bg-emerald-50',
    error:   'border-red-300 text-red-700 bg-red-50',
  };
  const dotColor: Record<string, string> = {
    idle: 'bg-gray-300', loading: 'bg-amber-400 animate-pulse', done: 'bg-emerald-500', error: 'bg-red-500',
  };
 
  return (
    <div className="flex items-stretch gap-0 border border-gray-200 rounded-lg overflow-hidden">
      {items.map((item, idx) => (
        <div
          key={item.key}
          className={`flex-1 flex flex-col items-center gap-1 px-4 py-3 transition-all duration-300 ${statusColor[steps[item.key]]} ${idx > 0 ? 'border-l border-gray-200' : ''}`}
        >
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[steps[item.key]]}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
          </div>
          <span className="text-[9px] font-medium opacity-70 lowercase">{statusText[steps[item.key]]}</span>
        </div>
      ))}
    </div>
  );
};
 
const SituacaoBadge: React.FC<{ situacao: string }> = ({ situacao }) => {
  const map: Record<string, { border: string; text: string; dot: string; bg: string }> = {
    'Ativo':       { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'Pendente':    { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-400' },
    'Cancelado':   { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500' },
    'Suspenso':    { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  dot: 'bg-orange-400' },
    'Certificado': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'Em Análise':  { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  };
  const style = map[situacao] ?? { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${style.bg} ${style.border} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {situacao}
    </span>
  );
};
 
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start gap-6 py-2.5 border-b border-gray-50 last:border-0">
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-32 flex-shrink-0 mt-0.5 leading-tight">{label}</p>
    <div className="flex-1 min-w-0 text-sm font-semibold text-[#2c5363] break-all leading-snug">{value}</div>
  </div>
);
 
const ResultCard: React.FC<{
  result: PropertyResult;
  onDownloadKml?: () => Promise<void>;
  user?: { email: string };
}> = ({ result, onDownloadKml, user }) => {
  const [kmlLoading, setKmlLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { car, sigef, embargos, vinculados } = result;
 
  const handleKml = async () => {
    if (!onDownloadKml) return;
    setKmlLoading(true);
    try { await onDownloadKml(); } finally { setKmlLoading(false); }
  };
 
  const handleCopy = async () => {
    const { texto } = formatarPropriedade(car, sigef, embargos);
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    if (!result.car) return;
    setPdfLoading(true);
    try {
      const reportData = await gerarDadosRelatorio(result, { email: user?.email ?? '' });
      const blob = await pdf(<SmartFazendaPDF data={reportData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Prylom-SmartFazendas-${reportData.numeroPDF}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PDF] erro ao gerar relatório:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {vinculados && vinculados.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-xl overflow-hidden">
          <div className="border-l-4 border-blue-400 px-5 py-3 bg-blue-50 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">CARs Vinculados</span>
            <span className="text-[10px] font-black text-blue-500 bg-blue-100 px-2 py-0.5 rounded">{vinculados.length}</span>
          </div>
          <div className="p-4 space-y-2">
            {vinculados.map((c, i) => (
              <div key={i} className="px-4 py-2 text-xs font-mono text-[#2c5363] bg-gray-50 border border-gray-100 rounded break-all">
                {c}
              </div>
            ))}
            <p className="text-[10px] text-gray-400 pt-1">Exibindo detalhes do primeiro registro</p>
          </div>
        </div>
      )}
 
      {car && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="border-l-4 border-[#2c5363] px-5 py-3 bg-[#2c5363]/5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2c5363]">Dados da Propriedade</span>
            <SituacaoBadge situacao={car.situacao} />
          </div>
          <div className="px-5 py-1">
            <InfoRow label="Nome do Imóvel" value={car.nomeImovel} />
            <InfoRow label="Área Total" value={`${car.areaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha`} />
            <InfoRow label="Município / UF" value={`${car.municipio} — ${car.estado}`} />
            <InfoRow label="Código CAR" value={<span className="font-mono text-xs break-all">{car.codigo}</span>} />
            <InfoRow label="Situação CAR" value={<SituacaoBadge situacao={car.situacao} />} />
          </div>
        </div>
      )}
 
      {sigef && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="border-l-4 border-slate-500 px-5 py-3 bg-slate-50 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Documentação Fundiária</span>
            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">SIGEF / INCRA</span>
          </div>
          <div className="px-5 py-1">
            <InfoRow label="CCIR" value={sigef.numeroCCIR} />
            <InfoRow label="Certificação SIGEF" value={<SituacaoBadge situacao={sigef.situacaoCertificacao} />} />
            <InfoRow label="Área Certificada" value={`${sigef.areaCertificada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha`} />
          </div>
        </div>
      )}
 
      <div className={`bg-white border rounded-xl overflow-hidden ${embargos.length > 0 ? 'border-red-200' : 'border-gray-200'}`}>
        <div className={`border-l-4 px-5 py-3 flex items-center justify-between ${embargos.length > 0 ? 'border-l-red-500 bg-red-50' : 'border-l-emerald-500 bg-emerald-50'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest ${embargos.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            Embargos IBAMA
          </span>
          {embargos.length > 0 && (
            <span className="text-[10px] font-black text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded">
              {embargos.length} ativo{embargos.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="px-5 py-4">
          {embargos.length === 0 ? (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-emerald-700">Nenhum embargo ativo encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {embargos.map((e, i) => (
                <div key={i} className="border border-red-100 rounded-lg p-4 bg-red-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-700">Auto nº {e.numero}</span>
                    <SituacaoBadge situacao={e.situacao} />
                  </div>
                  <p className="text-xs font-medium text-red-800 leading-snug">{e.motivo}</p>
                  <div className="flex gap-4 text-[10px] text-red-500 font-mono">
                    <span>Data: {e.data}</span>
                    <span>Área: {e.areaEmbargada.toLocaleString('pt-BR')} ha</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
 
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-[#2c5363] rounded-lg py-3 font-black text-[10px] uppercase tracking-widest transition-all"
        >
          {copied ? 'Copiado' : 'Copiar Resultado'}
        </button>
 
        {onDownloadKml && (
          <button
            onClick={handleKml}
            disabled={kmlLoading}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 font-black text-[10px] uppercase tracking-widest transition-all ${
              kmlLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-[#2c5363] hover:bg-[#1e3d4d] text-white'
            }`}
          >
            {kmlLoading ? 'Baixando...' : 'Exportar KML'}
          </button>
        )}

        <button
          onClick={handleExportPDF}
          disabled={pdfLoading || !result.car}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-3 font-black text-[10px] uppercase tracking-widest transition-all ${
            pdfLoading || !result.car
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'bg-[#bba219] hover:bg-[#a08f16] text-white'
          }`}
        >
          {pdfLoading ? 'Gerando PDF...' : 'Smart Fazendas PDF'}
        </button>
      </div>
    </div>
  );
};
 
// ─── Modal de Intenção ────────────────────────────────────────────────────────
 
const INTENCOES: { value: IntencaoConsulta; label: string; desc: string }[] = [
  { value: 'vender',  label: 'Quero vender',          desc: 'Estou avaliando a propriedade para venda' },
  { value: 'comprar', label: 'Quero comprar',          desc: 'Estou avaliando a propriedade para compra' },
  { value: 'duvidas', label: 'Apenas tirando dúvidas', desc: 'Consulta informativa, sem intenção de negócio' },
];
 
const ModalIntencao: React.FC<{
  onConfirm: (intencao: IntencaoConsulta) => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
  const [selected, setSelected] = useState<IntencaoConsulta | null>(null);
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-sm overflow-hidden">
        <div className="border-l-4 border-[#2c5363] px-6 py-5 bg-[#2c5363]/5">
          <p className="text-[9px] font-black text-[#2c5363]/50 uppercase tracking-[0.4em] mb-1">Antes de consultar</p>
          <h2 className="text-base font-black text-[#2c5363] uppercase tracking-tight leading-tight">
            Qual é sua intenção<br />com esta consulta?
          </h2>
        </div>
        <div className="p-4 space-y-2">
          {INTENCOES.map(op => (
            <button
              key={op.value}
              onClick={() => setSelected(op.value)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                selected === op.value
                  ? 'border-[#2c5363] bg-[#2c5363]/5'
                  : 'border-gray-200 bg-white hover:border-[#2c5363]/40 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all ${
                  selected === op.value ? 'border-[#2c5363] bg-[#2c5363]' : 'border-gray-300'
                }`} />
                <div>
                  <p className={`text-xs font-black uppercase tracking-wider ${selected === op.value ? 'text-[#2c5363]' : 'text-gray-700'}`}>
                    {op.label}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{op.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              selected
                ? 'bg-[#2c5363] text-white hover:bg-[#1e3d4d]'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            Consultar
          </button>
        </div>
      </div>
    </div>
  );
};
 
// ─── MonitorCard — card expandível por propriedade ────────────────────────────
 
const MonitorCard: React.FC<{
  prop: MonitoredProperty;
  onRemove: (id: string) => void;
  onAtualizar: (prop: MonitoredProperty) => Promise<void>;
  atualizando: boolean;
}> = ({ prop, onRemove, onAtualizar, atualizando }) => {
  const [expandido, setExpandido] = useState(false);
  const snap = prop.snapshot;
 
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* ── Cabeçalho sempre visível ── */}
      <div className="px-5 py-3.5 flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${prop.status === 'alert' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
 
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-[#2c5363] truncate">{prop.label}</p>
          <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{prop.input}</p>
          <p className="text-[9px] text-gray-300 mt-0.5 tracking-wide">
            Adicionado: {prop.addedAt} &nbsp;·&nbsp; Atualizado: {prop.lastCheck}
          </p>
        </div>
 
        <div className="flex items-center gap-2 flex-shrink-0">
          {prop.status === 'alert' && (
            <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[9px] font-black uppercase tracking-wider">
              Alerta
            </span>
          )}
 
          {/* Botão expandir para ver snapshot */}
          {snap && (
            <button
              onClick={() => setExpandido(v => !v)}
              className="px-3 py-1.5 rounded border border-gray-200 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:border-[#2c5363] hover:text-[#2c5363] transition-all"
            >
              {expandido ? 'Fechar' : 'Ver'}
            </button>
          )}
 
          {/* Botão atualizar — faz nova consulta forçada */}
          <button
            onClick={() => onAtualizar(prop)}
            disabled={atualizando}
            className={`px-3 py-1.5 rounded border text-[9px] font-black uppercase tracking-widest transition-all ${
              atualizando
                ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-white'
                : 'border-[#2c5363]/30 text-[#2c5363] hover:bg-[#2c5363] hover:text-white hover:border-[#2c5363]'
            }`}
          >
            {atualizando ? '...' : 'Atualizar'}
          </button>
 
          {/* Remover */}
          <button
            onClick={() => onRemove(prop.id)}
            className="w-7 h-7 rounded border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-400 flex items-center justify-center text-xs font-black transition-all"
          >
            ✕
          </button>
        </div>
      </div>
 
      {/* ── Snapshot expandido ── */}
      {expandido && snap && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50/50">
 
          {/* CAR */}
          {snap.car && (
            <div className="space-y-1">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Propriedade</p>
              <div className="bg-white border border-gray-100 rounded-lg px-4 py-1">
                <InfoRow label="Nome" value={snap.car.nomeImovel} />
                <InfoRow label="Área" value={`${snap.car.areaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ha`} />
                <InfoRow label="Município" value={`${snap.car.municipio} — ${snap.car.estado}`} />
                <InfoRow label="Situação" value={<SituacaoBadge situacao={snap.car.situacao} />} />
              </div>
            </div>
          )}
 
          {/* SIGEF */}
          {snap.sigef && (
            <div className="space-y-1">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Documentação</p>
              <div className="bg-white border border-gray-100 rounded-lg px-4 py-1">
                <InfoRow label="CCIR" value={snap.sigef.numeroCCIR} />
                <InfoRow label="SIGEF" value={<SituacaoBadge situacao={snap.sigef.situacaoCertificacao} />} />
              </div>
            </div>
          )}
 
          {/* Embargos */}
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Embargos IBAMA</p>
            {snap.embargos.length === 0 ? (
              <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <p className="text-xs font-semibold text-emerald-700">Nenhum embargo ativo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {snap.embargos.map((e, i) => (
                  <div key={i} className="bg-white border border-red-100 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-red-700">Auto nº {e.numero}</span>
                      <SituacaoBadge situacao={e.situacao} />
                    </div>
                    <p className="text-xs text-red-800">{e.motivo}</p>
                    <p className="text-[10px] text-red-400 font-mono">
                      {e.data} · {e.areaEmbargada.toLocaleString('pt-BR')} ha
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
 
// ─── Main Component ───────────────────────────────────────────────────────────
 
const MarketTerminal: React.FC<Props> = ({ onBack }) => {
  const [inputValue, setInputValue]     = useState('');
  const [detectedType, setDetectedType] = useState<InputType>('unknown');
  const [status, setStatus]             = useState<QueryStatus>('idle');
  const [steps, setSteps]               = useState<StepStatus>({ sicar: 'idle', sigef: 'idle', ibama: 'idle' });
  const [result, setResult]             = useState<PropertyResult | null>(null);
  const [errorMsg, setErrorMsg]         = useState('');
  const [monitored, setMonitored]       = useState<MonitoredProperty[]>([]);
  const [activeTab, setActiveTab]       = useState<'consulta' | 'monitoramento'>('consulta');
  const [userId, setUserId]             = useState<string | null>(null);
  const [userEmail, setUserEmail]       = useState<string | null>(null);
  const [alertas, setAlertas]           = useState<AlertaMonitoramento[]>([]);
 
  // ID da propriedade sendo atualizada no momento (null = nenhuma)
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);
 
  const [modalIntencao, setModalIntencao] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
 
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setUserEmail(data.user?.email ?? null);
      if (uid) {
        listarPropriedadesMonitoradas(uid).then(setMonitored);
      }
    });
  }, []);
 
  const updateStep = useCallback((step: keyof StepStatus, s: 'loading' | 'done' | 'error') => {
    setSteps(prev => ({ ...prev, [step]: s }));
  }, []);
 
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    const cleanDigits = v.replace(/\D/g, '');
    if (/^\d+$/.test(v.trim())) {
      if (cleanDigits.length <= 11) v = formatCpf(cleanDigits);
      else if (cleanDigits.length <= 14) v = formatCnpj(cleanDigits);
    }
    setInputValue(v);
    setDetectedType(detectInputType(v));
    setResult(null);
    setErrorMsg('');
    setStatus('idle');
  };
 
  const handleConsult = () => {
    if (!inputValue.trim()) return;
    setModalIntencao(true);
  };
 
  const handleConfirmIntencao = async (intencao: IntencaoConsulta) => {
    setModalIntencao(false);
    setStatus('loading');
    setResult(null);
    setErrorMsg('');
    setSteps({ sicar: 'idle', sigef: 'idle', ibama: 'idle' });
 
    try {
      const data = await consultarPropriedade(inputValue, updateStep);
      setResult(data);
      setStatus('success');
      await salvarConsulta(userId, userEmail, inputValue, detectedType, intencao, data);
    } catch (err: any) {
      const erro = formatarErro('RuralConsulta', err.message ?? 'Erro desconhecido. Tente novamente.');
      setErrorMsg(`[${erro.badge}] ${erro.mensagem}`);
      setStatus('error');
    }
  };
 
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConsult();
  };
 
  const handleDownloadKml = async () => {
    if (!result) return;
    try {
      const kmlContent = result.kml ?? gerarKML(result, inputValue, detectedType);
      const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.car?.codigo ?? 'propriedade'}.kml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Erro ao gerar KML.');
      setStatus('error');
    }
  };
 
  const addToMonitor = async () => {
    if (!inputValue.trim() || !result) return;
 
    const codigoCar = result.car?.codigo ?? inputValue.trim();
    const label     = result.car?.nomeImovel ?? inputValue.trim();
    const now       = new Date();
    const tempId    = crypto.randomUUID();
 
    const newEntry: MonitoredProperty = {
      id:                   tempId,
      input:                inputValue.trim(),
      label,
      addedAt:              now.toLocaleDateString('pt-BR'),
      lastCheck:            now.toLocaleDateString('pt-BR'),
      status:               result.embargos?.length ? 'alert' : 'ok',
      codigoCar,
      snapshot:             result,
      ultimaVerificacaoIso: now.toISOString(),
    };
 
    setMonitored(prev => [newEntry, ...prev]);
 
    if (userId) {
      const id = await salvarPropriedade(userId, codigoCar, label, inputValue.trim(), result);
      if (id) setMonitored(prev => prev.map(m => m.id === tempId ? { ...m, id } : m));
    }
  };
 
  const removeFromMonitor = async (id: string) => {
    setMonitored(prev => prev.filter(m => m.id !== id));
    if (userId) await removerPropriedade(userId, id);
  };
 
  // ── Atualizar uma propriedade específica ──────────────────────────────────
  const handleAtualizarPropriedade = async (prop: MonitoredProperty) => {
    if (atualizandoId) return; // já tem uma atualização em andamento
    setAtualizandoId(prop.id);
 
    try {
      // forceRefresh=true: ignora cache e busca dados frescos
      const dadosAtuais = await consultarPropriedade(prop.input, () => {}, true);
 
      // Compara com o snapshot salvo e gera alerta se houver mudança
      if (prop.snapshot) {
        const mudancas = compararSnapshots(prop.snapshot, dadosAtuais);
        if (mudancas.length > 0) {
          const alerta = formatarAlertaMonitoramento(
            { label: prop.label, input: prop.input },
            mudancas
          );
          setAlertas(prev => [alerta, ...prev]);
 
          // Persiste o alerta no banco
          if (userId) {
            await supabase.from('rural_alertas_historico').insert({
              propriedade_id:  prop.id,
              user_id:         userId,
              mudancas,
              texto_formatado: alerta.texto,
            });
          }
        }
      }
 
      // Salva o snapshot atualizado no banco
      if (userId) {
        await salvarPropriedade(
          userId,
          prop.codigoCar || prop.input,
          prop.label,
          prop.input,
          dadosAtuais
        );
      }
 
      // Atualiza o estado local
      const now = new Date();
      setMonitored(prev => prev.map(m =>
        m.id === prop.id
          ? {
              ...m,
              snapshot:             dadosAtuais,
              lastCheck:            now.toLocaleDateString('pt-BR'),
              ultimaVerificacaoIso: now.toISOString(),
              status:               dadosAtuais.embargos.length > 0 ? 'alert' : 'ok',
            }
          : m
      ));
    } catch (err: any) {
      console.error('[Monitor] Erro ao atualizar', prop.label, err.message);
    } finally {
      setAtualizandoId(null);
    }
  };
 
  const typeLabels: Record<InputType, { label: string; color: string }> = {
    cpf:         { label: 'CPF',         color: 'text-blue-500' },
    cnpj:        { label: 'CNPJ',        color: 'text-purple-500' },
    car:         { label: 'Código CAR',  color: 'text-emerald-600' },
    coordinates: { label: 'Coordenadas', color: 'text-amber-500' },
    unknown:     { label: '',            color: '' },
  };
 
  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8 md:py-12 animate-fadeIn pb-40 flex flex-col gap-6">
 
      {modalIntencao && (
        <ModalIntencao
          onConfirm={handleConfirmIntencao}
          onCancel={() => setModalIntencao(false)}
        />
      )}
 
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-gray-100">
        <div>
          <p className="text-[9px] font-black text-[#2c5363]/50 uppercase tracking-[0.4em] mb-2">Módulo Rural · Prylom</p>
          <h1 className="text-2xl md:text-3xl font-black text-[#2c5363] tracking-tight uppercase leading-none">
            Consulta de Propriedades
          </h1>
          <p className="text-[10px] text-gray-400 font-medium mt-2 tracking-wide">
            SICAR &nbsp;·&nbsp; SIGEF / INCRA &nbsp;·&nbsp; IBAMA Embargos
          </p>
        </div>
        <button
          onClick={onBack}
          className="bg-white text-[#2c5363] border border-gray-200 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-[#2c5363] hover:bg-[#2c5363]/5 transition-all"
        >
          ← Voltar
        </button>
      </div>
 
      {/* ── Tabs ── */}
      <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden w-fit">
        {(['consulta', 'monitoramento'] as const).map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
              idx > 0 ? 'border-l border-gray-200' : ''
            } ${
              activeTab === tab
                ? 'bg-[#2c5363] text-white'
                : 'bg-white text-gray-400 hover:text-[#2c5363] hover:bg-gray-50'
            }`}
          >
            {tab === 'consulta'
              ? 'Consulta'
              : `Monitoramento${monitored.length > 0 ? ` (${monitored.length})` : ''}`}
          </button>
        ))}
      </div>
 
      {/* ── Aba Consulta ── */}
      {activeTab === 'consulta' && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.35em]">Identificador de Entrada</p>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="CPF, CNPJ, Código CAR ou -15.123, -56.456"
                className="w-full bg-gray-50 border border-gray-200 focus:border-[#2c5363] focus:bg-white rounded-lg px-4 py-3 pr-32 text-sm font-medium text-[#2c5363] placeholder:text-gray-300 outline-none transition-all font-mono"
              />
              {detectedType !== 'unknown' && (
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase tracking-widest bg-white px-2 py-0.5 rounded border ${typeLabels[detectedType].color} border-current/20`}>
                  {typeLabels[detectedType].label}
                </span>
              )}
            </div>
 
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest self-center mr-1">Formato:</span>
              {[
                { label: 'CPF',    example: '000.000.000-00' },
                { label: 'CNPJ',   example: '00.000.000/0001-00' },
                { label: 'CAR',    example: 'MT-0000000-...' },
                { label: 'Coord.', example: '-15.12, -56.45' },
              ].map(h => (
                <button
                  key={h.label}
                  onClick={() => { setInputValue(h.example); setDetectedType(detectInputType(h.example)); }}
                  className="px-3 py-1 rounded border border-gray-200 bg-gray-50 text-[9px] font-black text-gray-500 hover:border-[#2c5363] hover:text-[#2c5363] hover:bg-[#2c5363]/5 transition-all uppercase tracking-wider"
                >
                  {h.label}
                </button>
              ))}
            </div>
 
            <button
              onClick={handleConsult}
              disabled={status === 'loading' || !inputValue.trim()}
              className={`w-full py-3 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                status === 'loading' || !inputValue.trim()
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-[#2c5363] hover:bg-[#1e3d4d] text-white'
              }`}
            >
              {status === 'loading' ? 'Consultando...' : 'Consultar Propriedade'}
            </button>
          </div>
 
          {(status === 'loading' || status === 'success') && (
            <div className="space-y-2">
              {status === 'loading' && (
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.35em]">Verificando fontes</p>
              )}
              <StepIndicator steps={steps} />
            </div>
          )}
 
          {status === 'error' && (
            <div className="bg-red-50 border-l-4 border-red-400 border border-red-100 rounded-lg px-5 py-4">
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Erro na consulta</p>
              <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
            </div>
          )}
 
          {status === 'success' && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.35em]">Resultado da Análise</p>
                <button
                  onClick={addToMonitor}
                  className="flex items-center gap-2 px-4 py-1.5 bg-white border border-[#2c5363]/20 hover:bg-[#2c5363] hover:text-white hover:border-[#2c5363] text-[#2c5363] rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  + Adicionar ao Monitoramento
                </button>
              </div>
              <ResultCard result={result} onDownloadKml={handleDownloadKml} user={{ email: userEmail ?? '' }} />
            </div>
          )}
        </div>
      )}
 
      {/* ── Aba Monitoramento ── */}
      {activeTab === 'monitoramento' && (
        <div className="space-y-4">
 
          {/* Banner informativo */}
          <div className="border border-[#2c5363]/20 bg-[#2c5363]/5 rounded-xl px-5 py-4">
            <p className="text-xs font-black text-[#2c5363] uppercase tracking-widest">Monitoramento de Propriedades</p>
            <p className="text-[10px] text-[#2c5363]/60 font-medium mt-0.5">
              Clique em <strong>Atualizar</strong> em qualquer propriedade para refazer a consulta completa: SICAR · SIGEF · IBAMA
            </p>
          </div>
 
          {/* Alertas */}
          {alertas.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.35em]">
                Alertas Recentes ({alertas.length})
              </p>
              {alertas.map((a, i) => (
                <div key={i} className="bg-white border-l-4 border-l-red-500 border border-red-100 rounded-lg px-5 py-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-red-700">{a.titulo}</p>
                    <p className="text-[10px] text-red-500 mt-0.5">{a.subtitulo}</p>
                    <div className="mt-2 space-y-1 border-t border-red-100 pt-2">
                      {a.mudancas.map((m, j) => (
                        <p key={j} className="text-[10px] text-red-700 font-mono">
                          <span className="font-black">{m.campo}:</span>{' '}
                          <span className="line-through opacity-50">{m.anterior}</span>
                          <span className="mx-1 opacity-50">→</span>
                          <span className="font-black">{m.atual}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setAlertas(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-300 hover:text-red-600 text-xs font-black flex-shrink-0 transition-all"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
 
          {/* Lista de propriedades */}
          {monitored.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl py-14 flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Nenhuma propriedade monitorada</p>
              <p className="text-[10px] text-gray-300 text-center max-w-xs">
                Realize uma consulta e clique em "Adicionar ao Monitoramento".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {monitored.map(m => (
                <MonitorCard
                  key={m.id}
                  prop={m}
                  onRemove={removeFromMonitor}
                  onAtualizar={handleAtualizarPropriedade}
                  atualizando={atualizandoId === m.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
 
export default MarketTerminal;