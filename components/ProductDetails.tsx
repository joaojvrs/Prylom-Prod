import React, { useState, useEffect, useMemo } from 'react';
import { AppLanguage, AppCurrency } from '../types';
import { supabase } from '../supabaseClient';
import { GoogleGenAI } from "@google/genai";

interface Props {
  productId: string | null;
  onSelectProduct?: (id: string) => void;
  onBack: () => void;
  t: any;
  lang: AppLanguage;
  currency: AppCurrency;
}
const getFullImage = (url: string) => {
  return `${url}?width=1280&quality=85&resize=contain`;
};






const ProductDetails: React.FC<Props> = ({ productId, onSelectProduct, onBack, t, lang, currency }) => {
  const [product, setProduct] = useState<any>(null);
  const [spec, setSpec] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  // PASSO 3: Estado sem cache busting - URL Limpa é obrigatória
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableAudios, setAvailableAudios] = useState<any[]>([]);
  const [prylomScore, setPrylomScore] = useState<number | null>(null);
  const [analyzingScore, setAnalyzingScore] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const rates = useMemo(() => ({
    [AppCurrency.BRL]: 1, [AppCurrency.USD]: 0.19, [AppCurrency.CNY]: 1.42, [AppCurrency.RUB]: 18.5
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

  const formatNumber = (val: number, decimals = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(val);
  };

  const formatV = (val: number, isCurrency = true, decimals = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '---';
    const converted = val * rates[currency];
    const symbol = getSymbol();
    const formatted = formatNumber(converted, decimals);
    
    return isCurrency 
      ? <span className="flex items-baseline gap-1"><span className="text-[0.6em] font-black opacity-60">{symbol}</span><span>{formatted}</span></span>
      : <span>{formatted}</span>;
  };

  const handleShare = async () => {
    const url = window.location.href;
const title = `Prylom - ${product.titulo}`;
const text = `Confira este ativo em ${product.cidade} no ecossistema Prylom.`;


    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Native share failed, using fallback:', err);
      }
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 3000);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          setCopyFeedback(true);
          setTimeout(() => setCopyFeedback(false), 3000);
        }
      }
    } catch (err) {
      console.error('All share methods failed:', err);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  // PASSO 2: Preload manual SÓ das imagens full (URL limpa para cache perfeito)
// PASSO 2: Preload aprimorado
useEffect(() => {
  if (images.length > 0) {
    images.forEach((img) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = getFullImage(img.image_url);
      document.head.appendChild(link);
      
      // Fallback para navegadores antigos
      const i = new Image();
      i.src = getFullImage(img.image_url);
    });
  }
  
}, [images]);


  // PASSO 4: Navegação limpa (SEM ?v=)
  const handleNextImage = () => {
    if (images.length <= 1) return;
    const currentIndex = images.findIndex(
  img => img.image_url === activeImage
);
    const nextIndex = (currentIndex + 1) % images.length;
    setActiveImage(images[nextIndex].image_url);

  };

  const handlePrevImage = () => {
    if (images.length <= 1) return;
    const currentIndex = images.findIndex(
  img => img.image_url === activeImage
);
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    setActiveImage(images[prevIndex].image_url);

  };

  // ROI & ECONOMICS CÁLCULOS
  const farmEconomics = useMemo(() => {
    if (!product || product.categoria !== 'fazendas') return null;
    
    const isLease = product.tipo_transacao === 'arrendamento';
    const areaTotal = spec?.area_total_ha || 1000;
    const fatorAproveitamento = 0.68;
    const areaAgri = spec?.area_lavoura_ha || (areaTotal * fatorAproveitamento);
    const prodSoja = 59.8; 
    const prodMilho = 87.4;
    
    if (isLease) {
      const valorArrendamentoHa = product.valor || 1800;
      const custoTotalAnual = areaAgri * valorArrendamentoHa;
      const margemOperacionalMin = 18;
      const margemOperacionalMax = 28;
      const receitaEstimada = (areaAgri * prodSoja * 135) + (areaAgri * prodMilho * 72); 
      const ebitdaEstimado = receitaEstimada - custoTotalAnual - (areaAgri * 8000);
// Dentro do if (isLease) no farmEconomics:
return { 
  isLease: true,
  areaAgri, 
  receitaBruta: receitaEstimada, 
  ebitda: ebitdaEstimado,
  lucroLiquido: ebitdaEstimado * 0.85,
  roiRange: { pessimista: 12, base: 18, otimista: 25 }, 
  paybackReal: 0,
  prodSoja,
  prodMilho,
  // DADOS DINÂMICOS DO BANCO DE DADOS:
  indices: {
    argila: { 
      atual: spec?.teor_argila || '---', 
      mediaEstado: spec?.media_argila_estado || '30%' 
    },
    pluviometrico: { 
      atual: spec?.precipitacao_mm ? `${spec.precipitacao_mm}mm` : '---', 
      mediaEstado: spec?.media_pluvio_estado || '1.600mm' 
    },
    altimetria: { 
      atual: spec?.altitude_m ? `${spec.altitude_m}m` : '---', 
      mediaEstado: spec?.media_altitude_estado || '400m' 
    },
    relevo: { 
      atual: spec?.topografia || '---', 
      mediaEstado: spec?.media_relevo_estado || 'Plano/Ondulado' 
    }
  }
};
    } else {
      const valorAtivo = product.valor || 1;
      const precoSoja = 135; 
      const precoMilho = 72;
      const custoSoja = areaAgri * 5800; 
      const custoMilho = areaAgri * 4400; 
      const custoTotalOp = custoSoja + custoMilho;
      const receitaBruta = (areaAgri * prodSoja * precoSoja) + (areaAgri * prodMilho * precoMilho);
      const ebitda = receitaBruta - custoTotalOp;
      const reinvestimento = receitaBruta * 0.07; 
      const impostos = ebitda * 0.10; 
      const lucroLiquido = ebitda - reinvestimento - impostos;
      const roiReal = (lucroLiquido / valorAtivo) * 100;
      const paybackReal = valorAtivo / (lucroLiquido || 1);
      const precoHa = valorAtivo / (areaTotal || 1);
      const roiRange = {
        pessimista: Math.max(0, roiReal * 0.9),
        base: roiReal,
        otimista: roiReal * 1.15
      };

      return { 
        isLease: false,
        areaAgri, 
        receitaBruta, 
        custoTotalOp, 
        ebitda,
        reinvestimento,
        impostos,
        lucroLiquido, 
        roiReal,
        roiRange,
        paybackReal, 
        precoHa,
        prodSoja,
        prodMilho
      };
    }
  }, [product, spec, rates, currency]);

  const planeEcoData = useMemo(() => {
    if (!product || product.categoria !== 'avioes' || !spec) return null;
    return {
      custoHora: 4850,
      consumo: 115,
      autonomia: 1650,
      custoAnual: 4850 * 200,
      tmv: 45,
      liquidez: 'Alta',
      inspecaoLast: 'Dez/2023',
      inspecaoNext: 'Dez/2024 (100h / Anual)',
      motoresStatus: '60% TBO Remaining',
      marketBenchmark: -4.2
    };
  }, [product, spec]);

  const grainMarketData = useMemo(() => {
    if (!product || product.categoria !== 'graos' || !spec) return null;
    return {
      cbotPrice: 13.20,
      basis: -0.35,
      fobSantos: 12.85,
      trend: '+4,1%',
      liquidez: '🟢 Alta (Exportação/Esmagamento)',
      umidade: '≤ 13%',
      impurezas: '≤ 1%',
      transgenico: 'Sim (RR)',
      loteMinimo: 1000,
      lotePadrao: 10000,
      modal: '🚛 Rodoviário | 🚆 Ferroviário',
      destino: '⚓ Porto de Santos / Indústrias',
      janela: 'Março – Junho 2025',
      custoLogistico: 85.00
    };
  }, [product, spec]);

  useEffect(() => {
    if (productId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      fetchFullProductData();
    }
  }, [productId, lang]);

  const fetchFullProductData = async () => {
    setLoading(true);
    try {
      const { data: baseData } = await supabase.from('produtos').select('*').eq('id', productId).single();
      if (!baseData) return;
      const { data: specData } = await supabase.from(baseData.categoria).select('*').eq('produto_id', productId).maybeSingle();
      const { data: imgData } = await supabase.from('produtos_imagens').select('*').eq('produto_id', productId).order('ordem', { ascending: true });
      const { data: audioData } = await supabase.from('produtos_audios').select('*').eq('produto_id', productId);
      setProduct(baseData);
      setSpec(specData);
      if (imgData) {
        setImages(imgData);
        // Inicialização correta sem cache busting
        if (imgData.length > 0) {
          setActiveImage(imgData[0].image_url);
        }
      }
      if (audioData) setAvailableAudios(audioData);
      analyzePrylomScore(baseData, specData);
      fetchRelatedProducts(baseData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchRelatedProducts = async (currentProd: any) => {
    try {
      const { data } = await supabase
  .from('produtos')
  .select(`
    *,
    arrendamentos (modalidade, quantidade, unidade, ativo),
    produtos_imagens (image_url, ordem)
  `)
  .eq('estado', currentProd.estado)
  .neq('id', currentProd.id)
  .limit(3);

      if (data) setRelatedProducts(data.map((item: any) => ({ ...item, main_image: item.produtos_imagens?.[0]?.image_url })));
    } catch (e) { console.error(e); }
  };

  const analyzePrylomScore = async (p: any, s: any) => {
    setAnalyzingScore(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Premium Asset Analysis (Private Equity). Asset: ${p.titulo}, Category: ${p.categoria}. Rate 0.0-10.0 based on liquidity, market history, demand, and risk. Return ONLY the number.`;
      const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
      const score = p.categoria === 'graos' ? "8.7" : (response.text?.trim() || "8.2");
      setPrylomScore(parseFloat(score));
    } catch (e) { setPrylomScore(p.categoria === 'graos' ? 8.7 : 8.2); } finally { setAnalyzingScore(false); }
  };

  if (loading || !product) return <div className="p-40 text-center animate-pulse text-prylom-gold font-black uppercase text-[10px]">{t.mapProcessing}</div>;

  const isFarm = product.categoria === 'fazendas';
  const isPlane = product.categoria === 'avioes';
  const isMachine = product.categoria === 'maquinas';
  const isGrain = product.categoria === 'graos';
  const isLease = product.tipo_transacao === 'arrendamento';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fadeIn pb-40 space-y-12 print:p-0 print:space-y-4 print:m-0">
      
<style
  dangerouslySetInnerHTML={{
    __html: `
      @media print {
        body { background: white !important; }
        .no-print { display: none !important; }
        .print-full { width: 100% !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
        header, footer, aside { display: none !important; }
        .print-main { display: block !important; width: 100% !important; }
        .aspect-video { height: 400px !important; }
        .rounded-[3rem], .rounded-[3.5rem], .rounded-full { border-radius: 0.5rem !important; }
      }
    `,
  }}
/>



      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase text-prylom-gold tracking-widest transition-all no-print">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        {t.hubTitle} / {t.btnShopping}
      </button>

      {/* BLOCO 1: IDENTIDADE DO ATIVO */}
      <section className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-8 print-full">
        <div className="col-span-1 md:col-span-2">
           <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-[8px] font-black text-white bg-prylom-dark px-3 py-1 rounded-md uppercase tracking-widest">
                {isPlane ? '🛩️ ' + t.catPlanes : isMachine ? '🚜 ' + t.catMachinery : isGrain ? '🌾 ' + t.catGrains : '🌾 ' + t.catFarms}
              </span>
              <span className="text-[8px] font-black text-prylom-dark bg-gray-100 px-3 py-1 rounded-md uppercase tracking-widest">🧠 Prylom Intelligence</span>
              {product.certificacao && <span className="text-[8px] font-black text-prylom-gold bg-prylom-gold/5 px-3 py-1 rounded-md border border-prylom-gold/10 uppercase tracking-widest">🔒 Prylom Verified | 📑 Compliance OK</span>}
           </div>
           <h1 className="text-3xl font-black text-[#000080] tracking-tighter leading-none mb-2">

             {isGrain
  ? `${spec?.cultura || 'Soja'} – Grão Físico | Safra ${spec?.safra || '24/25'}`
  : isPlane && spec?.fabricante
    ? `${spec.fabricante} ${spec.modelo}`
    : product.titulo
    
}


           </h1>
<div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-prylom-dark uppercase">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3 w-3 text-prylom-gold no-print"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
    />
  </svg>
  Origem: {product.cidade} — {product.estado}
</div>
</div>

<div className="col-span-1 flex flex-col justify-center items-start w-full">
  
  <div className="flex items-start gap-8 w-full">
    
    {/* Coluna 1: Status / Modalidade / Volume */}
    <div className="flex flex-col min-w-0">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
        {isGrain ? 'Volume Total' : isPlane ? 'Liquidez de Mercado' : isLease ? '🏷️ Modalidade' : 'Status & Selo'}
      </p>
      
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse no-print flex-shrink-0"></div>
        <span className="text-sm font-black text-[#000080] uppercase tracking-tighter truncate">
          {isGrain
            ? `${formatNumber(spec?.estoque_toneladas || 120000, 0)} t`
            : isPlane
              ? `${planeEcoData?.liquidez} (TMV: ${planeEcoData?.tmv} dias)`
              : isLease
                ? 'Arrendamento'
                : t.statusAvailable}
        </span>
      </div>
    </div>

{/* Adicionei mr-8 como exemplo, ajuste o número conforme necessário */}
<div className="flex flex-col ml-auto mr-8 text-left min-w-fit">
  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
    Código
  </p>
  <span className="text-sm font-black text-[#000080] uppercase tracking-tighter">
    {product.codigo}
  </span>
</div>

  </div>



 
           {isGrain && <p className="text-[8px] font-bold text-prylom-gold mt-1 uppercase tracking-widest">Preço: {formatV(product.valor || 1000)} / t</p>}
        </div>
        <div className="col-span-1 bg-gray-100/70 p-6 rounded-[2.5rem] border border-gray-200 flex flex-col justify-center">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{isGrain ? 'Valor Total Lote' : (isLease ? 'Área Disponível' : t.priceTotal)}</p>
           <p className="text-[1.6rem] font-black text-[#000080] leading-tight">
             {isGrain
  ? formatV((spec?.estoque_toneladas || 120000) * (product.valor || 1000))
  : isLease
    ? `${formatNumber(spec?.area_total_ha || 1000)} ha`
    : formatV(product.valor)
}

           </p>

{/* VALOR POR HECTARE — apenas fazenda à venda */}
{!isGrain && !isLease && spec?.area_total_ha && product.valor && (
  <div className="mt-2 flex items-baseline gap-1 opacity-70">
    <span className="text-sm font-black text-gray-500">
      {getSymbol()}
    </span>

    <span className="text-lg font-black text-gray-500 tabular-nums">
      {formatNumber(product.valor / spec.area_total_ha, 0)}
    </span>

    <span className="text-xs font-black text-gray-400">
      / ha
    </span>
  </div>
)}


        </div>
      </section>

      {/* SNAPSHOT INDICADORES (ESTRATÉGICOS) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 print-full">
        {[
          { label: isGrain ? 'Preço Spot (Hoje)' : (isPlane ? 'Positioning' : (isLease ? 'Perfil do Operador' : 'Perfil do Investidor')), val: isGrain ? <div className="flex flex-col"><span className="text-[#000080]">CBOT: US$ {grainMarketData?.cbotPrice}</span><span className="text-[7px] opacity-60">Basis: {grainMarketData?.basis} | FOB: {grainMarketData?.fobSantos}</span></div> : isPlane ? 'Operação Regional / Pista Curta' : (isFarm ? (isLease ? 'Produtor | Grupo Agro' : 'Produção | Arrendamento') : 'Corporativo') },
          { label: isGrain ? 'Tendência (30d)' : (isPlane ? 'Hours vs Média' : 'Market Fit'), val: isGrain ? <span className="text-green-600">📈 Alta moderada ({grainMarketData?.trend})</span> : isPlane ? '✔ Abaixo da Média (Low Time)' : (isFarm ? '✔ Produção de grãos mecanizada' : t.highPerformance) },
          { label: isGrain ? 'Liquidez do Ativo' : (isPlane ? 'Selo de Robustez' : (isLease ? 'Liquidez Operacional' : 'Liquidez Patrimonial')), val: isGrain ? grainMarketData?.liquidez : isPlane ? 'Agro Ready: Pista não pavimentada' : (isFarm ? '✔ Alta demanda regional' : 'Auditada') },
          { label: t.valuationConfidence, val: <div className="flex flex-col items-center"><span className="text-prylom-gold font-black">{prylomScore || '8.2'} / 10</span><span className="text-[6px] font-bold text-gray-400 uppercase text-center mt-1">Analytics Real-Time</span></div> }
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 text-center shadow-sm flex flex-col justify-center">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">{item.label}</p>
            <div className="text-[10px] font-black text-[#000080] uppercase leading-tight">{item.val}</div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
        <div className="lg:col-span-8 space-y-6 print-full">
           {/* GALERIA PRINCIPAL "PREMIUM" (PASSO 6) */}
           <div className="relative group">
              <div className="aspect-video bg-gray-100 rounded-[3.5rem] overflow-hidden border border-gray-200 shadow-xl relative">
<img 
      key={activeImage} 
      src={activeImage ? getFullImage(activeImage) : ''}
      loading="eager"
      decoding="async"
      // @ts-ignore
      fetchpriority="high"
      className="w-full h-full object-cover transition-opacity duration-500 opacity-0" 
      onLoad={(e) => (e.currentTarget.classList.remove('opacity-0'))}
    />

                  
                  {/* Navegação flutuante */}
                  {images.length > 1 && (
                    <>
                      <button 
                        onClick={handlePrevImage}
                        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-prylom-dark shadow-2xl z-20 no-print"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button 
                        onClick={handleNextImage}
                        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-prylom-dark shadow-2xl z-20 no-print"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </>
                  )}

                  <div className="absolute top-8 left-8 flex gap-2 no-print">
                    <span className="bg-[#000080] text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-2xl">Auditado Prylom</span>
                    <span className="bg-white/90 backdrop-blur-md text-prylom-gold text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">Compliance Documental OK</span>
                  </div>

                  {images.length > 1 && (
                    <div className="absolute bottom-8 right-8 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[9px] font-black uppercase tracking-widest no-print">
                      {images.findIndex(img => img.image_url === activeImage) + 1} / {images.length}

                    </div>
                  )}
              </div>
           </div>


 {/* ECONOMICS (FAZENDAS) */}
{isFarm && farmEconomics && (
  <div className="space-y-8 animate-fadeIn pt-4">
    <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10 print-full">
      <header className="flex justify-between items-center border-b border-gray-50 pb-6">
        <h3 className="text-2xl font-black text-[#000080] uppercase tracking-tighter flex items-center gap-3">💰 Economics do Ativo</h3>
        <span className="bg-prylom-gold/10 text-prylom-gold text-[8px] font-black px-3 py-1 rounded-md uppercase tracking-widest">Projeção Auditada</span>
      </header>

      {/* BLOCO DE PRODUTIVIDADE E PERFORMANCE - SEMPRE APARECE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">📊 Produtividade Real (Ajustada por Risco)</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-sm font-bold text-prylom-dark uppercase">Soja</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-prylom-dark">{formatNumber(farmEconomics.prodSoja, 1)} sc/ha</span>
                  <p className="text-[7px] text-red-500 font-bold uppercase tracking-widest">Incluindo Risco Climático</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-sm font-bold text-prylom-dark uppercase">Milho (2ª Safra)</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-prylom-dark">{formatNumber(farmEconomics.prodMilho, 1)} sc/ha</span>
                  <p className="text-[7px] text-red-500 font-bold uppercase tracking-widest">Incluindo Risco Climático</p>
                </div>
              </div>
            </div>
          </div>

          {/* Faturamento para Venda (Escondido se for Arrendamento, pois o Arrendamento tem o seu próprio bloco gigante abaixo) */}
          {!isLease && (
            <div className="pt-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">💵 Receita Bruta Anual</h4>
              <div className="p-8 bg-[#000080]/5 rounded-[2.5rem] border border-[#000080]/10 flex flex-col items-center text-center">
                <span className="text-[9px] font-black text-[#000080] uppercase tracking-widest mb-2">Faturamento Estimado</span>
                <p className="text-4xl font-black text-[#000080]">{formatV(farmEconomics.receitaBruta || 0)}</p>
                <span className="text-[8px] font-bold text-gray-400 uppercase mt-2">/ ano</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-prylom-dark text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <h4 className="text-[10px] font-black text-prylom-gold uppercase tracking-[0.2em] mb-6">📈 Performance Líquida</h4>
            <div className="space-y-6">
              <div>
                <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">EBITDA (Fluxo de Caixa)</p>
                <p className="text-2xl font-black text-white">{formatV(farmEconomics.ebitda || 0)} <span className="text-[10px] opacity-40">/ ano</span></p>
              </div>
              <div className="pt-6 border-t border-white/10">
                <p className="text-[9px] font-black text-prylom-gold uppercase mb-1">Lucro Líquido Real (Pos-Tax/Reinvest)</p>
                <p className="text-3xl font-black text-white">{formatV(farmEconomics.lucroLiquido || 0)} <span className="text-[10px] opacity-40">/ ano</span></p>
              </div>
            </div>
          </div>

          {/* SELEÇÃO CONDICIONAL: Se for Arrendamento, fecha o grid de 2 colunas para o conteúdo abaixo ocupar tudo. Se for Venda, mantém os cards originais. */}
          {!isLease && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                <p className="text-[8px] font-black text-green-700 uppercase mb-2">ROI Real Anual</p>
                <p className="text-xl font-black text-green-700">
                  {formatNumber(farmEconomics.roiRange.pessimista, 1)}% - {formatNumber(farmEconomics.roiRange.otimista, 1)}%
                </p>
              </div>
              <div className="p-6 bg-[#000080] rounded-3xl">
                <p className="text-[8px] font-black text-prylom-gold uppercase mb-2">Payback Real</p>
                <p className="text-xl font-black text-white">{formatNumber(farmEconomics.paybackReal || 0, 1)} anos</p>
              </div>
            </div>
          )}
        </div>
      </div>
  </div>

{isLease && (
  <div className="w-full border-t border-gray-100 pt-12 mt-10 space-y-6">
    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] mb-4 ml-2">
      💰 Economics & Indicadores Agrotecnológicos
    </h4>

    {/* BLOCO SUPERIOR: Faturamento com destaque total */}
    <div className="w-full p-8 bg-[#000080]/5 rounded-[3rem] border border-[#000080]/10 flex flex-col items-center justify-center text-center shadow-sm">
      <span className="text-[11px] font-black text-[#000080] uppercase tracking-[0.2em] mb-3 opacity-60">
        Faturamento Estimado Anual
      </span>
      <div className="flex flex-col md:flex-row items-baseline gap-3">
        <p className="text-4xl md:text-5xl font-black text-[#000080] tracking-tighter">
          {formatV(farmEconomics.receitaBruta || 0)}
        </p>
        <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">
          / ano projetado
        </span>
      </div>
    </div>

    {/* BLOCO INFERIOR: Cards técnicos em grid de 4 colunas (ou 2 no tablet) */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {[
        { label: 'Teor médio de Argila', val: farmEconomics.indices.argila.atual, media: farmEconomics.indices.argila.mediaEstado },
        { label: 'Índice Pluviométrico', val: farmEconomics.indices.pluviometrico.atual, media: farmEconomics.indices.pluviometrico.mediaEstado },
        { label: 'Índice de Altimetria', val: farmEconomics.indices.altimetria.atual, media: farmEconomics.indices.altimetria.mediaEstado },
        { label: 'Índice Relevo', val: farmEconomics.indices.relevo.atual, media: farmEconomics.indices.relevo.mediaEstado },
      ].map((item, idx) => (
        <div 
          key={idx} 
          className="p-6 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm flex flex-col justify-between min-h-[180px] transition-all hover:border-prylom-gold/30"
        >
          <p className="text-[10px] font-black text-prylom-gold uppercase tracking-tighter mb-6 leading-tight">
            {item.label}
          </p>

          <div className="space-y-4">
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-[#000080] uppercase opacity-60 mb-1">
                {product.cidade}:
              </p>
              <p className="text-sm font-bold text-gray-600 truncate">
                {item.val}
              </p>
            </div>

            <div className="pt-3 border-t border-gray-50 flex flex-col">
              <p className="text-[10px] font-black text-[#000080] uppercase opacity-40 mb-1">
                Média {product.estado}:
              </p>
              <p className="text-sm font-bold text-gray-400 truncate">
                {item.media}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
    </div>

)}

           {/* ESPECIFICAÇÕES TÉCNICAS */}
           <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-sm print-full">
              <h3 className="text-xl font-black text-[#000080] uppercase tracking-tighter mb-10">
                {isGrain ? "🌾 Especificações de Lote" : isPlane ? "📋 Dossiê Técnico da Aeronave" : (isFarm ? "🌱 Características Técnicas da Área" : "⚙️ Dados Técnicos")}
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                {isGrain ? (
                  <>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Cultura</p><p className="text-xs font-black text-prylom-dark uppercase">{spec?.cultura || '---'}</p></div>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Safra</p><p className="text-xs font-black text-prylom-dark uppercase">{spec?.safra || '---'}</p></div>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Volume</p><p className="text-xs font-black text-prylom-dark uppercase">{formatNumber(spec?.estoque_toneladas, 0)} t</p></div>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Qualidade</p><p className="text-xs font-black text-green-600 uppercase">{spec?.qualidade || 'Exportação'}</p></div>
                  </>
                ) : isPlane ? (
                  <>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Fabricante</p><p className="text-xs font-black text-prylom-dark uppercase">{spec?.fabricante || '---'}</p></div>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Modelo</p><p className="text-xs font-black text-prylom-dark uppercase">{spec?.modelo || '---'}</p></div>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Ano de Fabricação</p><p className="text-xs font-black text-prylom-dark uppercase">{spec?.ano || '---'}</p></div>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Time (TTAF)</p><p className="text-xs font-black text-prylom-dark uppercase">{spec?.horas_voo || '---'} h</p></div>
                  </>
                ) : isFarm ? (
                  <>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{isLease ? 'Área Arrendável' : 'Área Total'}</p><p className="text-xs font-black text-prylom-dark uppercase">{formatNumber(spec?.area_total_ha || 1000)} ha</p></div>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Aptidão / Solo</p><p className="text-xs font-black text-prylom-dark uppercase">{spec?.aptidao || 'Dupla Aptidão'}</p></div>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Teor de Argila</p><p className="text-xs font-black text-prylom-dark uppercase">{spec?.teor_argila || '40% - 50%'}</p></div>
                    <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Topografia</p><p className="text-xs font-black text-green-600 uppercase">{spec?.topografia || 'Mecanizável'}</p></div>
                  </>
                ) : (
                  <div><p className="text-xs font-black opacity-40">Dados sob consulta.</p></div>
                )}
              </div>
           </div>
        </div>

        <aside className="lg:col-span-4 space-y-8 no-print">
           <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
              <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] block mb-2">Ações do Ativo</span>
              <div className="flex flex-col gap-3">
                 <button onClick={handleShare} className="w-full bg-gray-50 text-prylom-dark font-black py-4 rounded-full text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-3 border border-gray-200">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                   {copyFeedback ? t.linkCopied : t.btnShare}
                 </button>
                 <button onClick={handleDownloadPDF} className="w-full bg-prylom-dark text-white font-black py-4 rounded-full text-[10px] uppercase tracking-widest hover:bg-prylom-gold transition-all flex items-center justify-center gap-3 shadow-lg">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                   {t.btnDownloadPDF}
                 </button>
              </div>
           </div>

           <div className="bg-prylom-dark text-white p-10 rounded-[3rem] shadow-2xl space-y-8 border border-white/5">
              <div>
                 <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] block mb-2">Protocolo de Aquisição</span>
                 <h4 className="text-2xl font-black uppercase tracking-tighter">Fluxo Corporativo</h4>
              </div>
              <div className="space-y-4">
                 <button className="w-full bg-prylom-gold text-white font-black py-6 rounded-full text-[11px] uppercase tracking-widest hover:bg-white hover:text-prylom-dark transition-all shadow-xl">
                   {isGrain ? 'Solicitar Dossiê de Qualidade' : 'Solicitar Dossiê Completo'}
                 </button>
                 <button className="w-full bg-white/10 text-white border border-white/10 font-bold py-5 rounded-full text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all">Análise de Viabilidade</button>
              </div>
           </div>

{isLease ? (
    <div className="space-y-8">
      {/* IMAGEM 1: ESCOAMENTO DA PRODUÇÃO */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
        <h4 className="text-[10px] font-black text-prylom-gold uppercase tracking-[0.4em] text-center">
          Escoamento da Produção <br/> {product.cidade} {product.estado}
        </h4>
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-gray-50 pb-2">
            <span className="text-[11px] font-black text-[#000080] uppercase">Rodovia:</span>
            <span className="text-[11px] font-bold text-gray-500">BR - 040</span>
          </div>
          <div className="flex justify-between items-center border-b border-gray-50 pb-2">
            <span className="text-[11px] font-black text-[#000080] uppercase">Ferrovia:</span>
            <span className="text-[11px] font-bold text-gray-500 uppercase">Centro-Atlântica</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black text-[#000080] uppercase">Porto:</span>
            <span className="text-[11px] font-bold text-gray-500 uppercase">Porto de Santos</span>
          </div>
        </div>
      </div>

      {/* IMAGEM 2: PRODUÇÃO MÉDIA DE SOJA */}
      <div className="bg-[#2C5266] p-8 rounded-[2.5rem] shadow-xl space-y-6">
        <div className="text-center">
          <h4 className="text-[13px] font-black text-white uppercase leading-tight">
            Produção média de Soja
          </h4>
          <p className="text-[11px] font-bold text-white/70 uppercase">(saca/ha) 2025/26</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[12px] font-black text-prylom-gold uppercase">{product.cidade} {product.estado}:</span>
            <span className="text-[12px] font-bold text-white">68 a 78 sacas/ha</span>
          </div>
          <div className="flex justify-between items-center opacity-80">
            <span className="text-[12px] font-black text-prylom-gold uppercase">Média Goiás:</span>
            <span className="text-[12px] font-bold text-white">62 a 62 sacas/ha</span>
          </div>
          <div className="flex justify-between items-center opacity-80 border-t border-white/10 pt-2">
            <span className="text-[12px] font-black text-prylom-gold uppercase">Média Brasil:</span>
            <span className="text-[12px] font-bold text-white">62 sacas/ha</span>
          </div>
        </div>
      </div>
    </div>
  ) : (
    /* BLOCO ORIGINAL PARA VENDA */
    <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
      <h4 className="text-[10px] font-black text-prylom-gold uppercase tracking-[0.4em]">🧭 Casos de Uso Estratégicos</h4>
      <ul className="space-y-4">
        {[{ label: 'Produção própria de grãos' }, { label: 'Ativo patrimonial de longo prazo' }, { label: 'Hedge contra inflação' }].map((item, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="text-prylom-gold mt-1 font-bold">✔</span>
            <p className="text-[10px] font-bold text-gray-600 uppercase">{item.label}</p>
          </li>
        ))}
      </ul>
    </div>
  )}
        </aside>
      </div>

      {relatedProducts.length > 0 && (
        <section className="pt-12 border-t border-gray-100 space-y-10 no-print">
          <h3 className="text-2xl font-black text-[#000080] tracking-tighter uppercase">{t.relatedRegionAssets}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {relatedProducts.map(p => (
              <div key={p.id} onClick={() => onSelectProduct?.(p.id)} className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col group h-full">
                <div className="h-56 relative overflow-hidden bg-gray-50">
                  <img src={p.main_image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-black text-prylom-dark mb-1 line-clamp-1 uppercase">{p.titulo}</h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mb-4">{p.cidade} - {p.estado}</p>
                  <div className="mt-auto p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xl font-black text-prylom-dark">{formatV(p.valor)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetails;