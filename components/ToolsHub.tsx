import React, { useEffect, useState, useMemo, useRef } from 'react';
import { AppCurrency, AppLanguage, MarketNews } from '../types';

interface Props {
  onBack: () => void;
  t: any;
  lang: AppLanguage;
  currency: AppCurrency;
}

const BR_STATES: { sigla: string; nome: string; capital: string; cidades: string[] }[] = [
  { sigla: 'AC', nome: 'Acre', capital: 'Rio Branco', cidades: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó'] },
  { sigla: 'AL', nome: 'Alagoas', capital: 'Maceió', cidades: ['Maceió', 'Arapiraca', 'Palmeira dos Índios', 'São Miguel dos Campos', 'Penedo', 'União dos Palmares'] },
  { sigla: 'AM', nome: 'Amazonas', capital: 'Manaus', cidades: ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé', 'Humaitá'] },
  { sigla: 'AP', nome: 'Amapá', capital: 'Macapá', cidades: ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Porto Grande'] },
  { sigla: 'BA', nome: 'Bahia', capital: 'Salvador', cidades: ['Salvador', 'Feira de Santana', 'Luís Eduardo Magalhães', 'Barreiras', 'Vitória da Conquista', 'Ilhéus', 'Juazeiro', 'Bom Jesus da Lapa', 'Correntina', 'Formosa do Rio Preto', 'São Desidério', 'Riachão das Neves', 'Cotegipe'] },
  { sigla: 'CE', nome: 'Ceará', capital: 'Fortaleza', cidades: ['Fortaleza', 'Sobral', 'Juazeiro do Norte', 'Quixadá', 'Iguatu', 'Russas', 'Cratéus', 'Limoeiro do Norte'] },
  { sigla: 'DF', nome: 'Distrito Federal', capital: 'Brasília', cidades: ['Brasília', 'Planaltina', 'Paranoá', 'Brazlândia'] },
  { sigla: 'ES', nome: 'Espírito Santo', capital: 'Vitória', cidades: ['Vitória', 'Cachoeiro de Itapemirim', 'Colatina', 'Linhares', 'São Mateus', 'Alegre', 'Barra de São Francisco', 'Nova Venécia'] },
  { sigla: 'GO', nome: 'Goiás', capital: 'Goiânia', cidades: ['Goiânia', 'Anápolis', 'Rio Verde', 'Jataí', 'Mineiros', 'Catalão', 'Itumbiara', 'Formosa', 'Cristalina', 'Quirinópolis', 'Morrinhos', 'Chapadão do Céu', 'Montividiu', 'Serranópolis', 'Paraúna'] },
  { sigla: 'MA', nome: 'Maranhão', capital: 'São Luís', cidades: ['São Luís', 'Imperatriz', 'Caxias', 'Timon', 'Balsas', 'Barra do Corda', 'Chapadinha', 'Codó', 'Açailândia', 'Santa Inês', 'Tasso Fragoso', 'Riachão'] },
  { sigla: 'MG', nome: 'Minas Gerais', capital: 'Belo Horizonte', cidades: ['Belo Horizonte', 'Uberlândia', 'Uberaba', 'Patos de Minas', 'Montes Claros', 'Sete Lagoas', 'Divinópolis', 'Varginha', 'Araguari', 'Ituiutaba', 'Paracatu', 'Araxá', 'Frutal', 'Iturama', 'Buritis', 'João Pinheiro', 'Coromandel', 'Vazante'] },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', capital: 'Campo Grande', cidades: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Naviraí', 'Nova Andradina', 'Maracaju', 'Rio Brilhante', 'Chapadão do Sul', 'Sidrolândia', 'Sonora', 'Coxim', 'Amambai', 'Iguatemi', 'São Gabriel do Oeste'] },
  { sigla: 'MT', nome: 'Mato Grosso', capital: 'Cuiabá', cidades: ['Cuiabá', 'Sorriso', 'Lucas do Rio Verde', 'Sinop', 'Rondonópolis', 'Tangará da Serra', 'Primavera do Leste', 'Campo Verde', 'Nova Mutum', 'Sapezal', 'Campo Novo do Parecis', 'Querência', 'Água Boa', 'Canarana', 'Alta Floresta', 'Diamantino', 'Nova Ubiratã', 'Ipiranga do Norte', 'Tapurah', 'Vera', 'São José do Rio Claro', 'Brasnorte'] },
  { sigla: 'PA', nome: 'Pará', capital: 'Belém', cidades: ['Belém', 'Santarém', 'Marabá', 'Castanhal', 'Paragominas', 'Altamira', 'Redenção', 'Dom Eliseu', 'Rondon do Pará', 'Itaituba', 'Novo Progresso', 'Ulianópolis', 'Abel Figueiredo'] },
  { sigla: 'PB', nome: 'Paraíba', capital: 'João Pessoa', cidades: ['João Pessoa', 'Campina Grande', 'Patos', 'Sousa', 'Cajazeiras', 'Pombal', 'Guarabira'] },
  { sigla: 'PE', nome: 'Pernambuco', capital: 'Recife', cidades: ['Recife', 'Caruaru', 'Petrolina', 'Garanhuns', 'Santa Cruz do Capibaribe', 'Salgueiro', 'Serra Talhada', 'Araripina', 'Ouricuri'] },
  { sigla: 'PI', nome: 'Piauí', capital: 'Teresina', cidades: ['Teresina', 'Parnaíba', 'Picos', 'Floriano', 'Bom Jesus', 'Uruçuí', 'Corrente', 'São Raimundo Nonato', 'Baixa Grande do Ribeiro', 'Santa Filomena', 'Sebastião Leal'] },
  { sigla: 'PR', nome: 'Paraná', capital: 'Curitiba', cidades: ['Curitiba', 'Cascavel', 'Londrina', 'Maringá', 'Ponta Grossa', 'Guarapuava', 'Campo Mourão', 'Umuarama', 'Toledo', 'Palmas', 'Francisco Beltrão', 'Paranavaí', 'Cianorte', 'Medianeira', 'Palotina', 'Corbélia', 'Assis Chateaubriand', 'Irati'] },
  { sigla: 'RJ', nome: 'Rio de Janeiro', capital: 'Rio de Janeiro', cidades: ['Rio de Janeiro', 'Niterói', 'Campos dos Goytacazes', 'Macaé', 'Barra do Piraí', 'Petrópolis', 'Nova Friburgo'] },
  { sigla: 'RN', nome: 'Rio Grande do Norte', capital: 'Natal', cidades: ['Natal', 'Mossoró', 'Caicó', 'Açu', 'Currais Novos', 'Apodi', 'Pau dos Ferros'] },
  { sigla: 'RO', nome: 'Rondônia', capital: 'Porto Velho', cidades: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal', 'Rolim de Moura', 'Jaru', 'Ouro Preto do Oeste', 'Cerejeiras', 'Colorado do Oeste', 'Corumbiara'] },
  { sigla: 'RR', nome: 'Roraima', capital: 'Boa Vista', cidades: ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Mucajaí', 'Cantá'] },
  { sigla: 'RS', nome: 'Rio Grande do Sul', capital: 'Porto Alegre', cidades: ['Porto Alegre', 'Caxias do Sul', 'Passo Fundo', 'Pelotas', 'Santa Maria', 'Ijuí', 'Cruz Alta', 'Cachoeira do Sul', 'Não-Me-Toque', 'Erechim', 'Santo Ângelo', 'Bagé', 'Uruguaiana', 'Giruá', 'Carazinho', 'Palmeira das Missões', 'Tupanciretã', 'São Borja', 'Alegrete', 'Santana do Livramento'] },
  { sigla: 'SC', nome: 'Santa Catarina', capital: 'Florianópolis', cidades: ['Florianópolis', 'Joinville', 'Blumenau', 'Chapecó', 'Lages', 'Caçador', 'Concórdia', 'Campos Novos', 'Curitibanos', 'Xanxerê', 'São Miguel do Oeste', 'Abelardo Luz', 'Quilombo'] },
  { sigla: 'SE', nome: 'Sergipe', capital: 'Aracaju', cidades: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'Tobias Barreto', 'Estância', 'Simão Dias'] },
  { sigla: 'SP', nome: 'São Paulo', capital: 'São Paulo', cidades: ['São Paulo', 'Campinas', 'Ribeirão Preto', 'São José do Rio Preto', 'Araçatuba', 'Bauru', 'Marília', 'Presidente Prudente', 'Ourinhos', 'Assis', 'Tupã', 'Votuporanga', 'Fernandópolis', 'Franca', 'Barretos', 'Jaboticabal', 'Bebedouro', 'Orlândia', 'Sertãozinho', 'Lins', 'Penápolis', 'Andradina'] },
  { sigla: 'TO', nome: 'Tocantins', capital: 'Palmas', cidades: ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Dianópolis', 'Pedro Afonso', 'Formoso do Araguaia', 'Campos Lindos', 'São Félix do Tocantins', 'Lagoa da Confusão'] },
];

const ToolsHub: React.FC<Props> = ({ onBack, t, lang, currency }) => {
  const [commodity, setCommodity] = useState('soja');
  const [commodityPrice, setCommodityPrice] = useState(135.50);
  const [inputCost, setInputCost] = useState(2500);
  const [region, setRegion] = useState('MT - Médio Norte');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
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
  const [weatherTab, setWeatherTab] = useState<'previsao' | 'avancado'>('previsao');
  const weatherScrollRef = useRef<HTMLDivElement>(null);
  const tvTickerRef      = useRef<HTMLDivElement>(null);
  // Termômetro Imobiliário — Motores
  const [vtAreaTotal,    setVtAreaTotal]    = useState(1000);
  const [vtAreaLavoura,  setVtAreaLavoura]  = useState(700);
  const [vtAreaPastagem, setVtAreaPastagem] = useState(200);
  const [vtAreaReserva,  setVtAreaReserva]  = useState(100);
  const [vtProdSacas,    setVtProdSacas]    = useState(65);
  const [vtArrendSacas,  setVtArrendSacas]  = useState(10);
  const [vtCapRate,      setVtCapRate]      = useState(0.04);
  const [vtDistAsfalto,  setVtDistAsfalto]  = useState(20);
  const [vtTemSilo,      setVtTemSilo]      = useState(false);
  const [vtMatricula,    setVtMatricula]    = useState(true);
  const [vtGeoAverbado,  setVtGeoAverbado]  = useState(true);
  const [vtPassivo,      setVtPassivo]      = useState(false);
  const [vtEstado,       setVtEstado]       = useState('MT');
  // Conversor de unidades
  const [ucValue, setUcValue] = useState<number>(1);
  const [ucFrom,  setUcFrom]  = useState('Hectare');
  const [ucTo,    setUcTo]    = useState('Alqueire Paulista');


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
  const [loadingNews, setLoadingNews] = useState(true);

  // Módulos colapsáveis (accordion)
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const toggleModule = (id: string) => setOpenModules(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

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

// --- ESTIMATIVA DE PRODUTIVIDADE: dados por estado ---
const produtividadeMap: Record<string, {
  soja:  { mun: string; estado: string; brasil: string; precoSaca: number; custoProd: number };
  milho: { mun: string; estado: string; brasil: string; precoSaca: number; custoProd: number };
  delta: { soja: number; milho: number };
  nomeEstado: string;
}> = {
  MT: { nomeEstado: 'Mato Grosso',    soja:  { mun: '82 a 95', estado: '60 a 72', brasil: '60', precoSaca: 133, custoProd: 5500 }, milho: { mun: '82 a 95', estado: '60 a 75', brasil: '62', precoSaca: 68, custoProd: 1800 }, delta: { soja: -2.1, milho: 4.8 } },
  GO: { nomeEstado: 'Goiás',          soja:  { mun: '58 a 68', estado: '55 a 65', brasil: '60', precoSaca: 130, custoProd: 5200 }, milho: { mun: '100 a 120', estado: '90 a 110', brasil: '62', precoSaca: 65, custoProd: 1600 }, delta: { soja: 2.4, milho: -1.5 } },
  PR: { nomeEstado: 'Paraná',         soja:  { mun: '62 a 72', estado: '58 a 68', brasil: '60', precoSaca: 128, custoProd: 5800 }, milho: { mun: '90 a 110', estado: '85 a 100', brasil: '62', precoSaca: 63, custoProd: 1700 }, delta: { soja: 5.3, milho: 3.9 } },
  MS: { nomeEstado: 'Mato Grosso do Sul', soja: { mun: '55 a 68', estado: '52 a 62', brasil: '60', precoSaca: 130, custoProd: 5000 }, milho: { mun: '90 a 105', estado: '85 a 100', brasil: '62', precoSaca: 65, custoProd: 1650 }, delta: { soja: 1.7, milho: 6.1 } },
  SP: { nomeEstado: 'São Paulo',      soja:  { mun: '50 a 62', estado: '48 a 60', brasil: '60', precoSaca: 132, custoProd: 6000 }, milho: { mun: '85 a 100', estado: '80 a 95', brasil: '62', precoSaca: 64, custoProd: 1900 }, delta: { soja: -1.3, milho: 2.5 } },
  MG: { nomeEstado: 'Minas Gerais',   soja:  { mun: '52 a 62', estado: '50 a 60', brasil: '60', precoSaca: 129, custoProd: 5500 }, milho: { mun: '80 a 95', estado: '75 a 90', brasil: '62', precoSaca: 62, custoProd: 1750 }, delta: { soja: 3.2, milho: -0.9 } },
  BA: { nomeEstado: 'Bahia',          soja:  { mun: '55 a 68', estado: '52 a 65', brasil: '60', precoSaca: 131, custoProd: 5300 }, milho: { mun: '75 a 90', estado: '70 a 85', brasil: '62', precoSaca: 61, custoProd: 1600 }, delta: { soja: 4.6, milho: 2.2 } },
  RS: { nomeEstado: 'Rio Grande do Sul', soja: { mun: '55 a 70', estado: '55 a 68', brasil: '60', precoSaca: 130, custoProd: 5600 }, milho: { mun: '100 a 120', estado: '95 a 115', brasil: '62', precoSaca: 66, custoProd: 1800 }, delta: { soja: 7.3, milho: 5.5 } },
  SC: { nomeEstado: 'Santa Catarina', soja:  { mun: '52 a 65', estado: '50 a 62', brasil: '60', precoSaca: 129, custoProd: 5500 }, milho: { mun: '88 a 105', estado: '85 a 100', brasil: '62', precoSaca: 63, custoProd: 1750 }, delta: { soja: 3.8, milho: 4.1 } },
  TO: { nomeEstado: 'Tocantins',      soja:  { mun: '52 a 65', estado: '50 a 60', brasil: '60', precoSaca: 128, custoProd: 5100 }, milho: { mun: '70 a 85', estado: '65 a 80', brasil: '62', precoSaca: 62, custoProd: 1550 }, delta: { soja: 5.1, milho: 3.3 } },
  MA: { nomeEstado: 'Maranhão',       soja:  { mun: '50 a 62', estado: '48 a 58', brasil: '60', precoSaca: 127, custoProd: 5000 }, milho: { mun: '65 a 80', estado: '60 a 75', brasil: '62', precoSaca: 60, custoProd: 1500 }, delta: { soja: 4.2, milho: 2.8 } },
  PI: { nomeEstado: 'Piauí',          soja:  { mun: '48 a 62', estado: '46 a 58', brasil: '60', precoSaca: 126, custoProd: 4900 }, milho: { mun: '60 a 75', estado: '58 a 72', brasil: '62', precoSaca: 59, custoProd: 1450 }, delta: { soja: 5.5, milho: 3.7 } },
  RO: { nomeEstado: 'Rondônia',       soja:  { mun: '48 a 60', estado: '46 a 58', brasil: '60', precoSaca: 125, custoProd: 4800 }, milho: { mun: '62 a 78', estado: '60 a 75', brasil: '62', precoSaca: 60, custoProd: 1480 }, delta: { soja: 6.2, milho: 4.1 } },
};

// --- TERMÔMETRO IMOBILIÁRIO: dados de mercado por estado ---
const termometroMap: Record<string, {
  nomeEstado: string;
  precoHaMin: number; precoHaMax: number;
  prylomPremium: number;
  arrendMin: number; arrendMax: number;
  arrendPrylomPremium: number;
  valorizacao12m: number;
  valorizacao5a: number;
  precoSoja: number;
}> = {
  MT: { nomeEstado: 'Mato Grosso',        precoHaMin: 18000, precoHaMax: 35000, prylomPremium: 22, arrendMin: 9,  arrendMax: 13, arrendPrylomPremium: 18, valorizacao12m: 14.2, valorizacao5a: 68.4, precoSoja: 133 },
  GO: { nomeEstado: 'Goiás',              precoHaMin: 15000, precoHaMax: 28000, prylomPremium: 20, arrendMin: 8,  arrendMax: 12, arrendPrylomPremium: 15, valorizacao12m: 11.5, valorizacao5a: 54.2, precoSoja: 130 },
  PR: { nomeEstado: 'Paraná',             precoHaMin: 28000, precoHaMax: 58000, prylomPremium: 18, arrendMin: 10, arrendMax: 15, arrendPrylomPremium: 14, valorizacao12m: 13.8, valorizacao5a: 62.1, precoSoja: 128 },
  MS: { nomeEstado: 'Mato Grosso do Sul', precoHaMin: 12000, precoHaMax: 25000, prylomPremium: 21, arrendMin: 8,  arrendMax: 11, arrendPrylomPremium: 16, valorizacao12m: 10.2, valorizacao5a: 48.5, precoSoja: 130 },
  SP: { nomeEstado: 'São Paulo',          precoHaMin: 25000, precoHaMax: 75000, prylomPremium: 15, arrendMin: 12, arrendMax: 18, arrendPrylomPremium: 12, valorizacao12m:  9.8, valorizacao5a: 44.3, precoSoja: 132 },
  MG: { nomeEstado: 'Minas Gerais',       precoHaMin: 14000, precoHaMax: 32000, prylomPremium: 19, arrendMin: 8,  arrendMax: 12, arrendPrylomPremium: 15, valorizacao12m: 12.1, valorizacao5a: 52.8, precoSoja: 129 },
  BA: { nomeEstado: 'Bahia',              precoHaMin: 12000, precoHaMax: 28000, prylomPremium: 24, arrendMin: 7,  arrendMax: 11, arrendPrylomPremium: 20, valorizacao12m: 15.3, valorizacao5a: 74.2, precoSoja: 131 },
  RS: { nomeEstado: 'Rio Grande do Sul',  precoHaMin: 22000, precoHaMax: 45000, prylomPremium: 17, arrendMin: 11, arrendMax: 16, arrendPrylomPremium: 13, valorizacao12m: 10.5, valorizacao5a: 49.1, precoSoja: 130 },
  SC: { nomeEstado: 'Santa Catarina',     precoHaMin: 20000, precoHaMax: 42000, prylomPremium: 17, arrendMin: 10, arrendMax: 14, arrendPrylomPremium: 13, valorizacao12m:  9.2, valorizacao5a: 42.6, precoSoja: 129 },
  TO: { nomeEstado: 'Tocantins',          precoHaMin:  8000, precoHaMax: 20000, prylomPremium: 28, arrendMin: 6,  arrendMax: 10, arrendPrylomPremium: 22, valorizacao12m: 18.5, valorizacao5a: 89.3, precoSoja: 128 },
  MA: { nomeEstado: 'Maranhão',           precoHaMin:  6000, precoHaMax: 18000, prylomPremium: 30, arrendMin: 5,  arrendMax:  9, arrendPrylomPremium: 25, valorizacao12m: 21.4, valorizacao5a: 102.5, precoSoja: 127 },
  PI: { nomeEstado: 'Piauí',              precoHaMin:  5000, precoHaMax: 15000, prylomPremium: 32, arrendMin: 4,  arrendMax:  8, arrendPrylomPremium: 28, valorizacao12m: 22.8, valorizacao5a: 115.0, precoSoja: 126 },
  RO: { nomeEstado: 'Rondônia',           precoHaMin:  7000, precoHaMax: 18000, prylomPremium: 26, arrendMin: 5,  arrendMax:  8, arrendPrylomPremium: 22, valorizacao12m: 16.2, valorizacao5a: 78.4, precoSoja: 125 },
  PA: { nomeEstado: 'Pará',               precoHaMin:  5000, precoHaMax: 15000, prylomPremium: 28, arrendMin: 4,  arrendMax:  8, arrendPrylomPremium: 24, valorizacao12m: 19.5, valorizacao5a: 95.2, precoSoja: 125 },
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


  // ── TradingView Ticker Tape (script injection) ──
  // Guard prevents double-run in React Strict Mode (which would crash TV's script)
  const tvTickerInitRef = useRef(false);
  useEffect(() => {
    if (tvTickerInitRef.current) return;
    const el = tvTickerRef.current;
    if (!el) return;
    tvTickerInitRef.current = true;
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    el.appendChild(inner);
    const s = document.createElement('script');
    s.type  = 'text/javascript';
    s.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    s.async = true;
    s.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'FX_IDC:USDBRL',   title: 'Dólar/Real'   },
        { proName: 'CBOT:ZS1!',        title: 'Soja CBOT'    },
        { proName: 'CBOT:ZC1!',        title: 'Milho CBOT'   },
        { proName: 'BMFBOVESPA:BGI1!', title: 'Boi Gordo B3' },
        { proName: 'BMFBOVESPA:ICF1!', title: 'Café B3'      },
        { proName: 'COMEX:GC1!',       title: 'Ouro'         },
        { proName: 'TVC:DXY',          title: 'Índice Dólar'  },
      ],
      colorTheme:    'dark',
      isTransparent: true,
      displayMode:   'compact',
      locale:        'pt_BR',
    });
    el.appendChild(s);
  }, []);


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

      // Região é atualizada em fetchAgroIndicators via stateCode (geocoding)
    };

    if (specificLocation) {
      await analyze(specificLocation);
    } else {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const revRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=pt`
            );
            const revData = await revRes.json();
            const cityName = revData.city || revData.locality || revData.principalSubdivision || "Minha Localização";
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
    if (!selectedState) return;
    const stateObj = BR_STATES.find(s => s.sigla === selectedState)!;
    // Envia só o nome da cidade ou a capital — a API de geocoding não aceita strings compostas
    const locationQuery = selectedCity || stateObj.capital;
    setAgroIndicators(null);
    setWeatherForecast(null);
    setLocalInsight(null);
    setLoadingAgro(true);
    fetchLocalInsight(locationQuery);
  };

  const handleUseLocation = () => {
    setSelectedState('');
    setSelectedCity('');
    setAgroIndicators(null);
    setWeatherForecast(null);
    setLocalInsight(null);
    setLoadingAgro(true);
    fetchLocalInsight();
  };

const fetchAgroIndicators = async (location: string) => {
  setLoadingAgro(true);
  try {
    // 1. Geocodificação via Open-Meteo (CORS-friendly, sem necessidade de proxy)
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=pt&format=json&countryCode=BR`
    );
    const geoData = await geoRes.json();
    if (!geoData.results?.length) throw new Error("Localização não encontrada.");

    const lat = geoData.results[0].latitude;
    const lon = geoData.results[0].longitude;
    const cityLabel = geoData.results[0].name || location;
    const stateLabel = geoData.results[0].admin1 || 'Estado';
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
    const stateCode = stateNameToCode[stateLabel.toLowerCase()] || '';

    // 2. APIs paralelas principais
    const [nasaRes, weatherRes, elevRes] = await Promise.all([
      fetch(`https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,RH2M,WS10M,ALLSKY_SFC_SW_DWN,EVPTRNS&community=AG&longitude=${lon}&latitude=${lat}&format=JSON`),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,visibility,uv_index,dew_point_2m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,sunshine_duration,uv_index_max,et0_fao_evapotranspiration,precipitation_hours&timezone=America/Sao_Paulo&forecast_days=16`),
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
    if (detectedRegionKey) setRegion(detectedRegionKey);
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
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(orig)}&count=1&language=pt&format=json`).then(r => r.json()),
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(dest)}&count=1&language=pt&format=json`).then(r => r.json()),
      ]);
      if (g1.results?.length && g2.results?.length) {
        const lat1 = g1.results[0].latitude, lon1 = g1.results[0].longitude;
        const lat2 = g2.results[0].latitude, lon2 = g2.results[0].longitude;
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

  const fetchAgroNews = async () => {
    setLoadingNews(true);

    // Maps raw <item> objects from XML → MarketNews[]
    const mapItems = (rawItems: { title: string; description: string; link: string; pubDate: string }[], feedTitle: string): MarketNews[] =>
      rawItems.map((item, idx) => {
        const text = (item.title + ' ' + item.description).toLowerCase();
        const bullish = ['alta', 'subiu', 'cresceu', 'valorização', 'avanço', 'recorde', 'exportação', 'colheita', 'abriu', 'dispara'];
        const bearish = ['queda', 'caiu', 'baixa', 'crise', 'seca', 'perdas', 'recuo', 'preocupa', 'deficit', 'recua'];
        const sentiment: MarketNews['sentiment'] = bullish.some(w => text.includes(w))
          ? 'BULLISH' : bearish.some(w => text.includes(w)) ? 'BEARISH' : 'NEUTRAL';

        let category: MarketNews['category'] = 'INPUTS';
        if (/soja|milho|cbot|grão|trigo/.test(text)) category = 'CHICAGO';
        else if (/usda|exporta|embarque|porto/.test(text)) category = 'USDA';
        else if (/china|ásia|asia/.test(text)) category = 'CHINA';
        else if (/clima|chuva|seca|geada|tempo|fenômeno/.test(text)) category = 'CLIMATE';

        const timestamp = item.pubDate
          ? new Date(item.pubDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
          : '';

        return {
          id: String(idx + 1),
          source: feedTitle,
          title: item.title.replace(/<[^>]+>/g, '').trim(),
          summary: item.description.replace(/<[^>]+>/g, '').trim().slice(0, 250),
          category,
          sentiment,
          timestamp,
          url: item.link,
        };
      });

    // Fetch an RSS feed via corsproxy.io CORS proxy and parse the XML
    const tryFeed = async (feedUrl: string, label: string): Promise<MarketNews[] | null> => {
      try {
        const proxy = `https://corsproxy.io/?url=${encodeURIComponent(feedUrl)}`;
        const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        const xmlText = await res.text();
        const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
        const itemEls = Array.from(xml.querySelectorAll('item')).slice(0, 8);
        if (!itemEls.length) return null;
        const raw = itemEls.map(el => ({
          title:       el.querySelector('title')?.textContent        ?? '',
          description: el.querySelector('description')?.textContent  ?? '',
          link:        el.querySelector('link')?.textContent          ?? '',
          pubDate:     el.querySelector('pubDate')?.textContent       ?? '',
        }));
        return mapItems(raw, label);
      } catch {
        return null;
      }
    };

    try {
      const result =
        await tryFeed('https://www.noticiasagricolas.com.br/noticias/rss.xml', 'Notícias Agrícolas') ??
        await tryFeed('https://www.agrolink.com.br/rss/noticias.rss',          'AgroLink') ??
        await tryFeed('https://g1.globo.com/dynamo/economia/agronegocio/rss2.xml', 'G1 Agronegócio') ??
        await tryFeed('https://www.canalrural.com.br/rss/',                    'Canal Rural');

      setNews(result ?? []);
    } catch (e) {
      console.error('Erro ao buscar notícias agro:', e);
      setNews([]);
    } finally {
      setLoadingNews(false);
    }
  };

  const newsFetchedRef = useRef(false);
  useEffect(() => {
    if (newsFetchedRef.current) return;
    newsFetchedRef.current = true;
    fetchAgroNews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  

  

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

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
         <form onSubmit={handleManualSearch} className="w-full flex flex-col md:flex-row items-end gap-4">
            {/* Estado */}
            <div className="flex-1 w-full space-y-2">
               <label className="text-[10px] font-black text-prylom-dark/60 uppercase tracking-widest block px-1">Estado</label>
               <select
                 value={selectedState}
                 onChange={e => { setSelectedState(e.target.value); setSelectedCity(''); }}
                 className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-2xl outline-none font-bold text-[#2c5363] transition-all appearance-none cursor-pointer"
               >
                 <option value="">Selecione o estado...</option>
                 {BR_STATES.map(s => (
                   <option key={s.sigla} value={s.sigla}>{s.nome}</option>
                 ))}
               </select>
            </div>
            {/* Cidade */}
            <div className="flex-1 w-full space-y-2">
               <label className="text-[10px] font-black text-prylom-dark/60 uppercase tracking-widest block px-1">Cidade</label>
               <select
                 value={selectedCity}
                 onChange={e => setSelectedCity(e.target.value)}
                 disabled={!selectedState}
                 className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-2xl outline-none font-bold text-[#2c5363] transition-all appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
               >
                 <option value="">Analisar apenas o estado</option>
                 {selectedState && BR_STATES.find(s => s.sigla === selectedState)?.cidades.map(c => (
                   <option key={c} value={c}>{c}</option>
                 ))}
               </select>
            </div>
            {/* Usar localização */}
            <button type="button" onClick={handleUseLocation} className="text-prylom-gold font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-prylom-gold/5 px-5 py-4 rounded-2xl transition-all whitespace-nowrap w-full md:w-auto justify-center border border-prylom-gold/30">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
               {t.useAutoLocation}
            </button>
            {/* Analisar */}
            <button type="submit" disabled={!selectedState} className="bg-prylom-dark text-white font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-prylom-gold active:scale-95 transition-all w-full md:w-auto shadow-xl whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed">
               Analisar Região
            </button>
         </form>
      </div>
                
                {/* ── Ticker TradingView ── */}
                <div className="w-full rounded-3xl overflow-hidden" style={{ backgroundColor: '#2c5363', minHeight: '46px' }}>
                  <div ref={tvTickerRef} className="tradingview-widget-container w-full" />
                </div>



      {/* ── ECONOMICS & INDICADORES AGROTECNOLÓGICOS ── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleModule('agro')}
          className="w-full p-6 md:p-8 flex items-center gap-5 text-left hover:bg-gray-50/60 transition-colors"
        >
          <div className="w-12 h-12 bg-[#2c5363]/5 rounded-2xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2c5363]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h3 className="text-sm font-black text-prylom-dark uppercase tracking-tight">Indicadores Agrotecnológicos</h3>
              {agroIndicators && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[7px] font-black uppercase tracking-widest">Dados carregados</span>}
              {(loadingAgro || loadingInsight) && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[7px] font-black uppercase tracking-widest animate-pulse">Carregando...</span>}
            </div>
            <p className="text-[11px] text-gray-400 font-medium leading-snug">Veja o potencial da sua região: qualidade do solo, chuva anual, temperatura, relevo e mais de 10 dados agronômicos.</p>
          </div>
          <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${openModules.has('agro') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {openModules.has('agro') && (
        <div className="border-t border-gray-100 p-6 md:p-8">

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
            { title: 'Argila no Solo',                f: agroIndicators.argila },
            { title: 'Chuva Anual',                   f: agroIndicators.pluvio },
            { title: 'Altitude',                      f: agroIndicators.altimetria },
            { title: 'Relevo',                        f: agroIndicators.relevo },
            { title: 'Tipo de Solo',                  f: agroIndicators.solo },
            { title: 'Radiação Solar',                f: agroIndicators.irradiacao },
            { title: 'Perda de Água (Ano)',           f: agroIndicators.evapotranspiracao },
            { title: 'Temperatura Média Anual',       f: agroIndicators.temperatura },
            { title: 'Hidrografia',                   f: agroIndicators.hidrografia },
            { title: 'Culturas da Região',            f: agroIndicators.culturas },
            { title: 'Vento (Risco de Pulverização)', f: agroIndicators.vento },
            { title: 'Umidade do Ar',                 f: agroIndicators.umidade },
            { title: 'Variação de Temperatura',       f: agroIndicators.tempDinamica },
            { title: 'Aptidão Agrícola',              f: agroIndicators.aptidao },
            { title: 'Valor da Produção',             f: agroIndicators.valorProducao },
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
        )}
      </div>

      {/* ── MONITORAMENTO AGROMETEOROLÓGICO ── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleModule('meteo')}
          className="w-full p-6 md:p-8 flex items-center gap-5 text-left hover:bg-gray-50/60 transition-colors"
        >
          <div className="w-12 h-12 bg-[#2c5363]/5 rounded-2xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2c5363]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h3 className="text-sm font-black text-prylom-dark uppercase tracking-tight">Monitoramento Agrometeorológico</h3>
              {weatherForecast && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[7px] font-black uppercase tracking-widest"><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"/><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"/></span>Live</span>}
              {loadingAgro && !weatherForecast && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[7px] font-black uppercase tracking-widest animate-pulse">Carregando...</span>}
            </div>
            <p className="text-[11px] text-gray-400 font-medium leading-snug">Previsão do tempo para os próximos 15 dias com alertas de geada, chuva forte e vento — para planejar a lavoura com segurança.</p>
          </div>
          <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${openModules.has('meteo') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {openModules.has('meteo') && (
          <div className="border-t border-gray-100 p-6 md:p-8">
            {!weatherForecast && !loadingAgro && (
              <div className="py-12 text-center opacity-40">
                <p className="text-sm font-medium">Selecione uma região para carregar os dados meteorológicos.</p>
              </div>
            )}
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
          <div className="animate-fadeIn">
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

            {/* Navegação de abas */}
            <div className="flex gap-0 border-b border-gray-100 mt-6 mb-0">
              {([
                { key: 'previsao', label: 'Previsão 15 Dias' },
                { key: 'avancado', label: 'Dados Avançados' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setWeatherTab(key)}
                  className={`px-5 py-2.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-all ${
                    weatherTab === key
                      ? 'border-prylom-gold text-prylom-gold'
                      : 'border-transparent text-gray-400 hover:text-prylom-dark'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Aba: Previsão 15 Dias */}
            {weatherTab === 'previsao' && (
            <div className="border-gray-100 pt-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-[9px] font-black text-prylom-dark uppercase tracking-widest">Tendência 15 Dias</p>
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
                {w.daily?.time?.slice(1, 16).map((date: string, i: number) => {
                  const d = new Date(date + 'T00:00:00');
                  const code   = w.daily.weather_code?.[i + 1] ?? 0;
                  const tMax   = w.daily.temperature_2m_max?.[i + 1] ?? 0;
                  const tMin   = w.daily.temperature_2m_min?.[i + 1] ?? 0;
                  const rain   = w.daily.precipitation_probability_max?.[i + 1] ?? 0;

                  // Lógica de risco
                  const isStorm   = code > 77;
                  const isHeavyRain = rain >= 70 || (code >= 51 && code <= 67);
                  const isHeat    = tMax >= 38;
                  const isFrost   = tMin <= 4;
                  const isMidRisk = rain >= 40 || tMax >= 35 || tMin <= 8;

                  const isRed = isStorm || isHeavyRain || isHeat || isFrost;
                  const isYellow = !isRed && isMidRisk;

                  const riskLabel = isRed
                    ? isStorm       ? 'Tempestade — evite trabalho externo'
                    : isHeavyRain   ? `Chuva intensa (${rain}%) — risco operacional`
                    : isHeat        ? `Calor extremo (${Math.round(tMax)}°C) — risco à saúde`
                    :                 `Geada (${Math.round(tMin)}°C) — risco às culturas`
                    : isYellow
                    ? rain >= 40    ? `Chuva moderada (${rain}%) — atenção`
                    : tMax >= 35    ? `Calor elevado (${Math.round(tMax)}°C) — monitorar`
                    :                 `Frio (${Math.round(tMin)}°C) — atenção culturas sensíveis`
                    : 'Condições favoráveis à operação';

                  const flagColor = isRed ? 'bg-red-500' : isYellow ? 'bg-yellow-400' : 'bg-green-500';
                  const cardBorder = isRed ? 'border-red-200' : isYellow ? 'border-yellow-200' : 'border-gray-100';

                  return (
                    <div key={date} className={`min-w-[130px] snap-start bg-gray-50 p-3 rounded-2xl border ${cardBorder} flex flex-col items-start hover:border-prylom-gold transition-all group relative`}>
                      {/* Cabeçalho */}
                      <div className="w-full flex justify-between items-center mb-1.5">
                        <p className="text-[8px] font-black text-prylom-gold uppercase">
                          {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                        </p>
                        <p className="text-[8px] font-bold text-gray-400">
                          {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>

                      {/* Ícone + bandeira */}
                      <div className="w-full flex items-center justify-between mb-1.5">
                        <span className="text-xl">{getWeatherIcon(code)}</span>
                        <div className="flex items-center gap-1">
                          <span className={`w-2.5 h-3.5 rounded-sm ${flagColor}`} title={riskLabel} />
                        </div>
                      </div>

                      {/* Temperaturas */}
                      <span className="text-[12px] font-black text-prylom-dark">
                        {Math.round(tMax)}° / {Math.round(tMin)}°
                      </span>
                      <span className="text-[8px] font-bold text-blue-500 uppercase flex items-center gap-1 mt-0.5">
                        ☔ {rain}%
                      </span>

                      {/* Tooltip de risco */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-prylom-dark text-white text-[8px] font-bold rounded-xl px-3 py-2 leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-lg">
                        <span className={`inline-block w-2 h-2.5 rounded-sm mr-1.5 align-middle ${flagColor}`} />
                        {riskLabel}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                {[
                  { color: 'bg-green-500', label: 'Favorável' },
                  { color: 'bg-yellow-400', label: 'Atenção' },
                  { color: 'bg-red-500',   label: 'Risco Alto' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-3.5 rounded-sm ${color}`} />
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Aba: Dados Avançados */}
            {weatherTab === 'avancado' && (() => {
              const precipMax = Math.max(...(w.daily?.precipitation_sum?.slice(1, 16) ?? [0]).map((v: any) => v ?? 0), 1);
              const windGustMax = Math.max(...(w.daily?.wind_gusts_10m_max?.slice(1, 16) ?? [0]).map((v: any) => v ?? 0), 1);

              const uvLabel = (n: number) =>
                n >= 11 ? { text: 'Perigo — fique à sombra', color: 'bg-purple-100 text-purple-700' }
                : n >= 8  ? { text: 'Muito alto — protetor obrigatório', color: 'bg-red-100 text-red-600' }
                : n >= 6  ? { text: 'Alto — use protetor solar', color: 'bg-orange-100 text-orange-600' }
                : n >= 3  ? { text: 'Moderado — atenção no horário de pico', color: 'bg-yellow-100 text-yellow-700' }
                :           { text: 'Baixo — sem preocupações', color: 'bg-green-100 text-green-700' };

              const windLabel = (kmh: number) =>
                kmh >= 60 ? { text: 'Perigoso — evite trabalho externo', color: 'text-red-600' }
                : kmh >= 35 ? { text: 'Forte — atenção em campo aberto', color: 'text-yellow-600' }
                :              { text: 'Tranquilo', color: 'text-green-600' };

              const pressureNote = (hpa: number) =>
                hpa < 1000 ? 'Pressão baixa — pode chover' : hpa > 1020 ? 'Pressão alta — tempo estável' : 'Pressão normal';

              const cloudNote = (pct: number) =>
                pct >= 80 ? 'Céu muito nublado' : pct >= 40 ? 'Céu parcialmente nublado' : 'Céu aberto';

              const visNote = (km: number) =>
                km < 1 ? 'Visibilidade muito baixa — neblina' : km < 5 ? 'Visibilidade reduzida' : 'Boa visibilidade';

              return (
              <div className="pt-6 space-y-10">

                {/* ── AGORA: Condições do ar ── */}
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-xl">🌍</span>
                    <div>
                      <p className="text-sm font-black text-prylom-dark">Condições do Ar Agora</p>
                      <p className="text-[10px] text-gray-400 font-medium">O que está acontecendo neste momento</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* Sensação Térmica */}
                    {cur.apparent_temperature != null && (
                      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-4">
                        <span className="text-3xl">🌡️</span>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-500 mb-0.5">Como o corpo sente o calor</p>
                          <p className="text-2xl font-black text-prylom-dark leading-none">{Math.round(cur.apparent_temperature)}<span className="text-sm font-bold ml-1 opacity-60">°C</span></p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Temperatura real: {Math.round(cur.temperature_2m)}°C</p>
                        </div>
                      </div>
                    )}

                    {/* Umidade / Orvalho */}
                    {cur.dew_point_2m != null && (
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                        <span className="text-3xl">💧</span>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-500 mb-0.5">Umidade do ar (ponto de orvalho)</p>
                          <p className="text-2xl font-black text-prylom-dark leading-none">{Math.round(cur.dew_point_2m)}<span className="text-sm font-bold ml-1 opacity-60">°C</span></p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Umidade relativa: {cur.relative_humidity_2m}%</p>
                        </div>
                      </div>
                    )}

                    {/* Rajadas */}
                    {cur.wind_gusts_10m != null && (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
                        <span className="text-3xl">💨</span>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-500 mb-0.5">Rajadas de vento (mais forte)</p>
                          <p className="text-2xl font-black text-prylom-dark leading-none">{Math.round(cur.wind_gusts_10m)}<span className="text-sm font-bold ml-1 opacity-60">km/h</span></p>
                          <p className={`text-[10px] font-bold mt-0.5 ${windLabel(cur.wind_gusts_10m).color}`}>{windLabel(cur.wind_gusts_10m).text}</p>
                        </div>
                      </div>
                    )}

                    {/* Pressão */}
                    {cur.surface_pressure != null && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-4">
                        <span className="text-3xl">🔵</span>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-500 mb-0.5">Pressão atmosférica</p>
                          <p className="text-2xl font-black text-prylom-dark leading-none">{Math.round(cur.surface_pressure)}<span className="text-sm font-bold ml-1 opacity-60">hPa</span></p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{pressureNote(cur.surface_pressure)}</p>
                        </div>
                      </div>
                    )}

                    {/* Nuvens */}
                    {cur.cloud_cover != null && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
                        <span className="text-3xl">☁️</span>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-500 mb-0.5">Nuvens no céu agora</p>
                          <p className="text-2xl font-black text-prylom-dark leading-none">{cur.cloud_cover}<span className="text-sm font-bold ml-1 opacity-60">%</span></p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{cloudNote(cur.cloud_cover)}</p>
                        </div>
                      </div>
                    )}

                    {/* Visibilidade */}
                    {cur.visibility != null && (
                      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex items-center gap-4">
                        <span className="text-3xl">👁️</span>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-gray-500 mb-0.5">Até onde se enxerga</p>
                          <p className="text-2xl font-black text-prylom-dark leading-none">{(cur.visibility / 1000).toFixed(1)}<span className="text-sm font-bold ml-1 opacity-60">km</span></p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{visNote(cur.visibility / 1000)}</p>
                        </div>
                      </div>
                    )}

                    {/* UV agora */}
                    {cur.uv_index != null && (() => {
                      const uv = uvLabel(cur.uv_index);
                      return (
                        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 flex items-center gap-4 md:col-span-2">
                          <span className="text-3xl">☀️</span>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-gray-500 mb-1">Força da radiação solar agora (Índice UV)</p>
                            <div className="flex items-center gap-3">
                              <p className="text-2xl font-black text-prylom-dark">{cur.uv_index}</p>
                              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${uv.color}`}>{uv.text}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* ── CHUVA PREVISTA — 15 dias ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🌧️</span>
                    <div>
                      <p className="text-sm font-black text-prylom-dark">Chuva Prevista — Próximos 15 Dias</p>
                      <p className="text-[10px] text-gray-400 font-medium">Quantidade de chuva esperada por dia</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-36 mt-4">
                    {w.daily?.time?.slice(1, 16).map((date: string, i: number) => {
                      const d       = new Date(date + 'T00:00:00');
                      const precip  = w.daily.precipitation_sum?.[i + 1] ?? 0;
                      const hours   = w.daily.precipitation_hours?.[i + 1] ?? 0;
                      const pct     = Math.min((precip / precipMax) * 100, 100);
                      const isHeavy = precip >= 20;
                      const isMid   = precip >= 5;
                      const barColor = isHeavy ? 'bg-blue-600' : isMid ? 'bg-blue-400' : 'bg-blue-200';
                      const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3);
                      return (
                        <div key={date} className="flex-1 flex flex-col items-center gap-1">
                          {precip > 0 && (
                            <p className="text-[7px] font-black text-blue-600 leading-none mb-0.5">{precip.toFixed(0)}mm</p>
                          )}
                          <div className={`w-full rounded-t-lg ${barColor}`} style={{ height: `${Math.max(pct, 4)}%` }} />
                          <p className="text-[7px] font-bold text-gray-500 leading-none">{dia}</p>
                          <p className="text-[6px] text-gray-400 leading-none">{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                          {hours > 0 && <p className="text-[6px] text-blue-400 leading-none">{hours}h</p>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
                    {[
                      { color: 'bg-blue-200', label: 'Sem chuva ou pouca (menos de 5 mm)' },
                      { color: 'bg-blue-400', label: 'Chuva moderada (5 a 20 mm)' },
                      { color: 'bg-blue-600', label: 'Chuva forte (acima de 20 mm)' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className={`w-4 h-3 rounded-sm flex-shrink-0 ${color}`} />
                        <span className="text-[10px] font-bold text-gray-500">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── VENTO — 15 dias ── */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🌬️</span>
                    <div>
                      <p className="text-sm font-black text-prylom-dark">Rajadas de Vento — Próximos 15 Dias</p>
                      <p className="text-[10px] text-gray-400 font-medium">Velocidade máxima do vento em rajada por dia</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-28 mt-4">
                    {w.daily?.time?.slice(1, 16).map((date: string, i: number) => {
                      const d    = new Date(date + 'T00:00:00');
                      const gust = w.daily.wind_gusts_10m_max?.[i + 1] ?? 0;
                      const wmax = w.daily.wind_speed_10m_max?.[i + 1] ?? 0;
                      const pct  = Math.min((gust / windGustMax) * 100, 100);
                      const isDangerous = gust >= 60;
                      const isMod       = gust >= 35;
                      const barColor    = isDangerous ? 'bg-red-500' : isMod ? 'bg-yellow-400' : 'bg-green-400';
                      const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').slice(0, 3);
                      return (
                        <div key={date} className="flex-1 flex flex-col items-center gap-1">
                          <p className="text-[7px] font-black text-gray-600 leading-none mb-0.5">{Math.round(gust)}</p>
                          <div className={`w-full rounded-t-lg ${barColor}`} style={{ height: `${Math.max(pct, 4)}%` }} />
                          <p className="text-[7px] font-bold text-gray-500 leading-none">{dia}</p>
                          <p className="text-[6px] text-gray-400 leading-none">{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                          <p className="text-[6px] text-gray-300 leading-none">{Math.round(wmax)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">Números acima da barra = rajada (km/h) · Números abaixo = vento médio (km/h)</p>
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
                    {[
                      { color: 'bg-green-400',  label: 'Vento tranquilo (menos de 35 km/h)' },
                      { color: 'bg-yellow-400', label: 'Vento forte — atenção em campo (35 a 60 km/h)' },
                      { color: 'bg-red-500',    label: 'Vento perigoso — evite trabalho externo (acima de 60 km/h)' },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className={`w-4 h-3 rounded-sm flex-shrink-0 ${color}`} />
                        <span className="text-[10px] font-bold text-gray-500">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── SOL & PROTEÇÃO — 15 dias ── */}
                <div>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-xl">🌞</span>
                    <div>
                      <p className="text-sm font-black text-prylom-dark">Sol, Proteção & Evaporação — Próximos 15 Dias</p>
                      <p className="text-[10px] text-gray-400 font-medium">Horas de sol, força da radiação e ressecamento do solo</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {w.daily?.time?.slice(1, 16).map((date: string, i: number) => {
                      const d     = new Date(date + 'T00:00:00');
                      const sunH  = w.daily.sunshine_duration?.[i + 1] != null ? (w.daily.sunshine_duration[i + 1] / 3600).toFixed(1) : null;
                      const uvNum = w.daily.uv_index_max?.[i + 1] ?? 0;
                      const et0   = w.daily.et0_fao_evapotranspiration?.[i + 1] ?? null;
                      const uv    = uvLabel(uvNum);
                      const diaLabel = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
                      return (
                        <div key={date} className="flex flex-col md:flex-row md:items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
                          {/* Data */}
                          <div className="md:w-36 flex-shrink-0">
                            <p className="text-[11px] font-black text-prylom-dark capitalize">{diaLabel.split(',')[0]}</p>
                            <p className="text-[10px] text-gray-400">{d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                          </div>
                          {/* Horas de sol */}
                          <div className="flex items-center gap-2 md:w-28 flex-shrink-0">
                            <span className="text-lg">🌤️</span>
                            <div>
                              <p className="text-[9px] text-gray-400 font-bold">Horas de sol</p>
                              <p className="text-[13px] font-black text-prylom-dark">{sunH ?? '—'}<span className="text-[9px] font-bold opacity-50 ml-0.5">h</span></p>
                            </div>
                          </div>
                          {/* UV badge */}
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-lg">🕶️</span>
                            <div>
                              <p className="text-[9px] text-gray-400 font-bold">Radiação solar (UV {uvNum})</p>
                              <span className={`inline-block text-[9px] font-black px-2.5 py-0.5 rounded-full mt-0.5 ${uv.color}`}>{uv.text}</span>
                            </div>
                          </div>
                          {/* ET0 */}
                          {et0 != null && (
                            <div className="flex items-center gap-2 md:w-36 flex-shrink-0">
                              <span className="text-lg">🌱</span>
                              <div>
                                <p className="text-[9px] text-gray-400 font-bold">Evaporação do solo</p>
                                <p className="text-[13px] font-black text-blue-600">{et0.toFixed(1)}<span className="text-[9px] font-bold opacity-60 ml-0.5">mm</span></p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 mt-3 leading-relaxed">
                    Evaporação do solo: quanto de água o campo perde por dia para o ar — útil para saber quando irrigar.
                  </p>
                </div>

              </div>
              );
            })()}

          </div>
        );
            })()}
          </div>
        )}
      </div>

      {/* ── INTELIGÊNCIA DE ESCOAMENTO ── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleModule('esco')}
          className="w-full p-6 md:p-8 flex items-center gap-5 text-left hover:bg-gray-50/60 transition-colors"
        >
          <div className="w-12 h-12 bg-[#2c5363]/5 rounded-2xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2c5363]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h3 className="text-sm font-black text-prylom-dark uppercase tracking-tight">Inteligência de Escoamento</h3>
              {escoamentoData && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[7px] font-black uppercase tracking-widest">Dados carregados</span>}
              {loadingAgro && !escoamentoData && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[7px] font-black uppercase tracking-widest animate-pulse">Carregando...</span>}
            </div>
            <p className="text-[11px] text-gray-400 font-medium leading-snug">Calcule quanto custa levar sua produção até o porto e veja qual é o lucro real por saca depois do frete.</p>
          </div>
          <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${openModules.has('esco') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {openModules.has('esco') && (
        <div className="border-t border-gray-100 p-6 md:p-8">

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
            { title: 'Estradas / Rodovias', f: escoamentoData.rodovia },
            { title: 'Ferrovia',            f: escoamentoData.ferrovia },
            { title: 'Porto Mais Próximo',  f: escoamentoData.porto },
            { title: 'Frete Médio\n(R$ por tonelada / saca)', f: escoamentoData.freteMedio },
            { title: 'Pedágios\n(estimativa por eixo)',        f: escoamentoData.pedagios },
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
                        className="w-16 bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#2c5363] outline-none focus:border-prylom-gold appearance-none text-center">
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={escoOrigemCidade} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEscoOrigemCidade(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#2c5363] outline-none focus:border-prylom-gold appearance-none">
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
                        className="w-16 bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#2c5363] outline-none focus:border-prylom-gold appearance-none text-center">
                        {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={escoDestinoCidade} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEscoDestinoCidade(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#2c5363] outline-none focus:border-prylom-gold appearance-none">
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
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Distância (km)</label>
                      <input type="number" value={freightDistance} onChange={e => setFreightDistance(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#2c5363] outline-none focus:border-prylom-gold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Tarifa (R$/t/km)</label>
                      <input type="number" step="0.01" value={freightRateKm} onChange={e => setFreightRateKm(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#2c5363] outline-none focus:border-prylom-gold" />
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
                    <p className="text-[9px] text-gray-400 mt-1 font-medium">O que sobra por saca depois do frete</p>
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
                    <div className="bg-[#2c5363]/5 rounded-2xl p-4 border border-[#2c5363]/10 text-center">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Peso do Frete</p>
                      <p className="text-2xl font-black text-[#2c5363]">{indiceFPL.toFixed(1)}</p>
                      <p className="text-[7px] font-bold text-gray-400 uppercase mt-0.5">% sobre o preço</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-center">
                      <p className="text-[8px] font-black text-green-700 uppercase mb-1">Frete por Saca</p>
                      <p className="text-2xl font-black text-green-700">R$ {freteSaca.toFixed(2).replace('.', ',')}</p>
                      <p className="text-[7px] font-bold text-green-600/60 uppercase mt-0.5">Padrão 60 kg</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <label className="text-[8px] font-black text-gray-400 uppercase block mb-1">Preço no Destino (R$/saca)</label>
                      <input type="number" value={destPrice} onChange={e => setDestPrice(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#2c5363] outline-none focus:border-prylom-gold" />
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <label className="text-[8px] font-black text-gray-400 uppercase block mb-1">Condição da Rota</label>
                      <select value={riskFactor} onChange={e => setRiskFactor(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold text-[#2c5363] outline-none focus:border-prylom-gold appearance-none">
                        <option value={1.0}>Cenário Limpo (0%)</option>
                        <option value={1.05}>Safra / Chuvas (+5%)</option>
                        <option value={1.15}>Risco Alto / Filas (+15%)</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-prylom-gold/5 rounded-2xl p-4 border border-prylom-gold/20">
                    <p className="text-[9px] font-black text-[#2c5363] uppercase tracking-widest mb-1">Diagnóstico Prylom:</p>
                    <p className="text-[10px] font-medium text-prylom-dark leading-relaxed italic">{fplDiag}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        </div>
        )}
      </div>


      {/* ── ESTIMATIVA DE PRODUTIVIDADE + BARTER + DIAGNÓSTICO ── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleModule('prod')}
          className="w-full p-6 md:p-8 flex items-center gap-5 text-left hover:bg-gray-50/60 transition-colors"
        >
          <div className="w-12 h-12 bg-[#2c5363]/5 rounded-2xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2c5363]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h3 className="text-sm font-black text-prylom-dark uppercase tracking-tight">Produtividade & Barter</h3>
              {agroIndicators && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[7px] font-black uppercase tracking-widest">Dados carregados</span>}
            </div>
            <p className="text-[11px] text-gray-400 font-medium leading-snug">Veja quantas sacas por hectare sua região produz e se o custo dos insumos está valendo a pena nesta safra.</p>
          </div>
          <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${openModules.has('prod') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {openModules.has('prod') && (() => {
        const sc = agroIndicators?.stateCode ?? '';
        const pd = sc ? produtividadeMap[sc] : null;
        const loc = agroIndicators?.locationLabel ?? '—';
        const stLbl = agroIndicators?.stateLabel ?? '—';

        // Cálculo financeiro: usa médio do intervalo (ex: "82 a 95" → 88)
        const midOf = (range: string) => {
          const parts = range.split('a').map(s => parseFloat(s.trim()));
          return parts.length === 2 ? (parts[0] + parts[1]) / 2 : parts[0];
        };

        const calcMetrica = (sacasRange: string, preco: number, custo: number) => {
          const sacasMed = midOf(sacasRange);
          const bruto = sacasMed * preco;
          const liquido = bruto - custo;
          const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/ha`;
          return { brutoStr: fmt(bruto), liquidoStr: fmt(liquido), isPos: liquido >= 0 };
        };

        const fmtDelta = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}% vs safra ant.`;

        const cards = pd ? [
          {
            titulo: 'Sacas/Ha — Safra 2025/26', subtitulo: 'Soja',
            rows: [
              { label: `(mun) ${loc}`,        valor: `${pd.soja.mun} SACAS/Ha`, bold: true },
              { label: `Média ${stLbl}`,       valor: `${pd.soja.estado} SACAS/Ha`, bold: true },
              { label: 'Média Brasil',         valor: `${pd.soja.brasil} SACAS/Ha`, bold: true },
            ],
          },
          {
            titulo: 'Sacas/Ha — Safra 2025/26', subtitulo: 'Milho Safrinha',
            rows: [
              { label: `(mun) ${loc}`,        valor: `${pd.milho.mun} SACAS/Ha`, bold: true },
              { label: `Média ${stLbl}`,       valor: `${pd.milho.estado} SACAS/Ha`, bold: true },
              { label: 'Média Brasil',         valor: `${pd.milho.brasil} SACAS/Ha`, bold: true },
            ],
          },
          {
            titulo: 'Evolução vs. Safra Anterior', subtitulo: 'Soja / Milho',
            rows: [
              { label: `(mun) ${loc}`,        valor: fmtDelta(pd.delta.soja), bold: true, isPos: pd.delta.soja >= 0 },
              { label: `Média ${stLbl}`,       valor: fmtDelta(pd.delta.soja * 0.85), bold: false, isPos: pd.delta.soja >= 0 },
              { label: 'Milho Safrinha',       valor: fmtDelta(pd.delta.milho), bold: true, isPos: pd.delta.milho >= 0 },
            ],
          },
          (() => {
            const m = calcMetrica(pd.soja.mun, pd.soja.precoSaca, pd.soja.custoProd);
            return {
              titulo: 'Resultado por Hectare', subtitulo: 'Soja estimativa',
              rows: [
                { label: 'Receita Bruta (R$/ha)',    valor: m.brutoStr,   bold: true },
                { label: 'Lucro Estimado (R$/ha)',   valor: m.liquidoStr, bold: true, isPos: m.isPos },
              ],
            };
          })(),
          (() => {
            const m = calcMetrica(pd.milho.mun, pd.milho.precoSaca, pd.milho.custoProd);
            return {
              titulo: 'Resultado por Hectare', subtitulo: 'Milho Safrinha',
              rows: [
                { label: 'Receita Bruta (R$/ha)',    valor: m.brutoStr,   bold: true },
                { label: 'Lucro Estimado (R$/ha)',   valor: m.liquidoStr, bold: true, isPos: m.isPos },
              ],
            };
          })(),
        ] : null;

        return (
          <div className="p-6 md:p-8 space-y-8">

            {/* ── Cards: Estimativa de Produtividade ── */}
            <div>
              <h3 className="text-xl font-black text-prylom-dark uppercase tracking-tight mb-6">
                Estimativa de Produtividade
              </h3>
              {!agroIndicators || !pd ? (
                <p className="text-sm text-gray-400 font-medium">Analise uma região para ver a estimativa de produtividade.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-fadeIn">
                  {cards!.map((card, ci) => (
                    <div key={ci} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
                      <div className="px-3 pt-3 pb-0.5">
                        <p className="text-prylom-gold font-black text-[10px] uppercase leading-tight">{card.titulo}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-0.5">{card.subtitulo}</p>
                      </div>
                      <div className="px-3 pb-3 flex-1 flex flex-col gap-2 mt-2">
                        {card.rows.map((row, ri) => (
                          <div key={ri}>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight">{row.label}</p>
                            <p className={`text-[12px] leading-snug mt-0.5 ${'isPos' in row ? (row.isPos ? 'font-black text-green-600' : 'font-black text-red-500') : (row.bold ? 'font-black text-prylom-dark' : 'font-bold text-gray-500')}`}>
                              {row.valor}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Barter + Diagnóstico ── */}
            <div className="pt-6 border-t border-gray-100 grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Barter – col-span-2 */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-black text-prylom-dark uppercase tracking-tight mb-1">{t.greenCurrency}</h3>
                    <p className="text-gray-700 text-xs font-bold">Relação de troca e margem operacional da safra</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${ratioHealth === 'success' ? 'bg-green-100 text-green-700' : ratioHealth === 'danger' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {ratioHealth === 'success' ? t.ratioSuccess : ratioHealth === 'danger' ? t.ratioAlert : t.ratioStable}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-prylom-dark/60 uppercase tracking-widest block">Cultura</label>
                    <select value={commodity} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCommodity(e.target.value)} className="w-full p-3 bg-gray-50 rounded-2xl font-bold text-[#2c5363] outline-none border-2 border-transparent focus:border-prylom-gold appearance-none cursor-pointer text-sm">
                      <option value="soja">{t.soy} (Saca 60kg)</option>
                      <option value="milho">{t.corn} (Saca 60kg)</option>
                      <option value="boi">Boi Gordo (@)</option>
                      <option value="cafe">Café Arábica (Saca 60kg)</option>
                      <option value="algodao">Algodão (Pluma)</option>
                      <option value="trigo">Trigo (Ton)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-prylom-dark/60 uppercase tracking-widest block">{t.bagPriceLabel}</label>
                    <input type="number" value={commodityPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCommodityPrice(parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 rounded-2xl font-black text-[#2c5363] outline-none border-2 border-transparent focus:border-prylom-gold text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-prylom-dark/60 uppercase tracking-widest block">Custo de Insumos ({getSymbol()})</label>
                    <input type="number" value={inputCost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputCost(parseFloat(e.target.value))} className="w-full p-3 bg-gray-50 rounded-2xl font-black text-[#2c5363] outline-none border-2 border-transparent focus:border-prylom-gold text-sm" />
                  </div>
                </div>

                <div className="bg-prylom-dark text-white rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
                  <div className="flex-1 text-center md:text-left z-10">
                    <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">{t.exchangeRatio}</span>
                    <p className="text-3xl font-black">{barterRatio.toFixed(2)} <span className="text-sm text-gray-300 font-bold uppercase ml-1">unidades / insumo</span></p>
                    <p className="text-[10px] text-gray-400 mt-1.5 font-medium">Referência de Mercado: {historicalAvg} unidades</p>
                  </div>
                  <div className="w-px h-12 bg-white/10 hidden md:block" />
                  <div className="flex-1 text-center md:text-left z-10">
                    <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">{t.breakEven}</span>
                    <p className="text-3xl font-black">{regionalCosts[region]?.yieldBe} <span className="text-xs text-gray-300 font-bold uppercase">{t.bagsPerHa}</span></p>
                    <p className="text-[10px] text-gray-400 mt-1.5 font-medium">Mínimo para cobrir os custos</p>
                  </div>
                </div>
              </div>

              {/* Diagnóstico Prylom */}
              <div className="bg-prylom-gold/5 rounded-3xl border border-prylom-gold/20 p-6 flex flex-col justify-center italic">
                <p className="text-[10px] font-black text-[#2c5363] uppercase tracking-widest mb-3 not-italic">Diagnóstico Prylom:</p>
                <p className="text-sm font-medium text-prylom-dark leading-relaxed">
                  {barterRatio >= (historicalAvg * 0.95)
                    ? 'Relação de troca favorável. O custo operacional está dentro da média histórica, indicando alta eficiência produtiva e margem sustentável para a safra.'
                    : barterRatio >= (historicalAvg * 0.80)
                    ? 'Relação de troca em zona de atenção. O custo do insumo está acima do padrão histórico. Recomenda-se revisão de fixação de preços e controle de custos.'
                    : 'Relação de troca desfavorável. O custo operacional compromete a margem. Recomenda-se travar preços futuros e avaliar alternativas de custeio.'}
                </p>
                {pd && (
                  <div className="mt-4 pt-4 border-t border-prylom-gold/20 not-italic">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Produtividade estimada</p>
                    <p className="text-sm font-black text-prylom-dark mt-1">{pd.soja.mun} sc/ha · Soja {new Date().getFullYear()}/{String(new Date().getFullYear() + 1).slice(2)}</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
        })()}
      </div>

      {/* ── TERMÔMETRO IMOBILIÁRIO ── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleModule('termo')}
          className="w-full p-6 md:p-8 flex items-center gap-5 text-left hover:bg-gray-50/60 transition-colors"
        >
          <div className="w-12 h-12 bg-[#2c5363]/5 rounded-2xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2c5363]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h3 className="text-sm font-black text-prylom-dark uppercase tracking-tight">Termômetro Imobiliário</h3>
            </div>
            <p className="text-[11px] text-gray-400 font-medium leading-snug">Descubra quanto vale seu imóvel rural hoje, o valor de arrendamento e quanto a terra valorizou nos últimos anos.</p>
          </div>
          <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${openModules.has('termo') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {openModules.has('termo') && (
        <div className="border-t border-gray-100 p-6 md:p-8 space-y-8">
          {/* Estado selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado:</label>
            <select
              value={vtEstado}
              onChange={e => setVtEstado(e.target.value)}
              className="p-2 px-4 bg-gray-50 rounded-xl font-bold text-[#2c5363] outline-none border-2 border-transparent focus:border-prylom-gold text-sm appearance-none cursor-pointer"
            >
              {Object.keys(termometroMap).map(k => (
                <option key={k} value={k}>{k} – {termometroMap[k].nomeEstado}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 5 cards */}
        {(() => {
          const td = termometroMap[vtEstado] ?? termometroMap['MT'];
          const loc = agroIndicators?.locationLabel ?? td.nomeEstado;
          const stLbl = td.nomeEstado;
          const fmtBRL = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
          const precoMedioHa = (td.precoHaMin + td.precoHaMax) / 2;
          const prylomPrecoHa = Math.round(precoMedioHa * (1 + td.prylomPremium / 100));
          const arrendMed = (td.arrendMin + td.arrendMax) / 2;
          const prylomArrdSc = parseFloat((arrendMed * (1 + td.arrendPrylomPremium / 100)).toFixed(1));

          const BRASIL_PRECO_HA = 19000;
          const BRASIL_ARREND_SC = 9;
          const BRASIL_VAL_5A = 58.2;

          const cards = [
            {
              titulo: 'Preço por Hectare',
              rows: [
                { label: `(mun) ${loc}`,   valor: `${fmtBRL(td.precoHaMin)} – ${fmtBRL(td.precoHaMax)}` },
                { label: `Média ${stLbl}`, valor: fmtBRL(precoMedioHa) },
                { label: 'Média Brasil',   valor: fmtBRL(BRASIL_PRECO_HA) },
              ],
            },
            {
              titulo: 'Hectare (Ativos Prylom)',
              rows: [
                { label: `(mun) ${loc}`,   valor: fmtBRL(prylomPrecoHa) },
                { label: `Média ${stLbl}`, valor: fmtBRL(precoMedioHa) },
                { label: 'Média Brasil',   valor: fmtBRL(BRASIL_PRECO_HA) },
              ],
            },
            {
              titulo: 'Arrendamento (sc/ha)',
              rows: [
                { label: `(mun) ${loc}`,   valor: `${td.arrendMin} – ${td.arrendMax} sc/ha` },
                { label: `Média ${stLbl}`, valor: `${arrendMed.toFixed(1)} sc/ha` },
                { label: 'Média Brasil',   valor: `${BRASIL_ARREND_SC} sc/ha` },
              ],
            },
            {
              titulo: 'Arrendamento Prylom',
              rows: [
                { label: `(mun) ${loc}`,   valor: `${prylomArrdSc} sc/ha` },
                { label: `Média ${stLbl}`, valor: `${arrendMed.toFixed(1)} sc/ha` },
                { label: 'Média Brasil',   valor: `${BRASIL_ARREND_SC} sc/ha` },
              ],
            },
            {
              titulo: 'Valorização da Terra',
              rows: [
                { label: `(mun) ${loc}`,   valor: `${td.valorizacao12m.toFixed(1)}% / 12m` },
                { label: `Média ${stLbl}`, valor: `${td.valorizacao5a.toFixed(1)}% / 5 anos` },
                { label: 'Média Brasil',   valor: `${BRASIL_VAL_5A}% / 5 anos` },
              ],
            },
          ];

          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {cards.map((card, ci) => (
                <div key={ci} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
                  <div className="px-3 pt-3 pb-0.5">
                    <p className="text-prylom-gold font-black text-[10px] uppercase leading-tight">{card.titulo}</p>
                  </div>
                  <div className="px-3 pb-3 flex-1 flex flex-col gap-2 mt-2">
                    {card.rows.map((row, ri) => (
                      <div key={ri}>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight">{row.label}</p>
                        <p className="text-[11px] font-black text-prylom-dark leading-snug mt-0.5">{row.valor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Prylom Valuation Engine: 4 Motores ── */}
        <div className="pt-4 border-t border-gray-100 space-y-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Prylom Valuation Engine</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* Motor 1 – O Peso da Terra */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[8px] font-black text-prylom-gold uppercase tracking-[0.3em]">Motor 1</span>
                <h4 className="text-xs font-black text-prylom-dark">O Peso da Terra</h4>
                <span className="text-[9px] font-medium text-gray-400 hidden sm:inline">· Análise Comparativa</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: 'Área Total (ha)',           val: vtAreaTotal,    set: setVtAreaTotal    },
                  { label: 'Área Útil de Lavoura (ha)', val: vtAreaLavoura,  set: setVtAreaLavoura  },
                  { label: 'Área de Pastagem (ha)',     val: vtAreaPastagem, set: setVtAreaPastagem },
                  { label: 'Reserva Legal / APP (ha)',  val: vtAreaReserva,  set: setVtAreaReserva  },
                ] as { label: string; val: number; set: (v: number) => void }[]).map(f => (
                  <div key={f.label} className="space-y-0.5">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight">{f.label}</p>
                    <input
                      type="number"
                      value={f.val}
                      onChange={e => f.set(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border-2 border-transparent focus:border-prylom-gold rounded-lg font-black text-[#2c5363] text-sm outline-none"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-gray-400 pt-1 border-t border-gray-200">
                <span className="font-black text-gray-500">Pesos:</span> Lavoura 100% · Pastagem 60% · Reserva 15%
              </p>
            </div>

            {/* Motor 2 – A Máquina de Dinheiro */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[8px] font-black text-prylom-gold uppercase tracking-[0.3em]">Motor 2</span>
                <h4 className="text-xs font-black text-prylom-dark">A Máquina de Dinheiro</h4>
                <span className="text-[9px] font-medium text-gray-400 hidden sm:inline">· Cap Rate</span>
              </div>
              <div className="space-y-2">
                {([
                  { label: 'Produtividade estimada (sc/ha)',       val: vtProdSacas,                            set: setVtProdSacas,  step: 1  },
                  { label: 'Arrendamento praticado (sc/ha/ano)',   val: vtArrendSacas,                          set: setVtArrendSacas, step: 1  },
                  { label: 'Taxa de Retorno Esperado (%)',          val: parseFloat((vtCapRate*100).toFixed(1)), set: (v: number) => setVtCapRate(v/100), step: 0.5 },
                ] as { label: string; val: number; set: (v: number) => void; step: number }[]).map(f => (
                  <div key={f.label} className="space-y-0.5">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight">{f.label}</p>
                    <input
                      type="number"
                      step={f.step}
                      value={f.val}
                      onChange={e => f.set(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border-2 border-transparent focus:border-prylom-gold rounded-lg font-black text-[#2c5363] text-sm outline-none"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-gray-400 pt-1 border-t border-gray-200">
                <span className="font-black text-gray-500">Como funciona:</span> Renda anual ÷ taxa de retorno = valor da terra
              </p>
            </div>

            {/* Motor 3 – O Multiplicador Logístico */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[8px] font-black text-prylom-gold uppercase tracking-[0.3em]">Motor 3</span>
                <h4 className="text-xs font-black text-prylom-dark">O Multiplicador Logístico</h4>
                <span className="text-[9px] font-medium text-gray-400 hidden sm:inline">· Infraestrutura</span>
              </div>
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Distância do Asfalto (km)</p>
                  <input
                    type="number"
                    value={vtDistAsfalto}
                    onChange={e => setVtDistAsfalto(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border-2 border-transparent focus:border-prylom-gold rounded-lg font-black text-[#2c5363] text-sm outline-none"
                  />
                </div>
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Possui Silos Próprios?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVtTemSilo(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest border-2 transition-colors ${vtTemSilo ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                    >SIM</button>
                    <button
                      onClick={() => setVtTemSilo(false)}
                      className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest border-2 transition-colors ${!vtTemSilo ? 'bg-red-400 border-red-400 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                    >NÃO</button>
                  </div>
                </div>
              </div>
              <p className="text-[8px] text-gray-400 pt-1 border-t border-gray-200">
                <span className="font-black text-green-600">Prêmio:</span> ≤5km +15% · Silo +10% &nbsp;
                <span className="font-black text-red-500">Deságio:</span> 51–100km −10% · &gt;100km −20%
              </p>
            </div>

            {/* Motor 4 – A Tesoura do Compliance */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[8px] font-black text-prylom-gold uppercase tracking-[0.3em]">Motor 4</span>
                <h4 className="text-xs font-black text-prylom-dark">A Tesoura do Compliance</h4>
                <span className="text-[9px] font-medium text-gray-400 hidden sm:inline">· Filtro Jurídico</span>
              </div>
              <div className="space-y-2">
                {([
                  { label: 'Matrícula Limpa (20 anos)?',          sub: 'Situação da propriedade regular',      val: vtMatricula,   set: setVtMatricula,   simBom: true,  desc: 'Sem matrícula: −35%' },
                  { label: 'GEO e CAR Regulares?',                sub: 'Sem sobreposição de áreas',            val: vtGeoAverbado, set: setVtGeoAverbado, simBom: true,  desc: 'Sem GEO/CAR: −25%'  },
                  { label: 'Tem Passivo Ambiental / IBAMA?',       sub: 'Embargo, autuação ou desmatamento',   val: vtPassivo,     set: setVtPassivo,     simBom: false, desc: 'Com passivo: −30%'   },
                ] as { label: string; sub: string; val: boolean; set: (v: boolean) => void; simBom: boolean; desc: string }[]).map(f => (
                  <div key={f.label} className="bg-white border border-gray-200 rounded-xl p-2.5 space-y-1.5">
                    <div>
                      <p className="text-[9px] font-black text-prylom-dark leading-tight">{f.label}</p>
                      <p className="text-[8px] text-gray-400">{f.sub} · <span className="font-black text-red-400">{f.desc}</span></p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => f.set(true)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border-2 transition-colors ${f.val ? (f.simBom ? 'bg-green-500 border-green-500 text-white' : 'bg-red-500 border-red-500 text-white') : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                      >SIM</button>
                      <button
                        onClick={() => f.set(false)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border-2 transition-colors ${!f.val ? (f.simBom ? 'bg-red-400 border-red-400 text-white' : 'bg-green-500 border-green-500 text-white') : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                      >NÃO</button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-gray-400 pt-1 border-t border-gray-200">
                <span className="font-black text-red-500">Risco máximo acumulado:</span> −50% no valor final
              </p>
            </div>

          </div>

          {/* ── Valuation Forense: 3 Cenários ── */}
          {(() => {
            const td = termometroMap[vtEstado] ?? termometroMap['MT'];
            const precoMedioHa = (td.precoHaMin + td.precoHaMax) / 2;
            const m1 = vtAreaLavoura * precoMedioHa * 1.00
                      + vtAreaPastagem * precoMedioHa * 0.60
                      + vtAreaReserva  * precoMedioHa * 0.15;
            const rendaAnual = vtArrendSacas * td.precoSoja * vtAreaLavoura;
            const m2 = vtCapRate > 0 ? rendaAnual / vtCapRate : 0;
            const base = m1 * 0.60 + m2 * 0.40;
            let logAdj = 0;
            if      (vtDistAsfalto <= 5)   logAdj += 0.15;
            else if (vtDistAsfalto <= 20)  logAdj += 0.05;
            else if (vtDistAsfalto <= 50)  logAdj += 0;
            else if (vtDistAsfalto <= 100) logAdj -= 0.10;
            else                           logAdj -= 0.20;
            if (vtTemSilo) logAdj += 0.10;
            const logMult = 1 + logAdj;
            let compDisc = 0;
            if (!vtMatricula)   compDisc += 0.35;
            if (!vtGeoAverbado) compDisc += 0.25;
            if (vtPassivo)      compDisc += 0.30;
            compDisc = Math.min(compDisc, 0.50);
            const compMult  = 1 - compDisc;
            const fairValue  = base * logMult * compMult;
            const estressado = fairValue * 0.75;
            const potencial  = vtAreaTotal * precoMedioHa * logMult;
            const fmt   = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
            const fmtHa = (v: number) => vtAreaTotal > 0 ? `R$ ${Math.round(v / vtAreaTotal).toLocaleString('pt-BR')}/ha` : '—';
            const paybackAnos = rendaAnual > 0 ? (fairValue / rendaAnual).toFixed(1) : '—';
            const cenarios = [
              { id: 'est', tag: 'Venda Rápida',      sub: 'Desconto de 25% para venda imediata',   desc: 'Valor com desconto para quem precisa vender rápido.', total: estressado, cor: 'border-orange-300 bg-orange-50', tagCor: 'bg-orange-100 text-orange-700', valCor: 'text-orange-600', destaque: false },
              { id: 'fv',  tag: 'Valor Justo',       sub: 'Precificação completa — 4 motores',      desc: `Precificação completa Prylom. Payback: ${paybackAnos} anos.`, total: fairValue, cor: 'border-prylom-gold bg-prylom-dark', tagCor: 'bg-prylom-gold/20 text-prylom-gold', valCor: 'text-prylom-gold', destaque: true },
              { id: 'pot', tag: 'Valor Potencial',   sub: 'Documentação em dia e área aproveitada', desc: 'Se toda a documentação estiver regularizada e toda a área produtiva. O valor máximo.', total: potencial, cor: 'border-green-300 bg-green-50', tagCor: 'bg-green-100 text-green-700', valCor: 'text-green-600', destaque: false },
            ];
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-black text-prylom-dark uppercase tracking-tight">Valuation Forense</h4>
                  {compDisc > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[8px] font-black uppercase tracking-widest">
                      ⚠ Risco jurídico · −{Math.round(compDisc * 100)}%
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {cenarios.map(c => (
                    <div key={c.id} className={`rounded-2xl p-4 border-2 space-y-2 ${c.cor}`}>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${c.tagCor}`}>{c.tag}</span>
                      <p className={`text-[9px] font-bold ${c.destaque ? 'text-white/60' : 'text-gray-400'}`}>{c.sub}</p>
                      <p className={`text-xl font-black leading-tight ${c.valCor}`}>{fmt(c.total)}</p>
                      <p className={`text-[8px] font-bold ${c.destaque ? 'text-white/50' : 'text-gray-400'}`}>{fmtHa(c.total)}</p>
                      <p className={`text-[8px] font-medium leading-relaxed ${c.destaque ? 'text-white/70' : 'text-gray-500'}`}>{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Conversão de unidades de área */}
          <div className="pt-3 border-t border-gray-100">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 max-w-sm space-y-3">
              <div>
                <h4 className="text-xs font-black text-prylom-dark">Conversão de Área</h4>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Converta entre as medidas de terra do campo</p>
              </div>
              {(() => {
                const ucUnits: Record<string, number> = {
                  'Hectare': 1,
                  'Alqueire Paulista': 2.42,
                  'Alqueire Mineiro': 4.84,
                  'Alqueire Goiano': 4.84,
                  'Acre': 0.404686,
                  'Metro Quadrado': 0.0001,
                };
                const fromFactor = ucUnits[ucFrom] ?? 1;
                const toFactor   = ucUnits[ucTo]   ?? 1;
                const converted  = parseFloat(((ucValue * fromFactor) / toFactor).toFixed(4));
                return (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Converter</p>
                      <input
                        type="number"
                        value={ucValue}
                        onChange={e => setUcValue(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg font-black text-[#2c5363] text-sm outline-none focus:border-prylom-gold"
                      />
                      <select
                        value={ucFrom}
                        onChange={e => setUcFrom(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold text-[#2c5363] text-sm outline-none focus:border-prylom-gold cursor-pointer"
                      >
                        {Object.keys(ucUnits).map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Para</p>
                      <input
                        type="number"
                        readOnly
                        value={converted}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg font-black text-[#2c5363] text-sm outline-none bg-gray-100"
                      />
                      <select
                        value={ucTo}
                        onChange={e => setUcTo(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg font-bold text-[#2c5363] text-sm outline-none focus:border-prylom-gold cursor-pointer"
                      >
                        {Object.keys(ucUnits).map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
        </div>
        )}
      </div>

      {/* ── ALERTAS ESTRATÉGICOS IMOBILIÁRIOS ── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleModule('alertas')}
          className="w-full p-6 md:p-8 flex items-center gap-5 text-left hover:bg-gray-50/60 transition-colors"
        >
          <div className="w-12 h-12 bg-[#2c5363]/5 rounded-2xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2c5363]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h3 className="text-sm font-black text-prylom-dark uppercase tracking-tight">Alertas Estratégicos Imobiliários</h3>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[7px] font-black uppercase tracking-widest">2 urgentes</span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium leading-snug">Fique por dentro de prazos fiscais, exigências ambientais e oportunidades que afetam diretamente o seu imóvel rural.</p>
          </div>
          <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${openModules.has('alertas') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {openModules.has('alertas') && (() => {
        const alertas = [
          {
            tipo: 'urgente',
            categoria: 'Fiscal',
            impacto: 'Alto',
            titulo: 'ITR 2026: Novas Tabelas de VTN em Vigor',
            desc: 'Receita Federal atualiza Valor da Terra Nua em 14 estados. Declarações subavaliadas terão multa de 75% + correção SELIC. Imóveis avaliados abaixo do novo piso podem ter auto de infração retroativo a 2024.',
            acao: 'Revisar declaração anterior e ajustar VTN',
            fonte: 'Receita Federal / IN RFB',
            prazo: '30/04/2026',
          },
          {
            tipo: 'urgente',
            categoria: 'Regulatório',
            impacto: 'Alto',
            titulo: 'INCRA: GEO Obrigatório para Imóveis acima de 4 MF',
            desc: 'Prazo final dezembro/2026. Propriedades sem georreferenciamento certificado ficam bloqueadas para transferência cartorial, desmembramento e regularização fundiária. MT, GO e PA são os estados com maior volume de pendências.',
            acao: 'Contratar empresa credenciada INCRA imediatamente',
            fonte: 'INCRA / Portaria 1.101/2025',
            prazo: '31/12/2026',
          },
          {
            tipo: 'atencao',
            categoria: 'Ambiental',
            impacto: 'Alto',
            titulo: 'IBAMA Intensifica Embargos no Cerrado e Amazônia',
            desc: 'Operação Fronteira Verde II: 1.240 novas autuações em fevereiro/2026. Imóveis com passivo ambiental não averbado têm bloqueio automático de transferência no SNCR e perda de acesso ao crédito rural (Pronaf, ABC, FCO).',
            acao: 'Verificar situação no SICAR e IBAMA antes de negociar',
            fonte: 'IBAMA / SICAR',
            prazo: 'Ativo',
          },
          {
            tipo: 'atencao',
            categoria: 'Compliance',
            impacto: 'Médio',
            titulo: 'CAR: Retificação Obrigatória no MATOPIBA até Jul/2026',
            desc: 'Estados de MA, PI, TO e BA exigem adequação de módulos fiscais em áreas de bioma Cerrado. CAR irregular suspende crédito BNDES, Syngenta e Bayer. Estimativa de 38 mil imóveis ainda pendentes.',
            acao: 'Checar status no SICAR estadual e protocolar retificação',
            fonte: 'SEMA-MT / SEMARH-GO',
            prazo: '31/07/2026',
          },
          {
            tipo: 'oportunidade',
            categoria: 'Mercado',
            impacto: 'Alto',
            titulo: 'FIAgro Atinge R$ 18,4 Bi — Maior Liquidez Histórica',
            desc: 'Fundos de Investimento Agrícola buscam ativos com lavoura certificada, GEO regularizado e arrendamento ativo. Janela de valorização de 12–18 meses para fazendas em MT, GO e BA. Prêmio médio de 22% sobre valor de mercado para ativos "clean".',
            acao: 'Preparar dossiê de ativos e conectar com investidores via Prylom',
            fonte: 'CVM / B3 / ANBIMA',
            prazo: 'Janela aberta',
          },
          {
            tipo: 'oportunidade',
            categoria: 'Jurídico',
            impacto: 'Médio',
            titulo: 'STJ Consolida Usucapião Rural Quinquenal (Súmula 637)',
            desc: 'Nova orientação do STJ favorece regularização de posses com 5 anos pacíficos, contínuos e produtivos. Impacto direto em ~190 mil imóveis rurais sem escritura no Brasil. Simplifica due diligence e reduz litígios em transações com histórico de ocupação.',
            acao: 'Avaliar imóveis com histórico de posse como oportunidade de aquisição',
            fonte: 'STJ — Recurso Especial 2.089.XXX',
            prazo: 'Vigente',
          },
        ];

        const corTipo: Record<string, { borda: string; tag: string; tagTxt: string; label: string }> = {
          urgente:     { borda: 'border-l-red-500',    tag: 'bg-red-100',    tagTxt: 'text-red-700',    label: 'URGENTE'      },
          atencao:     { borda: 'border-l-amber-400',  tag: 'bg-amber-100',  tagTxt: 'text-amber-700',  label: 'ATENÇÃO'      },
          oportunidade:{ borda: 'border-l-green-500',  tag: 'bg-green-100',  tagTxt: 'text-green-700',  label: 'OPORTUNIDADE' },
        };

        const corImpacto: Record<string, string> = {
          'Alto':  'bg-red-50 text-red-600',
          'Médio': 'bg-amber-50 text-amber-600',
          'Baixo': 'bg-gray-100 text-gray-500',
        };

        return (
          <div className="p-6 md:p-8 border-t border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Coluna principal: alertas */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-black text-prylom-dark uppercase tracking-tight">Alertas Estratégicos</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Imóveis Rurais · Atualizado março/2026</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-[8px] font-black uppercase tracking-widest">
                    {alertas.filter(a => a.tipo === 'urgente').length} urgentes
                  </span>
                </div>

                {alertas.map((a, i) => {
                  const c = corTipo[a.tipo];
                  return (
                    <div key={i} className={`bg-gray-50 rounded-2xl border border-gray-100 border-l-4 ${c.borda} p-4 space-y-2`}>
                      {/* badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${c.tag} ${c.tagTxt}`}>{c.label}</span>
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-gray-100 text-gray-500 uppercase">{a.categoria}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${corImpacto[a.impacto]}`}>Impacto {a.impacto}</span>
                        <span className="ml-auto text-[8px] font-bold text-gray-400 shrink-0">Prazo: {a.prazo}</span>
                      </div>
                      {/* conteúdo */}
                      <p className="text-sm font-black text-prylom-dark leading-tight">{a.titulo}</p>
                      <p className="text-[11px] font-medium text-gray-500 leading-relaxed">{a.desc}</p>
                      {/* rodapé */}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                        <p className="text-[8px] font-black text-prylom-gold uppercase tracking-widest">→ {a.acao}</p>
                        <p className="text-[8px] text-gray-400 font-medium shrink-0 ml-4">{a.fonte}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sidebar: Due Diligence + Radar */}
              <div className="space-y-4">

                {/* Checklist de Due Diligence */}
                <div className="bg-prylom-dark text-white rounded-2xl p-6 space-y-4">
                  <div>
                    <p className="text-[8px] font-black text-prylom-gold uppercase tracking-[0.3em]">Prylom</p>
                    <h4 className="text-sm font-black uppercase tracking-tight mt-0.5">Checklist de Compra Segura</h4>
                    <p className="text-[9px] text-white/50 font-medium mt-0.5">O que verificar antes de fechar o negócio</p>
                  </div>
                  <div className="space-y-2">
                    {([
                      { ok: true,  txt: 'CCIR e ITR vigentes (últimos 5 anos)'          },
                      { ok: true,  txt: 'Georreferenciamento averbado no CRI'            },
                      { ok: true,  txt: 'CAR validado — sem sobreposição'                },
                      { ok: false, txt: 'Certidão negativa de débitos ambientais (IBAMA)'},
                      { ok: true,  txt: 'Matrícula sem ônus reais ou penhoras'           },
                      { ok: false, txt: 'GEO e matrícula coincidentes (polígono)'        },
                      { ok: true,  txt: 'Outorga d\'água ativa (se irrigação)'           },
                      { ok: false, txt: 'Certidões negativas federais e estaduais'       },
                    ] as { ok: boolean; txt: string }[]).map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className={`mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black ${item.ok ? 'bg-green-500 text-white' : 'bg-white/20 text-white/40'}`}>
                          {item.ok ? '✓' : '○'}
                        </span>
                        <p className={`text-[10px] font-medium leading-tight ${item.ok ? 'text-white/80' : 'text-white/40'}`}>{item.txt}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[8px] text-white/30 pt-2 border-t border-white/10">
                    Itens em cinza são documentos que frequentemente faltam na hora de negociar uma terra.
                  </p>
                </div>

                {/* Radar de Categorias */}
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 space-y-3">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Alertas por Área</p>
                  {([
                    { cat: 'Fiscal',      urgentes: 1, total: 1, cor: 'bg-red-400'   },
                    { cat: 'Regulatório', urgentes: 1, total: 1, cor: 'bg-red-400'   },
                    { cat: 'Ambiental',   urgentes: 0, total: 1, cor: 'bg-amber-400' },
                    { cat: 'Compliance',  urgentes: 0, total: 1, cor: 'bg-amber-400' },
                    { cat: 'Mercado',     urgentes: 0, total: 1, cor: 'bg-green-500' },
                    { cat: 'Jurídico',    urgentes: 0, total: 1, cor: 'bg-green-500' },
                  ] as { cat: string; urgentes: number; total: number; cor: string }[]).map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${r.cor}`} />
                      <p className="text-[10px] font-black text-prylom-dark flex-1">{r.cat}</p>
                      <p className="text-[8px] font-bold text-gray-400">{r.total} alerta{r.total > 1 ? 's' : ''}</p>
                      {r.urgentes > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[7px] font-black">URGENTE</span>}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        );
        })()}
      </div>

      {/* ── FEED DE NOTÍCIAS AGRO ── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleModule('noticias')}
          className="w-full p-6 md:p-8 flex items-center gap-5 text-left hover:bg-gray-50/60 transition-colors"
        >
          <div className="w-12 h-12 bg-[#2c5363]/5 rounded-2xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2c5363]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h3 className="text-sm font-black text-prylom-dark uppercase tracking-tight">{t.terminalMainEvents}</h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[7px] font-black uppercase tracking-widest"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse inline-block mr-0.5"/>Live</span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium leading-snug">Notícias do dia sobre soja, milho, commodities e o que está movendo o mercado agro no Brasil e no mundo.</p>
          </div>
          <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${openModules.has('noticias') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {openModules.has('noticias') && (
        <div className="border-t border-gray-100 p-6 md:p-8 space-y-6">

          {/* Atualizar */}
          <div className="flex justify-end">
            <button
              onClick={fetchAgroNews}
              disabled={loadingNews}
              className="flex items-center gap-2 text-[9px] font-black text-prylom-gold uppercase tracking-widest hover:underline disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${loadingNews ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t.terminalUpdateScan}
            </button>
          </div>

        {/* Cards */}
        {loadingNews ? (
          <div className="py-20 flex flex-col items-center justify-center gap-5 bg-white rounded-3xl border border-gray-100">
            <div className="w-10 h-10 border-4 border-prylom-gold/20 border-t-prylom-gold rounded-full animate-spin" />
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">{t.terminalGlobalScan}</p>
          </div>
        ) : news.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">{t.marketEmpty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {news.map((item: MarketNews) => {
              const catColors: Record<string, string> = {
                CHICAGO: 'bg-amber-50 text-amber-700 border-amber-200',
                USDA:    'bg-blue-50 text-blue-700 border-blue-200',
                CHINA:   'bg-red-50 text-red-700 border-red-200',
                INPUTS:  'bg-purple-50 text-purple-700 border-purple-200',
                CLIMATE: 'bg-teal-50 text-teal-700 border-teal-200',
              };
              const catLabel: Record<string, string> = {
                CHICAGO: 'Grãos / CBOT',
                USDA:    'USDA / Exportação',
                CHINA:   'China / Ásia',
                INPUTS:  'Insumos / Mercado',
                CLIMATE: 'Clima / Safra',
              };
              const sentColor = item.sentiment === 'BULLISH'
                ? 'bg-green-50 text-green-700'
                : item.sentiment === 'BEARISH'
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-100 text-gray-500';
              const sentIcon = item.sentiment === 'BULLISH' ? '▲' : item.sentiment === 'BEARISH' ? '▼' : '—';

              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
                >
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${catColors[item.category] ?? catColors.INPUTS}`}>
                      {catLabel[item.category] ?? item.category}
                    </span>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${sentColor}`}>
                      {sentIcon} {item.sentiment}
                    </span>
                  </div>

                  {/* Title — grows to fill card */}
                  <h3 className="text-sm font-black text-prylom-dark leading-snug mb-3 line-clamp-3 flex-1">
                    {item.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed line-clamp-3 mb-4">
                    {item.summary}
                  </p>

                  {/* Footer */}
                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide leading-tight">
                      {item.source}<br />{item.timestamp}
                    </span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1 text-[9px] font-black text-prylom-gold uppercase tracking-widest hover:underline"
                      >
                        Ver mais
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-[#2c5363] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-prylom-gold/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-prylom-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-1 block">{t.terminalDisclaimer}</span>
              <h4 className="text-base font-black mb-1 tracking-tight">{t.terminalExecution}</h4>
              <p className="text-[11px] font-medium leading-relaxed opacity-70">{t.terminalDisclaimerDesc}</p>
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-prylom-gold/10 rounded-full blur-3xl" />
        </div>
        </div>
        )}
      </div>

      {/* ── ANÁLISE DE REGIÃO PRYLOM AI ── */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleModule('ai')}
          className="w-full p-6 md:p-8 flex items-center gap-5 text-left hover:bg-gray-50/60 transition-colors"
        >
          <div className="w-12 h-12 bg-[#2c5363]/5 rounded-2xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#2c5363]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h3 className="text-sm font-black text-prylom-dark uppercase tracking-tight">Análise de Região Prylom AI</h3>
              {localInsight && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[7px] font-black uppercase tracking-widest">Análise gerada</span>}
              {loadingInsight && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[7px] font-black uppercase tracking-widest animate-pulse">Gerando...</span>}
            </div>
            <p className="text-[11px] text-gray-400 font-medium leading-snug">Receba um resumo completo em linguagem simples sobre o potencial produtivo e os riscos da região buscada.</p>
          </div>
          <svg className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${openModules.has('ai') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {openModules.has('ai') && (
        <div className="border-t border-gray-100 p-6 md:p-8 space-y-8 min-h-[200px]">

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
                     <p className="text-sm font-bold text-[#2c5363] italic leading-relaxed mb-8">"{localInsight.simple}"</p>
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
        )}
      </div>
    </div>
  );
};

export default ToolsHub;