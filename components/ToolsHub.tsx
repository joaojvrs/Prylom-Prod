import { GoogleGenAI, Type } from "@google/genai";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { AppCurrency, AppLanguage, MarketNews } from '../types';

interface Props {
  onBack: () => void;
  t: any;
  lang: AppLanguage;
  currency: AppCurrency;
}

const ToolsHub: React.FC<Props> = ({ onBack, t, lang, currency }) => {
  const [commodity, setCommodity] = useState('soja');
  const [commodityPrice, setCommodityPrice] = useState(135.50);
  const [inputCost, setInputCost] = useState(2500);
  const [region, setRegion] = useState('MT - Médio Norte');
  const [manualRegion, setManualRegion] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [localInsight, setLocalInsight] = useState<{technical: string, simple: string, coords: string, locationName: string} | null>(null);

  // Estados para a Inteligência de Frete
  const [freightOrigin, setFreightOrigin] = useState('Fazenda (Interior)');
  const [freightDest, setFreightDest] = useState('Porto / Terminal');
  const [freightDistance, setFreightDistance] = useState(650);
  const [escoOrigemEstado, setEscoOrigemEstado] = useState('MT');
  const [escoOrigemCidade, setEscoOrigemCidade] = useState('');
  const [escoDestinoEstado, setEscoDestinoEstado] = useState('SP');
  const [escoDestinoCidade, setEscoDestinoCidade] = useState('Santos');
  const [calcDistLoading, setCalcDistLoading] = useState(false);
  const [freightRateKm, setFreightRateKm] = useState(0.18); // R$ / t / km
  const [loadWeight, setLoadWeight] = useState(37); // Toneladas (Bitrem comum)
  const [destPrice, setDestPrice] = useState(148.00); // Preço na ponta (Porto)
  const [riskFactor, setRiskFactor] = useState(1.05); // 5% extra para riscos/manutenção
  const [extraCosts, setExtraCosts] = useState(1200); // Pedágios/Seguros fixos

  // Estados para Indicadores Agrotecnológicos
interface AgroField { local: string; media: string }
const [agroIndicators, setAgroIndicators] = useState<{
  locationLabel: string; stateLabel: string; stateCode: string; // ← NOVO
  argila: AgroField; pluvio: AgroField; altimetria: AgroField; relevo: AgroField; solo: AgroField;
  irradiacao: AgroField; evapotranspiracao: AgroField; temperatura: AgroField; hidrografia: AgroField; culturas: AgroField;
  vento: AgroField; umidade: AgroField; tempDinamica: AgroField; aptidao: AgroField; valorProducao: AgroField;
} | null>(null);

  const [loadingAgro, setLoadingAgro] = useState(false);
  const [weatherForecast, setWeatherForecast] = useState<{ data: any; locationLabel: string; stateLabel: string } | null>(null);
  const [forecastDays, setForecastDays] = useState(7);
  const weatherScrollRef = useRef<HTMLDivElement>(null);

  interface EscoamentoData {
    locationLabel: string; stateCode: string;
    rodovia: { local: string; media: string };
    ferrovia: { local: string; media: string };
    porto: { local: string; media: string };
    freteMedio: { local: string; media: string };
    pedagios: { local: string; media: string };
  }
  const [escoamentoData, setEscoamentoData] = useState<EscoamentoData | null>(null);

  // Estados para o Feed de Notícias
  const [news, setNews] = useState<MarketNews[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsInsight, setNewsInsight] = useState<{ newsId: string; text: string } | null>(null);
  const [loadingNewsInsight, setLoadingNewsInsight] = useState(false);

  const rates = useMemo(() => ({
    [AppCurrency.BRL]: 1,
    [AppCurrency.USD]: 0.19,
    [AppCurrency.CNY]: 1.42,
    [AppCurrency.RUB]: 18.5
  }), []);

  const getSymbol = () => {
    switch (currency) {
      case AppCurrency.BRL: return 'R$';
      case AppCurrency.USD: return '$';
      case AppCurrency.CNY: return '¥';
      case AppCurrency.RUB: return '₽';
      default: return 'R$';
    }
  };

  const formatPrice = (valInBrl: number, decimals = 2) => {
    const converted = valInBrl * rates[currency];
    return `${getSymbol()} ${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

// --- LOCAL 1: SUBSTITUA O regionalCosts ---
const regionalCosts: Record<string, any> = {
  'MT - Médio Norte': { 
    costHa: 4850, 
    yieldBe: 52, 
    location: "Sorriso (MT)",
    argila: "40% e 70%",
    pluvio: "1.850 a 2.150 mm",
    altimetria: "350 a 420 mts",
    relevo: "Plano",
    rodovia: "BR-163",
    ferrovia: "FERRONORTE",
    porto: "PORTO DE MIRITITUBA",
    prodLocal: "82 a 92",
    prodEstado: "78 a 80",
    prodBrasil: "62",
    labelEstado: "Mato Grosso"
  },
  'GO - Sudoeste': { 
    costHa: 4620, 
    yieldBe: 49, 
    location: "Alexandria (GO)",
    argila: "40% e 70%", // Conforme imagem 1 e 2
    pluvio: "1.450 a 1.650 mm",
    altimetria: "1.100 e 1.250 mts",
    relevo: "Plano e Suave Ondulado",
    rodovia: "BR-040",
    ferrovia: "CENTRO-ATLÂNTICA",
    porto: "PORTO DE SANTOS",
    prodLocal: "68 a 78",
    prodEstado: "62 a 62",
    prodBrasil: "62",
    labelEstado: "Goiás"
  },
  'PR - Oeste': { 
    costHa: 5100, 
    yieldBe: 58, 
    location: "Cascavel (PR)",
    argila: "60% e 80%",
    pluvio: "1.700 a 1.900 mm",
    altimetria: "700 a 800 mts",
    relevo: "Ondulado",
    rodovia: "BR-277",
    ferrovia: "FERROESTE",
    porto: "PORTO DE PARANAGUÁ",
    prodLocal: "75 a 85",
    prodEstado: "70 a 72",
    prodBrasil: "62",
    labelEstado: "Paraná"
  },
  'MS - Sul': { 
    costHa: 4400, 
    yieldBe: 47, 
    location: "Maracaju (MS)",
    argila: "35% e 55%",
    pluvio: "1.400 a 1.600 mm",
    altimetria: "400 a 550 mts",
    relevo: "Suave Ondulado",
    rodovia: "BR-163",
    ferrovia: "MALHA OESTE",
    porto: "PORTO DE PARANAGUÁ",
    prodLocal: "70 a 80",
    prodEstado: "65 a 68",
    prodBrasil: "62",
    labelEstado: "Mato Grosso do Sul"
  }
};

// --- INTELIGÊNCIA DE ESCOAMENTO: base de dados logísticos por estado ---
const logisticsMap: Record<string, {
  rodovia: { local: string; media: string };
  ferrovia: { local: string; media: string };
  porto: { local: string; media: string };
  freteMedio: { local: string; media: string };
  pedagios: { local: string; media: string };
  distanciaDefault: number;
  tarifaDefault: number;
}> = {
  MT: {
    rodovia: { local: 'BR-163 (Cuiabá-Santarém)', media: 'BR-163 / MT-235' },
    ferrovia: { local: 'FERRONORTE (Term. Rondonópolis)', media: 'FERRONORTE / RUMO' },
    porto: { local: 'Porto de Miritituba (PA)', media: 'Miritituba / Santos' },
    freteMedio: { local: 'R$ 120–160/ton', media: 'R$ 135/ton (média MT)' },
    pedagios: { local: 'R$ 80–140/eixo', media: 'R$ 110/eixo (rota Miritituba)' },
    distanciaDefault: 1100, tarifaDefault: 0.18,
  },
  GO: {
    rodovia: { local: 'BR-060 / BR-040', media: 'BR-060 / GO-174' },
    ferrovia: { local: 'FCA–Vale (Term. Mineiros)', media: 'FCA / Centro-Atlântica' },
    porto: { local: 'Porto de Santos (SP)', media: 'Santos / Paranaguá' },
    freteMedio: { local: 'R$ 80–110/ton', media: 'R$ 93/ton (média GO)' },
    pedagios: { local: 'R$ 40–80/eixo', media: 'R$ 62/eixo (rota Santos)' },
    distanciaDefault: 900, tarifaDefault: 0.16,
  },
  PR: {
    rodovia: { local: 'BR-277 / BR-467', media: 'BR-277 / BR-163' },
    ferrovia: { local: 'RUMO Malha Oeste (Term. Cascavel)', media: 'RUMO / Ferroeste' },
    porto: { local: 'Porto de Paranaguá (PR)', media: 'Paranaguá / Santos' },
    freteMedio: { local: 'R$ 50–70/ton', media: 'R$ 58/ton (média PR)' },
    pedagios: { local: 'R$ 30–60/eixo', media: 'R$ 48/eixo (rota Paranaguá)' },
    distanciaDefault: 550, tarifaDefault: 0.14,
  },
  MS: {
    rodovia: { local: 'BR-163 / BR-267', media: 'BR-163 / MS-080' },
    ferrovia: { local: 'RUMO Malha Oeste (Term. Campo Grande)', media: 'RUMO Malha Oeste' },
    porto: { local: 'Porto de Santos (SP)', media: 'Santos / Paranaguá' },
    freteMedio: { local: 'R$ 70–100/ton', media: 'R$ 84/ton (média MS)' },
    pedagios: { local: 'R$ 50–90/eixo', media: 'R$ 72/eixo (rota Santos)' },
    distanciaDefault: 850, tarifaDefault: 0.16,
  },
  SP: {
    rodovia: { local: 'SP-330 (Anhanguera) / BR-050', media: 'SP-330 / SP-300 (Castelo)' },
    ferrovia: { local: 'RUMO Malha Paulista (Term. Sumaré)', media: 'RUMO Malha Paulista' },
    porto: { local: 'Porto de Santos (SP)', media: 'Porto de Santos' },
    freteMedio: { local: 'R$ 40–65/ton', media: 'R$ 52/ton (média SP)' },
    pedagios: { local: 'R$ 60–120/eixo', media: 'R$ 95/eixo (alta densidade SP)' },
    distanciaDefault: 600, tarifaDefault: 0.14,
  },
  MG: {
    rodovia: { local: 'BR-381 / BR-040', media: 'BR-381 / BR-262' },
    ferrovia: { local: 'VALE/FCA (Term. Pirapora)', media: 'VALE / Centro-Atlântica' },
    porto: { local: 'Porto de Santos (SP) / Vitória (ES)', media: 'Santos / Vitória' },
    freteMedio: { local: 'R$ 70–110/ton', media: 'R$ 88/ton (média MG)' },
    pedagios: { local: 'R$ 40–90/eixo', media: 'R$ 65/eixo' },
    distanciaDefault: 800, tarifaDefault: 0.16,
  },
  BA: {
    rodovia: { local: 'BR-020 / BR-135', media: 'BR-020 / BR-242' },
    ferrovia: { local: 'FCA–Vale (Term. Barreiras)', media: 'FCA / VALE' },
    porto: { local: 'Porto de Ilhéus (BA) / Salvador', media: 'Ilhéus / Salvador' },
    freteMedio: { local: 'R$ 90–130/ton', media: 'R$ 108/ton (média BA)' },
    pedagios: { local: 'R$ 20–50/eixo', media: 'R$ 35/eixo' },
    distanciaDefault: 950, tarifaDefault: 0.17,
  },
  RS: {
    rodovia: { local: 'BR-392 / BR-290', media: 'BR-392 / RS-020' },
    ferrovia: { local: 'RUMO Malha Sul (Term. Passo Fundo)', media: 'RUMO Malha Sul' },
    porto: { local: 'Porto do Rio Grande (RS)', media: 'Rio Grande / Paranaguá' },
    freteMedio: { local: 'R$ 45–70/ton', media: 'R$ 55/ton (média RS)' },
    pedagios: { local: 'R$ 25–50/eixo', media: 'R$ 38/eixo' },
    distanciaDefault: 500, tarifaDefault: 0.14,
  },
  SC: {
    rodovia: { local: 'BR-470 / BR-282', media: 'BR-470 / SC-390' },
    ferrovia: { local: 'RUMO Malha Sul (Term. Lages)', media: 'RUMO Malha Sul' },
    porto: { local: 'Porto de Itajaí (SC)', media: 'Itajaí / São Francisco do Sul' },
    freteMedio: { local: 'R$ 45–75/ton', media: 'R$ 58/ton (média SC)' },
    pedagios: { local: 'R$ 25–55/eixo', media: 'R$ 40/eixo' },
    distanciaDefault: 520, tarifaDefault: 0.14,
  },
  PA: {
    rodovia: { local: 'BR-163 / PA-150', media: 'BR-163 / PA-275' },
    ferrovia: { local: 'VALE EFC (Estrada de Ferro Carajás)', media: 'VALE / EFC' },
    porto: { local: 'Term. Miritituba (PA) / Vila do Conde', media: 'Miritituba / Santarém' },
    freteMedio: { local: 'R$ 40–80/ton', media: 'R$ 55/ton (Arco Norte)' },
    pedagios: { local: 'R$ 10–30/eixo', media: 'R$ 18/eixo' },
    distanciaDefault: 700, tarifaDefault: 0.15,
  },
  TO: {
    rodovia: { local: 'BR-153 (Belém-Brasília)', media: 'BR-153 / TO-080' },
    ferrovia: { local: 'FNS / VALE EFC (em implantação)', media: 'FNS / VALE' },
    porto: { local: 'Term. Itaqui (MA) / Miritituba (PA)', media: 'Itaqui / Miritituba' },
    freteMedio: { local: 'R$ 80–120/ton', media: 'R$ 95/ton (média TO)' },
    pedagios: { local: 'R$ 10–30/eixo', media: 'R$ 18/eixo' },
    distanciaDefault: 900, tarifaDefault: 0.16,
  },
  MA: {
    rodovia: { local: 'BR-316 / BR-010', media: 'BR-222 / MA-014' },
    ferrovia: { local: 'VALE EFC (Term. Açailândia)', media: 'VALE / EMAP' },
    porto: { local: 'Porto do Itaqui (MA) / Ponta da Madeira', media: 'Itaqui / Ponta da Madeira' },
    freteMedio: { local: 'R$ 70–110/ton', media: 'R$ 85/ton (média MA)' },
    pedagios: { local: 'R$ 10–25/eixo', media: 'R$ 15/eixo' },
    distanciaDefault: 800, tarifaDefault: 0.16,
  },
  RO: {
    rodovia: { local: 'BR-364 (Cuiabá-Porto Velho)', media: 'BR-364 / RO-010' },
    ferrovia: { local: 'Sem ferrovia operacional (hidroviária)', media: 'Hidrovia Madeira / VALE projeto' },
    porto: { local: 'Porto de Miritituba (PA) / Porto Velho', media: 'Miritituba / Itacoatiara' },
    freteMedio: { local: 'R$ 100–150/ton', media: 'R$ 120/ton (média RO)' },
    pedagios: { local: 'R$ 15–40/eixo', media: 'R$ 25/eixo' },
    distanciaDefault: 1200, tarifaDefault: 0.18,
  },
  default: {
    rodovia: { local: 'Consultar DNIT/SNV', media: 'Consultar Infra S.A.' },
    ferrovia: { local: 'Consultar ANTT', media: 'Consultar ANTT' },
    porto: { local: 'Consultar ANTAQ/ComexStat', media: 'Consultar ANTAQ' },
    freteMedio: { local: 'Consultar SIFRECA/ESALQ', media: 'Consultar IMEA' },
    pedagios: { local: 'Consultar ANTT/Concessionárias', media: 'Consultar ANTT' },
    distanciaDefault: 650, tarifaDefault: 0.18,
  },
};

// Mapa de solo predominante por estado
const brasilCidades: Record<string, string[]> = {
  AC: ['Rio Branco','Cruzeiro do Sul','Sena Madureira','Tarauacá'],
  AL: ['Maceió','Arapiraca','Palmeira dos Índios','Penedo'],
  AP: ['Macapá','Santana','Laranjal do Jari','Oiapoque'],
  AM: ['Manaus','Parintins','Itacoatiara','Tefé','Tabatinga'],
  BA: ['Salvador','Feira de Santana','Barreiras','Luís Eduardo Magalhães','Vitória da Conquista','Ilhéus','Juazeiro','Camaçari'],
  CE: ['Fortaleza','Caucaia','Sobral','Juazeiro do Norte','Maracanaú'],
  DF: ['Brasília','Ceilândia','Taguatinga','Gama'],
  ES: ['Vitória','Vila Velha','Serra','Cachoeiro de Itapemirim','Linhares'],
  GO: ['Goiânia','Aparecida de Goiânia','Anápolis','Mineiros','Rio Verde','Jataí','Catalão','Luziânia','Formosa'],
  MA: ['São Luís','Imperatriz','São José de Ribamar','Balsas','Açailândia','Caxias','Timon'],
  MT: ['Cuiabá','Várzea Grande','Rondonópolis','Sinop','Sorriso','Lucas do Rio Verde','Tangará da Serra','Nova Mutum','Primavera do Leste','Campo Novo do Parecis','Alta Floresta','Cáceres'],
  MS: ['Campo Grande','Dourados','Três Lagoas','Corumbá','Maracaju','Ponta Porã','Naviraí','Nova Andradina'],
  MG: ['Belo Horizonte','Uberlândia','Contagem','Uberaba','Montes Claros','Pirapora','Paracatu','Patos de Minas','Araguari'],
  PA: ['Belém','Ananindeua','Santarém','Marabá','Parauapebas','Itaituba','Miritituba','Castanhal'],
  PB: ['João Pessoa','Campina Grande','Santa Rita','Patos','Guarabira'],
  PR: ['Curitiba','Londrina','Maringá','Ponta Grossa','Cascavel','Toledo','Guarapuava','Paranaguá','Foz do Iguaçu'],
  PE: ['Recife','Caruaru','Olinda','Petrolina','Paulista','Jaboatão dos Guararapes'],
  PI: ['Teresina','Parnaíba','Picos','Uruçuí','Bom Jesus','Floriano'],
  RJ: ['Rio de Janeiro','São Gonçalo','Duque de Caxias','Niterói','Campos dos Goytacazes','Angra dos Reis'],
  RN: ['Natal','Mossoró','Parnamirim','Caicó','Açu'],
  RS: ['Porto Alegre','Caxias do Sul','Canoas','Pelotas','Santa Maria','Passo Fundo','Rio Grande','Ijuí','Cruz Alta','Erechim','Marau'],
  RO: ['Porto Velho','Ji-Paraná','Ariquemes','Vilhena','Cacoal','Rolim de Moura'],
  RR: ['Boa Vista','Rorainópolis','Caracaraí'],
  SC: ['Florianópolis','Joinville','Blumenau','Chapecó','Itajaí','Lages','São Francisco do Sul','Criciúma'],
  SP: ['São Paulo','Guarulhos','Campinas','Santos','Ribeirão Preto','São José do Rio Preto','Sorocaba','Araçatuba','Presidente Prudente','Marília','Bauru','Franca','Sumaré','Piracicaba'],
  SE: ['Aracaju','Nossa Senhora do Socorro','Lagarto','Itabaiana'],
  TO: ['Palmas','Araguaína','Gurupi','Porto Nacional','Pedro Afonso','Paraíso do Tocantins'],
};

const soloMapEstado: Record<string, string> = {
  MT: 'Latossolo Vermelho-Amarelo (argiloso)',
  GO: 'Latossolo Vermelho (argiloso)',
  PR: 'Latossolo Vermelho (muito argiloso)',
  MS: 'Latossolo Vermelho (argiloso)',
  SP: 'Latossolo Verm.-Amarelo / Argissolo',
  MG: 'Latossolo Vermelho / Cambissolo',
  BA: 'Latossolo Verm.-Amarelo (Oeste) / Neossolo',
  RS: 'Latossolo Vermelho / Nitossolo',
  SC: 'Nitossolo Vermelho / Cambissolo',
  PA: 'Latossolo Amarelo / Argissolo',
  TO: 'Latossolo Verm.-Amarelo / Gleissolo',
  MA: 'Latossolo Amarelo / Gleissolo',
  RO: 'Latossolo Vermelho-Amarelo (argiloso)',
  RR: 'Latossolo Amarelo / Plintossolo',
  AM: 'Latossolo Amarelo / Espodossolo',
  AC: 'Latossolo Vermelho-Amarelo / Gleissolo',
  AP: 'Latossolo Amarelo / Gleissolo',
  PI: 'Latossolo Vermelho-Amarelo / Neossolo',
  CE: 'Neossolo Litólico / Luvissolo',
  RN: 'Neossolo Litólico / Argissolo',
  PB: 'Neossolo Litólico / Luvissolo',
  PE: 'Argissolo Vermelho-Amarelo / Neossolo',
  AL: 'Argissolo Vermelho-Amarelo',
  SE: 'Argissolo Vermelho-Amarelo / Gleissolo',
  ES: 'Latossolo Verm.-Amarelo / Argissolo',
  RJ: 'Argissolo Vermelho-Amarelo',
  DF: 'Latossolo Vermelho / Cambissolo',
};

// Produtividade de soja por estado (sc/ha) — fonte: CONAB
const prodMapEstado: Record<string, { prodLocal: string; prodEstado: string; labelEstado: string }> = {
  SP: { prodLocal: '58 a 68', prodEstado: '56 a 62', labelEstado: 'São Paulo' },
  MG: { prodLocal: '52 a 62', prodEstado: '52 a 58', labelEstado: 'Minas Gerais' },
  BA: { prodLocal: '55 a 68', prodEstado: '52 a 60', labelEstado: 'Bahia (Oeste)' },
  RS: { prodLocal: '55 a 72', prodEstado: '58 a 65', labelEstado: 'Rio Grande do Sul' },
  SC: { prodLocal: '52 a 65', prodEstado: '54 a 62', labelEstado: 'Santa Catarina' },
  TO: { prodLocal: '52 a 65', prodEstado: '50 a 58', labelEstado: 'Tocantins' },
  PA: { prodLocal: '45 a 58', prodEstado: '48 a 55', labelEstado: 'Pará' },
  MA: { prodLocal: '50 a 62', prodEstado: '50 a 58', labelEstado: 'Maranhão' },
  RO: { prodLocal: '48 a 60', prodEstado: '48 a 55', labelEstado: 'Rondônia' },
  PI: { prodLocal: '48 a 62', prodEstado: '48 a 56', labelEstado: 'Piauí' },
  AM: { prodLocal: '40 a 52', prodEstado: '40 a 50', labelEstado: 'Amazonas' },
  RR: { prodLocal: '45 a 58', prodEstado: '45 a 55', labelEstado: 'Roraima' },
  AC: { prodLocal: '40 a 52', prodEstado: '40 a 50', labelEstado: 'Acre' },
};

  const barterRatio = inputCost / commodityPrice;
  
  const historicalAverages: Record<string, number> = {
    'soja': 16,
    'milho': 45,
    'boi': 2.2,
    'cafe': 4.5,
    'algodao': 8.2,
    'trigo': 32
  };
  
  const historicalAvg = historicalAverages[commodity] || 16;
  const ratioHealth = barterRatio < historicalAvg ? 'success' : (barterRatio > historicalAvg * 1.2 ? 'danger' : 'warning');

  // Cálculos de Frete & Spread
  const freightAnalysis = useMemo(() => {
    const costPerTon = (freightDistance * freightRateKm * riskFactor) + (extraCosts / loadWeight);
    const totalFreightLoad = costPerTon * loadWeight;
    const loadValueOrigin = commodityPrice * (loadWeight * 16.666); // Simulação carga total (sacas)
    const loadValueDest = destPrice * (loadWeight * 16.666);
    
    const spreadUnit = destPrice - (commodityPrice + (costPerTon / 16.666));
    const ipel = (loadValueOrigin / totalFreightLoad);

    return { costPerTon, totalFreightLoad, spreadUnit, ipel, efficiency: ipel > 10 ? 'Alta' : ipel < 6 ? 'Baixa' : 'Média' };
  }, [freightDistance, freightRateKm, loadWeight, commodityPrice, destPrice, riskFactor, extraCosts]);

  useEffect(() => {
    fetchLocalInsight();
  }, [lang]);

const fetchLocalInsight = async (specificLocation?: string) => {
  setLoadingInsight(true);
  const WEBHOOK_URL = "https://webhook.saveautomatik.shop/webhook/terminalAgro";

  try {
    const analyze = async (locInfo: string, lat?: number, lng?: number) => {
      const payload = {
        location: locInfo,
        latitude: lat || null,
        longitude: lng || null,
        language: lang, // vindo do seu estado/contexto
      };

      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro na resposta do Webhook");

      const data = await res.json();
      
      // Ajuste aqui: acessando data.response que é onde seu n8n envia o texto
      const fullText = data.response || "";
      const [technical, simple] = fullText.split("|||").map((s: string) => s.trim());

      setLocalInsight({
        technical: technical || fullText,
        simple: simple || "",
        coords: lat ? `${lat.toFixed(4)}, ${lng?.toFixed(4)}` : "Referência Geográfica",
        locationName: locInfo === "Sua Localização Atual" ? "Detectado por Geovisualização" : locInfo
      });

      // Dispara indicadores agrotecnológicos em paralelo
      fetchAgroIndicators(locInfo);

      // Lógica de região (opcional, baseada no nome da localização)
      const locLower = locInfo.toLowerCase();
      if (locLower.includes('mt') || locLower.includes('mato grosso')) setRegion('MT - Médio Norte');
      else if (locLower.includes('go') || locLower.includes('goiás')) setRegion('GO - Sudoeste');
      else if (locLower.includes('pr') || locLower.includes('paraná')) setRegion('PR - Oeste');
      else if (locLower.includes('ms') || locLower.includes('mato grosso do sul')) setRegion('MS - Sul');
    };

    if (specificLocation) {
      await analyze(specificLocation);
    } else {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const revRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
              { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'PrylomApp/1.0' } }
            );
            const revData = await revRes.json();
            const cityName = revData.address?.city || revData.address?.town || revData.address?.municipality || revData.address?.county || "Minha Localização";
            setManualRegion(cityName);
            await analyze(cityName, pos.coords.latitude, pos.coords.longitude);
          } catch {
            await analyze("Minha Localização", pos.coords.latitude, pos.coords.longitude);
          }
        },
        async () => await analyze("Brasil - Hub Regional")
      );
    }
  } catch (e) {
    console.error("Falha ao processar insight:", e);
  } finally {
    setLoadingInsight(false);
  }
};

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualRegion.trim()) {
      setLoadingAgro(true); // loading imediato ao clicar em Analisar
      fetchLocalInsight(manualRegion);
    }
  };

const fetchAgroIndicators = async (location: string) => {
  setLoadingAgro(true);
  try {
    // 1. Geocodificação
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location + ' Brasil')}&format=json&limit=1&addressdetails=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'PrylomApp/1.0' } }
    );
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("Localização não encontrada.");

    const lat = parseFloat(geoData[0].lat);
    const lon = parseFloat(geoData[0].lon);
    const addr = geoData[0].address || {};
    const cityLabel = addr.city || addr.town || addr.municipality || addr.county || location;
    const stateLabel = addr.state || 'Estado';
    // Nominatim nem sempre retorna state_code — fallback por nome do estado
    const stateNameToCode: Record<string, string> = {
      'acre':'AC','alagoas':'AL','amapá':'AP','amazonas':'AM','bahia':'BA',
      'ceará':'CE','distrito federal':'DF','espírito santo':'ES','goiás':'GO',
      'maranhão':'MA','mato grosso':'MT','mato grosso do sul':'MS',
      'minas gerais':'MG','pará':'PA','paraíba':'PB','paraná':'PR',
      'pernambuco':'PE','piauí':'PI','rio de janeiro':'RJ',
      'rio grande do norte':'RN','rio grande do sul':'RS','rondônia':'RO',
      'roraima':'RR','santa catarina':'SC','são paulo':'SP',
      'sergipe':'SE','tocantins':'TO',
    };
    const rawCode = addr.state_code?.toUpperCase().replace('BR-', '').substring(0, 2) || '';
    const stateCode = rawCode || stateNameToCode[stateLabel.toLowerCase()] || '';

    // 2. APIs paralelas principais
    const [nasaRes, weatherRes, elevRes] = await Promise.all([
      fetch(`https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,RH2M,WS10M,ALLSKY_SFC_SW_DWN,EVPTRNS&community=AG&longitude=${lon}&latitude=${lat}&format=JSON`),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America/Sao_Paulo&forecast_days=16`),
      fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`),
    ]);
    const [nasa, weather, elev] = await Promise.all([nasaRes.json(), weatherRes.json(), elevRes.json()]);

    // 3. Open-Meteo Historical — média de vento dos últimos 5 anos
    let windAvgKmh: number | null = null;
    try {
      const histRes = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
        `&start_date=2019-01-01&end_date=2023-12-31` +
        `&daily=wind_speed_10m_max&timezone=America/Sao_Paulo`
      );
      const histData = await histRes.json();
      const windArr: number[] = histData.daily?.wind_speed_10m_max?.filter((v: any) => v != null) || [];
      if (windArr.length > 0) {
        windAvgKmh = parseFloat((windArr.reduce((a, b) => a + b, 0) / windArr.length).toFixed(1));
      }
    } catch { /* fallback silencioso */ }

    // 4. Overpass API — rios mais próximos (raio 50km)
    let riverLocal = 'N/D';
    let riverMedia = 'N/D';
    try {
      const overpassQuery = `
        [out:json][timeout:10];
        (
          way(around:50000,${lat},${lon})[waterway=river][name];
          relation(around:50000,${lat},${lon})[waterway=river][name];
        );
        out tags 10;
      `;
      const ovRes = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`
      );
      const ovData = await ovRes.json();

      // Coleta nomes únicos dos rios encontrados
      const riverNames: string[] = [];
      for (const el of (ovData.elements || [])) {
        const name = el.tags?.name;
        if (name && !riverNames.includes(name)) riverNames.push(name);
        if (riverNames.length >= 3) break;
      }

      if (riverNames.length > 0) {
        riverLocal = riverNames.slice(0, 2).join(' / ');
        riverMedia = riverNames.join(' · ');
      } else {
        // Fallback ao mapa estático se Overpass não retornar nada
        const hidroMap: Record<string, { local: string; media: string }> = {
          MT: { local: 'Rio Teles Pires / Rio Juruena', media: 'Bacia Amazônica / Araguaia-Tocantins' },
          GO: { local: 'Rio Araguaia / Rio Paranaíba', media: 'Bacia do Araguaia / Bacia do Paraná' },
          PR: { local: 'Rio Paraná / Rio Iguaçu', media: 'Bacia do Paraná / Bacia do Iguaçu' },
          MS: { local: 'Rio Paraguai / Rio Miranda', media: 'Bacia do Rio Paraguai' },
          SP: { local: 'Rio Tietê / Rio Paranapanema', media: 'Bacia do Rio Paraná' },
          MG: { local: 'Rio São Francisco / Rio Doce', media: 'Bacia do São Francisco' },
          BA: { local: 'Rio São Francisco / Rio de Contas', media: 'Bacia do São Francisco' },
          RS: { local: 'Rio Jacuí / Rio Uruguai', media: 'Bacia do Uruguai' },
          SC: { local: 'Rio Uruguai / Rio Itajaí', media: 'Bacia do Uruguai / Atlântico Sul' },
        };
        const hid = hidroMap[stateCode] || { local: 'Consultar SNIRH (ANA)', media: 'Consultar SNIRH (ANA)' };
        riverLocal = hid.local;
        riverMedia = hid.media;
      }
    } catch {
      riverLocal = 'Consultar SNIRH (ANA)';
      riverMedia = 'Consultar SNIRH (ANA)';
    }

    // 5. SoilGrids — tentativa com fallback silencioso
    let soil: any = null;
    try {
      const soilRes = await fetch(`https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=clay&property=sand&depth=0-5cm&value=mean`);
      if (soilRes.ok) soil = await soilRes.json();
    } catch { /* SoilGrids indisponível */ }

    // 6. NASA POWER — clima histórico
    const p = nasa.properties?.parameter || {};
    const nasaPrec  = p.PRECTOTCORR?.ANN;
    const nasaPrecAnual = nasaPrec != null ? nasaPrec * 365 : null;
    const nasaSolar = p.ALLSKY_SFC_SW_DWN?.ANN;
    const nasaEvap  = p.EVPTRNS?.ANN;
    const tMed = p.T2M?.ANN?.toFixed(1) ?? '—';
    const tMax = p.T2M_MAX?.ANN?.toFixed(1) ?? '—';
    const tMin = p.T2M_MIN?.ANN?.toFixed(1) ?? '—';
    const nasaWind = p.WS10M?.ANN; // vento médio da NASA como fallback extra

    // 7. Open-Meteo — elevação e tempo real
    const elevM = elev.elevation?.[0];
    const altiLocal = elevM != null ? `${elevM.toFixed(0)} m` : 'N/D';
    const relevoLocal = elevM != null
      ? elevM < 200 ? 'Plano' : elevM < 400 ? 'Suave Ondulado' : elevM < 700 ? 'Ondulado' : 'Forte Ondulado'
      : 'N/D';
    const cur = weather.current || {};
    const windDirs = ['N','NE','L','SE','S','SO','O','NO'];
    const windDir = cur.wind_direction_10m != null ? windDirs[Math.round(cur.wind_direction_10m / 45) % 8] : '—';

    // 8. SoilGrids — argila e tipo de solo
    const layers = soil?.properties?.layers || [];
    const clayLayer = layers.find((l: any) => l.name === 'clay');
    const clayGkg = clayLayer?.depths?.[0]?.values?.mean;
    const clayPct = clayGkg != null ? Math.round(clayGkg / 10) : null;
    const soloTipo = clayPct != null
      ? clayPct >= 60 ? 'Latossolo Vermelho (muito argiloso)'
      : clayPct >= 35 ? 'Latossolo / Nitossolo (argiloso)'
      : clayPct >= 15 ? 'Argissolo / Cambissolo (médio)'
      : 'Neossolo Quartzarênico (arenoso)'
      : 'N/D';

    // 9. Aptidão por estado
    const aptMap: Record<string, { local: string; media: string }> = {
      MT: { local: 'Agricultura de Sequeiro e Irrigada', media: 'Soja · Milho · Algodão · Cana' },
      GO: { local: 'Agricultura Irrigada (PIVÔS) e Sequeiro', media: 'Soja · Milho · Sorgo · Cana' },
      PR: { local: 'Agricultura de Alta Performance', media: 'Soja · Milho · Trigo · Cevada' },
      MS: { local: 'Agropecuária Mista', media: 'Soja · Milho · Cana · Pecuária' },
      SP: { local: 'Agricultura Irrigada e Cana', media: 'Cana · Laranja · Soja · Milho' },
      MG: { local: 'Agropecuária Diversificada', media: 'Café · Soja · Milho · Pecuária' },
      BA: { local: 'Agricultura Irrigada (Oeste Bahia)', media: 'Soja · Algodão · Milho · Café' },
      RS: { local: 'Agricultura de Precisão', media: 'Soja · Milho · Trigo · Arroz' },
      SC: { local: 'Agricultura Familiar e Grãos', media: 'Milho · Soja · Fumo · Trigo' },
    };
    const apt = aptMap[stateCode] || { local: 'Consultar ZARC/MAPA', media: 'Consultar ZARC/MAPA' };

    // 10. Dados regionais internos — usa stateCode detectado, não o dropdown
    const stateToRegion: Record<string, string> = {
      'MT': 'MT - Médio Norte',
      'GO': 'GO - Sudoeste',
      'PR': 'PR - Oeste',
      'MS': 'MS - Sul',
    };
    const detectedRegionKey = stateToRegion[stateCode];
    const rc = detectedRegionKey ? regionalCosts[detectedRegionKey] : null;

    // Médias estaduais aproximadas para campos físicos (fallback quando rc é null)
    const stateAverages: Record<string, { argila: string; pluvio: string; altimetria: string; relevo: string }> = {
      SP: { argila: '25% a 50%', pluvio: '1.200 a 1.600 mm', altimetria: '300 a 900 m', relevo: 'Plano a Ondulado' },
      MG: { argila: '35% a 65%', pluvio: '1.100 a 1.700 mm', altimetria: '500 a 1.200 m', relevo: 'Ondulado a Forte Ondulado' },
      BA: { argila: '20% a 60%', pluvio: '600 a 1.800 mm', altimetria: '400 a 900 m', relevo: 'Plano a Ondulado (Oeste)' },
      RS: { argila: '30% a 55%', pluvio: '1.400 a 1.800 mm', altimetria: '100 a 700 m', relevo: 'Ondulado a Forte Ondulado' },
      SC: { argila: '40% a 65%', pluvio: '1.400 a 2.000 mm', altimetria: '200 a 1.200 m', relevo: 'Ondulado a Forte Ondulado' },
      RJ: { argila: '20% a 40%', pluvio: '1.000 a 1.500 mm', altimetria: '50 a 500 m', relevo: 'Montanhoso a Plano' },
      ES: { argila: '35% a 55%', pluvio: '1.000 a 1.400 mm', altimetria: '100 a 700 m', relevo: 'Ondulado' },
      PE: { argila: '15% a 45%', pluvio: '400 a 1.200 mm', altimetria: '200 a 700 m', relevo: 'Plano a Ondulado' },
      CE: { argila: '15% a 35%', pluvio: '300 a 1.000 mm', altimetria: '200 a 900 m', relevo: 'Plano a Ondulado' },
      PA: { argila: '40% a 70%', pluvio: '2.000 a 3.000 mm', altimetria: '50 a 300 m', relevo: 'Plano' },
      AM: { argila: '40% a 65%', pluvio: '2.000 a 3.000 mm', altimetria: '50 a 250 m', relevo: 'Plano' },
      TO: { argila: '25% a 55%', pluvio: '1.200 a 1.800 mm', altimetria: '200 a 600 m', relevo: 'Plano a Suave Ondulado' },
      MA: { argila: '20% a 50%', pluvio: '1.200 a 2.000 mm', altimetria: '100 a 500 m', relevo: 'Plano' },
      PI: { argila: '15% a 40%', pluvio: '600 a 1.500 mm', altimetria: '200 a 700 m', relevo: 'Plano a Ondulado' },
      RO: { argila: '35% a 60%', pluvio: '1.600 a 2.400 mm', altimetria: '100 a 400 m', relevo: 'Plano a Suave Ondulado' },
      MT: { argila: '40% a 70%', pluvio: '1.600 a 2.200 mm', altimetria: '250 a 500 m', relevo: 'Plano a Suave Ondulado' },
      GO: { argila: '35% a 65%', pluvio: '1.200 a 1.800 mm', altimetria: '600 a 1.200 m', relevo: 'Plano a Ondulado' },
      PR: { argila: '50% a 80%', pluvio: '1.600 a 2.000 mm', altimetria: '500 a 900 m', relevo: 'Ondulado' },
      MS: { argila: '30% a 60%', pluvio: '1.200 a 1.800 mm', altimetria: '150 a 450 m', relevo: 'Plano a Suave Ondulado' },
      DF: { argila: '40% a 65%', pluvio: '1.200 a 1.600 mm', altimetria: '900 a 1.200 m', relevo: 'Plano a Suave Ondulado' },
      PB: { argila: '10% a 35%', pluvio: '300 a 1.100 mm', altimetria: '200 a 700 m', relevo: 'Plano a Ondulado' },
      AL: { argila: '20% a 50%', pluvio: '1.200 a 2.000 mm', altimetria: '50 a 400 m', relevo: 'Plano a Ondulado' },
      SE: { argila: '20% a 50%', pluvio: '900 a 1.500 mm', altimetria: '50 a 400 m', relevo: 'Plano a Ondulado' },
      RN: { argila: '10% a 35%', pluvio: '300 a 900 mm', altimetria: '50 a 600 m', relevo: 'Plano a Ondulado' },
      AP: { argila: '30% a 60%', pluvio: '2.000 a 3.500 mm', altimetria: '10 a 200 m', relevo: 'Plano' },
      RR: { argila: '25% a 55%', pluvio: '1.400 a 2.200 mm', altimetria: '50 a 400 m', relevo: 'Plano a Suave Ondulado' },
      AC: { argila: '35% a 65%', pluvio: '1.800 a 2.800 mm', altimetria: '100 a 600 m', relevo: 'Plano a Ondulado' },
    };
    const sa = stateAverages[stateCode];

    // 11. Montar média de vento histórico (prioridade: Open-Meteo Hist > NASA > fallback)
    const windAvgStr = windAvgKmh != null
      ? `${windAvgKmh} km/h (média 5 anos)`
      : nasaWind != null
      ? `${(nasaWind * 3.6).toFixed(1)} km/h (NASA médio)`
      : 'Variável (consultar INMET)';

    setAgroIndicators({
      locationLabel: cityLabel,
      stateLabel,
      stateCode,
      argila: {
        local: clayPct != null ? `${clayPct}%` : (rc?.argila ?? sa?.argila ?? 'N/D'),
        media: rc?.argila ?? sa?.argila ?? 'N/D',
      },
      pluvio: {
        local: nasaPrecAnual != null ? `${nasaPrecAnual.toFixed(0)} mm/ano` : 'N/D',
        media: rc?.pluvio ?? sa?.pluvio ?? (nasaPrecAnual != null ? `~${nasaPrecAnual.toFixed(0)} mm/ano` : 'N/D'),
      },
      altimetria: {
        local: altiLocal,
        media: rc?.altimetria ?? sa?.altimetria ?? 'N/D',
      },
      relevo: {
        local: relevoLocal,
        media: rc?.relevo ?? sa?.relevo ?? 'N/D',
      },
      solo: {
        local: soloTipo !== 'N/D' ? soloTipo : (soloMapEstado[stateCode] ?? 'N/D'),
        media: soloMapEstado[stateCode] ?? 'Consultar Embrapa Solos',
      },
      irradiacao: {
        local: nasaSolar != null ? `${(nasaSolar / 3.6).toFixed(1)} kWh/m²/dia` : 'N/D',
        media: nasaSolar != null ? `${(nasaSolar / 3.6).toFixed(1)} kWh/m²/dia` : 'N/D',
      },
      evapotranspiracao: {
        local: nasaEvap != null ? `${(nasaEvap * 365).toFixed(0)} mm/ano` : 'N/D',
        media: nasaEvap != null ? `${(nasaEvap * 365).toFixed(0)} mm/ano` : 'N/D',
      },
      temperatura: {
        local: `${tMed}°C`,
        media: `${tMin}°C – ${tMax}°C`,
      },
      hidrografia: {
        local: riverLocal,   // ← Overpass real
        media: riverMedia,   // ← Overpass real
      },
      culturas: {
        local: rc ? 'Soja · Milho · Algodão' : apt.local,
        media: rc ? 'Soja · Milho · Algodão' : apt.media,
      },
      vento: {
        local: cur.wind_speed_10m != null ? `${cur.wind_speed_10m} km/h ${windDir}` : 'N/D',
        media: windAvgStr,   // ← Open-Meteo Historical real
      },
      umidade: {
        local: cur.relative_humidity_2m != null ? `${cur.relative_humidity_2m}%` : 'N/D',
        media: p.RH2M?.ANN != null ? `${p.RH2M.ANN.toFixed(0)}% (média histórica)` : 'N/D',
      },
      tempDinamica: {
        local: cur.temperature_2m != null ? `${cur.temperature_2m}°C` : 'N/D',
        media: `${tMin}°C – ${tMax}°C`,
      },
      aptidao: { local: apt.local, media: apt.media },
      valorProducao: (() => {
        const pd = rc ?? prodMapEstado[stateCode];
        return {
          local: pd ? `${pd.prodLocal} sc/ha` : 'Consultar IBGE PAM',
          media: pd ? `${pd.prodEstado} sc/ha (${pd.labelEstado})` : 'Consultar CONAB',
        };
      })(),
    });

    // Inteligência de Escoamento
    const lm = logisticsMap[stateCode] ?? logisticsMap['default'];
    setEscoamentoData({
      locationLabel: cityLabel,
      stateCode,
      rodovia: lm.rodovia,
      ferrovia: lm.ferrovia,
      porto: lm.porto,
      freteMedio: lm.freteMedio,
      pedagios: lm.pedagios,
    });
    setFreightDistance(lm.distanciaDefault);
    setFreightRateKm(lm.tarifaDefault);
    setWeatherForecast({ data: weather, locationLabel: cityLabel, stateLabel });
  } catch (e) {
    console.error("Erro ao buscar indicadores agro:", e);
  } finally {
    setLoadingAgro(false);
  }
};

  const calcularDistanciaRota = async () => {
    const orig = `${escoOrigemCidade ? escoOrigemCidade + ', ' : ''}${escoOrigemEstado}, Brasil`;
    const dest = `${escoDestinoCidade ? escoDestinoCidade + ', ' : ''}${escoDestinoEstado}, Brasil`;
    setCalcDistLoading(true);
    try {
      const [g1, g2] = await Promise.all([
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(orig)}&format=json&limit=1`, { headers: { 'User-Agent': 'PrylomApp/1.0' } }).then(r => r.json()),
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(dest)}&format=json&limit=1`, { headers: { 'User-Agent': 'PrylomApp/1.0' } }).then(r => r.json()),
      ]);
      if (g1.length && g2.length) {
        const lat1 = parseFloat(g1[0].lat), lon1 = parseFloat(g1[0].lon);
        const lat2 = parseFloat(g2[0].lat), lon2 = parseFloat(g2[0].lon);
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        setFreightDistance(Math.round(dist * 1.35)); // fator rodoviário Brasil
      }
    } catch { /* silencioso */ }
    finally { setCalcDistLoading(false); }
  };

  const fetchLiveAgroNews = async () => {
    setLoadingNews(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Search for the 5 most recent and relevant agribusiness news and events today.
        Focus on: Soybean/Corn Prices, USDA Reports, Port Logistics and Climate.
        Return the response strictly in the language: ${lang}.
        Format as a JSON ARRAY of objects: [{ "id": "string", "source": "string", "title": "string", "summary": "string", "sentiment": "BULLISH|BEARISH", "timestamp": "string" }]`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                source: { type: Type.STRING },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                sentiment: { type: Type.STRING },
                timestamp: { type: Type.STRING }
              },
              required: ["id", "source", "title", "summary", "sentiment", "timestamp"]
            }
          }
        },
      });
      const newsData = JSON.parse(response.text || "[]");
      setNews(newsData);
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        setSources(response.candidates[0].groundingMetadata.groundingChunks);
      }
    } catch (e) {
      console.error("Erro ao buscar notícias:", e);
    } finally {
      setLoadingNews(false);
    }
  };

 // const getAiImpact = async (item: MarketNews) => {
 //   setLoadingNewsInsight(true);
 //   try {
 //     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
 //     const response = await ai.models.generateContent({
 //       model: "gemini-1.5-flash",
 //       contents: `Analyze the strategic impact of this news for a rural producer: "${item.title} - ${item.summary}". Respond strictly in ${lang} in a premium Prylom consultative tone.`,
 //       config: { tools: [{ googleSearch: {} }] }
  //    });
  //    setNewsInsight({ newsId: item.id, text: response.text || "N/A" });
 //   } catch (e) {
 //     console.error(e);
 //   } finally {
//      setLoadingNewsInsight(false);
 //   }
//  };

  // Ref para evitar double-fetch do React Strict Mode em desenvolvimento
  const newsFetchedLang = useRef<string | null>(null);
  useEffect(() => {
    if (newsFetchedLang.current === lang) return;
    newsFetchedLang.current = lang;
    fetchLiveAgroNews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  

    const tickerSymbols = useMemo(() => JSON.stringify([
      { proName: "FX_IDC:USDBRL", title: "Dólar / Real" },
      { proName: "CBOT:ZS1!", title: "Soja (CBOT)" },
      { proName: "CBOT:ZC1!", title: "Milho (CBOT)" },
      { proName: "CME:LE1!", title: "Boi Gordo" },
      { proName: "ICEUS:KC1!", title: "Café Arábica" },
      { proName: "ICEUS:SB1!", title: "Açúcar" },
      { proName: "INDEX:DXY", title: "DXY Index" }
    ]), []);
  

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 md:py-12 animate-fadeIn flex flex-col gap-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-prylom-dark tracking-tight">{t.btnTools}</h1>
          <p className="text-gray-700 font-bold text-sm mt-1">{t.economicDueDiligence}</p>
        </div>
        <button onClick={onBack} className="bg-white text-prylom-dark border border-gray-200 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           {t.backToStart}
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
         <form onSubmit={handleManualSearch} className="flex-1 w-full flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full space-y-2">
               <label className="text-[10px] font-black text-prylom-dark/60 uppercase tracking-widest block px-1">{t.manualLocationLabel}</label>
               <input 
                 type="text" 
                 value={manualRegion}
                 onChange={e => setManualRegion(e.target.value)}
                 placeholder={t.manualLocationPlaceholder} 
                 className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-2xl outline-none font-bold text-[#000080] transition-all"
               />
            </div>
            <button type="submit" className="bg-prylom-dark text-white font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-prylom-gold active:scale-95 transition-all w-full md:w-auto shadow-xl">
               Analisar Região
            </button>
         </form>
         <div className="h-10 w-px bg-gray-200 hidden md:block"></div>
         <button onClick={() => fetchLocalInsight()} className="text-prylom-gold font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-prylom-gold/5 p-4 rounded-2xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
            {t.useAutoLocation}
         </button>
      </div>
                
                <div className="w-full bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 min-h-[72px]">
                  {React.createElement('tv-ticker-tape', { 
                    symbols: tickerSymbols,
                    colorTheme: "light",
                    isTransparent: false,
                    displayMode: "adaptive",
                    locale: lang.toLowerCase()
                  } as any)}
                </div>



      {/* ── ECONOMICS & INDICADORES AGROTECNOLÓGICOS ── */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-prylom-gold text-[9px] font-black uppercase tracking-[0.4em] block mb-1">
              ▲ Economics & Indicadores Agrotecnológicos
            </span>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              {agroIndicators
                ? `${agroIndicators.locationLabel} · ${agroIndicators.stateLabel}`
                : 'Selecione uma região para carregar os indicadores'}
            </p>
          </div>
          {(loadingAgro || loadingInsight) && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-prylom-gold/30 border-t-prylom-gold rounded-full animate-spin" />
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest animate-pulse hidden md:block">
                Consultando fontes oficiais...
              </span>
            </div>
          )}
        </div>

        {/* Estado vazio */}
        {!agroIndicators && !(loadingAgro || loadingInsight) && (
          <div className="py-16 text-center opacity-40">
            <p className="text-sm font-medium">Use a busca de região acima para carregar os indicadores.</p>
          </div>
        )}

        {/* Loading */}
        {(loadingAgro || loadingInsight) && !agroIndicators && (
          <div className="py-16 flex flex-col items-center gap-5">
            <div className="w-10 h-10 border-4 border-prylom-gold/20 border-t-prylom-gold rounded-full animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse text-center">
              NASA POWER · Open-Meteo · SoilGrids · Nominatim
            </p>
          </div>
        )}

        {/* Grid de cards */}
        {agroIndicators && !(loadingAgro || loadingInsight) && (() => {
          const loc = agroIndicators.locationLabel.toUpperCase();
          const st = `Média ${agroIndicators.stateCode || agroIndicators.stateLabel.split(' ')[0].toUpperCase()}`;
          const cards = [
            { title: 'Teor Médio de Argila',         f: agroIndicators.argila },
            { title: 'Índice Pluviométrico',          f: agroIndicators.pluvio },
            { title: 'Índice de Altimetria',          f: agroIndicators.altimetria },
            { title: 'Índice Relevo',                 f: agroIndicators.relevo },
            { title: 'Solo Predominante',             f: agroIndicators.solo },
            { title: 'Irradiação Global Horizontal',  f: agroIndicators.irradiacao },
            { title: 'Evapotranspiração Ano',         f: agroIndicators.evapotranspiracao },
            { title: 'Temperatura (°C) Ano',          f: agroIndicators.temperatura },
            { title: 'Hidrografia',                   f: agroIndicators.hidrografia },
            { title: 'Principais Culturas',           f: agroIndicators.culturas },
            { title: 'Vento (A Trava da Pulverização)', f: agroIndicators.vento },
            { title: 'Umidade Relativa do Ar (%)',    f: agroIndicators.umidade },
            { title: 'Temperatura Dinâmica',          f: agroIndicators.tempDinamica },
            { title: 'Classificação de Aptidão',      f: agroIndicators.aptidao },
            { title: 'Valor de Produção',             f: agroIndicators.valorProducao },
          ];
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-fadeIn">
              {cards.map(({ title, f }) => (
                <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  {/* Título */}
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-prylom-gold font-black text-[10px] uppercase leading-tight">{title}</p>
                  </div>
                  {/* Valor local */}
                  <div className="px-3 pb-2 flex-1">
                    <p className="text-[8px] font-black text-prylom-gold/60 uppercase tracking-widest">{loc}:</p>
                    <p className="text-[13px] font-black text-[#1a3a48] leading-tight mt-0.5 break-words">{f.local}</p>
                  </div>
                  {/* Divisor */}
                  <div className="h-px bg-gray-100 mx-3" />
                  {/* Média estado */}
                  <div className="px-3 py-2">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{st}:</p>
                    <p className="text-[11px] font-bold text-gray-400 leading-tight mt-0.5 break-words">{f.media}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ── MONITORAMENTO AGROMETEOROLÓGICO ── */}
      {weatherForecast && (() => {
        const w = weatherForecast.data;
        const cur = w.current || {};
        const getWeatherIcon = (code: number) => {
          if (code === 0) return '☀️';
          if (code <= 3)  return '🌤️';
          if (code <= 48) return '☁️';
          if (code <= 67) return '🌧️';
          if (code <= 77) return '❄️';
          if (code <= 82) return '🌦️';
          if (code <= 99) return '⛈️';
          return '☁️';
        };
        const scrollWeather = (dir: 'left' | 'right') => {
          if (weatherScrollRef.current) {
            const delta = dir === 'left' ? -200 : 200;
            weatherScrollRef.current.scrollTo({ left: weatherScrollRef.current.scrollLeft + delta, behavior: 'smooth' });
          }
        };
        return (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-7">
              <div>
                <span className="text-prylom-gold text-[9px] font-black uppercase tracking-[0.4em] block mb-1">▲ Monitoramento Agrometeorológico</span>
                <p className="text-[10px] font-black text-prylom-dark/40 uppercase tracking-widest">
                  {weatherForecast.locationLabel} · {weatherForecast.stateLabel}
                </p>
                <p className="text-[8px] font-bold text-gray-400 mt-0.5">🗓️ Planejando visita? <span className="text-blue-500">Confira a previsão antes de agendar.</span></p>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-[8px] font-black text-gray-400 uppercase italic">Live Data</span>
              </div>
            </div>

            {/* Condições atuais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Temperatura', value: `${cur.temperature_2m}`, unit: '°C', highlight: getWeatherIcon(cur.weather_code ?? 0) + ' ', color: 'text-prylom-dark' },
                { label: 'Umidade',     value: `${cur.relative_humidity_2m}`, unit: '%', highlight: '', color: 'text-prylom-dark' },
                { label: 'Vento (10m)', value: `${cur.wind_speed_10m}`, unit: 'km/h', highlight: '', color: 'text-prylom-dark' },
                { label: 'Precipitação',value: `${cur.precipitation ?? 0}`, unit: 'mm', highlight: '', color: 'text-prylom-gold' },
              ].map(({ label, value, unit, highlight, color }) => (
                <div key={label} className="flex flex-col items-start">
                  <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                  <div className="flex items-end gap-1 h-7">
                    {highlight && <span className="text-xl leading-none mb-px">{highlight}</span>}
                    <p className={`text-lg font-black leading-none ${color}`}>
                      {value}<span className="text-[10px] ml-0.5 font-bold opacity-60">{unit}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Previsão estendida */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <p className="text-[9px] font-black text-prylom-dark uppercase tracking-widest">Tendência {forecastDays} Dias</p>
                  <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    {[7, 15].map(d => (
                      <button key={d} onClick={() => setForecastDays(d)}
                        className={`text-[7px] px-2.5 py-1 font-black uppercase transition-all rounded-md ${forecastDays === d ? 'bg-white shadow-sm text-prylom-dark' : 'text-gray-400 hover:text-prylom-dark'}`}>
                        {d} dias
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => scrollWeather('left')} className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 text-prylom-dark transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button onClick={() => scrollWeather('right')} className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 text-prylom-dark transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              <div ref={weatherScrollRef} className="flex overflow-x-auto gap-3 pb-2 scroll-smooth snap-x" style={{ scrollbarWidth: 'none' }}>
                {w.daily?.time?.slice(1, forecastDays + 1).map((date: string, i: number) => {
                  const d = new Date(date + 'T00:00:00');
                  return (
                    <div key={date} className="min-w-[120px] snap-start bg-gray-50 p-3 rounded-2xl border border-gray-100 flex flex-col items-start hover:border-prylom-gold transition-all">
                      <div className="w-full flex justify-between items-center mb-1.5">
                        <p className="text-[8px] font-black text-prylom-gold uppercase">
                          {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                        </p>
                        <p className="text-[8px] font-bold text-gray-400">
                          {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-xl mb-1.5">{getWeatherIcon(w.daily.weather_code?.[i + 1] ?? 0)}</span>
                      <span className="text-[12px] font-black text-prylom-dark">
                        {Math.round(w.daily.temperature_2m_max?.[i + 1])}° / {Math.round(w.daily.temperature_2m_min?.[i + 1])}°
                      </span>
                      <span className="text-[8px] font-bold text-blue-500 uppercase flex items-center gap-1 mt-0.5">
                        ☔ {w.daily.precipitation_probability_max?.[i + 1]}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── INTELIGÊNCIA DE ESCOAMENTO ── */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-prylom-gold text-[9px] font-black uppercase tracking-[0.4em] block mb-1">
              ▲ Inteligência de Escoamento
            </span>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
              {escoamentoData
                ? `${escoamentoData.locationLabel} · ${escoamentoData.stateCode}`
                : 'Selecione uma região para carregar a inteligência logística'}
            </p>
          </div>
          {loadingAgro && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-prylom-gold/30 border-t-prylom-gold rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Estado vazio */}
        {!escoamentoData && !loadingAgro && (
          <div className="py-16 text-center opacity-40">
            <p className="text-sm font-medium">Use a busca de região acima para carregar a inteligência de escoamento.</p>
          </div>
        )}

        {/* Loading */}
        {loadingAgro && !escoamentoData && (
          <div className="py-16 flex flex-col items-center gap-5">
            <div className="w-10 h-10 border-4 border-prylom-gold/20 border-t-prylom-gold rounded-full animate-spin" />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] animate-pulse text-center">
              DNIT · ANTT · ANTAQ · SIFRECA
            </p>
          </div>
        )}

        {escoamentoData && !loadingAgro && (() => {
          const loc = escoamentoData.locationLabel.toUpperCase();
          const st = `Média ${escoamentoData.stateCode}`;
          const infCards = [
            { title: 'Rodovia',    f: escoamentoData.rodovia },
            { title: 'Ferrovia',   f: escoamentoData.ferrovia },
            { title: 'Porto',      f: escoamentoData.porto },
            { title: 'Frete Médio\n(R$/Tonelada · R$/Saca)', f: escoamentoData.freteMedio },
            { title: 'Custo de Pedágios\n(Estimativa por Eixo)', f: escoamentoData.pedagios },
          ];
          const freteTon = freightDistance * freightRateKm * riskFactor;
          const freteSaca = freteTon * 0.06;
          const indiceFPL = destPrice > 0 ? (freteSaca / destPrice) * 100 : 0;
          const spreadEsc = destPrice - freteSaca;
          const fplDiag = indiceFPL < 10
            ? `Excelente vantagem logística. O frete representa menos de 10% do valor da carga, garantindo alta resiliência a oscilações de diesel e preço.`
            : indiceFPL < 20
            ? `Frete em zona de atenção. Custos de escoamento consomem ${indiceFPL.toFixed(1)}% da margem. Recomenda-se fixação antecipada.`
            : `Frete crítico. Incidência de ${indiceFPL.toFixed(1)}% sobre o preço destino representa compressão severa de margem.`;
          return (
            <div className="space-y-6 animate-fadeIn">
              {/* 5 cards de infraestrutura */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {infCards.map(({ title, f }) => (
                  <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-3 pt-3 pb-1">
                      <p className="text-prylom-gold font-black text-[10px] uppercase leading-tight whitespace-pre-line">{title}</p>
                    </div>
                    <div className="px-3 pb-2 flex-1">
                      <p className="text-[8px] font-black text-prylom-gold/60 uppercase tracking-widest">{loc}:</p>
                      <p className="text-[12px] font-black text-[#1a3a48] leading-tight mt-0.5 break-words">{f.local}</p>
                    </div>
                    <div className="h-px bg-gray-100 mx-3" />
                    <div className="px-3 py-2">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{st}:</p>
                      <p className="text-[11px] font-bold text-gray-400 leading-tight mt-0.5 break-words">{f.media}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculadora de Spread Logístico */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                {/* Definição do Fluxo */}
                <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 space-y-4">
                  <p className="text-[9px] font-black text-prylom-gold uppercase tracking-[0.3em]">Definição do Fluxo</p>

                  {/* Origem */}
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Origem</label>
                    <div className="flex gap-2">
                      <select value={escoOrigemEstado} onChange={e => { setEscoOrigemEstado(e.target.value); setEscoOrigemCidade(''); }}
                        className="w-16 bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold appearance-none text-center">
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={escoOrigemCidade} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEscoOrigemCidade(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold appearance-none">
                        <option value="">Cidade</option>
                        {(brasilCidades[escoOrigemEstado] || []).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Destino */}
                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Destino</label>
                    <div className="flex gap-2">
                      <select value={escoDestinoEstado} onChange={e => { setEscoDestinoEstado(e.target.value); setEscoDestinoCidade(''); }}
                        className="w-16 bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold appearance-none text-center">
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={escoDestinoCidade} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEscoDestinoCidade(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold appearance-none">
                        <option value="">Cidade / Porto</option>
                        {(brasilCidades[escoDestinoEstado] || []).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Botão calcular */}
                  <button onClick={calcularDistanciaRota} disabled={calcDistLoading}
                    className="w-full bg-prylom-dark text-prylom-gold text-[9px] font-black uppercase tracking-widest py-2.5 rounded-xl hover:bg-prylom-gold hover:text-prylom-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {calcDistLoading
                      ? <><div className="w-3 h-3 border-2 border-prylom-gold/30 border-t-prylom-gold rounded-full animate-spin" /> Calculando...</>
                      : '↔ Calcular Distância'}
                  </button>

                  {/* Divisor OU */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-[8px] font-black text-gray-300 uppercase">ou informe</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Distância manual + tarifa */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">KM</label>
                      <input type="number" value={freightDistance} onChange={e => setFreightDistance(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">R$/T/KM</label>
                      <input type="number" step="0.01" value={freightRateKm} onChange={e => setFreightRateKm(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold" />
                    </div>
                  </div>
                </div>

                {/* Spread Logístico — card central */}
                <div className="bg-prylom-dark rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden">
                  <span className="text-prylom-gold text-[9px] font-black uppercase tracking-[0.2em] block">Spread Logístico Prylom</span>
                  <div>
                    <p className="text-4xl font-black text-white mt-2">
                      R$ {spreadEsc.toFixed(2).replace('.', ',')}
                      <span className="text-xs opacity-40 ml-1">/ saca</span>
                    </p>
                    <p className="text-[9px] text-gray-400 mt-1 font-medium">Margem Final: Destino – Origem + Frete Real</p>
                  </div>
                  <div className="absolute bottom-0 right-0 p-4 opacity-5 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-28 w-28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                </div>

                {/* Métricas + Diagnóstico */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#000080]/5 rounded-2xl p-4 border border-[#000080]/10 text-center">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Índice FPL</p>
                      <p className="text-2xl font-black text-[#000080]">{indiceFPL.toFixed(1)}</p>
                      <p className="text-[7px] font-bold text-gray-400 uppercase mt-0.5">Incidência %</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-center">
                      <p className="text-[8px] font-black text-green-700 uppercase mb-1">Frete por Saca</p>
                      <p className="text-2xl font-black text-green-700">R$ {freteSaca.toFixed(2).replace('.', ',')}</p>
                      <p className="text-[7px] font-bold text-green-600/60 uppercase mt-0.5">Padrão 60 kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <label className="text-[8px] font-black text-gray-400 uppercase block mb-1">Preço Destino (sc)</label>
                      <input type="number" value={destPrice} onChange={e => setDestPrice(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold" />
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <label className="text-[8px] font-black text-gray-400 uppercase block mb-1">Fator de Risco %</label>
                      <select value={riskFactor} onChange={e => setRiskFactor(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold appearance-none">
                        <option value={1.0}>Cenário Limpo (0%)</option>
                        <option value={1.05}>Safra / Chuvas (+5%)</option>
                        <option value={1.15}>Risco Alto / Filas (+15%)</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-prylom-gold/5 rounded-2xl p-4 border border-prylom-gold/20">
                    <p className="text-[9px] font-black text-[#000080] uppercase tracking-widest mb-1">Diagnóstico Prylom:</p>
                    <p className="text-[10px] font-medium text-prylom-dark leading-relaxed italic">{fplDiag}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100 space-y-8 min-h-[400px]">
             <header className="flex items-center gap-4">
                <div className="w-12 h-12 bg-prylom-dark text-prylom-gold rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div>
                   <h3 className="text-xl font-black text-prylom-dark uppercase tracking-tight">Análise de Região Prylom AI</h3>
                   <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{localInsight?.locationName || 'Detectando...'}</p>
                </div>
             </header>

             {loadingInsight ? (
               <div className="py-20 flex flex-col items-center justify-center gap-6">
                  <div className="w-10 h-10 border-4 border-prylom-gold/20 border-t-prylom-gold rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse tracking-[0.4em]">Auditando Dados Regionais...</p>
               </div>
             ) : localInsight ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fadeIn">
                  <div className="space-y-4">
                     <span className="text-prylom-gold text-[10px] font-black uppercase tracking-widest">Dossiê Técnico</span>
                     <p className="text-sm font-medium text-prylom-dark leading-relaxed whitespace-pre-wrap">{localInsight.technical}</p>
                  </div>
                  <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100 flex flex-col">
                     <span className="text-prylom-dark/40 text-[10px] font-black uppercase tracking-widest mb-4">Em Resumo</span>
                     <p className="text-sm font-bold text-[#000080] italic leading-relaxed mb-8">"{localInsight.simple}"</p>
                     <div className="mt-auto pt-6 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ref: {localInsight.coords}</span>
                     </div>
                  </div>
               </div>
             ) : (
               <div className="py-20 text-center opacity-40">
                  <p className="text-sm font-medium">Selecione uma região ou use sua localização para iniciar o diagnóstico.</p>
               </div>
             )}
          </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Dashboard Barter */}
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 flex flex-col gap-8">
            <header className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-prylom-dark uppercase tracking-tight mb-1">{t.greenCurrency}</h3>
                <p className="text-gray-700 text-xs font-bold">Indicadores de Troca e Margem Operacional</p>
              </div>
              <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                ratioHealth === 'success' ? 'bg-green-100 text-green-700' : 
                ratioHealth === 'danger' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {ratioHealth === 'success' ? t.ratioSuccess : ratioHealth === 'danger' ? t.ratioAlert : t.ratioStable}
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-prylom-dark/60 uppercase tracking-widest block px-1">Cultura / Ativo</label>
                <select value={commodity} onChange={e => setCommodity(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-[#000080] outline-none border-2 border-transparent focus:border-prylom-gold appearance-none cursor-pointer">
                  <option value="soja">{t.soy} (Saca 60kg)</option>
                  <option value="milho">{t.corn} (Saca 60kg)</option>
                  <option value="boi">Boi Gordo (@)</option>
                  <option value="cafe">Café Arábica (Saca 60kg)</option>
                  <option value="algodao">Algodão (Pluma)</option>
                  <option value="trigo">Trigo (Ton)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-prylom-dark/60 uppercase tracking-widest block px-1">{t.bagPriceLabel}</label>
                <input type="number" value={commodityPrice} onChange={e => setCommodityPrice(parseFloat(e.target.value))} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-[#000080] outline-none border-2 border-transparent focus:border-prylom-gold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-prylom-dark/60 uppercase tracking-widest block px-1">Custo Insumo ({getSymbol()})</label>
                <input type="number" value={inputCost} onChange={e => setInputCost(parseFloat(e.target.value))} className="w-full p-4 bg-gray-50 rounded-2xl font-black text-[#000080] outline-none border-2 border-transparent focus:border-prylom-gold" />
              </div>
            </div>

            <div className="bg-prylom-dark text-white rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden">
               <div className="flex-1 text-center md:text-left z-10">
                  <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">{t.exchangeRatio}</span>
                  <p className="text-3xl md:text-4xl font-black leading-tight">
                    {barterRatio.toFixed(2)} 
                    <span className="text-sm text-gray-300 font-bold uppercase ml-2 block md:inline">unidades / insumo</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium">Referência de Mercado: {historicalAvg} unidades</p>
               </div>
               <div className="w-px h-16 bg-white/10 hidden md:block"></div>
               <div className="flex-1 text-center md:text-left z-10">
                  <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">{t.breakEven}</span>
                  <p className="text-3xl font-black">{regionalCosts[region]?.yieldBe} <span className="text-xs text-gray-300 font-bold uppercase">{t.bagsPerHa}</span></p>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium">Base de Sustentabilidade</p>
               </div>
            </div>
          </div>

          {/* NOVO CARD: INTELIGÊNCIA DE FRETE & SPREAD LOGÍSTICO (VISÃO PRYLOM) */}
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100 space-y-10 animate-fadeIn">
            <header className="flex justify-between items-center border-b border-gray-50 pb-8">
              <div>
                <h3 className="text-2xl font-black text-[#000080] uppercase tracking-tighter flex items-center gap-3">
                  📦 Inteligência de Frete & Spread
                </h3>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Análise Logística de Alta Precisão</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${freightAnalysis.ipel > 10 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                IPEL: {freightAnalysis.efficiency}
              </span>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Entradas Logísticas */}
              <div className="space-y-6">
                 <div className="p-6 bg-gray-50 rounded-3xl space-y-6 border border-gray-100">
                    <h4 className="text-[10px] font-black text-prylom-gold uppercase tracking-widest px-1">Definição do Fluxo</h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Origem</label>
                          <input value={freightOrigin} onChange={e => setFreightOrigin(e.target.value)} className="w-full bg-white border border-gray-200 p-3 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Destino</label>
                          <input value={freightDest} onChange={e => setFreightDest(e.target.value)} className="w-full bg-white border border-gray-200 p-3 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Distância (km)</label>
                          <input type="number" value={freightDistance} onChange={e => setFreightDistance(Number(e.target.value))} className="w-full bg-white border border-gray-200 p-3 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">R$ / t / km</label>
                          <input type="number" value={freightRateKm} step="0.01" onChange={e => setFreightRateKm(Number(e.target.value))} className="w-full bg-white border border-gray-200 p-3 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold" />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                       <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Preço Destino (sc)</label>
                       <input type="number" value={destPrice} onChange={e => setDestPrice(Number(e.target.value))} className="w-full bg-white border border-gray-200 p-3 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold" />
                    </div>
                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                       <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Fator de Risco %</label>
                       <select value={riskFactor} onChange={e => setRiskFactor(Number(e.target.value))} className="w-full bg-white border border-gray-200 p-3 rounded-xl text-xs font-bold text-[#000080] outline-none focus:border-prylom-gold appearance-none">
                          <option value={1.0}>Cenário Limpo (0%)</option>
                          <option value={1.05}>Safra / Chuvas (+5%)</option>
                          <option value={1.15}>Risco Alto / Filas (+15%)</option>
                       </select>
                    </div>
                 </div>
              </div>

              {/* Resultados Estratégicos */}
              <div className="space-y-8">
                 <div className="bg-prylom-dark text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                    <span className="text-prylom-gold text-[9px] font-black uppercase tracking-[0.2em] mb-4 block">Spread Logístico Prylom</span>
                    <p className="text-4xl font-black text-white">{formatPrice(freightAnalysis.spreadUnit)} <span className="text-xs opacity-40">/ saca</span></p>
                    <p className="text-[9px] text-gray-400 mt-2 font-medium">Margem Final: Destino – (Origem + Frete Real)</p>
                    <div className="absolute bottom-0 right-0 p-4 opacity-5 pointer-events-none">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-[#000080]/5 rounded-3xl border border-[#000080]/10 text-center">
                       <p className="text-[8px] font-black text-gray-400 uppercase mb-2">Índice IPEL</p>
                       <p className="text-2xl font-black text-[#000080]">{freightAnalysis.ipel.toFixed(1)}</p>
                       <p className="text-[7px] font-bold text-gray-400 uppercase mt-1">Eficiência Ativo/Frete</p>
                    </div>
                    <div className="p-6 bg-green-50 rounded-3xl border border-green-100 text-center">
                       <p className="text-[8px] font-black text-green-700 uppercase mb-2">Frete por Saca</p>
                       <p className="text-2xl font-black text-green-700">{formatPrice(freightAnalysis.costPerTon / 16.666)}</p>
                       <p className="text-[7px] font-bold text-green-600/60 uppercase mt-1">Padrão 60kg</p>
                    </div>
                 </div>

                 <div className="p-6 bg-prylom-gold/5 rounded-3xl border border-prylom-gold/20 italic">
                    <p className="text-[10px] font-black text-[#000080] uppercase tracking-widest mb-2">Diagnóstico Prylom:</p>
                    <p className="text-xs font-medium text-prylom-dark leading-relaxed">
                      {freightAnalysis.ipel > 10 
                        ? "Excelente vantagem logística. O frete representa menos de 10% do valor da carga, garantindo alta resiliência a oscilações de diesel e preço."
                        : "Logística em zona de atenção. Custos de escoamento consomem parte significativa da margem. Recomenda-se fixação futura para proteger o spread."}
                    </p>
                 </div>
              </div>
            </div>
          </div>


        </div>

<div className="space-y-8">
  <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 flex flex-col gap-6 shadow-inner">
    <div>
      <h3 className="text-lg font-black text-prylom-dark uppercase tracking-tight mb-1">{t.landMeasures}</h3>
      <p className="text-gray-700 text-xs font-bold">Fonte de Dados: IMEA / CONAB</p>
    </div>
    
    <div className="space-y-4">
       <label className="text-[10px] font-black text-prylom-dark/60 uppercase tracking-widest block px-1">{t.selectRegion}</label>
       <select value={region} onChange={e => setRegion(e.target.value)} className="w-full p-4 bg-white rounded-2xl font-bold text-[#000080] border border-gray-200 outline-none appearance-none cursor-pointer shadow-sm">
          {Object.keys(regionalCosts).map(r => <option key={r} value={r}>{r}</option>)}
       </select>
    </div>

    {/* Métricas Conforme Imagem 3 */}
    <div className="mt-4 space-y-6">
       <div className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
         <span className="text-[10px] font-black text-gray-400 uppercase">Custo Médio / Ha</span>
         <span className="font-black text-prylom-dark">{formatPrice(regionalCosts[region]?.costHa, 0)}</span>
       </div>
       <div className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
         <span className="text-[10px] font-black text-gray-400 uppercase">Aptidão Reg.</span>
         <span className="text-[9px] font-black uppercase text-prylom-gold tracking-widest">Alta Performance</span>
       </div>

       {/* Dados Agro-técnicos (Imagem 3) */}
       <div className="pt-4 space-y-4 text-center">
         <div>
            <p className="text-prylom-gold text-[12px] font-black uppercase tracking-tighter">Teor médio de Argila</p>
            <p className="text-[#000080] text-lg font-black opacity-40">{regionalCosts[region].argila}</p>
         </div>
         <div>
            <p className="text-prylom-gold text-[12px] font-black uppercase tracking-tighter">Indice Pluviometrico</p>
            <p className="text-[#000080] text-lg font-black opacity-40">{regionalCosts[region].pluvio}</p>
         </div>
         <div>
            <p className="text-prylom-gold text-[12px] font-black uppercase tracking-tighter">Indice de Altimetria</p>
            <p className="text-[#000080] text-lg font-black opacity-40">{regionalCosts[region].altimetria}</p>
         </div>
         <div>
            <p className="text-prylom-gold text-[12px] font-black uppercase tracking-tighter">Indice Relevo</p>
            <p className="text-[#000080] text-lg font-black opacity-40">{regionalCosts[region].relevo}</p>
         </div>
       </div>

       {/* Escoamento (Imagem 1) */}
       <div className="pt-6 border-t border-gray-200">
         <p className="text-prylom-gold text-[13px] font-black uppercase tracking-tighter text-center mb-4">
            Escoamento da Produção <br/> <span className="text-[#000080]">{regionalCosts[region].location}</span>
         </p>
         <div className="space-y-3">
           <div className="flex justify-between text-[11px] font-black uppercase">
             <span className="text-[#000080]">Rodovia:</span>
             <span className="text-gray-400">{regionalCosts[region].rodovia}</span>
           </div>
           <div className="flex justify-between text-[11px] font-black uppercase">
             <span className="text-[#000080]">Ferrovia:</span>
             <span className="text-gray-400">{regionalCosts[region].ferrovia}</span>
           </div>
           <div className="flex justify-between text-[11px] font-black uppercase">
             <span className="text-[#000080]">Porto:</span>
             <span className="text-gray-400">{regionalCosts[region].porto}</span>
           </div>
         </div>
       </div>

       {/* Produção Soja (Imagem 2) */}
       <div className="bg-[#2C5266] p-6 rounded-[2rem] shadow-lg mt-6">
          <div className="text-center mb-4">
            <p className="text-white font-black text-[13px] uppercase leading-tight">Estimativa de Produtividade</p>
            <p className="text-white/50 font-bold text-[9px] uppercase tracking-widest">(saca/ha) 2025/26</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-prylom-gold text-[10px] font-black uppercase">(MUN) {regionalCosts[region].location}:</span>
              <span className="text-white font-bold text-xs">{regionalCosts[region].prodLocal} sacas/ha</span>
            </div>
            <div className="flex justify-between items-center opacity-80 pt-2 border-t border-white/10">
              <span className="text-prylom-gold text-[10px] font-black uppercase">Média {regionalCosts[region].labelEstado}:</span>
              <span className="text-white font-bold text-xs">{regionalCosts[region].prodEstado} sacas/ha</span>
            </div>
            <div className="flex justify-between items-center opacity-60">
              <span className="text-prylom-gold text-[10px] font-black uppercase">Média Brasil:</span>
              <span className="text-white font-bold text-xs">{regionalCosts[region].prodBrasil} sacas/ha</span>
            </div>
          </div>
       </div>
    </div>
  </div>
</div>
</div>

      {/* ── FEED DE NOTÍCIAS AGRO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Coluna de Notícias */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-prylom-gold uppercase tracking-[0.3em]">{t.liveFeed}</span>
              </div>
              <h2 className="text-xl font-black text-[#000080] uppercase tracking-widest">{t.terminalMainEvents}</h2>
            </div>
            <button onClick={fetchLiveAgroNews} className="text-[9px] font-black text-prylom-gold uppercase tracking-widest hover:underline">
              {t.terminalUpdateScan}
            </button>
          </div>

          {loadingNews ? (
            <div className="py-20 flex flex-col items-center justify-center gap-6 bg-white rounded-[2.5rem] border border-gray-100">
              <div className="w-10 h-10 border-4 border-prylom-gold/20 border-t-prylom-gold rounded-full animate-spin"></div>
              <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">{t.terminalGlobalScan}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {news.length === 0 && (
                <p className="text-center py-10 text-gray-400 font-bold uppercase text-[10px]">{t.marketEmpty}</p>
              )}
              {news.map(item => (
                <div key={item.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all duration-500">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-gray-100 text-gray-500 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      {item.source} • {item.timestamp}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${item.sentiment === 'BULLISH' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.sentiment}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-prylom-dark mb-4 leading-tight">{item.title}</h3>
                  <p className="text-gray-600 text-sm mb-6 font-medium">{item.summary}</p>
                  <button
                   // onClick={() => getAiImpact(item)}
                    disabled={loadingNewsInsight}
                    className="flex items-center gap-2 text-prylom-gold font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-all disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {loadingNewsInsight ? t.adminProcessing : t.aiAnalysis}
                  </button>
                  {newsInsight?.newsId === item.id && (
                    <div className="mt-6 p-6 bg-prylom-dark text-white rounded-3xl border-l-4 border-prylom-gold animate-fadeIn">
                      <p className="text-xs font-bold leading-relaxed opacity-90 whitespace-pre-wrap">{newsInsight.text}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {sources.length > 0 && (
            <div className="px-4">
              <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">{t.terminalSources}</h4>
              <div className="flex flex-wrap gap-3">
                {sources.map((source, idx) => (
                  <a key={idx} href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-prylom-gold hover:underline">
                    [{idx + 1}] {source.web?.title || 'External Reference'}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Painel Disclaimer */}
        <div>
          <div className="bg-[#000080] p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-4 block">{t.terminalDisclaimer}</span>
              <h4 className="text-xl font-black mb-4 tracking-tight">{t.terminalExecution}</h4>
              <p className="text-xs font-medium leading-relaxed opacity-70">{t.terminalDisclaimerDesc}</p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-prylom-gold/10 rounded-full blur-3xl"></div>
          </div>
        </div>

      </div>

</div>
  );
};

export default ToolsHub;