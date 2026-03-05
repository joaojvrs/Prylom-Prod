import React, { useState, useEffect, useMemo } from 'react';
import { AppLanguage, AppCurrency } from '../types';
import { supabase } from '../supabaseClient';
import { GoogleGenAI } from "@google/genai";
import { createPortal } from 'react-dom';
import DataRoomModal from './DataRoomModal'; // Certifique-se de que o caminho está correto
import PropertyRegistrationForm from './PropertyRegistrationForm';


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
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  // Adicione junto aos outros estados no topo do componente ProductDetails
const [showDataRoomView, setShowDataRoomView] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  // Adicione este novo estado
const [selectedFormType, setSelectedFormType] = useState<'open' | 'offmarket' | 'selected' | null>(null);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [economicsMode, setEconomicsMode] = useState<'agricola' | 'pecuaria'>('agricola');
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
   useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isLightboxOpen) return;
    if (e.key === 'Escape') setIsLightboxOpen(false);
    if (e.key === 'ArrowRight') handleNextImage();
    if (e.key === 'ArrowLeft') handlePrevImage();
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isLightboxOpen, activeImage, images]); // Adicionado activeImage e images aqui

const [showFraudModal, setShowFraudModal] = useState(false);

  const formatNumber = (val: number, decimals = 2) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(val);
  };

