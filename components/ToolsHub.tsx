import { GoogleGenAI } from "@google/genai";
import React, { useEffect, useState, useMemo } from 'react';
import { AppCurrency, AppLanguage } from '../types';

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
  const [freightRateKm, setFreightRateKm] = useState(0.18); // R$ / t / km
  const [loadWeight, setLoadWeight] = useState(37); // Toneladas (Bitrem comum)
  const [destPrice, setDestPrice] = useState(148.00); // Preço na ponta (Porto)
  const [riskFactor, setRiskFactor] = useState(1.05); // 5% extra para riscos/manutenção
  const [extraCosts, setExtraCosts] = useState(1200); // Pedágios/Seguros fixos

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
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const analyze = async (locInfo: string, lat?: number, lng?: number) => {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Atue como um Product Designer e Consultor Sênior de agronegócio Prylom especializado em análise regional de ativos rurais.
          Localização alvo: ${locInfo}. 
          ${lat ? `Coordenadas: ${lat}, ${lng}.` : ''}
          Forneça um insight estratégico curto no tom premium e técnico da Prylom. 
          Inclua informações sobre aptidão produtiva, regime de chuvas e potencial de valorização da região.
          Divida a resposta em Parte 1 (Análise Técnica Profunda) e Parte 2 (Resumo Executivo Simples) separando com "|||". 
          Responda estritamente no idioma: ${lang}.`,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
        const [technical, simple] = (response.text || "").split("|||").map(s => s.trim());
        setLocalInsight({
          technical: technical || response.text || "",
          simple: simple || "",
          coords: lat ? `${lat.toFixed(4)}, ${lng?.toFixed(4)}` : "Referência Geográfica",
          locationName: locInfo === "Sua Localização Atual" ? "Detectado por Geovisualização" : locInfo
        });

        if (locInfo.toLowerCase().includes('mt') || locInfo.toLowerCase().includes('mato grosso')) setRegion('MT - Médio Norte');
        else if (locInfo.toLowerCase().includes('go') || locInfo.toLowerCase().includes('goiás')) setRegion('GO - Sudoeste');
        else if (locInfo.toLowerCase().includes('pr') || locInfo.toLowerCase().includes('paraná')) setRegion('PR - Oeste');
        else if (locInfo.toLowerCase().includes('ms') || locInfo.toLowerCase().includes('mato grosso do sul')) setRegion('MS - Sul');
      };

      if (specificLocation) {
        await analyze(specificLocation);
      } else {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await analyze("Sua Localização Atual", pos.coords.latitude, pos.coords.longitude);
        }, async () => {
          await analyze("Brasil - Hub Regional");
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInsight(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualRegion.trim()) fetchLocalInsight(manualRegion);
  };

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
            <p className="text-white font-black text-[13px] uppercase leading-tight">Produção média de Soja</p>
            <p className="text-white/50 font-bold text-[9px] uppercase tracking-widest">(saca/ha) 2025/26</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-prylom-gold text-[10px] font-black uppercase">{regionalCosts[region].location}:</span>
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
</div>
  );
};

export default ToolsHub;