const formatV = (val: number, isCurrency = true, decimals = 0) => {
  if (val === undefined || val === null || isNaN(val)) return '---';
  const converted = val * rates[currency];
  const symbol = getSymbol();
  // Aqui o formatNumber receberá 0 por padrão, removendo os centavos
  const formatted = formatNumber(converted, decimals); 
  
  return isCurrency 
    ? <span className="flex items-baseline gap-1">
        <span className="text-[0.6em] font-black opacity-60">{symbol}</span>
        <span>{formatted}</span>
      </span>
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


// Trava o scroll da tela de fundo quando o formulário abre
useEffect(() => {
  if (selectedFormType) {
    // Salva a posição atual do scroll e trava o body
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflowY = 'hidden';
  } else {
    // Quando fechar, remove as travas e volta para a posição onde estava
    const scrollY = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflowY = '';
    window.scrollTo(0, parseInt(scrollY || '0') * -1);
  }

  // Cleanup para garantir que não trave o site se o componente for desmontado
  return () => {
    document.body.style.position = '';
    document.body.style.overflowY = '';
  };
}, [selectedFormType]);

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

  const [cityAverageHa, setCityAverageHa] = useState<number | null>(null);
  const [stateAverageHa, setStateAverageHa] = useState<number | null>(null);
const fetchRegionalAverages = async (cidade: string, estado: string, categoria: string) => {
  try {
    // 1. Busca todos os ativos do MESMO ESTADO
    const { data, error } = await supabase
      .from('produtos')
      .select(`valor, cidade, fazendas (area_total_ha)`)
      .eq('estado', estado)
      .eq('categoria', categoria)
      .eq('status', 'ativo');

    if (data && data.length > 0) {
      const validAssets = data.filter((item: any) => item.valor && item.fazendas?.area_total_ha);
      
      // Cálculo Média Estadual
      const totalStateHa = validAssets.reduce((acc, item: any) => acc + (item.valor / item.fazendas.area_total_ha), 0);
      setStateAverageHa(totalStateHa / validAssets.length);

      // Cálculo Média Municipal (filtrando o array que já temos em memória)
      const cityAssets = validAssets.filter((item: any) => item.cidade === cidade);
      if (cityAssets.length > 0) {
        const totalCityHa = cityAssets.reduce((acc, item: any) => acc + (item.valor / item.fazendas.area_total_ha), 0);
        setCityAverageHa(totalCityHa / cityAssets.length);
      }
    }
  } catch (err) {
    console.error("Erro ao calcular médias regionais:", err);
  }
};
const [showDataRoomModal, setShowDataRoomModal] = useState(false);

const [showFraudForm, setShowFraudForm] = useState(false);
const [fraudData, setFraudData] = 
useState
({ nome: '', 
documento: '', 
email: '', 
telefone: '', 
relacao: '', 
motivo: '', 
aceite: false });

const farmEconomics = useMemo(() => {
  if (!product || product.categoria !== 'fazendas') return null;
  
  const isLease = product.tipo_transacao === 'arrendamento';
  const areaTotal = spec?.area_total_ha || 1000;
  const fatorAproveitamento = 0.68;
  const areaUtil = spec?.area_lavoura_ha || (areaTotal * fatorAproveitamento);
  const prodSoja = 59.8; 
  const prodMilho = 87.4;

// VARIÁVEIS PECUÁRIAS (Ajustadas para os novos campos)
  const lotacaoUA = 2.5; // UA/ha
  const producaoArrobaHaAno = 12.5;
  const diasAno = 365;
  const valorArrobaBoi = 315.00;

  // 1. DADOS DE ÍNDICES (SEMPRE RETORNADOS)
  const indicesData = {
    argila: { atual: spec?.teor_argila || '---', mediaEstado: spec?.media_argila_estado || '30%' },
    pluviometrico: { atual: spec?.precipitacao_mm ? `${spec.precipitacao_mm}mm` : '---', mediaEstado: spec?.media_pluvio_estado || '1.600mm' },
    altimetria: { atual: spec?.altitude_m ? `${spec.altitude_m}m` : '---', mediaEstado: spec?.media_altitude_estado || '400m' },
    relevo: { atual: spec?.topografia || '---', mediaEstado: spec?.media_relevo_estado || 'Plano/Ondulado' }
  };

  // 2. SE FOR ARRENDAMENTO (LEASE)
  if (isLease) {
    const valorArrendamentoHa = product.valor || 1800;
    const custoTotalAnual = areaUtil * valorArrendamentoHa;
    
    let receitaEstimada, ebitdaEstimado;

    if (economicsMode === 'agricola') {
      receitaEstimada = (areaUtil * prodSoja * 135) + (areaUtil * prodMilho * 72);
      ebitdaEstimado = receitaEstimada - custoTotalAnual - (areaUtil * 8000);
    }else {
receitaEstimada = (areaUtil * producaoArrobaHaAno) * valorArrobaBoi;
      ebitdaEstimado = receitaEstimada - custoTotalAnual - (receitaEstimada * 0.35);
    }

return { 
      isLease: true, mode: economicsMode, areaAgri: areaUtil, receitaBruta: receitaEstimada, ebitda: ebitdaEstimado,
      lucroLiquido: ebitdaEstimado * 0.85, roiRange: { pessimista: 12, base: 18, otimista: 25 },
      prodSoja, prodMilho, producaoCarne: producaoArrobaHaAno,
      lotacao: lotacaoUA, indices: indicesData
    };
  } 
  
  // 3. SE FOR VENDA (PROPRIEDADE)
  else {
    const valorAtivo = product.valor || 1;
    let receitaBruta, ebitda, lucroLiquido;

    if (economicsMode === 'agricola') {
      const custoTotalOp = (areaUtil * 5800) + (areaUtil * 4400); 
      receitaBruta = (areaUtil * prodSoja * 135) + (areaUtil * prodMilho * 72);
      ebitda = receitaBruta - custoTotalOp;
      lucroLiquido = ebitda - (receitaBruta * 0.07) - (ebitda * 0.10);
    } else {
receitaBruta = (areaUtil * producaoArrobaHaAno) * valorArrobaBoi;
      ebitda = receitaBruta * 0.42; 
      lucroLiquido = ebitda * 0.88;
    }

    const roiReal = (lucroLiquido / valorAtivo) * 100;

    return { 
      isLease: false,
      mode: economicsMode,
      areaAgri: areaUtil, 
      receitaBruta, 
      ebitda,
      lucroLiquido, 
      roiReal,
      roiRange: { pessimista: roiReal * 0.9, base: roiReal, otimista: roiReal * 1.15 },
      paybackReal: valorAtivo / (lucroLiquido || 1), 
      precoHa: valorAtivo / (areaTotal || 1),
      prodSoja, prodMilho,
producaoCarne: producaoArrobaHaAno,
      lotacao: lotacaoUA,
      indices: indicesData
    };
  }
}, [product, spec, rates, currency, economicsMode]);

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
      const { data: specData } = await supabase.from(baseData.categoria).select('*, corretor:corretores(creci, nome)').eq('produto_id', productId).maybeSingle();
      const { data: imgData } = await supabase.from('produtos_imagens').select('*').eq('produto_id', productId).order('ordem', { ascending: true });
      const { data: audioData } = await supabase.from('produtos_audios').select('*').eq('produto_id', productId);
      setProduct(baseData);
      setSpec(specData);
      if (baseData.categoria === 'fazendas') {
        fetchRegionalAverages(baseData.cidade, baseData.estado, baseData.categoria);
}
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
        fazendas (*),
        maquinas (*),
        avioes (*),
        graos (*),
        arrendamentos (*),
        produtos_imagens (image_url, ordem)
      `)
      .eq('estado', currentProd.estado)
      .neq('id', currentProd.id)
      .limit(3);

    if (data) {
      const formatted = data.map((item: any) => {
        // Padronização de "Flattening" (Achatamento) para todas as categorias
        const faz = Array.isArray(item.fazendas) ? item.fazendas[0] : item.fazendas;
        const maq = Array.isArray(item.maquinas) ? item.maquinas[0] : item.maquinas;
        const avi = Array.isArray(item.avioes) ? item.avioes[0] : item.avioes;
        const gra = Array.isArray(item.graos) ? item.graos[0] : item.graos;
        const arr = Array.isArray(item.arrendamentos) ? item.arrendamentos[0] : item.arrendamentos;

        return {
          ...item,
          fazenda_data: faz,
          maquina_data: maq,
          aviao_data: avi,
          grao_data: gra,
          arrendamento_info: arr,
          // Busca imagem de capa (ordem 1) ou a primeira disponível
          main_image: item.produtos_imagens?.find((img: any) => img.ordem === 1)?.image_url || 
                      item.produtos_imagens?.[0]?.image_url
        };
      });

      setRelatedProducts(formatted);
    }
  } catch (e) {
    console.error("Erro ao buscar relacionados multissetoriais:", e);
  }
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

  const formatDescription = (text: string) => {
  if (!text) return "";
  
  // Substitui conteúdo entre **texto** por <strong>texto</strong>
  const boldFormatted = text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black text-[#000080]">{part.slice(2, -2)}</strong>;
    }
    return part;
  });

  return boldFormatted;
};



  return (
<>


<div className="prylom-pdf-footer-fixed">
        <p>
          Documento gerado eletronicamente em {new Date().toLocaleDateString('pt-BR')} — Ativo Cód: {product?.codigo || '---'}.
          <br/>

        </p>
        Sujeito aos Termos de Uso Prylom. Dados declaratórios não auditados.
    </div>
    
<div className="print-main-container max-w-7xl mx-auto px-4 py-12 animate-fadeIn pb-40 space-y-12 print:p-0 print:space-y-4 print:m-0">
      



<style
  dangerouslySetInnerHTML={{
    __html: `
      /* Esconde os elementos de PDF na visualização do navegador */
      .prylom-pdf-footer-fixed, .pdf-watermark-container {
        display: none;
      }

      @media print {
        @page {
          margin: 1.5cm 1cm 2.5cm 1cm;
        }

        /* Configuração da Marca d'Água */
        .pdf-watermark-container {
          display: flex !important;
          position: fixed !important;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          align-items: center;
          justify-content: center;
          z-index: -1; /* Fica atrás do conteúdo */
          pointer-events: none;
          opacity: 0.08; /* Ajuste aqui a intensidade da marca d'água */
        }

        .pdf-watermark-container img {
          width: 600px; /* Tamanho da logo no fundo */
          transform: rotate(-35deg); /* Inclinação elegante */
        }

        /* Rodapé Fixo */
        .prylom-pdf-footer-fixed {
          display: block !important;
          position: fixed !important;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          text-align: center;
          font-size: 10pt;
          color: #999;
          border-top: 1px solid #eee;
          background: white !important;
          padding-top: 10px;
          line-height: 1.4;
          z-index: 9999;
        }

        /* Reset de Containers */
        html, body {
          height: auto !important;
          overflow: visible !important;
          display: block !important;
          background: white !important;
        }

        .print-main-container {
          display: block !important; 
          overflow: visible !important;
          position: relative !important;
          z-index: 1; /* Garante que o texto fique acima da marca d'água */
        }

        .no-print, button { display: none !important; }
        
        section { 
          page-break-inside: avoid !important; 
          break-inside: avoid !important;
        }
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

{/* SELO DINÂMICO COM QUATRO ESTADOS DE RELEVÂNCIA */}
{spec?.relevancia_anuncio && (
  <span 
    className={`text-[8px] font-black px-3 py-1.5 rounded-md uppercase tracking-widest shadow-sm animate-fadeIn border transition-all ${
      spec.relevancia_anuncio === 'Prylom Selected'
        ? 'bg-[#000033] text-prylom-gold border-prylom-gold shadow-[0_0_10px_rgba(197,163,118,0.3)]' 
        : spec.relevancia_anuncio === 'Prylom Verified'
          ? 'bg-[#000080] text-white border-blue-400/30' // Azul com borda de destaque
          : spec.relevancia_anuncio === 'Open Market'
            ? 'bg-gray-100 text-gray-400 border-gray-200 shadow-none' // Cinza
            : 'bg-[#000080] text-white border-transparent' // Padrão
    }`}
  >
    {spec.relevancia_anuncio === 'Prylom Selected' && <span className="mr-1">✦</span>}
    {spec.relevancia_anuncio === 'Prylom Verified' && <span className="mr-1">✓</span>}
    {spec.relevancia_anuncio}
  </span>
)}
{/* EXIBIÇÃO DO CRECI VINDO DA TABELA ESPECÍFICA */}
{spec?.corretor?.creci && (
  <span className="text-[8px] font-black px-3 py-1.5 rounded-md uppercase tracking-widest bg-gray-100 text-gray-500 border border-gray-200 shadow-sm flex items-center gap-1.5">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
    Supervisão Técnica: CRECI: {spec.corretor.creci}
  </span>
)}
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
  {product.status === 'vendido' && (
      <div className="mb-4 bg-red-50/50 border-l-2 border-red-500 p-3 rounded-r-xl">
        <p className="text-[9px] font-bold text-red-700 uppercase tracking-tight leading-tight">
          Registro Histórico. <span className="font-medium opacity-80">Mantido na plataforma exclusivamente para fins estatísticos e inteligência de mercado. Não representa oferta vigente.</span>
        </p>
      </div>
    )}
  <div className="flex items-start gap-8 w-full">
    
    {/* Coluna 1: Status / Modalidade / Volume */}
    <div className="flex flex-col min-w-0">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
        {isGrain ? 'Volume Total' : isPlane ? 'Liquidez de Mercado' : isLease ? '🏷️ Modalidade' : 'Status & Selo'}
      </p>
<div className="flex items-center gap-2">
  {/* A bolinha pisca verde se disponível; fica vermelha fixa se vendido */}
  <div 
    className={`w-2 h-2 rounded-full flex-shrink-0 ${
      product.status === 'vendido' 
        ? 'bg-red-600' 
        : 'bg-green-500 animate-pulse'
    }`}
  ></div>
  
  <span 
    className={`text-sm font-black uppercase tracking-tighter truncate ${
      product.status === 'vendido' 
        ? 'text-red-600' 
        : 'text-[#000080]'
    }`}
  >
    {product.status === 'vendido' 
      ? 'Indisponível' 
      : isGrain
        ? `${formatNumber(spec?.estoque_toneladas || 0, 0)} t`
        : isPlane
          ? `${planeEcoData?.liquidez} (TMV: ${planeEcoData?.tmv} dias)`
          : isLease
            ? 'Arrendamento'
            : t.statusAvailable
    }
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
          { label: isGrain ? 'Tendência (30d)' : (isPlane ? 'Hours vs Média' : 'Aptidão Mecanizavel'), val: isGrain ? <span className="text-green-600">📈 Alta moderada ({grainMarketData?.trend})</span> : isPlane ? '✔ Abaixo da Média (Low Time)' : (isFarm ? '✔ Produção de grãos mecanizada' : t.highPerformance) },
          { label: isGrain ? 'Liquidez do Ativo' : (isPlane ? 'Selo de Robustez' : (isLease ? 'Liquidez Operacional' : 'Liquidez Patrimonial')), val: isGrain ? grainMarketData?.liquidez : isPlane ? 'Agro Ready: Pista não pavimentada' : (isFarm ? '✔ Alta consolidação regional' : 'Auditada') },
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
{/* GALERIA PRINCIPAL "PREMIUM" - AGORA 100% LIMPA */}
<div className="relative group">
<div 
  className="aspect-video bg-gray-100 rounded-[3.5rem] overflow-hidden border border-gray-200 shadow-xl relative group cursor-pointer"
  onClick={() => setIsLightboxOpen(true)}
>
  <img 
    key={activeImage} 
    src={activeImage ? getFullImage(activeImage) : ''}      
    loading="eager"
    decoding="async"
    className="w-full h-full object-cover transition-opacity duration-500 opacity-0" 
    onLoad={(e) => (e.currentTarget.classList.remove('opacity-0'))}
  />
      
    {/* Navegação flutuante (Apenas setas mantidas para funcionalidade) */}
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

    {/* Contador numérico sutil mantido no canto inferior */}
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
    <div className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8 print-full">
      
      {/* HEADER REESTRUTURADO */}
      <header className="flex flex-col gap-6 border-b border-gray-50 pb-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* LADO ESQUERDO: TÍTULO E BADGE DE PROJEÇÃO */}
          <div className="flex items-center gap-4">
            <h3 className="text-2xl md:text-3xl font-black text-[#000080] uppercase tracking-tighter flex items-center gap-3">
              <span className="text-2xl">💰</span> Economics do Ativo
            </h3>
            <span className="hidden md:inline-block bg-prylom-gold/10 text-prylom-gold text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em]">
              Projeção Estimada
            </span>
          </div>

          {/* LADO DIREITO: SELO E SWITCHER (Ações/Status) */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            
            {/* SELO DINÂMICO */}
            {spec?.relevancia_anuncio && (
              <span 
                className={`text-[9px] font-bold px-4 py-2 rounded-full uppercase tracking-wider border transition-all shrink-0 ${
                  spec.relevancia_anuncio === 'Prylom Selected'
                    ? 'bg-[#000033] text-prylom-gold border-prylom-gold shadow-lg shadow-gold/20' 
                    : spec.relevancia_anuncio === 'Prylom Verified'
                      ? 'bg-[#000080] text-white border-blue-400/30'
                      : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                {spec.relevancia_anuncio === 'Prylom Selected' && <span className="mr-1.5">✦</span>}
                {spec.relevancia_anuncio === 'Prylom Verified' && <span className="mr-1.5">✓</span>}
                {spec.relevancia_anuncio}
              </span>
            )}

            {/* SWITCHER DE MODALIDADE (Estilo Pílula) */}
            <div className="flex bg-gray-100 p-1 rounded-full no-print ml-auto">
              <button 
                type="button"
                onClick={() => setEconomicsMode('agricola')}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  economicsMode === 'agricola' 
                  ? 'bg-white text-[#000080] shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Agrícola
              </button>
              <button 
                type="button"
                onClick={() => setEconomicsMode('pecuaria')}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  economicsMode === 'pecuaria' 
                  ? 'bg-white text-[#000080] shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Pecuária
              </button>
            </div>
          </div>
        </div>

        {/* VISÍVEL APENAS NO MOBILE: BADGE DE PROJEÇÃO */}
        <div className="md:hidden">
            <span className="bg-prylom-gold/10 text-prylom-gold text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Projeção Estimada
            </span>
        </div>
      </header>
      {/* AVISO METODOLÓGICO PARA OPEN MARKETING */}
{spec?.relevancia_anuncio === 'Open Market' && (
  <div className="mt-6 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
    <p className="text-[9px] font-bold text-gray-400 uppercase leading-relaxed tracking-wider text-justify italic">
      <span className="text-[#000080] not-italic">Nota de Compliance:</span> Para ativos Open Market, este filtro baseia-se exclusivamente em dados declaratórios do anunciante, sem validação da plataforma.
    </p>
  </div>
)}


<div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
              {economicsMode === 'agricola' ? '📊 Produtividade Potencial Média' : '🐂 Performance Pecuária Média'}
            </h4>
            
{/* BLOCO DE PERFORMANCE - DINÂMICO ENTRE AGRÍCOLA E PECUÁRIA */}
<div className="space-y-4">
  {economicsMode === 'agricola' ? (
    <>
      <div className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-fadeIn">
        <span className="text-sm font-bold text-prylom-dark uppercase tracking-tighter">Produtividade Soja</span>
        <div className="text-right">
          <span className="text-2xl font-black text-[#000080]">{formatNumber(farmEconomics.prodSoja, 1)} sc/ha</span>
          <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Média Histórica Local</p>
        </div>
      </div>
      <div className="flex justify-between items-center p-6 bg-gray-50 rounded-2xl border border-gray-100 animate-fadeIn">
        <span className="text-sm font-bold text-prylom-dark uppercase tracking-tighter">Produtividade Milho</span>
        <div className="text-right">
          <span className="text-2xl font-black text-[#000080]">{formatNumber(farmEconomics.prodMilho, 1)} sc/ha</span>
          <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest">Segunda Safra Estimada</p>
        </div>
      </div>
      {/* Abaixo dos cards de soja/milho, ainda na coluna da esquerda */}
<div className="mt-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between">
  <p className="text-[7px] font-black text-gray-400 uppercase leading-none max-w-[80px]">
    Faturamento Estimado Anual
  </p>
  <div className="flex items-baseline gap-1">
    <p className="text-lg font-black text-[#000080]">
      {formatV(farmEconomics.receitaBruta || 0)}
    </p>
    <span className="text-[8px] font-bold text-gray-400 uppercase">/ ano projetado</span>
  </div>
</div>
    </>
  ) : (
<div className="space-y-3">
    {/* CARD: PRODUÇÃO DE CARNE */}
    <div className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100 animate-fadeIn">
      <div className="flex flex-col">

        <span className="text-sm font-bold text-prylom-dark uppercase tracking-tighter">Produção de Carne</span>
      </div>
      <div className="text-right flex flex-col items-end">
        <div className="flex items-baseline gap-1">
          {/* Tamanho reduzido para 1.25rem (text-xl) para melhor encaixe */}
          <span className="text-xl font-black text-[#000080] tabular-nums">
            {formatNumber(farmEconomics.producaoCarne, 1)}
          </span>
          <span className="text-[10px] font-bold text-[#000080]/60 uppercase">@/ha ano</span>
        </div>
        <p className="text-[7px] text-prylom-gold font-bold uppercase tracking-widest mt-0.5">Produtividade Estimada</p>
      </div>
    </div>

    {/* CARD: CAPACIDADE SUPORTE */}
    <div className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100 animate-fadeIn">
      <div className="flex flex-col">

        <span className="text-sm font-bold text-prylom-dark uppercase tracking-tighter">Capacidade</span>
      </div>
      <div className="text-right flex flex-col items-end">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-[#000080] tabular-nums">
            {formatNumber(farmEconomics.lotacao, 1)}
          </span>
          <span className="text-[10px] font-bold text-[#000080]/60 uppercase">UA/ha</span>
        </div>
        <p className="text-[7px] text-prylom-gold font-bold uppercase tracking-widest mt-0.5">Lotação Estimada</p>
      </div>
    </div>
    <div className="mt-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between">
  <p className="text-[7px] font-black text-gray-400 uppercase leading-none max-w-[80px]">
    Faturamento Estimado Anual
  </p>
  <div className="flex items-baseline gap-1">
    <p className="text-lg font-black text-[#000080]">
      {formatV(farmEconomics.receitaBruta || 0)}
    </p>
    <span className="text-[8px] font-bold text-gray-400 uppercase">/ ano projetado</span>
  </div>
</div>
  </div>

  
  )}
</div>
          </div>


        </div>

        <div className="space-y-8">
<div className="bg-prylom-dark text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
  <h4 className="text-[10px] font-black text-prylom-gold uppercase tracking-[0.2em] mb-6 flex items-center gap-1">
    <span>📈</span>
    <span className="text-green-500 text-[12px]">*</span>
    <span>Performance Líquida</span>
  </h4>
  <div className="space-y-6">
    <div>
      <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">EBITDA Projetado</p>
      {/* formatV sem o segundo parâmetro agora usará 0 casas decimais */}
      <p className="text-2xl font-black text-white">{formatV(farmEconomics.ebitda || 0)} <span className="text-[10px] opacity-40">/ ano</span></p>
    </div>
<div className="pt-6 border-t border-white/10">
  <p className="text-[9px] font-black text-prylom-gold uppercase mb-1 flex items-center gap-1">
    <span className="text-green-500 text-[12px]">*</span>
    <span>Lucro Líquido Projetado (Pos-Tax/Reinvest)</span>
  </p>
  <p className="text-3xl font-black text-white">
    {formatV(farmEconomics.lucroLiquido || 0)} 
    <span className="text-[10px] opacity-40">/ ano</span>
  </p>
</div>
  </div>
</div>

          {/* SELEÇÃO CONDICIONAL: Se for Arrendamento, fecha o grid de 2 colunas para o conteúdo abaixo ocupar tudo. Se for Venda, mantém os cards originais. */}
          {!isLease && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                <p className="text-[8px] font-black text-green-700 uppercase mb-2">Cap Rate Estimado</p>
                <p className="text-xl font-black text-green-700">
                  {formatNumber(farmEconomics.roiRange.pessimista, 1)}% - {formatNumber(farmEconomics.roiRange.otimista, 1)}%
                </p>
              </div>
              <div className="p-6 bg-[#000080] rounded-3xl">
                <p className="text-[8px] font-black text-prylom-gold uppercase mb-2">Payback Estimado</p>
                <p className="text-xl font-black text-white">{formatNumber(farmEconomics.paybackReal || 0, 1)} anos</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {isFarm && (
        <p className="mt-4 px-8 text-[9px] text-gray-400 italic leading-relaxed opacity-80 flex items-start gap-1">
          <span className="text-green-500 text-[12px] font-black not-italic">*</span>
          <span>
            As métricas agrotecnológicas e projeções financeiras apresentadas possuem caráter estritamente declaratório ou baseiam-se em médias históricas regionais, não constituindo garantia de produtividade ou rentabilidade futura.
          </span>
        </p>
      )}
  </div>

{isLease && (
  <div className="w-full border-t border-gray-100 pt-12 mt-10 space-y-6">
    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] mb-4 ml-2">
      💰 Economics & Indicadores Agrotecnológicos
    </h4>



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
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
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
<div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Area Total</p>
          <p className="text-sm font-black text-prylom-dark uppercase">{formatNumber(spec?.area_total_ha || 0, 2)} HEC</p>
        </div>
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Area Produtiva</p>
          <p className="text-sm font-black text-prylom-dark uppercase">{formatNumber(spec?.area_produtiva || 0, 2)} HEC</p>
        </div>
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Aptidão</p>
          <p className="text-sm font-black text-prylom-dark uppercase">{spec?.aptidao || '--'}</p>
        </div>
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Estimativa de Argila</p>
          <p className="text-sm font-black text-prylom-dark uppercase">{spec?.teor_argila || '---'}</p>
        </div>
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Topografia</p>
          <p className="text-sm font-black text-green-600 uppercase">{spec?.topografia || 'PLANA'}</p>
        </div>

        {/* LINHA 2 */}
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Pluviometrico</p>
          <p className="text-sm font-black text-prylom-dark uppercase">{spec?.precipitacao_mm || '--'}</p>
        </div>
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Altitude</p>
          <p className="text-sm font-black text-prylom-dark uppercase">{spec?.altitude_m || '--'}</p>
        </div>
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Asfalto/cidade</p>
          <p className="text-sm font-black text-prylom-dark uppercase">{spec?.km_asfalto ? `${spec.km_asfalto} km` : '--'}</p>
        </div>
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">area de Reserva</p>
          <p className="text-sm font-black text-prylom-dark uppercase">{spec?.reserva_legal || '--'}</p>
        </div>
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Estuda Permuta</p>
          <p className="text-sm font-black text-prylom-dark uppercase">{spec?.permuta || 'Não'}</p>
        </div>
      </>
                ) : (
                  <div><p className="text-xs font-black opacity-40">Dados sob consulta.</p></div>
                )}
              </div>
           </div>



        </div>


        <aside className="lg:col-span-4 space-y-8 no-print">
{/* Reduzi o padding de 10 para 6 e o space-y de 6 para 4 */}
<div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm space-y-4">
  <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] block mb-1">
    Ações do Ativo
  </span>
  
  {/* Reduzi o gap de 3 para 2 */}
  <div className="flex flex-col gap-2">
    {/* Troque py-4 por py-3 para diminuir a altura do botão */}
    <button onClick={handleShare} className="w-full bg-gray-50 text-prylom-dark font-black py-3 rounded-full text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-3 border border-gray-200">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
      {copyFeedback ? t.linkCopied : t.btnShare}
    </button>

    <button onClick={handleDownloadPDF} className="w-full bg-prylom-dark text-white font-black py-3 rounded-full text-[10px] uppercase tracking-widest hover:bg-prylom-gold transition-all flex items-center justify-center gap-3 shadow-lg">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {t.btnDownloadPDF}
    </button>
  </div>
</div>


<div className="bg-prylom-dark text-white p-8 rounded-[3rem] shadow-2xl space-y-8 border border-white/5">
  <div>
    <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] block mb-2">Protocolo de Negociação</span>
    <h4 className="text-2xl font-black uppercase tracking-tighter">Fluxo Corporativo</h4>
  </div>

  <div className="space-y-6">
    {/* CHECKBOX DE COMPLIANCE */}
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative flex items-center">
        <input 
          type="checkbox" 
          checked={hasAcceptedTerms}
          onChange={(e) => setHasAcceptedTerms(e.target.checked)}
          className="peer appearance-none w-5 h-5 border-2 border-white/20 rounded-md checked:bg-green-500 checked:border-green-500 transition-all cursor-pointer"
        />
        <svg className="absolute w-5 h-5 text-white p-1 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-white transition-colors leading-tight">
        SOU PRODUTOR RURAL / INVESTIDOR COM FINS EMPRESARIAIS E CONCORDO COM TERMOS, NDA E COMPLIANCE.
      </span>
    </label>

    <div className="space-y-4">
<button 
  disabled={!hasAcceptedTerms}
  onClick={() => setShowDataRoomView(true)} // Agora ativa a visualização de tela cheia
  className={`w-full font-black py-6 rounded-full text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
    hasAcceptedTerms 
      ? 'bg-green-600 text-white hover:bg-green-500 shadow-green-900/20' 
      : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
  }`}
>
  {isGrain ? 'Solicitar Dossiê de Qualidade' : 'Acessar Documentos'}
</button>

    </div>
  </div>
</div>


           {/* 1. GALERIA DE IMAGENS (Mantenha seu código de galeria aqui) */}

{isLease ? (
    <div className="space-y-8">
      {/* IMAGEM 1: ESCOAMENTO DA PRODUÇÃO */}


      {/* IMAGEM 2: PRODUÇÃO MÉDIA DE SOJA */}
      <div className="bg-[#2c5363] p-8 rounded-[2.5rem] shadow-xl space-y-6">
        <div className="text-center">
          <h4 className="text-[13px] font-black text-white uppercase leading-tight">
            Estimativa de Produtividade 
          </h4>
          <p className="text-[11px] font-bold text-white/70 uppercase">(SAFRA 2025/26)</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[12px] font-black text-prylom-gold uppercase">(Mun) {product.cidade} {product.estado}:</span>
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
    <div className="bg-white p-6 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
      <h4 className="text-[10px] font-black text-prylom-gold uppercase tracking-[0.4em]">🧭 Casos de Uso Estratégicos</h4>
      <ul className="space-y-4">
        {[{ label: 'Produção própria de grãos' }, { label: 'Ativo patrimonial de longo prazo' }, { label: 'Potencial de Proteçâo Patrimonial' }].map((item, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span className="text-prylom-gold mt-1 font-bold">✔</span>
            <p className="text-[10px] font-bold text-gray-600 uppercase">{item.label}</p>
          </li>
        ))}
      </ul>
    </div>
  )}

  {/* 2. INSERÇÃO DO COMPARATIVO DE VALUATION E DESCRIÇÃO */}
{isFarm && !isLease && (
  /* Reduzi mt-8 para mt-4 e space-y-8 para space-y-4 */
  <div className="mt-4 space-y-4 animate-fadeIn print:space-y-2">
    {/* Card: Reduzi p-8 para p-6 e arredondamento para 2rem */}
    <div className="bg-[#000080]/5 p-6 rounded-[2rem] border border-[#000080]/10 shadow-sm relative overflow-hidden">
      
      {/* Header: Reduzi mb-8 para mb-5 */}
      <div className="mb-5 flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h4 className="text-[8px] font-black text-prylom-gold uppercase tracking-[0.2em] mb-0.5">
            Inteligência de Mercado Prylom
          </h4>
          {/* Reduzi text-lg para text-base */}
          <p className="text-base font-black text-[#000080] uppercase tracking-tighter leading-tight">
            Comparativo de Mercado
          </p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-[#000080]/10 shrink-0">
           <p className="text-[7px] font-black text-gray-400 uppercase leading-none mb-1">Análise em</p>
           <p className="text-[8px] font-bold text-[#000080]">{new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Lista: Reduzi gap-6 para gap-4 */}
      <div className="flex flex-col gap-4 w-full">
        
        {/* Linha 1: Cidade (Reduzi pb-4 para pb-3 e text-xl para text-lg) */}
        <div className="flex flex-col gap-1 border-b border-gray-200/50 pb-3">
          <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
            Estimativa em {product.cidade}
          </p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-black text-prylom-dark tracking-tighter">
              {cityAverageHa ? formatV(cityAverageHa) : '---'}
            </p>
            <span className="text-[9px] font-bold opacity-40 whitespace-nowrap">/ ha</span>
          </div>
        </div>

        {/* Linha 2: Estado (Reduzi pb-4 para pb-3) */}
        <div className="flex flex-col gap-1 border-b border-gray-200/50 pb-3">
          <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
            Estimativa em {product.estado}
          </p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-black text-prylom-dark tracking-tighter">
              {stateAverageHa ? formatV(stateAverageHa) : '---'}
            </p>
            <span className="text-[9px] font-bold opacity-40 whitespace-nowrap">/ ha</span>
          </div>
        </div>

        {/* Linha 3: O Ativo (Reduzi text-3xl para text-2xl) */}
        <div className="flex flex-col gap-1 pt-1">
          <p className="text-[8px] font-black text-prylom-gold uppercase tracking-widest">
            Valor Pedido por Hectares
          </p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-black text-[#000080] tracking-tighter leading-none">
              {product.valor && spec?.area_total_ha ? formatV(product.valor / spec.area_total_ha) : '---'}
            </p>
            <span className="text-xs font-bold opacity-60 text-[#000080] whitespace-nowrap">/ ha</span>
          </div>
        </div>

        {/* Rodapé: Reduzi mt-4 para mt-2 */}
        <div className="mt-2 pt-3 border-t border-gray-100/50">
          <p className="text-[7px] font-bold text-gray-400 uppercase leading-tight tracking-wider opacity-70">
            * Médias baseadas em amostras de anúncios ativos, podendo divergir de transações reais registradas em cartório.
          </p>
        </div>
      </div>
    </div>
  </div>
)}
{/* BLOCO: ANÁLISE DE POTENCIAL DE VENDA */}


{isFarm && (
<div className="px-0 no-print"> 
    <button 
      onClick={() => setShowFraudForm(true)}
  
   className="w-full flex flex-col items-center overflow-hidden rounded-[2.5rem] bg-white border border-gray-100 shadow-sm transition-all hover:border-red-200"
    >
      {/* Aumentei px-6 para px-10 para o cabeçalho parecer mais largo */}
      <div className="w-full bg-[#2d525d] py-5 px-10 flex items-center justify-center gap-2">
         <span className="text-[11px] font-bold text-white uppercase tracking-wider">
           Canal de Transparência & Compliance
         </span>
      </div>
      
      {/* Aumentei p-5 para p-8 e adicionei leading-relaxed */}
<div className="px-12 py-6">
        <p className="text-[13px] text-[#2d525d] font-bold text-center leading-relaxed">
          É o titular legal desta área? Caso identifique qualquer inconformidade nos dados declarados pelo originador: 
          <br className="hidden sm:block" />
          <span className="underline ml-1">Clique aqui para acionar nossa Ouvidoria.</span>
        </p>
      </div>
    </button>
  </div>
)}

{isFarm && (
  <>

<div className="mt-10 px-0 no-print animate-fadeIn">
  {/* O padding (p) e o espaçamento entre elementos (space-y) diminuem se for isLease */}
  <div className={`bg-white rounded-[3rem] border border-gray-100 shadow-sm transition-all ${
    isLease ? 'p-3 space-y-3' : 'p-5 space-y-6'
  }`}>
    
    {/* A faixa azul ajusta as margens negativas e o padding interno */}
    <div className={`bg-[#2c5363] text-center transition-all ${
      isLease 
        ? '-mx-3 -mt-3 p-3 rounded-t-[3rem]' 
        : '-mx-5 -mt-5 p-6 rounded-t-[3rem]'
    }`}>
      <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em] leading-tight">
        Análise de Potencial<br/>de Venda
      </h4>
    </div>

    {/* O espaço entre os parágrafos diminui de 4 para 2 */}
    <div className={`${isLease ? 'space-y-2' : 'space-y-4'} text-center px-4`}>
      <p className="text-[11px] font-bold text-[#2c5363] leading-relaxed">
        Conecte sua propriedade a Investidores Qualificados e Fundos.
      </p>
      <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide leading-tight">
        Opções de Venda: Aberta, Sigilosa (Off-Market) ou Selected
      </p>
    </div>

    {/* A altura do botão (py) diminui de 5 para 3 */}
    <button 
      onClick={() => setShowSelectionModal(true)}
      className={`w-full bg-[#607D8B] hover:bg-[#455A64] text-white rounded-[2rem] shadow-lg transition-all flex items-center justify-center gap-3 group ${
        isLease ? 'py-3' : 'py-5'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">Cadastrar Propriedade</span>
    </button>
  </div>
</div>

    {/* OVERLAY FULLSCREEN VIA PORTAL (Para cobrir a tela inteira de verdade) */}
    {showSelectionModal && createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 md:p-10 animate-fadeIn overflow-hidden">
        {/* Fundo Azul translúcido com Blur */}
        <div 
          className="absolute inset-0 bg-[#2c5363]/95 backdrop-blur-xl" 
          onClick={() => setShowSelectionModal(false)}
        ></div>
        
        {/* Conteúdo Centralizado e Amplo */}
        <div className="relative w-full max-w-7xl mx-auto flex flex-col items-center gap-12 z-10">
          <h2 className="text-white text-center text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">
            Como deseja conectar seu patrimônio ao mercado?
          </h2>
<div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
  {/* CARD 1: OPEN MARKETING */}
  <div className="bg-white rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6 shadow-2xl transition-all hover:scale-[1.03]">
    <h3 className="text-[#2c5363] text-2xl font-black uppercase tracking-tighter">Open Market</h3>
    <p className="text-[11px] text-gray-500 font-bold leading-relaxed uppercase tracking-tight">
      Sua propriedade integrada ao ecossistema de ativos da Prylom...
    </p>
    <button className="text-[10px] font-black text-prylom-gold underline uppercase tracking-widest hover:opacity-70">Clique para saber mais</button>
    
    <button 
      onClick={() => {
        setSelectedFormType('open');
        setShowSelectionModal(false); // <--- FECHA O MODAL DE SELEÇÃO
      }}
      className="w-full bg-[#607D8B] hover:bg-[#2c5363] text-white py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all mt-auto shadow-lg"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
      Listar Propriedade
    </button>
  </div>

  {/* CARD 2: OFF MARKET */}
  <div className="bg-white rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6 shadow-2xl transition-all hover:scale-[1.03]">
    <h3 className="text-[#2c5363] text-2xl font-black uppercase tracking-tighter">Off Market</h3>
    <p className="text-[11px] text-gray-500 font-bold leading-relaxed uppercase tracking-tight">
      Posicionamos sua propriedade com foco em investidores institucionais...
    </p>
    <button className="text-[10px] font-black text-prylom-gold underline uppercase tracking-widest hover:opacity-70">Clique para saber mais</button>
    
    <button 
      onClick={() => {
        setSelectedFormType('offmarket');
        setShowSelectionModal(false); // <--- FECHA O MODAL DE SELEÇÃO
      }}
      className="w-full bg-[#607D8B] hover:bg-[#2c5363] text-white py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all mt-auto shadow-lg"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
      Listar Propriedade
    </button>
  </div>

  {/* CARD 3: PRYLOM SELECTED */}
  <div className="bg-white rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6 shadow-2xl border-4 border-prylom-gold/30 transition-all hover:scale-[1.03] relative">
    <h3 className="text-[#2c5363] text-2xl font-black uppercase tracking-tighter">Prylom Selected</h3>
    <p className="text-[11px] text-gray-600 font-black leading-relaxed uppercase tracking-tight">
      No Prylom Selected, sua propriedade recebe curadoria premium com foco em nosso Círculo Private...
    </p>
    
    <button 
      onClick={() => {
        setSelectedFormType('selected');
        setShowSelectionModal(false); // <--- FECHA O MODAL DE SELEÇÃO
      }}
      className="w-full bg-[#2c5363] hover:bg-prylom-dark text-prylom-gold py-5 rounded-full text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all mt-auto shadow-xl"
    >
      <span className="text-xl">✦</span>
      Acesso Private
    </button>
  </div>
</div>

          {/* BOTÃO INFERIOR */}
          <button className="bg-white/10 border border-white/20 text-white px-12 py-5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-4 hover:bg-white hover:text-[#2c5363] transition-all group shadow-2xl">
            <svg className="h-5 w-5 opacity-70 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
            Cadastro para corretores com ativos qualificados
          </button>
        </div>

        {/* Botão X para fechar no topo */}
        <button onClick={() => setShowSelectionModal(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>,
      document.body // ISSO JOGA O MODAL PARA FORA DA DIV LATERAL
    )}
  </>
)}


        </aside>
      </div>
{product.descricao && (
  /* Garanti w-full aqui para ocupar toda a largura do pai */
  <div className="mt-12 pt-10 border-t border-gray-50 w-full">
    
    {/* Header: removi max-w-md do parágrafo de apoio para não travar o cabeçalho */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 w-full">
      <h4 className="text-[9px] font-black text-prylom-gold uppercase tracking-[0.3em] flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        Descrição Comercial e Observações
      </h4>
      
      <p className="text-[7px] md:text-[8px] text-gray-400 font-medium uppercase tracking-wider leading-tight">
        Informações de caráter declaratório, fornecidas pelo originador.
      </p>
    </div>

    {/* Container da Descrição: w-full e padding horizontal ajustado */}
    <div className="bg-gray-50/30 p-8 md:px-12 rounded-[2rem] border border-gray-100/50 shadow-inner w-full">
      <p 
        className="text-gray-900 leading-relaxed text-[14px] md:text-[16px] text-justify tracking-tight w-full"
        style={{ 
          whiteSpace: 'pre-wrap',
          fontFamily: "'Playfair Display', serif",
          lineHeight: '1.8'
        }}
      >
        "{formatDescription(product.descricao)}"
      </p>
    </div>
  </div>
)}


{relatedProducts.length > 0 && (
  <section className="pt-12 border-t border-gray-100 space-y-10 no-print">
    <h3 className="text-2xl font-black text-[#000080] tracking-tighter uppercase">
      {t.relatedRegionAssets}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {relatedProducts.map(p => {
        const isLeaseItem = p.tipo_transacao === 'arrendamento';
        
        // Dados achatados conforme a categoria
        const fData = p.fazenda_data || {};
        const mData = p.maquina_data || {};
        const aData = p.aviao_data || {};
        const gData = p.grao_data || {};
        
        const areaTotal = fData.area_total_ha || p.area_total_ha;

        return (
          <div 
            key={p.id} 
            onClick={() => onSelectProduct?.(p.id)} 
            className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col group h-full"
          >
            {/* IMAGE CONTAINER */}
            <div className="h-56 relative overflow-hidden bg-gray-50">
              <img 
                src={p.main_image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800'} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                alt={p.titulo}
              />
            </div>

            {/* CONTENT */}
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-lg font-black text-prylom-dark line-clamp-1 uppercase group-hover:text-prylom-gold transition-colors mb-1">
                {p.titulo}
              </h3>
              
              <div className="flex flex-col mb-4">
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  p.status === 'vendido' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {p.status === 'vendido' ? 'Indisponível' : 'Disponível'}
                </span>
                <p className="text-[9px] text-gray-400 font-bold uppercase">
                  {p.cidade} - {p.estado}
                </p>
              </div>

              {/* GRID DINÂMICO DE DADOS TÉCNICOS */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-400 font-bold uppercase mb-6">
                {p.categoria === 'fazendas' && (
                  <>
                    <span>Argila: <strong className="font-black text-prylom-dark">{fData.teor_argila || '-'}%</strong></span>
                    <span>Aptidão: <strong className="font-black text-prylom-dark">{fData.aptidao || '-'}</strong></span>
                    <span>Pluviom.: <strong className="font-black text-prylom-dark">{fData.precipitacao_mm || '-'} mm</strong></span>
                    <span>Altitude: <strong className="font-black text-prylom-dark">{fData.altitude_m || '-'} m</strong></span>
                    <span>Área Total: <strong className="font-black text-prylom-dark">{areaTotal || '-'} ha</strong></span>
                    <span>Área Prod.: <strong className="font-black text-prylom-dark">{fData.area_lavoura_ha || '-'} ha</strong></span>
                  </>
                )}

                {p.categoria === 'maquinas' && (
                  <>
                    <span>Marca: <strong className="font-black text-prylom-dark">{mData.marca || '-'}</strong></span>
                    <span>Ano: <strong className="font-black text-prylom-dark">{mData.ano || '-'}</strong></span>
                    <span>Horas: <strong className="font-black text-prylom-dark">{mData.horas_trabalhadas || '-'} h</strong></span>
                    <span>Potência: <strong className="font-black text-prylom-dark">{mData.potencia || '-'} HP</strong></span>
                  </>
                )}

                {p.categoria === 'avioes' && (
                  <>
                    <span>Fabricante: <strong className="font-black text-prylom-dark">{aData.fabricante || '-'}</strong></span>
                    <span>Horas: <strong className="font-black text-prylom-dark">{aData.horas_voo || '-'} h</strong></span>
                    <span>Ano: <strong className="font-black text-prylom-dark">{aData.ano || '-'}</strong></span>
                    <span>Motor: <strong className="font-black text-prylom-dark">{aData.motor_status || 'TSN'}</strong></span>
                  </>
                )}

                {p.categoria === 'graos' && (
                  <>
                    <span>Cultura: <strong className="font-black text-prylom-dark">{gData.cultura || '-'}</strong></span>
                    <span>Safra: <strong className="font-black text-prylom-dark">{gData.safra || '-'}</strong></span>
                    <span>Volume: <strong className="font-black text-prylom-dark">{gData.estoque_toneladas || '-'} t</strong></span>
                    <span>Qualidade: <strong className="font-black text-prylom-dark">{gData.qualidade || '-'}</strong></span>
                  </>
                )}

                <span className="col-span-2 border-t border-gray-50 mt-1 pt-1">
                  Código: <strong className="font-black text-prylom-dark">{p.codigo}</strong>
                </span>
              </div>
              
              {/* PRICE BOX */}
              <div className="mt-auto p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[9px] font-black text-prylom-gold uppercase tracking-widest mb-1">
                  {isLeaseItem ? 'Arrendamento Disponível' : 'Ativo para Venda'}
                </p>

                {isLeaseItem ? (
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-prylom-dark tabular-nums">
                        {p.valor}
                      </span>
                      <span className="text-[10px] font-black text-prylom-dark uppercase tracking-tighter">
                        sc {p.arrendamento_info?.cultura_base || 'Soja'} / ha
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-prylom-dark tabular-nums">
                        {formatV(p.valor)}
                      </span>
                    </div>
                    {p.categoria === 'fazendas' && areaTotal && p.valor && (
                      <div className="flex items-baseline gap-1 opacity-60">
                        <span className="text-[10px] font-black text-gray-500 tabular-nums">
                          {formatV(p.valor / areaTotal)}
                        </span>
                        <span className="text-[8px] font-black text-gray-400 uppercase">/ ha</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </section>
)}

      {/* RODAPÉ DE COMPLIANCE & LEGAL */}
<footer className="mt-20 pt-10 border-t border-gray-100 space-y-8 pb-10">
  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
    
    {/* Coluna do Disclaimer */}
    <div className="md:col-span-8 space-y-4">
      <h5 className="text-[10px] font-black text-[#000080] uppercase tracking-[0.2em]">
        Disclaimer Legal & Compliance
      </h5>
      <p className="text-[10px] leading-relaxed text-gray-400 font-medium text-justify uppercase tracking-tight">
A Prylom atua como plataforma de inteligência e conexão para Investidores Qualificados, operada sob
rigorosa supervisão técnica (CRECI). Os ativos categorizados como "Open Market" são publicados
mediante autorização de terceiros, possuindo caráter estritamente declaratório, sendo a veracidade dos dados
de responsabilidade exclusiva da fonte informante (Art. 19, Marco Civil da Internet). Ressaltamos que as
projeções financeiras ("Economics") são estimativas estatísticas sujeitas a variações de mercado, não
substituindo Laudos Técnicos Oficiais (ABNT) nem assegurando rentabilidade futura. Valores apresentados
em moedas estrangeiras (USD, CNY, RUB) possuem fins meramente referenciais e baseiam-se em cotações
estimadas, devendo toda negociação, contratação e liquidação ocorrer obrigatoriamente em moeda nacional
(BRL). A aquisição de imóveis rurais por pessoas físicas ou jurídicas estrangeiras está rigorosamente sujeita
aos trâmites da Lei Brasileira nº 5.709/1971. Nossa operação atua em estrita conformidade com a LGPD e
segue as diretrizes de Prevenção à Lavagem de Dinheiro (PLD/FT), reportando automaticamente operações
atípicas ao COAF.

      </p>
    </div>

    {/* Coluna de Links e Selos */}
    <div className="md:col-span-4 flex flex-col md:items-end gap-6">
      <div className="flex gap-4">
        <a href="/terms" className="text-[9px] font-black text-prylom-gold uppercase border-b border-prylom-gold/20 hover:border-prylom-gold transition-all">
          Termos de Uso
        </a>
        <a href="/privacy" className="text-[9px] font-black text-prylom-gold uppercase border-b border-prylom-gold/20 hover:border-prylom-gold transition-all">
          Política de Privacidade
        </a>
      </div>
      
      {/* Selo de Segurança Visual */}
      <div className="flex items-center gap-3 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
        <div className="text-right">
          <p className="text-[7px] font-black text-prylom-dark uppercase leading-none">Criptografia</p>
          <p className="text-[9px] font-bold text-prylom-dark">SSL 256-bit</p>
        </div>
        <svg className="w-8 h-8 text-[#000080]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
        </svg>
      </div>
    </div>
  </div>

  {/* Linha Final de Copyright */}
  <div className="pt-8 border-t border-gray-50 flex justify-between items-center">
    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
      © {new Date().getFullYear()} Prylom Intelligence Ecosystem. Todos os direitos reservados.
    </p>
    <div className="flex gap-2">
       <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
       <span className="text-[8px] font-black text-gray-400 uppercase">System Status: Operational</span>
    </div>
  </div>
</footer>

{showDataRoomView && createPortal(
  <div className="fixed inset-0 z-[999999] bg-white overflow-y-auto">
    <DataRoomModal 
      /* Aqui mesclamos os dados básicos com os dados técnicos da fazenda */
      product={{ ...product, fazenda_data: spec }} 
      onBack={() => setShowDataRoomView(false)} 
    />
  </div>,
  document.body
)}
      
{selectedFormType && (
  <PropertyRegistrationForm 
    type={selectedFormType} 
    onBack={() => setSelectedFormType(null)} 
  />
)}

{/* NOVO PORTAL PARA TELA CHEIA DA FOTO */}
{isLightboxOpen && activeImage && createPortal(
  <div className="fixed inset-0 z-[100000] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center animate-fadeIn no-print">
    
    {/* Botão Fechar */}
    <button 
      onClick={() => setIsLightboxOpen(false)}
      className="absolute top-10 right-10 text-white/50 hover:text-white transition-all z-[100001]"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    {/* Setas de Navegação (Usando as funções que você já criou) */}
    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-8 pointer-events-none">
      <button 
        onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
        className="pointer-events-auto w-20 h-20 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-all border border-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
        className="pointer-events-auto w-20 h-20 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-all border border-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>

    {/* Container da Imagem */}
    <div className="w-full h-full p-4 md:p-20 flex items-center justify-center" onClick={() => setIsLightboxOpen(false)}>
      <img 
        src={getFullImage(activeImage)} 
        className="max-w-full max-h-full object-contain shadow-2xl rounded-xl select-none"
        onClick={(e) => e.stopPropagation()} 
        alt="Visualização em tela cheia"
      />
    </div>

    {/* Contador de Fotos */}
    <div className="absolute bottom-12 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
      <span className="text-white text-[12px] font-black uppercase tracking-[0.4em]">
        {images.findIndex(img => img.image_url === activeImage) + 1} / {images.length}
      </span>
    </div>
  </div>,
  document.body
)}



{showFraudForm && createPortal(
  <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 animate-fadeIn">
    <div className="absolute inset-0 bg-[#000022]/95 backdrop-blur-xl" onClick={() => setShowFraudForm(false)}></div>
    
    <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="bg-[#2d525d] p-8 text-center">
        <h3 className="text-white text-xl font-black uppercase tracking-widest mb-2">Contestação de Propriedade</h3>
        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest opacity-80">Unidade de Compliance & Combate à Fraude | Prylom</p>
      </div>

      <div className="p-8 md:p-12 overflow-y-auto space-y-8">
        <p className="text-[11px] text-gray-500 font-bold uppercase text-center border-b pb-4">
          Ativo Cód: <span className="text-[#000080]">{product?.codigo}</span> — Localidade: {product?.cidade}/{product?.estado}
        </p>

        {/* Campos de Identificação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
              Nome Completo / Razão Social <span className="text-red-500">*</span>
            </label>
            <input 
              required
              type="text" 
              value={fraudData.nome}
              className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-[#2d525d]"
              onChange={(e) => setFraudData({...fraudData, nome: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
              CPF / CNPJ <span className="text-red-500">*</span>
            </label>
            <input 
              required
              type="text" 
              value={fraudData.documento}
              className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-[#2d525d]"
              onChange={(e) => setFraudData({...fraudData, documento: e.target.value})}
            />
          </div>
          
          {/* ADICIONADOS: E-mail e Telefone */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
              E-mail de Contato <span className="text-red-500">*</span>
            </label>
            <input 
              required
              type="email" 
              value={fraudData.email}
              className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-[#2d525d]"
              onChange={(e) => setFraudData({...fraudData, email: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
              Telefone / WhatsApp <span className="text-red-500">*</span>
            </label>
            <input 
              required
              type="tel" 
              value={fraudData.telefone}
              className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-[#2d525d]"
              onChange={(e) => setFraudData({...fraudData, telefone: e.target.value})}
            />
          </div>
        </div>

        {/* Relação Direta */}
        <div className="space-y-4">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2 text-center block">
            Relação Direta com o Imóvel <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            {['Proprietário', 'Advogado/Representante Legal'].map(tipo => (
              <button 
                key={tipo}
                type="button"
                onClick={() => setFraudData({...fraudData, relacao: tipo})}
                className={`py-4 rounded-xl text-[10px] font-black uppercase transition-all border ${fraudData.relacao === tipo ? 'bg-[#2d525d] text-white border-[#2d525d]' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        {/* Motivo */}
        <div className="space-y-2">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2">
            Descrição da Contestação / Motivo <span className="text-red-500">*</span>
          </label>
          <textarea 
            required
            rows={4}
            value={fraudData.motivo}
            className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-[#2d525d] resize-none"
            placeholder="Explique detalhadamente a inconformidade..."
            onChange={(e) => setFraudData({...fraudData, motivo: e.target.value})}
          />
        </div>

        {/* Checkbox de Aceite Legal */}
        <label className="flex items-start gap-4 p-6 bg-red-50 border border-red-100 rounded-[1.5rem] cursor-pointer group">
          <input 
            required
            type="checkbox" 
            checked={fraudData.aceite}
            className="mt-1 w-5 h-5 accent-red-600"
            onChange={(e) => setFraudData({...fraudData, aceite: e.target.checked})}
          />
          <span className="text-[10px] font-bold text-red-900 leading-relaxed text-justify uppercase tracking-tight">
            Declaro sob as penas da lei (Art. 299 CP) que sou o legítimo titular ou representante legal e as informações são verdadeiras. <span className="text-red-600">*</span>
          </span>
        </label>

        {/* Botão de Envio Atualizado com validação de email e telefone */}
        <button 
          disabled={!fraudData.aceite || !fraudData.nome.trim() || !fraudData.documento.trim() || !fraudData.email?.trim() || !fraudData.telefone?.trim() || !fraudData.relacao || !fraudData.motivo.trim()}
          onClick={async () => {
            const msg = `*PROTOCOLO DE CONTESTAÇÃO*%0A%0A` +
                        `*Ativo:* ${product.codigo}%0A` +
                        `*Nome:* ${fraudData.nome}%0A` +
                        `*Doc:* ${fraudData.documento}%0A` +
                        `*E-mail:* ${fraudData.email}%0A` +
                        `*Tel:* ${fraudData.telefone}%0A` +
                        `*Relação:* ${fraudData.relacao}%0A` +
                        `*Motivo:* ${fraudData.motivo}`;
            
            window.open(`https://wa.me/5511947740452?text=${msg}`, '_blank');
            setShowFraudForm(false);
          }}
          className={`w-full py-6 rounded-full text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-xl 
            ${(!fraudData.aceite || !fraudData.nome.trim() || !fraudData.documento.trim() || !fraudData.email?.trim() || !fraudData.telefone?.trim() || !fraudData.relacao || !fraudData.motivo.trim()) 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'}`}
        >
          Protocolar Denúncia Oficial
        </button>
      </div>
    </div>
  </div>,
  document.body
)}

    </div>
</>
    
  );
};

export default ProductDetails;