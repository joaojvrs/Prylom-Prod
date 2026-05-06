
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { AppLanguage, AppCurrency } from '../types';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useParams, useNavigate } from 'react-router-dom';
import agro_brasil from "../assets/agro_brasil.jpg";
import mapaBrasil from "../assets/mapaBrasil.png";
import { createPortal } from 'react-dom';
import professorHernandez from "../assets/professor-hernandez.jpg";
import lidia from "../assets/lidia.jpeg";
interface Product {
  id: string;
  categoria: string;
  titulo: string;
  valor: number | null;
  unidade: string;
  descricao: string;
  estado: string;
  cidade: string;
  tipo_transacao: 'venda' | 'arrendamento';
  status: string;
  certificacao: boolean;
  tem_arrendamento_ativo?: boolean;
  arrendamento_info?: any;
  main_image?: string;
  area_total_ha?: number;
  fazenda_data?: any;
  maquina_data?: any;
  aviao_data?: any;
  grao_data?: any;
  coords?: [number, number];
  codigo?: string;
}

interface Props {
  onBack: () => void;
  onSelectProduct: (productId: string) => void;
  t: any;
  lang: AppLanguage;
  currency: AppCurrency;
}


const GEO_CACHE_KEY = 'prylom_geo_cache_v1';

const loadPersistedGeoCache = (): Record<string, [number, number]> => {
  try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}'); }
  catch { return {}; }
};

const persistGeoCache = (cache: Record<string, [number, number]>) => {
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache)); } catch {}
};

const geocodeWithRetry = async (searchTerm: string): Promise<[number, number] | null> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const waitMs = attempt === 0 ? 1200 : 3000 * attempt;
    await new Promise(r => setTimeout(r, waitMs));
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' } }
      );
      if (resp.status === 429) {
        await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      const data = await resp.json();
      if (data?.[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      return null;
    } catch { return null; }
  }
  return null;
};

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'vendido': return 'Indisponível';
    case 'ativo': return 'Disponível';
    default: return 'Em Negociação';
  }
};



const getStatusTextColor = (status: string) => {
  switch (status) {
    case 'ativo':
      return 'text-green-600';
    case 'vendido':
      return 'text-red-600';
    case 'reservado':
      return 'text-yellow-600';
    default:
      return 'text-gray-400';
  }
};



const ShoppingCenter: React.FC<Props> = ({ onBack, onSelectProduct, t, lang, currency }) => {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [transactionType, setTransactionType] = useState<'all' | 'venda' | 'arrendamento' | 'parceria'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'equipe'| 'global'| 'off'>('grid');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<{ financeiros: boolean; certificacao: boolean; offmarketing: boolean; [key: string]: boolean }>({
  financeiros: false,
  certificacao: false,
  offmarketing: false,
});

  const geoCache = useRef<Record<string, [number, number]>>(loadPersistedGeoCache());
const navigate = useNavigate();

  const PAGE_SIZE = 10;
  const MAX_WINDOW = 30;
  const [visibleStart, setVisibleStart] = useState(0);
  const [visibleEnd, setVisibleEnd] = useState(PAGE_SIZE);
  const [topSpacerHeight, setTopSpacerHeight] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef({ start: 0, end: PAGE_SIZE, spacer: 0 });
  const pendingTopLoadRef = useRef(false);
  const prevDocHeightRef = useRef(0);
  // Filtros Universais
  const [filterState, setFilterState] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [priceMode, setPriceMode] = useState<'total' | 'hectare'>('total');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const isSpecialView = viewMode === 'off' || viewMode === 'equipe' || viewMode === 'global';
  // Filtros Inteligentes (Fazendas)
  const [minAreaTotal, setMinAreaTotal] = useState<string>('');
  const [maxAreaTotal, setMaxAreaTotal] = useState<string>('');
  const [minAreaLavoura, setMinAreaLavoura] = useState<string>('');
  const [selectedTipoAnuncio, setSelectedTipoAnuncio] = useState<string | null>(null);
  // Filtros Inteligentes (Fazendas) - ADICIONE ESTES:
  const [minAreaProdutiva, setMinAreaProdutiva] = useState<string>('');
  const [maxAreaProdutiva, setMaxAreaProdutiva] = useState<string>('');
  const [minPluviometria, setMinPluviometria] = useState<string>('');
  const [minAltitude, setMinAltitude] = useState<string>('');
  const [soilType, setSoilType] = useState<string>('');
  const [clayContent, setClayContent] = useState<string>('');
  const [topography, setTopography] = useState<string>('');
  const [docOnlyOk, setDocOnlyOk] = useState<boolean>(false);
  const [filterCodigo, setFilterCodigo] = useState<string>('');
  const [filterAptidao, setFilterAptidao] = useState<string>('');
  const [minPriceHa, setMinPriceHa] = useState<string>('');
  const [maxPriceHa, setMaxPriceHa] = useState<string>('');
  const [minArgila, setMinArgila] = useState<string>('');
  const [maxArgila, setMaxArgila] = useState<string>('');
  // Filtros Financeiros (Fazendas)
  const [minProdutividade, setMinProdutividade] = useState<string>('');
  const [maxProdutividade, setMaxProdutividade] = useState<string>('');
  const [minRoi, setMinRoi] = useState<string>('');
  const [maxRoi, setMaxRoi] = useState<string>('');
  const [minValorizacao, setMinValorizacao] = useState<string>('');
  const [maxValorizacao, setMaxValorizacao] = useState<string>('');
  const [minPayback, setMinPayback] = useState<string>('');
  const [maxPayback, setMaxPayback] = useState<string>('');
  const [minFaturamento, setMinFaturamento] = useState<string>('');
  const [maxFaturamento, setMaxFaturamento] = useState<string>('');

  // Filtros Inteligentes (Máquinas)
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [machineModelFilter, setMachineModelFilter] = useState<string>('');
  const [minYear, setMinYear] = useState<string>('');
  const [maxYear, setMaxYear] = useState<string>('');
  const [maxHours, setMaxHours] = useState<string>('');
  const [conservationState, setConservationState] = useState<string>('');
  const [precisionAgFilter, setPrecisionAgFilter] = useState<string>('');
  const [minPower, setMinPower] = useState<string>('');
  const [fuelType, setFuelType] = useState<string>('');

  // Filtros Inteligentes (Aviões)
  const [planeTypeFilter, setPlaneTypeFilter] = useState<string>('');
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('');
  const [minYearPlane, setMinYearPlane] = useState<string>('');
  const [maxHoursPlane, setMaxHoursPlane] = useState<string>('');
  const [anacHomologFilter, setAnacHomologFilter] = useState<string>('');

  // Filtros Inteligentes (Grãos)
  const [grainCulture, setGrainCulture] = useState<string>('');
  const [grainHarvest, setGrainHarvest] = useState<string>('');
  const [grainQuality, setGrainQuality] = useState<string>('');
  const [minVolume, setMinVolume] = useState<string>('');

  // Filtros de Arrendamento
  const [arrModalidade, setArrModalidade] = useState<string>('');
  const [arrAptidao, setArrAptidao] = useState<string>('');
  const [minArrArea, setMinArrArea] = useState<string>('');
  const [maxArrArea, setMaxArrArea] = useState<string>('');
  const [arrCulturaBase, setArrCulturaBase] = useState<string>('');
  const [arrQtdSafras, setArrQtdSafras] = useState<string>('');
  const [arrMesInicioColheita, setArrMesInicioColheita] = useState<string>('');

  // --- FILTROS DE MAPA ---
  const [mapGrouping, setMapGrouping] = useState<'municipio' | 'microrregiao'>('municipio');
  const [mapHeatmap, setMapHeatmap] = useState<'none' | 'price' | 'productivity'>('none');
  const [mapOnlyFarms, setMapOnlyFarms] = useState(false);
  const [mapOnlyLeases, setMapOnlyLeases] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const mapLayersRef = useRef<{ markers: L.LayerGroup, heatmap: L.LayerGroup } | null>(null);
  const renderTokenRef = useRef<{ cancelled: boolean }>({ cancelled: false });

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

  const formatPriceParts = (valInBrl: number | null) => {
    if (valInBrl === null) return { symbol: getSymbol(), value: '---' };
    const converted = valInBrl * rates[currency];
    const formattedNum = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(converted);
    return { symbol: getSymbol(), value: formattedNum };
  };

  useEffect(() => {
    fetchProducts();
    
    const handleNav = (e: any) => {
      if (e.detail) onSelectProduct(e.detail);
    };
    window.addEventListener('prylom-navigate', handleNav);

    return () => { 
      if (mapInstance.current) mapInstance.current.remove(); 
      window.removeEventListener('prylom-navigate', handleNav);
    };
  }, []);

  useEffect(() => {
    if (viewMode === 'map' && !loading) {
      const timer = setTimeout(() => {
        initGeneralMap();
        setTimeout(() => mapInstance.current?.invalidateSize(), 100);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [viewMode, loading]);

  useEffect(() => {
    if (viewMode === 'map' && mapInstance.current && mapLayersRef.current) {
        renderMarkers();
    }
  }, [mapGrouping, mapHeatmap, mapOnlyFarms, mapOnlyLeases, products, activeCategory, transactionType, filterState, filterCity, filterStatus, minPrice, maxPrice, minAreaTotal, brandFilter, grainCulture, planeTypeFilter, arrModalidade, arrAptidao, minArrArea, maxArrArea, arrCulturaBase, arrQtdSafras, arrMesInicioColheita]);

  useEffect(() => {
    if (activeCategory !== 'fazendas' && activeCategory !== 'all') {
      setTransactionType('all');
    }
    // Adicione esta linha:
  if (viewMode !== 'grid' && viewMode !== 'map') {
    setViewMode('grid');
  }
  }, [activeCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      if (data) {
        setProducts(data.map((item: any) => {
          const arr = Array.isArray(item.arrendamentos) ? item.arrendamentos[0] : item.arrendamentos;
          const faz = Array.isArray(item.fazendas) ? item.fazendas[0] : item.fazendas;
          const maq = Array.isArray(item.maquinas) ? item.maquinas[0] : item.maquinas;
          const avi = Array.isArray(item.avioes) ? item.avioes[0] : item.avioes;
          const gra = Array.isArray(item.graos) ? item.graos[0] : item.graos;
          return {
            ...item,
            fazenda_data: faz,
            maquina_data: maq,
            aviao_data: avi,
            grao_data: gra,
            area_total_ha: faz?.area_total_ha || null,
            tem_arrendamento_ativo: !!arr && arr.ativo,
            arrendamento_info: arr,
            main_image: item.produtos_imagens?.find((img: any) => img.ordem === 1)?.image_url || item.produtos_imagens?.[0]?.image_url
          };
        }));
      }
    } catch (err) { 
      console.error("Erro ao carregar produtos:", err);
    } finally { 
      setLoading(false); 
    }
  };

  // ... dentro do componente ShoppingCenter
const [favorites, setFavorites] = useState<string[]>([]);

// Efeito para carregar os favoritos do usuário ao abrir a página
useEffect(() => {
  if (!user) return;
  supabase
    .from('favorites')
    .select('asset_id')
    .eq('user_id', user.id)
    .then(({ data }) => {
      if (data) setFavorites(data.map(f => f.asset_id));
    });
}, [user]);

const toggleFavorite = async (e: React.MouseEvent, assetId: string) => {
  e.stopPropagation();
  if (!user) {
    alert("Você precisa estar logado para curtir!");
    return;
  }

  const isFav = favorites.includes(assetId);

  if (isFav) {
    // Remover curtida
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('asset_id', assetId);

    if (!error) setFavorites(prev => prev.filter(id => id !== assetId));
  } else {
    // Adicionar curtida
    const { error } = await supabase
      .from('favorites')
      .insert([{ user_id: user.id, asset_id: assetId }]);

    if (!error) setFavorites(prev => [...prev, assetId]);
  }
};

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p: Product) =>
      !(p.categoria === 'fazendas' && (p as any).fazenda_data?.tipo_anuncio === 'Off Marketing')
    );

    if (activeCategory !== 'all') {
      filtered = filtered.filter(p => p.categoria === activeCategory);
    }

    if (transactionType !== 'all') {
      filtered = filtered.filter(p => p.tipo_transacao === transactionType);
    }

    if (viewMode === 'map') {
        if (mapOnlyFarms) filtered = filtered.filter(p => p.categoria === 'fazendas');
        if (mapOnlyLeases) filtered = filtered.filter(p => p.tipo_transacao === 'arrendamento');
    }

    if (filterState) filtered = filtered.filter(p => p.estado === filterState);
    if (filterCity) filtered = filtered.filter(p => p.cidade?.toLowerCase().includes(filterCity.toLowerCase()));
    if (filterCodigo) filtered = filtered.filter(p => p.codigo?.toLowerCase().includes(filterCodigo.toLowerCase()));

    if (filterStatus !== 'all') {
      if (filterStatus === 'verified') filtered = filtered.filter(p => p.certificacao);
      else filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (selectedTipoAnuncio && selectedTipoAnuncio !== "") {
    filtered = filtered.filter(p => {
      const valorNoBanco = p.fazenda_data?.relevancia_anuncio || "";
      return valorNoBanco.trim() === selectedTipoAnuncio.trim();
    });
  }

if (minPrice || maxPrice) {
  filtered = filtered.filter(p => {
    if (p.tipo_transacao === 'arrendamento') return true;
    if (!p.valor) return false;

    let valueToCompare = Number(p.valor);

    // Se o modo Hectare estiver ativo, comparamos o PREÇO/HA e não o PREÇO TOTAL
    if (priceMode === 'hectare') {
      // Limpeza da área (salva como text no banco)
      const areaRaw = String(p.area_total_ha || "").replace(/\s/g, "").replace(",", ".");
      const area = parseFloat(areaRaw);

      if (!isNaN(area) && area > 0) {
        valueToCompare = valueToCompare / area; // Ex: 55.000.000 / 957 = 57.471,26
      } else {
        return false; 
      }
    }

    const min = minPrice !== '' ? Number(minPrice) : 0;
    const max = maxPrice !== '' ? Number(maxPrice) : Infinity;

    return valueToCompare >= min && valueToCompare <= max;
  });
}

if (activeCategory === 'fazendas' || activeCategory === 'all') {
  
// --- FILTRO DE TIPO DE ANÚNCIO (CERTIFICAÇÃO) ---
if (selectedTipoAnuncio && selectedTipoAnuncio !== "") {
    filtered = filtered.filter(p => {
        // Pega o valor do campo correto que você indicou
        const valorNoBanco = p.fazenda_data?.relevancia_anuncio || "";
        
        // Remove as aspas de 'selectedTipoAnuncio' para ser a variável de verdade
        // E usamos trim() para evitar que um espaço invisível quebre a comparação
        return valorNoBanco.trim() === selectedTipoAnuncio.trim();
    });
}

  // --- ÁREA TOTAL ---
  // Só entra se houver número digitado e maior que zero
  if ((minAreaTotal && Number(minAreaTotal) > 0) || (maxAreaTotal && Number(maxAreaTotal) > 0)) {
    filtered = filtered.filter(p => {
      // area_total_ha pode vir de produtos ou de fazenda_data
      const raw = p.area_total_ha || p.fazenda_data?.area_total_ha;
      const area = parseFloat(String(raw || "").replace(",", "."));
      const min = minAreaTotal ? Number(minAreaTotal) : 0;
      const max = (maxAreaTotal && Number(maxAreaTotal) > 0) ? Number(maxAreaTotal) : Infinity;
      return !isNaN(area) && area >= min && area <= max;
    });
  }

  // --- PLUVIOMETRIA (usa precipitacao_mm; pluviometria_mm_ano é campo alternativo no banco) ---
  if (minPluviometria && Number(minPluviometria) > 0) {
    filtered = filtered.filter(p => {
      const mm = Number(p.fazenda_data?.precipitacao_mm || p.fazenda_data?.pluviometria_mm_ano || 0);
      return mm >= Number(minPluviometria);
    });
  }

  // --- ÁREA PRODUTIVA (coluna area_produtiva no banco) ---
  if ((minAreaProdutiva && Number(minAreaProdutiva) > 0) || (maxAreaProdutiva && Number(maxAreaProdutiva) > 0)) {
    filtered = filtered.filter(p => {
      const areaProd = parseFloat(String(p.fazenda_data?.area_produtiva || "").replace(",", "."));
      const min = minAreaProdutiva ? Number(minAreaProdutiva) : 0;
      const max = (maxAreaProdutiva && Number(maxAreaProdutiva) > 0) ? Number(maxAreaProdutiva) : Infinity;
      return !isNaN(areaProd) && areaProd >= min && areaProd <= max;
    });
  }

  // --- ALTITUDE ---
  if (minAltitude && Number(minAltitude) > 0) {
    filtered = filtered.filter(p => {
      const m = Number(p.fazenda_data?.altitude_m || 0);
      return m >= Number(minAltitude);
    });
  }

  // --- OUTROS FILTROS (Strings devem ter conteúdo) ---
  if (minAreaLavoura && Number(minAreaLavoura) > 0) {
    filtered = filtered.filter(p => Number(p.fazenda_data?.area_lavoura_ha || 0) >= Number(minAreaLavoura));
  }

  if (soilType && soilType.trim() !== "") {
    filtered = filtered.filter(p => p.fazenda_data?.tipo_solo?.toLowerCase().includes(soilType.toLowerCase()));
  }

  if (clayContent && clayContent.trim() !== "") {
    filtered = filtered.filter(p => p.fazenda_data?.teor_argila?.includes(clayContent));
  }

  if (topography && topography.trim() !== "") {
    filtered = filtered.filter(p => p.fazenda_data?.topografia?.toLowerCase().includes(topography.toLowerCase()));
  }

  if (docOnlyOk === true) { // Verificação booleana estrita
    filtered = filtered.filter(p => {
      const doc = p.fazenda_data?.documentacao_ok?.toLowerCase() || "";
      return doc.includes('sim') || doc.includes('ok');
    });
  }

  if (filterAptidao) {
    filtered = filtered.filter(p => p.fazenda_data?.vocacao?.toLowerCase().includes(filterAptidao.toLowerCase()));
  }

  if ((minPriceHa && Number(minPriceHa) > 0) || (maxPriceHa && Number(maxPriceHa) > 0)) {
    filtered = filtered.filter(p => {
      if (!p.valor || !p.area_total_ha) return false;
      const areaRaw = parseFloat(String(p.area_total_ha).replace(',', '.'));
      if (isNaN(areaRaw) || areaRaw <= 0) return false;
      const pricePerHa = Number(p.valor) / areaRaw;
      const min = minPriceHa ? Number(minPriceHa) : 0;
      const max = maxPriceHa && Number(maxPriceHa) > 0 ? Number(maxPriceHa) : Infinity;
      return pricePerHa >= min && pricePerHa <= max;
    });
  }

  if ((minArgila && Number(minArgila) > 0) || (maxArgila && Number(maxArgila) > 0)) {
    filtered = filtered.filter(p => {
      const arg = Number(p.fazenda_data?.teor_argila_num || 0);
      const min = minArgila ? Number(minArgila) : 0;
      const max = maxArgila && Number(maxArgila) > 0 ? Number(maxArgila) : Infinity;
      return arg >= min && arg <= max;
    });
  }

  // Filtros Financeiros
  if (minProdutividade && Number(minProdutividade) > 0) filtered = filtered.filter(p => Number(p.fazenda_data?.produtividade_saca_ha || 0) >= Number(minProdutividade));
  if (maxProdutividade && Number(maxProdutividade) > 0) filtered = filtered.filter(p => Number(p.fazenda_data?.produtividade_saca_ha || 0) <= Number(maxProdutividade));
  if (minRoi && Number(minRoi) > 0) filtered = filtered.filter(p => Number(p.fazenda_data?.roi_anual_pct || 0) >= Number(minRoi));
  if (maxRoi && Number(maxRoi) > 0) filtered = filtered.filter(p => Number(p.fazenda_data?.roi_anual_pct || 0) <= Number(maxRoi));
  if (minValorizacao && Number(minValorizacao) > 0) filtered = filtered.filter(p => Number(p.fazenda_data?.valorizacao_anual_pct || 0) >= Number(minValorizacao));
  if (maxValorizacao && Number(maxValorizacao) > 0) filtered = filtered.filter(p => Number(p.fazenda_data?.valorizacao_anual_pct || 0) <= Number(maxValorizacao));
  if (minPayback && Number(minPayback) > 0) filtered = filtered.filter(p => Number(p.fazenda_data?.payback_anos || 0) >= Number(minPayback));
  if (maxPayback && Number(maxPayback) > 0) filtered = filtered.filter(p => Number(p.fazenda_data?.payback_anos || 0) <= Number(maxPayback));
  if (minFaturamento && Number(minFaturamento) > 0) filtered = filtered.filter(p => Number(p.fazenda_data?.faturamento_estimado || 0) >= Number(minFaturamento));
  if (maxFaturamento && Number(maxFaturamento) > 0) filtered = filtered.filter(p => Number(p.fazenda_data?.faturamento_estimado || 0) <= Number(maxFaturamento));
}

    // Filtros Técnicos Máquinas
    if (activeCategory === 'maquinas' || activeCategory === 'all') {
      if (brandFilter) filtered = filtered.filter(p => p.maquina_data?.marca?.toLowerCase().includes(brandFilter.toLowerCase()));
      if (machineModelFilter) filtered = filtered.filter(p => p.maquina_data?.modelo?.toLowerCase().includes(machineModelFilter.toLowerCase()));
      if (minYear) filtered = filtered.filter(p => p.maquina_data?.ano && p.maquina_data?.ano >= Number(minYear));
      if (maxYear) filtered = filtered.filter(p => p.maquina_data?.ano && p.maquina_data?.ano <= Number(maxYear));
      if (maxHours) filtered = filtered.filter(p => p.maquina_data?.horas_trabalhadas && p.maquina_data?.horas_trabalhadas <= Number(maxHours));
      if (conservationState) filtered = filtered.filter(p => p.maquina_data?.estado_conservacao?.toLowerCase().includes(conservationState.toLowerCase()));
      if (precisionAgFilter) filtered = filtered.filter(p => p.maquina_data?.agricultura_precisao?.toLowerCase().includes(precisionAgFilter.toLowerCase()));
      if (minPower) filtered = filtered.filter(p => parseInt(p.maquina_data?.potencia) >= Number(minPower));
      if (fuelType) filtered = filtered.filter(p => p.maquina_data?.combustivel?.toLowerCase().includes(fuelType.toLowerCase()));
    }

    // Filtros Técnicos Aviões
    if (activeCategory === 'avioes' || activeCategory === 'all') {
      if (planeTypeFilter) filtered = filtered.filter(p => p.aviao_data?.tipo_operacao?.toLowerCase().includes(planeTypeFilter.toLowerCase()));
      if (manufacturerFilter) filtered = filtered.filter(p => p.aviao_data?.fabricante?.toLowerCase().includes(manufacturerFilter.toLowerCase()));
      if (minYearPlane) filtered = filtered.filter(p => p.aviao_data?.ano && p.aviao_data?.ano >= Number(minYearPlane));
      if (maxHoursPlane) filtered = filtered.filter(p => p.aviao_data?.horas_voo && p.aviao_data?.horas_voo <= Number(maxHoursPlane));
      if (anacHomologFilter) filtered = filtered.filter(p => p.aviao_data?.homologado_anac?.toLowerCase().includes(anacHomologFilter.toLowerCase()));
    }

    // Filtros Técnicos Grãos
    if (activeCategory === 'graos' || activeCategory === 'all') {
      if (grainCulture) filtered = filtered.filter(p => p.grao_data?.cultura?.toLowerCase().includes(grainCulture.toLowerCase()));
      if (grainHarvest) filtered = filtered.filter(p => p.grao_data?.safra?.toLowerCase().includes(grainHarvest.toLowerCase()));
      if (grainQuality) filtered = filtered.filter(p => p.grao_data?.qualidade?.toLowerCase().includes(grainQuality.toLowerCase()));
      if (minVolume) filtered = filtered.filter(p => p.grao_data?.estoque_toneladas && p.grao_data?.estoque_toneladas >= Number(minVolume));
    }

    // Filtros de Arrendamento
    if (transactionType === 'arrendamento') {
      if (arrModalidade) filtered = filtered.filter(p => p.arrendamento_info?.modalidade?.toLowerCase().includes(arrModalidade.toLowerCase()));
      if (arrAptidao) filtered = filtered.filter(p => p.fazenda_data?.vocacao?.toLowerCase().includes(arrAptidao.toLowerCase()));
      if (minArrArea) filtered = filtered.filter(p => p.area_total_ha && p.area_total_ha >= Number(minArrArea));
      if (maxArrArea) filtered = filtered.filter(p => p.area_total_ha && p.area_total_ha <= Number(maxArrArea));
      if (arrCulturaBase) filtered = filtered.filter(p => p.arrendamento_info?.cultura_base?.toLowerCase().includes(arrCulturaBase.toLowerCase()));
      if (arrQtdSafras) filtered = filtered.filter(p => p.arrendamento_info?.qtd_safras && p.arrendamento_info?.qtd_safras >= Number(arrQtdSafras));
      if (arrMesInicioColheita) filtered = filtered.filter(p => p.arrendamento_info?.mes_inicio_colheita?.toString() === arrMesInicioColheita);
    }
    
    return filtered;
  }, [products, activeCategory, transactionType, filterState, filterCity, filterCodigo, filterStatus, minPrice, maxPrice, priceMode, minAreaTotal, selectedTipoAnuncio, maxAreaTotal, minAreaLavoura, soilType, clayContent, topography, docOnlyOk, filterAptidao, minPriceHa, maxPriceHa, minArgila, maxArgila, brandFilter, machineModelFilter, minYear, maxYear, maxHours, conservationState, precisionAgFilter, minPower, fuelType, planeTypeFilter, manufacturerFilter, minYearPlane, maxHoursPlane, anacHomologFilter, grainCulture, grainHarvest, grainQuality, minVolume, arrModalidade, arrAptidao, minArrArea, maxArrArea, arrCulturaBase, arrQtdSafras, arrMesInicioColheita, viewMode, minAreaProdutiva, maxAreaProdutiva, minPluviometria, minAltitude, minProdutividade, maxProdutividade, minRoi, maxRoi, minValorizacao, maxValorizacao, minPayback, maxPayback, minFaturamento, maxFaturamento]);

  // Chave que muda sempre que qualquer filtro muda — usada para resetar a janela virtual
  const filterKey = [
    activeCategory, transactionType, filterState, filterCity, filterCodigo, filterStatus,
    minPrice, maxPrice, priceMode, selectedTipoAnuncio,
    minAreaTotal, maxAreaTotal, minAreaLavoura, minAreaProdutiva, maxAreaProdutiva,
    minPluviometria, minAltitude, soilType, clayContent, topography, String(docOnlyOk),
    filterAptidao, minPriceHa, maxPriceHa, minArgila, maxArgila,
    brandFilter, machineModelFilter, minYear, maxYear, maxHours, conservationState, precisionAgFilter, minPower, fuelType,
    planeTypeFilter, manufacturerFilter, minYearPlane, maxHoursPlane, anacHomologFilter,
    grainCulture, grainHarvest, grainQuality, minVolume,
    arrModalidade, arrAptidao, minArrArea, maxArrArea, arrCulturaBase, arrQtdSafras, arrMesInicioColheita,
    minProdutividade, maxProdutividade, minRoi, maxRoi, minValorizacao, maxValorizacao,
    minPayback, maxPayback, minFaturamento, maxFaturamento,
  ].join('|');

  // Reseta janela virtual ao trocar filtros
  useEffect(() => {
    windowRef.current = { start: 0, end: PAGE_SIZE, spacer: 0 };
    setVisibleStart(0);
    setVisibleEnd(PAGE_SIZE);
    setTopSpacerHeight(0);
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver: carrega mais 10 ao scroll, remove os de cima quando >30 no DOM
  useEffect(() => {
    if (viewMode !== 'grid') return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const loadMore = () => {
      const { start, end, spacer } = windowRef.current;
      if (end >= filteredProducts.length) return;

      const newEnd = Math.min(end + PAGE_SIZE, filteredProducts.length);
      const toRemove = Math.max(0, (newEnd - start) - MAX_WINDOW);
      const newStart = start + toRemove;

      let newSpacer = spacer;
      if (toRemove > 0 && gridRef.current) {
        const cards = gridRef.current.querySelectorAll<HTMLElement>('[data-card]');
        if (cards.length > toRemove) {
          const firstCard = cards[0];
          const firstKept = cards[toRemove];
          newSpacer = spacer + (firstKept.getBoundingClientRect().top - firstCard.getBoundingClientRect().top);
        }
      }

      windowRef.current = { start: newStart, end: newEnd, spacer: newSpacer };
      setVisibleStart(newStart);
      setVisibleEnd(newEnd);
      setTopSpacerHeight(newSpacer);
    };

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '500px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, filteredProducts.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Observer de subida: carrega os 10 anteriores quando o sentinel do topo aparece
  useEffect(() => {
    if (viewMode !== 'grid') return;
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const loadPrev = () => {
      const { start, end, spacer } = windowRef.current;
      if (start === 0) return;

      const newStart = Math.max(0, start - PAGE_SIZE);
      const itemsToAdd = start - newStart;
      const newEnd = (end - newStart > MAX_WINDOW) ? end - itemsToAdd : end;

      prevDocHeightRef.current = document.documentElement.scrollHeight;
      pendingTopLoadRef.current = true;

      // Se voltamos ao início, spacer deve ser zero (sem itens removidos acima)
      const newSpacer = newStart === 0 ? 0 : spacer;
      windowRef.current = { start: newStart, end: newEnd, spacer: newSpacer };
      setVisibleStart(newStart);
      setVisibleEnd(newEnd);
      if (newStart === 0) setTopSpacerHeight(0);
    };

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadPrev(); },
      { rootMargin: '500px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, visibleStart]); // eslint-disable-line react-hooks/exhaustive-deps

  // Após adicionar itens no topo: ajusta scroll e reduz spacer para evitar pulo
  useLayoutEffect(() => {
    if (!pendingTopLoadRef.current) return;
    pendingTopLoadRef.current = false;

    const heightAdded = document.documentElement.scrollHeight - prevDocHeightRef.current;
    if (heightAdded > 0) {
      window.scrollBy(0, heightAdded);
      const newSpacer = Math.max(0, windowRef.current.spacer - heightAdded);
      windowRef.current.spacer = newSpacer;
      setTopSpacerHeight(newSpacer);
    }
  }, [visibleStart]); // dispara após visibleStart mudar

  const initGeneralMap = async () => {
    if (!mapContainerRef.current) return;
    if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
    }
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, attributionControl: false, center: [-15.78, -47.93], zoom: 4,
    });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg', { maxZoom: 19 }).addTo(map);
    
    mapLayersRef.current = {
        markers: L.layerGroup().addTo(map),
        heatmap: L.layerGroup().addTo(map)
    };

    mapInstance.current = map;
    renderMarkers();
  };

  const renderMarkers = async () => {
    if (!mapInstance.current || !mapLayersRef.current) return;

    // Cancela qualquer renderização anterior em andamento
    renderTokenRef.current.cancelled = true;
    const token = { cancelled: false };
    renderTokenRef.current = token;

    mapLayersRef.current.markers.clearLayers();
    mapLayersRef.current.heatmap.clearLayers();

    const grouped = filteredProducts.reduce((acc, p) => {
      const key = `${p.cidade}-${p.estado}`.toLowerCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {} as Record<string, Product[]>);

    const bounds = L.latLngBounds([]);
    let cacheUpdated = false;

    for (const key in grouped) {
      if (token.cancelled) return;

      const items = grouped[key];
      const firstItem = items[0];
      const searchTerm = `${firstItem.cidade}, ${firstItem.estado}, Brasil`;

      let rawCoords: [number, number] | null = geoCache.current[searchTerm] || null;

      if (!rawCoords) {
        const result = await geocodeWithRetry(searchTerm);
        if (token.cancelled) return;
        if (result) {
          rawCoords = result;
          geoCache.current[searchTerm] = result;
          cacheUpdated = true;
        } else {
          console.warn("Geocoding failed for:", key);
        }
      }

      const pos = rawCoords ? new L.LatLng(rawCoords[0], rawCoords[1]) : null;

      if (pos) {
        bounds.extend(pos);
        const hasMultiple = items.length > 1;
        const marker = L.marker(pos, {
          icon: L.divIcon({
            className: 'custom-pin',
            html: `
              <div class="group relative">
                <div class="bg-prylom-gold w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center transform group-hover:scale-110 transition-all">
                  <span class="text-xs text-white font-black">${hasMultiple ? items.length : 'P'}</span>
                </div>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white rounded-[2rem] shadow-3xl opacity-0 group-hover:opacity-100 transition-all pointer-events-auto w-64 border border-gray-100 overflow-hidden z-[500] invisible group-hover:visible" onwheel="event.stopPropagation()">
                  <div class="bg-prylom-dark p-4 border-b border-white/10">
                     <p class="text-[9px] font-black text-prylom-gold uppercase tracking-[0.2em] mb-1">${hasMultiple ? 'Múltiplos Ativos' : firstItem.categoria}</p>
                     <p class="text-xs font-bold text-white truncate">${hasMultiple ? `${firstItem.cidade}, ${firstItem.estado}` : firstItem.titulo}</p>
                  </div>
                  <div class="max-h-48 overflow-y-auto no-scrollbar p-2 space-y-1">
${items.map(p => {
  const pd = formatPriceParts(p.valor);
  
  // Lógica de exibição condicional para o Mapa
  const mapPriceHtml = p.tipo_transacao === 'arrendamento' 
    ? `<span class="text-[10px] font-black">${p.valor} SC / HA</span>` 
    : `<span class="text-[10px] font-bold">${pd.symbol} ${pd.value}</span>`;

  return `
  <div 
    class="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-2xl cursor-pointer transition-colors border border-transparent hover:border-gray-200"
    onclick="window.dispatchEvent(new CustomEvent('prylom-navigate', { detail: '${p.id}' }))"
  >
     <div class="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
        <img src="${p.main_image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=100'}" class="w-full h-full object-cover" />
     </div>
     <div class="flex-1 min-w-0">
        <p class="text-[10px] font-black text-prylom-dark truncate uppercase tracking-tighter">${p.titulo}</p>
        <p class="text-[10px] font-bold text-prylom-gold">${mapPriceHtml}</p>
     </div>
  </div>
`;}).join('')}
                  </div>
                  ${hasMultiple ? '' : `
                     <div class="p-3 bg-gray-50 border-t border-gray-100 text-center">
                        <p class="text-[8px] font-black text-gray-400 uppercase tracking-widest">Clique para Detalhes</p>
                     </div>
                  `}
                </div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        }).addTo(mapLayersRef.current.markers);

        if (!hasMultiple) {
          marker.on('click', () => onSelectProduct(firstItem.id));
        } else {
          marker.on('click', () => mapInstance.current?.setView(pos!, 12));
        }
      }
    }

    if (token.cancelled) return;

    if (cacheUpdated) persistGeoCache(geoCache.current);

    if (bounds.isValid() && mapInstance.current) {
        mapInstance.current.fitBounds(bounds, { padding: [100, 100], maxZoom: 12 });
    }
  };

  const categories = [
    { id: 'all', label: t.catAll },
    { id: 'fazendas', label: t.catFarms },
    { id: 'maquinas', label: t.catMachinery },
    { id: 'avioes', label: t.catPlanes },
    { id: 'graos', label: t.catGrains }
  ];

  const availableStates = useMemo(() => Array.from(new Set(products.map(p => p.estado))).sort(), [products]);
  const availableCities = useMemo(() => Array.from(new Set(products.filter(p => !filterState || p.estado === filterState).map(p => p.cidade))).sort(), [products, filterState]);

const ESTADOS_COORDINATES: Record<string, [number, number]> = {
  'AC': [-9.02, -70.81], 'AL': [-9.57, -36.78], 'AP': [1.41, -51.77], 'AM': [-3.41, -64.59],
  'BA': [-12.97, -38.50], 'CE': [-5.45, -39.32], 'DF': [-15.79, -47.88], 'ES': [-19.19, -40.34],
  'GO': [-15.82, -49.83], 'MA': [-5.42, -45.44], 'MT': [-12.64, -55.42], 'MS': [-20.51, -54.54],
  'MG': [-18.51, -44.55], 'PA': [-3.79, -52.48], 'PB': [-7.24, -36.78], 'PR': [-24.89, -51.55],
  'PE': [-8.28, -37.92], 'PI': [-7.71, -42.72], 'RJ': [-22.84, -43.15], 'RN': [-5.22, -36.52],
  'RS': [-30.01, -51.22], 'RO': [-11.50, -63.58], 'RR': [2.73, -62.07], 'SC': [-27.24, -50.21],
  'SP': [-23.55, -46.63], 'SE': [-10.90, -37.07], 'TO': [-10.17, -48.33]
};

const validarCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let add = 0;
  for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  add = 0;
  for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;
  return true;
};

const EquipeView = ({ t }: { t: any }) => {
  const [corretores, setCorretores] = useState<any[]>([]);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [selectedHead, setSelectedHead] = useState<HeadOperacaoItem | null>(null);
  const [showHeadModal, setShowHeadModal]   = useState(false);
  const [selectedCorretor, setSelectedCorretor] = useState<any>(null);
const [showModal, setShowModal] = useState(false);
const [showRegisterModal, setShowRegisterModal] = useState(false);
const [selectedGlobalMember, setSelectedGlobalMember] = useState<any>(null);
const [showGlobalModal, setShowGlobalModal] = useState(false);

// --- Estado do formulário de cadastro de corretor ---
const [regFields, setRegFields] = useState({ nome: '', cpf: '', telefone: '', email: '', regiao: '', vinculo: 'Corretor Direto', termos: false });
const [regDocStatus, setRegDocStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
const [regSmsSent, setRegSmsSent] = useState(false);
const [regSmsCode, setRegSmsCode] = useState('');
const [regIsVerifying, setRegIsVerifying] = useState(false);
const [regIsCodeValid, setRegIsCodeValid] = useState(false);
const [regCodeError, setRegCodeError] = useState(false);

useEffect(() => {
  const soNumeros = regFields.cpf.replace(/\D/g, '');
  if (soNumeros.length === 11) {
    setRegDocStatus(validarCPF(soNumeros) ? 'valid' : 'invalid');
  } else {
    setRegDocStatus('idle');
  }
}, [regFields.cpf]);

useEffect(() => {
  if (regSmsCode.length !== 6) return;
  const verificar = async () => {
    setRegIsVerifying(true);
    setRegCodeError(false);
    try {
      const response = await fetch("https://webhook.saveautomatik.shop/webhook/validaCodigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: regFields.telefone.replace(/\D/g, ""), codigo: regSmsCode }),
      });
      const data = await response.json();
      const isValid = String(data.valid).toLowerCase() === "true";
      if (isValid) { setRegIsCodeValid(true); setRegCodeError(false); }
      else { setRegIsCodeValid(false); setRegCodeError(true); alert("Código incorreto ou expirado."); }
    } catch { setRegCodeError(true); }
    finally { setRegIsVerifying(false); }
  };
  verificar();
}, [regSmsCode, regFields.telefone]);

const handleRegDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let value = e.target.value.replace(/\D/g, "");
  value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  setRegFields({ ...regFields, cpf: value });
};

const handleRegTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let v = e.target.value.replace(/\D/g, "");
  if (!v.startsWith("55")) v = "55" + v;
  v = v.slice(0, 13);
  v = v.replace(/^(\d{2})(\d{2})(\d)/g, "$1 ($2) $3");
  v = v.replace(/(\d)(\d{4})$/, "$1-$2");
  setRegFields({ ...regFields, telefone: v });
};

const handleRegSendCode = async () => {
  setRegIsVerifying(true);
  try {
    await fetch("https://webhook.saveautomatik.shop/webhook/validaWhatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefone: regFields.telefone.replace(/\D/g, ""), nome: regFields.nome, projeto: "Prylom Corretor Parceiro" }),
    });
    setRegSmsSent(true);
  } catch { setRegSmsSent(true); }
  finally { setRegIsVerifying(false); }
};

const isRegFormValid = useMemo(() => (
  regFields.nome.trim().length > 3 &&
  regDocStatus === 'valid' &&
  regFields.email.includes('@') &&
  regIsCodeValid &&
  regFields.termos
), [regFields, regDocStatus, regIsCodeValid]);
const handleOpenDetails = (corretor: any) => {
  setSelectedCorretor(corretor);
  setShowModal(true);
};
const handleOpenGlobalDetails = (member: any) => {
  setSelectedGlobalMember(member);
  setShowGlobalModal(true);
};

const globalFarmsTeam = [
  {
    id: 'gf-1',
    nome: 'António Ferreira',
    cargo: 'Senior Partner',
    funcao: 'M&A Cross-Border',
    pais: 'Portugal',
    cidade: 'Lisboa',
    bandeira: 'https://flagcdn.com/w80/pt.png',
    codigoPais: 'PT',
    status: 'Ativo',
    especialidade: 'Fusões & Aquisições · Ativos Agrícolas',
    idiomas: ['Português', 'Inglês', 'Espanhol'],
    descricao: 'António lidera a operação de M&A cross-border da Prylom para o mercado europeu, com foco em Portugal e mercados lusófonos. Com mais de 15 anos de experiência em ativos reais e agronegócio internacional, estrutura teses de investimento para fundos europeus interessados em ativos brasileiros de alta performance.\n\nSua atuação abrange desde o mapeamento de oportunidades em fazendas premium até o fechamento de transações estruturadas com parceiros institucionais em Lisboa, Porto e Madrid.',
    foto_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80',
  },
  {
    id: 'gf-2',
    nome: 'Rodrigo Villalba',
    cargo: 'Co-Broker Internacional',
    funcao: 'Originação & Campo',
    pais: 'Paraguai',
    cidade: 'Assunção',
    bandeira: 'https://flagcdn.com/w80/py.png',
    codigoPais: 'PY',
    status: 'Ativo',
    especialidade: 'Ativos Rurais · M&A Fronteiriço',
    idiomas: ['Espanhol', 'Português', 'Guarani'],
    descricao: 'Rodrigo opera na região de fronteira entre Brasil e Paraguai, uma das mais dinâmicas do agronegócio sul-americano. Como co-broker internacional credenciado pela Prylom, especializa-se na mediação de transações envolvendo propriedades rurais em zonas limítrofes e na captação de investidores paraguaios para ativos brasileiros.\n\nSua rede de relacionamentos inclui grandes produtores e latifundiários das regiões de Alto Paraná e Canindeyú, além de contatos estratégicos com câmaras de comércio bilaterais.',
    foto_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&q=80',
  },
  {
    id: 'gf-3',
    nome: 'Valentina Ríos',
    cargo: 'Deal Structurer',
    funcao: 'Estruturação Transacional',
    pais: 'Argentina',
    cidade: 'Buenos Aires',
    bandeira: 'https://flagcdn.com/w80/ar.png',
    codigoPais: 'AR',
    status: 'Ativo',
    especialidade: 'Estruturação · Compliance Internacional',
    idiomas: ['Espanhol', 'Inglês', 'Português'],
    descricao: 'Valentina atua na estruturação de transações internacionais e due diligence cross-border para a Prylom a partir de Buenos Aires. Com formação jurídica especializada em direito internacional e experiência em firmas de assessoria M&A, garante a conformidade regulatória de operações envolvendo investidores argentinos em ativos brasileiros.\n\nSua expertise em compliance e estruturas holding internacionais é fundamental para viabilizar operações de alta complexidade, especialmente em um contexto de crescente interesse do capital argentino pelo agronegócio brasileiro como reserva de valor.',
    foto_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80',
  },
  {
    id: 'gf-4',
    nome: 'Marco Salinas',
    cargo: 'Deal Originator',
    funcao: 'Originação Estratégica',
    pais: 'Bolívia',
    cidade: 'Santa Cruz',
    bandeira: 'https://flagcdn.com/w80/bo.png',
    codigoPais: 'BO',
    status: 'Ativo',
    especialidade: 'Agronegócio · Expansão de Fronteiras',
    idiomas: ['Espanhol', 'Português'],
    descricao: 'Marco atua como originador estratégico da Prylom para o mercado boliviano, com base em Santa Cruz de la Sierra — o maior polo agrícola da Bolívia. Especializa-se na captação de investidores bolivianos interessados em diversificar portfólio com ativos rurais certificados no Brasil.\n\nSua rede inclui grandes grupos agroindustriais do Oriente boliviano e contatos com câmaras de comércio bilateral que facilitam o fluxo de capital entre os dois países.',
    foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
  },
  {
    id: 'gf-5',
    nome: 'Alejandro Quispe',
    cargo: 'Investor Relations',
    funcao: 'Captação & Estruturação',
    pais: 'Peru',
    cidade: 'Lima',
    bandeira: 'https://flagcdn.com/w80/pe.png',
    codigoPais: 'PE',
    status: 'Ativo',
    especialidade: 'Capital Andino · Alternative Assets',
    idiomas: ['Espanhol', 'Inglês', 'Português'],
    descricao: 'Alejandro é o representante da Prylom no Peru, conectando family offices e fundos de investimento peruanos ao deal flow de ativos reais brasileiros. Com passagem por gestoras de Lima e experiência no mercado de capitais andino, possui domínio da estruturação de veículos de investimento para o contexto regulatório peruano.\n\nLidera roadshows periódicos em Lima e Arequipa, posicionando fazendas certificadas do Brasil como destino estratégico de alocação para investidores que buscam proteção patrimonial em ativos tangíveis.',
    foto_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  },
  {
    id: 'gf-6',
    nome: 'Isabella Moreno',
    cargo: 'Strategic Advisor',
    funcao: 'Advisory & Relacionamento',
    pais: 'Colômbia',
    cidade: 'Bogotá',
    bandeira: 'https://flagcdn.com/w80/co.png',
    codigoPais: 'CO',
    status: 'Ativo',
    especialidade: 'Agri-Finance · M&A Colombia-Brasil',
    idiomas: ['Espanhol', 'Inglês', 'Português'],
    descricao: 'Isabella representa a Prylom na Colômbia, um dos mercados com maior crescimento de interesse por ativos reais no Brasil. Com background em finanças corporativas e passagem por bancos de investimento em Bogotá e Medellín, estrutura pontes entre capital colombiano e oportunidades premium do agronegócio brasileiro.\n\nSua atuação foca especialmente na conversão de grandes produtores rurais colombianos e family offices de Bogotá em investidores estratégicos de fazendas no Cerrado e Pantanal.',
    foto_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80',
  },
  {
    id: 'gf-7',
    nome: 'Rafael Ortega',
    cargo: 'Co-Broker Internacional',
    funcao: 'Originação & Campo',
    pais: 'Venezuela',
    cidade: 'Caracas',
    bandeira: 'https://flagcdn.com/w80/ve.png',
    codigoPais: 'VE',
    status: 'Ativo',
    especialidade: 'Preservação Patrimonial · Ativos Reais',
    idiomas: ['Espanhol', 'Inglês', 'Português'],
    descricao: 'Rafael atua como co-broker internacional da Prylom para a comunidade venezuelana, tanto no país quanto na diáspora. Em um contexto de forte demanda por proteção patrimonial, especializa-se em posicionar ativos rurais brasileiros como reserva de valor sólida e juridicamente blindada para investidores venezuelanos.\n\nSua rede abrange empresários e famílias de alto patrimônio líquido radicados em Caracas, Miami, Bogotá e Lisboa, conectando capital disperso da diáspora a oportunidades estruturadas de longo prazo no Brasil.',
    foto_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80',
  },
];

  useEffect(() => {
    const fetchCorretores = async () => {
      const { data } = await supabase.from('corretores').select('*');
      if (data) setCorretores(data);
    };
    fetchCorretores();
  }, []);

  const GEOJSON_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";
// No início do seu useEffect do Mapa
useEffect(() => {
  if (!mapContainerRef.current || mapInstance.current) return;

  // 1. Inicializa o mapa
const map = L.map(mapContainerRef.current, {
  zoomControl: false,
  attributionControl: false,
  center: [-19.78, -58.50],  // ajustado: mais para o centro geográfico do Brasil
  zoom: 3.4,
  zoomSnap: 0.1,             // permite incrementos de 0.1
  zoomDelta: 0.1,            // cada scroll move 0.1
  scrollWheelZoom: false,
  fadeAnimation: true
});

  // 2. Camada de Satélite (O fundo)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg', {
  maxZoom: 19,
  opacity: 1, // 0 = invisível, 1 = totalmente opaco — ajuste aqui
}).addTo(map);

  // 3. Camada de Fronteiras (GeoJSON) - Com tratamento de erro
  fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson")
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        L.geoJSON(data, {
          style: {
            color: "rgba(212, 175, 55, 0.4)", // Dourado suave
            weight: 0.8,
            fillColor: "transparent", // Garante que o fundo não fique preto
            fillOpacity: 0
          }
        }).addTo(map);
      }
    })
    .catch(err => console.error("Erro ao carregar fronteiras, mantendo apenas satélite."));

  mapInstance.current = map;

  // 4. Renderiza os marcadores e força o tamanho correto
  setTimeout(() => {
    map.invalidateSize();
    if (corretores.length > 0) renderStaticMarkers(map);
  }, 500);

  return () => {
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }
  };
}, [corretores]);
  const renderStaticMarkers = (map: L.Map) => {
    const bounds = L.latLngBounds([]);

    // Agrupa corretores por estado
    const grouped = corretores.reduce((acc: Record<string, any[]>, c: any) => {
      const uf = c.estado?.toUpperCase().trim();
      if (!acc[uf]) acc[uf] = [];
      acc[uf].push(c);
      return acc;
    }, {});

    Object.keys(grouped).forEach(uf => {
      const coords = ESTADOS_COORDINATES[uf];
      const lista = grouped[uf];

      if (coords) {
        bounds.extend(coords);
        L.marker(coords, {
          icon: L.divIcon({
            className: 'custom-pin',
            html: `
              <div class="group relative">
                <div class="bg-prylom-gold w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                  <span class="text-[9px] text-white font-black">${lista.length}</span>
                </div>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-prylom-dark text-white p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[1000] invisible group-hover:visible min-w-[100px] border border-prylom-gold/30">
                  <p class="text-[7px] font-black text-prylom-gold uppercase mb-1">Polo ${uf}</p>
                  ${lista.map((c: any) => `<p class="text-[8px] truncate border-t border-white/10 pt-1">${c.nome}</p>`).join('')}
                </div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(map);
      }
    });

  //  if (bounds.isValid()) {
   //   map.fitBounds(bounds, { padding: [50, 50] });
   // }
  };
// Filtra especificamente pelo cargo salvo no banco
const parceirosCredenciados = corretores.filter(c => c.cargo === "Co-Broker");
const equipeOriginaçao = corretores.filter(c => c.cargo === "Originador Estratégico");

// Mantém o cálculo de slots apenas para estética, se desejar
const slotsFaltantes = Math.max(0, 4 - parceirosCredenciados.length);

const headOperacao: HeadOperacaoItem[] = [
  { 
    subcategoria: "Jurídico",
    icone: "⚖️",
    nome: "Dr. Marcos Vieira",
    cargo: "Head Jurídico",
    creci: "OAB/SP 123456",
    estado: "SP",
    foto_url: null,
    descricao: "Apoio jurídico integral à Mesa de Operações e Due Diligence.",
  },
  {
    subcategoria: "Fazendas",
    icone: "🌾",
    nome: "Roberto Castilho",
    cargo: "Head Fazendas",
    creci: "CRECI/MT 78901",
    estado: "MT",
    foto_url: null,
    descricao: "Gestão e intermediação de ativos rurais de grande porte.",
  },
  {
    subcategoria: "Máquinas",
    icone: "🚜",
    nome: "Carlos Drummond",
    cargo: "Head Máquinas",
    creci: "CRECI/GO 45678",
    estado: "GO",
    foto_url: null,
    descricao: "Avaliação e comercialização de maquinário agrícola e industrial.",
  },
  {
    subcategoria: "Grãos",
    icone: "🌽",
    nome: "Fernanda Lopes",
    cargo: "Head Grãos",
    creci: "CRECI/MS 23456",
    estado: "MS",
    foto_url: null,
    descricao: "Estruturação de operações de compra e venda de commodities.",
  },
  {
    subcategoria: "Aeronave",
    icone: "✈️",
    nome: "Henrique Saraiva",
    cargo: "Head Aeronave",
    creci: "ANAC 987654",
    estado: "SP",
    foto_url: null,
    descricao: "Intermediação e avaliação de aeronaves executivas e agrícolas.",
  },
];

interface HeadOperacaoItem {
  subcategoria: string;
  icone: string;
  nome: string;
  cargo: string;
  creci: string;
  estado: string;
  foto_url: string | null;
  descricao: string;
}

const HeadOperacaoCard: React.FC<{
  item: HeadOperacaoItem;
  onClick: () => void;          // ← NOVO: recebe handler do pai
}> = ({ item, onClick }) => {
  return (
    <div
      onClick={onClick}          // ← NOVO: dispara o modal
      className="flex-1 min-w-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl group cursor-pointer"
    >
      {/* Topo colorido */}
      <div className="bg-[#2c5363] px-3 py-2 flex flex-col items-center gap-0.5">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/65">
          {/* CORREÇÃO: era text-white/50 (muito claro) → agora text-white/65 */}
          Head Operação
        </span>
        <span
          className="text-[11px] font-black uppercase tracking-tight text-center"
          style={{
            background: "linear-gradient(to bottom, #FFD700 0%, #B8860B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {item.subcategoria}
        </span>
      </div>
 
      {/* Foto / ícone */}
      <div className="bg-[#2c5363] flex justify-center items-end pb-0 px-3 h-16 relative">
        <div className="w-12 h-14 bg-gray-300/30 rounded-t-lg overflow-hidden border-2 border-white/20 flex items-center justify-center">
          {item.foto_url ? (
            <img
              src={item.foto_url}
              className="w-full h-full object-cover"
              alt={item.nome}
            />
          ) : (
            <span className="text-xl opacity-50">{item.icone}</span>
            // CORREÇÃO: era opacity-30 → agora opacity-50 (ícone mais visível)
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
      </div>
 
      {/* Dados */}
      <div className="p-2 space-y-1 flex-1 bg-white">
        {/* CORREÇÃO: era text-[#2c5363] → agora text-[#1a3a48] (mais escuro, melhor contraste) */}
        <p className="text-[9px] leading-tight text-[#1a3a48] font-extrabold uppercase truncate">
          {item.nome}
        </p>
 
        {/* CORREÇÃO: era text-gray-500 → agora text-[#3d5a6b] (mais escuro) */}
        <p className="text-[8px] leading-tight text-[#3d5a6b] truncate">
          <span className="font-bold text-[#2c5363]">Cargo:</span> {item.cargo}
        </p>
 
        {/* CORREÇÃO: era text-gray-500 → agora text-[#3d5a6b] */}
        <p className="text-[8px] leading-tight text-[#3d5a6b] truncate">
          <span className="font-bold text-[#2c5363]">Credencial:</span> {item.creci}
        </p>
 
        {/* CORREÇÃO: era text-gray-400 → agora text-[#4a6070] (mais escuro, leitura confortável) */}
        <p className="text-[8px] leading-tight text-[#4a6070] pt-1 border-t border-gray-100 line-clamp-2">
          {item.descricao}
        </p>
 
        {/* NOVO: indicador visual de clicável */}
        <p className="text-[7px] font-black text-[#2c5363]/60 uppercase tracking-widest pt-1">
          Ver detalhes →
        </p>
      </div>
    </div>
  );
};
<style> </style>

const BANDEIRA_URL = (uf: string) =>
  `https://cdn.jsdelivr.net/gh/akagabi/bandeira-dos-estados-do-brasil@master/${uf.toLowerCase()}.svg`;
const [showAcademyModal, setShowAcademyModal] = useState(false);


const HeadModal: React.FC<{
  item: HeadOperacaoItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-[95vw] max-w-[1100px] rounded-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-8 right-10 z-[100] text-gray-400 hover:text-[#bba219] transition-colors text-2xl font-light"
        >
          ✕
        </button>

        {/* ── CABEÇALHO ── */}
        <div className="pt-12 pb-6 px-12 text-center shrink-0">
          <h4
            className="text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-none mb-2"
            style={{
              background: 'linear-gradient(to bottom, #FFD700 0%, #B8860B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Head de Operação
          </h4>
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-[#bba219]/40" />
            <p className="text-[#bba219] font-bold text-[10px] uppercase tracking-[0.3em]">
              {item.subcategoria}
            </p>
            <span className="h-px w-10 bg-[#bba219]/40" />
          </div>
        </div>

        {/* ── CORPO ── */}
        <div className="overflow-y-auto flex-1 px-10 md:px-14 py-8">
          {/* Grid sem alignItems para o stretch funcionar no row de conteúdo */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: '0 40px' }}>

            {/* ─── ROW 1: TÍTULOS — align-self: start para não esticar ─── */}
            <div style={{ alignSelf: 'start', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1a3a48', lineHeight: 1.3 }}>
                {item.nome}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 700, color: '#bba219', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {item.cargo}
              </p>
            </div>
            <div style={{ alignSelf: 'start', borderBottom: '1px solid #f0f0f0', paddingBottom: 12, marginBottom: 16 }}>
              <h5 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1a3a48', letterSpacing: '-0.01em' }}>
                Trajetória: <span style={{ color: '#bba219' }}>{item.nome}</span>
              </h5>
            </div>
            <div style={{ alignSelf: 'start', borderBottom: '1px solid #f0f0f0', paddingBottom: 12, marginBottom: 16 }}>
              <h5 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1a3a48', letterSpacing: '-0.01em' }}>
                Mesa de Operações
              </h5>
            </div>

            {/* ─── ROW 2: CREDENCIAIS ─── */}
            <div style={{ alignSelf: 'start', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ margin: 0, fontSize: 10.5, color: '#4a5568', fontWeight: 600 }}>
                <span style={{ color: '#2c5363', fontWeight: 700 }}>Credencial:</span> {item.creci}
              </p>
              <p style={{ margin: 0, fontSize: 10.5, color: '#4a5568', fontWeight: 600 }}>
                <span style={{ color: '#2c5363', fontWeight: 700 }}>Estado:</span> {item.estado}
              </p>
            </div>
            <div style={{ alignSelf: 'start' }} />
            <div style={{ alignSelf: 'start' }} />

            {/* ─── ROW 3: CONTEÚDO — stretch padrão, foto preenche a altura do texto ─── */}

            {/* Foto: display flex + height 100% para esticar */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                flex: 1,
                border: '1px solid #f0f0f0',
                padding: '10px',
                background: '#fff',
                borderRadius: '4px',
                boxShadow: '0 15px 35px -15px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {item.foto_url ? (
                  <img
                    src={item.foto_url}
                    alt={item.nome}
                    style={{ flex: 1, width: '100%', objectFit: 'cover', display: 'block', minHeight: 240 }}
                  />
                ) : (
                  <div style={{
                    flex: 1,
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #1a3a48 0%, #2c5363 100%)',
                    gap: 14,
                    borderRadius: 2,
                  }}>
                    <span style={{ fontSize: 56 }}>{item.icone}</span>
                    <span style={{ color: '#bba219', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      {item.subcategoria}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Central */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px', fontSize: '13.5px', color: '#4a5568', lineHeight: '1.8', textAlign: 'justify', fontWeight: 500 }}>
              <p style={{ margin: 0 }}>
                <strong>A Função :</strong> É o cérebro tático e o filtro primário da Prylom. Centraliza todas as negociações de entrada e atua em alinhamento direto com o Head de Operação Jurídica, garantindo que nenhum ativo seja listado e nenhum investidor avance sem o carimbo absoluto de Compliance, COAF e LGPD.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Filtro de Ativos :</strong> Recepciona as propriedades originadas por corretores ou proprietários. Realiza a curadoria minuciosa das informações, ajusta e formaliza a Autorização de Venda e blinda os dados sensíveis antes de cadastrar o ativo em nossa plataforma.
              </p>
            </div>

            {/* Coluna Direita */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px', fontSize: '13.5px', color: '#4a5568', lineHeight: '1.8', textAlign: 'justify', fontWeight: 500 }}>
              <p style={{ margin: 0 }}>
                <strong>Filtro de Compradores :</strong> Conduz o atendimento e a negociação inicial com os investidores interessados. Aplica rigorosamente os protocolos de Know Your Customer (KYC - Conheça Seu Cliente) em conjunto com as normas de Prevenção à Lavagem de Dinheiro (COAF) e qualificação financeira de perfil. O cliente só é liberado para a visita de campo com o corretor local quando estiver 100% validado e pronto para a aquisição.
              </p>
              <div style={{
                fontStyle: 'italic',
                borderLeft: '3px solid #bba219',
                padding: '16px 20px',
                background: '#fcfcfc',
                color: '#1a3a48',
                fontSize: '13px',
                fontWeight: '600',
                lineHeight: '1.6',
                borderRadius: '0 8px 8px 0',
              }}>
                "O campo revela a oportunidade, mas é a governança da Mesa de Operações que consolida o negócio. Pautados por nossos princípios de ética e excelência, garantimos que cada visita seja uma agenda estratégica e cada ativo listado seja um legado protegido."
              </div>
            </div>

          </div>
        </div>

        {/* RODAPÉ TRICOLOR */}
        <div style={{ height: 6, width: '100%', display: 'flex', flexShrink: 0 }}>
          <div style={{ flex: 2, background: '#bba219' }} />
          <div style={{ flex: 1, background: '#1a3a48' }} />
          <div style={{ flex: 1, background: '#e2e8f0' }} />
        </div>

      </div>
    </div>,
    document.body
  );
};

  return (
<>
    <style>{`
      @keyframes scrollLoop {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }

      .animate-scroll {
        display: flex;
        width: max-content;
        animation: scrollLoop 10s linear infinite;
      }

      .animate-scroll:hover {
        animation-play-state: paused; 
      }
    `}</style>
{showModal && selectedCorretor && createPortal(
  <div 
    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    onClick={() => setShowModal(false)}
  >
    <div 
      className="bg-white w-[95vw] max-w-[1350px] rounded-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden animate-scaleUp border border-white/20"
      style={{ maxHeight: '90vh' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Botão Fechar - Ajustado para não colidir com o arredondamento */}
      <button 
        onClick={() => setShowModal(false)}
        className="absolute top-8 right-10 z-[100] text-gray-400 hover:text-prylom-gold transition-colors text-3xl font-light"
      >
        ✕
      </button>

      {/* Conteúdo Horizontal */}
      <div className="p-10 md:p-14 lg:p-20 overflow-y-auto">
        <div className="flex flex-col md:flex-row gap-12 lg:gap-16 items-start">
          
          {/* FOTO - Agora com cantos arredondados para suavizar o visual */}
          <div className="w-56 lg:w-72 shrink-0">
            <div className="aspect-[3/4] shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
              <img 
                src={selectedCorretor.foto_url} 
                className="w-full h-full object-cover" 
                alt={selectedCorretor.nome} 
              />
            </div>
          </div>

          {/* TEXTO */}
          <div className="flex-1 min-w-0">
            <div className="mb-8">
              <h4 className="text-4xl lg:text-5xl font-black text-prylom-dark uppercase tracking-tighter leading-none mb-4">
                {selectedCorretor.nome}
              </h4>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-prylom-gold"></span>
                <p className="text-prylom-gold font-bold text-sm uppercase tracking-[0.2em]">
                  {selectedCorretor.cargo} — POLO {selectedCorretor.estado}
                </p>
              </div>
            </div>

            {/* BIO TEXTO em Colunas */}
            <div className="text-gray-500 text-base lg:text-lg leading-relaxed lg:columns-2 gap-12 border-t border-gray-50 pt-10">
              {selectedCorretor.descricao ? (
                selectedCorretor.descricao.split('\n').map((p: string, i: number) => (
                  <p key={i} className="mb-4 text-justify whitespace-pre-line font-medium">
                    {p}
                  </p>
                ))
              ) : (
                <p className="italic opacity-60">Especialista estratégico em ativos reais focado na inteligência territorial Prylom.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detalhe estético inferior (Opcional, mas mantém a identidade) */}
      <div className="h-2 w-full bg-gray-50 shrink-0">
        <div className="h-full w-1/3 bg-prylom-gold rounded-r-full"></div>
      </div>
    </div>
  </div>,
  document.body
)}

{showGlobalModal && selectedGlobalMember && createPortal(
  <div
    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm"
    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(5,15,25,0.95)' }}
    onClick={() => setShowGlobalModal(false)}
  >
    <div
      className="w-[95vw] max-w-[900px] rounded-[2rem] relative flex flex-col overflow-hidden animate-scaleUp"
      style={{
        maxHeight: '90vh',
        background: 'linear-gradient(135deg, #0a1f2e 0%, #0d2d3e 60%, #071820 100%)',
        border: '1px solid rgba(184,134,11,0.3)',
        boxShadow: '0 0 80px rgba(184,134,11,0.15), 0 25px 60px rgba(0,0,0,0.6)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Linha dourada topo */}
      <div className="h-[2px] w-full shrink-0" style={{ background: 'linear-gradient(90deg, transparent, #B8860B, #FFD700, #B8860B, transparent)' }} />

      {/* Botão fechar */}
      <button
        onClick={() => setShowGlobalModal(false)}
        className="absolute top-5 right-6 z-50 text-white/30 hover:text-prylom-gold transition-colors text-2xl font-light"
      >✕</button>

      <div className="p-8 md:p-12 overflow-y-auto">
        <div className="flex flex-col md:flex-row gap-10 items-start">

          {/* COLUNA ESQUERDA — foto + meta */}
          <div className="flex flex-col items-center gap-4 shrink-0 w-full md:w-52">
            {/* Avatar */}
            <div className="w-40 h-48 rounded-2xl overflow-hidden border-2 bg-white/5 flex items-center justify-center shadow-2xl" style={{ borderColor: 'rgba(184,134,11,0.4)' }}>
              {selectedGlobalMember.foto_url ? (
                <img src={selectedGlobalMember.foto_url} className="w-full h-full object-cover" alt={selectedGlobalMember.nome} />
              ) : (
                <span className="text-6xl opacity-20">👤</span>
              )}
            </div>

            {/* Bandeira + País */}
            <div className="flex flex-col items-center gap-1.5">
              <img
                src={selectedGlobalMember.bandeira}
                alt={selectedGlobalMember.pais}
                className="w-14 h-auto rounded-lg shadow-lg border border-white/20"
                onError={(e: any) => { e.target.style.display = 'none'; }}
              />
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">{selectedGlobalMember.pais}</p>
              <p className="text-white/30 text-[9px]">📍 {selectedGlobalMember.cidade}</p>
            </div>

            {/* Status */}
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider">{selectedGlobalMember.status}</span>
            </div>

            {/* Idiomas */}
            <div className="w-full">
              <p className="text-white/30 text-[9px] uppercase tracking-wider mb-2 text-center font-bold">Idiomas</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {selectedGlobalMember.idiomas?.map((lang: string) => (
                  <span key={lang} className="text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(184,134,11,0.15)', color: '#B8860B', border: '1px solid rgba(184,134,11,0.2)' }}>
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA — nome, cargo, bio */}
          <div className="flex-1 min-w-0">
            {/* Badge Global Farms */}
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full"
              style={{ background: 'rgba(184,134,11,0.1)', border: '1px solid rgba(184,134,11,0.2)' }}>
              <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: '#B8860B' }}>
                Prylom Global Farms
              </span>
            </div>

            <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none text-white mb-1">
              {selectedGlobalMember.nome}
            </h3>
            <div className="flex items-center gap-3 mb-1">
              <span className="h-px w-6" style={{ background: '#B8860B' }} />
              <p className="text-[12px] font-bold uppercase tracking-[0.15em]" style={{ color: '#B8860B' }}>
                {selectedGlobalMember.cargo}
              </p>
            </div>
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mb-6">
              {selectedGlobalMember.funcao}
            </p>

            {/* Especialidade */}
            <div className="mb-6 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest mb-1">Especialidade</p>
              <p className="text-white/70 text-[11px] font-semibold">{selectedGlobalMember.especialidade}</p>
            </div>

            {/* Bio */}
            <div className="border-t pt-6" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {selectedGlobalMember.descricao?.split('\n').map((para: string, i: number) => (
                para.trim() && (
                  <p key={i} className="text-white/50 text-sm leading-relaxed mb-4 font-medium text-justify">
                    {para}
                  </p>
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé dourado */}
      <div className="h-[2px] w-full shrink-0" style={{ background: 'linear-gradient(90deg, transparent, #B8860B 40%, transparent)' }} />
    </div>
  </div>,
  document.body
)}

{showAcademyModal && createPortal(
  <div
    className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
    onClick={() => setShowAcademyModal(false)}
  >
    <div
      className="bg-white w-[95vw] max-w-[1100px] rounded-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden border border-white/20"
      style={{ maxHeight: '92vh' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Botão Fechar */}
      <button
        onClick={() => setShowAcademyModal(false)}
        className="absolute top-6 right-8 z-[100] text-gray-400 hover:text-prylom-gold transition-colors text-2xl font-light"
      >
        ✕
      </button>

      {/* ── CABEÇALHO ── */}
      <div className="pt-8 pb-5 px-12 text-center border-b border-gray-100 shrink-0">
        <h4
          className="text-4xl lg:text-5xl font-black uppercase tracking-tighter leading-none mb-2"
          style={{
            background: 'linear-gradient(to bottom, #FFD700 0%, #B8860B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Prylom Academy
        </h4>
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-prylom-gold" />
          <p className="text-prylom-gold font-bold text-[10px] uppercase tracking-[0.25em]">
            Educação Corporativa — Hub de Performance
          </p>
          <span className="h-px w-8 bg-prylom-gold" />
        </div>
      </div>

      {/* ── CORPO ── */}
      <div className="overflow-y-auto flex-1 px-10 md:px-12 py-8">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 1fr',
            gridTemplateRows: 'auto 1fr',
            gap: '0 40px',
          }}
        >

          {/* ─── LINHA 1: TÍTULOS ─── */}

          {/* Col 1 linha 1: vazia */}
          <div style={{ gridColumn: 1, gridRow: 1 }} />

          {/* Col 2 linha 1: Título Trajetória — bold, cor dourada, sentence case como na imagem */}
          <div style={{ gridColumn: 2, gridRow: 1, paddingBottom: 14, marginBottom: 14 }}>
            <h5 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: '#bba219',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              Trajetória: <span style={{ color: '#1a3a48' }}>Lidia Costa</span>
            </h5>
          </div>

          {/* Col 3 linha 1: Título Legado — mesmo estilo exato */}
          <div style={{ gridColumn: 3, gridRow: 1, paddingBottom: 14, marginBottom: 14 }}>
            <h5 style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: '#1a3a48',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}>
              Legado Prylom Academy
            </h5>
          </div>

          {/* ─── LINHA 2: CONTEÚDO ─── */}

          {/* Col 1 linha 2: Card + Foto */}
          <div style={{ gridColumn: 1, gridRow: 2, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              background: '#2c5363',
              borderRadius: '12px 12px 0 0',
              padding: '20px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: 44, lineHeight: 1, marginBottom: 10 }}>🎓</span>
              <h5 style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ffffff', lineHeight: 1.3, margin: 0 }}>
                Elite <br /> Performance
              </h5>
              <div style={{ marginTop: 12, height: 2, width: 32, background: '#bba219', borderRadius: 1 }} />
            </div>
            <div style={{
              border: '2px solid #2c5363',
              borderTop: 'none',
              borderRadius: '0 0 12px 12px',
              overflow: 'hidden',
            }}>
              <img
                src={lidia}
                alt="Lidia Costa"
                style={{ width: '100%', height: 260, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
              />
            </div>
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <p style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#2c5363', margin: 0 }}>
                Lidia Costa
              </p>
              <p style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#bba219', margin: 0 }}>
                Head of Academy
              </p>
            </div>
          </div>

          {/* Col 2 linha 2: Texto Trajetória */}
          <div style={{
            gridColumn: 2,
            gridRow: 2,
            fontSize: 13.5,
            color: '#2d2d2d',
            lineHeight: 1.8,
            fontWeight: 400,
            textAlign: 'justify',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            <p style={{ margin: 0 }}>
              A <strong>Prylom Academy</strong> nasceu da necessidade de padronizar a excelência e blindar a nossa cultura. Em um mercado de altíssima complexidade, a verdadeira diferenciação não vem apenas da tecnologia, mas do caráter, da inteligência e da execução impecável de quem a opera. Entendemos que ferramentas só são poderosas quando comandadas por mentes brilhantes.
            </p>
            <p style={{ margin: 0 }}>
              Por isso, o nosso hub não é uma escola de vendas; é um centro de formação contínua, estruturado sobre três pilares inegociáveis:
            </p>
            <p style={{ margin: 0 }}>
              <strong>1. Princípios e Valores Organizacionais (O Nosso DNA):</strong> A base de todo o nosso ecossistema. Forjamos profissionais guiados pela ética absoluta, transparência e governança institucional. Aqui, a cultura do Compliance, o respeito ao sigilo e a proteção do legado do cliente vêm antes de qualquer transação.
            </p>
            <p style={{ margin: 0 }}>
              <strong>2. Desenvolvimento Pessoal (A Mente Executiva):</strong> Negociar na alta roda do mercado exige mais do que planilhas. Preparamos o indivíduo de dentro para fora, focando em inteligência emocional, oratória de alto nível, resiliência e postura corporativa. O profissional Prylom cresce como ser humano para dominar qualquer mesa de negociação.
            </p>
          </div>

          {/* Col 3 linha 2: Texto Legado */}
          <div style={{
            gridColumn: 3,
            gridRow: 2,
            fontSize: 13.5,
            color: '#2d2d2d',
            lineHeight: 1.8,
            fontWeight: 400,
            textAlign: 'justify',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}>
            <p style={{ margin: 0 }}>
              <strong>3. Excelência Profissional (A Máquina e a Técnica):</strong> O domínio do ofício. Nossos módulos técnicos garantem o domínio completo da plataforma, aprofundando em Inteligência Territorial, geoprocessamento, viabilidade financeira corporativa e as nuances da legislação do agronegócio.
            </p>

            {/* Citação — borda esquerda dourada, fundo levemente acinzentado, itálico */}
            <p style={{
              margin: 0,
              fontStyle: 'italic',
              borderLeft: '3px solid #bba219',
              paddingLeft: 14,
              paddingTop: 10,
              paddingBottom: 10,
              background: '#f9fafb',
              color: '#2d2d2d',
              borderRadius: '0 4px 4px 0',
              lineHeight: 1.7,
            }}>
              "Não treinamos corretores, capacitamos arquitetos de negócios imobiliários. A Academy é onde os nossos valores inegociáveis encontram a prática implacável da Prylom."
            </p>

            <p style={{ margin: 0 }}>
              Ao final de cada ciclo, os membros são certificados em Performance Nacional, garantindo que a cultura de resultados, a ética e a excelência técnica da Sede sejam replicadas de forma idêntica em cada polo de atuação no Brasil.
            </p>
          </div>

        </div>
      </div>

      {/* ── RODAPÉ TRICOLOR ── */}
      <div style={{ height: 6, width: '100%', display: 'flex', flexShrink: 0 }}>
        <div style={{ flex: 2, background: '#bba219' }} />
        <div style={{ flex: 1, background: '#2c5363' }} />
        <div style={{ flex: 1, background: '#dce8ee' }} />
      </div>

    </div>
  </div>,
  document.body
)}


    <div className="w-full py-10 px-6 bg-[#F4F5F7] min-h-screen animate-fadeIn font-sans">
      <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] border border-white overflow-hidden">
        
{/* 1. Header & Mapa */}
{/* 1. Header & Mapa */}
<div className="relative flex flex-col md:flex-row overflow-hidden bg-prylom-dark" style={{ minHeight: 320 }}>

  {/* Fundos decorativos */}
  <div className="absolute inset-0 bg-cover bg-center opacity-30 z-0" style={{ backgroundImage: `url(/assets/agro_brasil.jpg)` }} />
  <div className="absolute inset-0 bg-gradient-to-r from-prylom-dark via-prylom-dark/80 to-transparent z-0" />

  {/* COLUNA DE TEXTO
      - padding aplicado somente aqui, não no container pai
      - pr reduzido para não sobrepor o mapa (md:pr-8 + largura do mapa = 24rem) */}
  <div
    className="flex-1 space-y-5 relative z-10 p-10 md:p-14"
    style={{ paddingRight: '27rem' }} // empurra o texto para não ficar atrás do mapa
  >
    <div className="inline-flex items-center gap-2 bg-prylom-gold/20 border border-prylom-gold/30 px-3 py-1 rounded-full backdrop-blur-sm">
      <span className="text-[9px] font-black text-prylom-gold uppercase tracking-[0.2em]">Presença Nacional</span>
    </div>

    <h1 className="text-3xl md:text-4xl font-[950] text-white leading-[1.1] tracking-tighter uppercase">
      Equipe de <br/>
      <span className="text-prylom-gold italic">Originação Estratégica</span>
    </h1>

    <p className="text-white text-xs md:text-sm font-semibold leading-relaxed opacity-90 text-justify">
      O mercado de ativos reais 'Deep Market' exige mais do que intermediação; exige presença territorial e
      relacionamento de alto nível. A PRYLOM opera apoiada por uma equipe de originação de elite, composta por
      Originadores Estratégicos, Consultores Agronômicos, Gestores Locais e Parceiros Credenciados (Co-Brokers)
      distribuídos nos principais polos do agronegócio brasileiro.
    </p>

    <p className="text-white text-xs md:text-sm font-semibold leading-relaxed opacity-90 text-justify">
      {">"} Nossa equipe de campo atua exclusivamente no
      mapeamento de oportunidades, prospecção direta com proprietários e logística executiva in loco. Toda a
      estruturação documental, due diligence, formatação de teses e o fechamento transacional (M&A/Closing) são
      centralizados e executados exclusivamente pela Mesa de Operações da Prylom, garantindo rigoroso compliance
      regulatório e segurança absoluta para os investidores.
    </p>
  </div>

  {/* MAPA — posição absoluta, cola em top/right/bottom
      Isso ignora completamente o padding do pai e ocupa a altura total */}
  <div
    className="hidden md:block absolute top-0 right-0 bottom-0 z-10"
    style={{ width: '24rem' }}
  >
    {/* Gradiente de fusão na borda esquerda do mapa */}
    <div
      className="absolute inset-y-0 left-0 w-10 z-20 pointer-events-none"
      style={{ background: 'linear-gradient(to right, #1a2e35, transparent)' }}
    />

    {/* Label flutuante */}
    <div className="absolute top-3 left-5 z-30 bg-prylom-dark/80 backdrop-blur-md border border-prylom-gold/30 px-2 py-0.5 rounded text-[7px] font-black text-prylom-gold uppercase tracking-widest">
      Operação Nacional
    </div>

    {/* Coordenadas estéticas */}
    <div className="absolute bottom-2 right-3 z-30 text-[6px] text-white/25 font-mono">
      BR-ATV // 15.7801° S, 47.9292° W
    </div>

    {/* Div do Leaflet — preenche 100% do absoluto (= altura total do header) */}
    <div
      ref={mapContainerRef}
      className="w-full h-full opacity-80 hover:opacity-100 transition-opacity duration-500"
      style={{ background: '#2c5363' }}
    />
  </div>

</div>

   <section className="space-y-5">
      <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#2c5363] border-l-4 border-yellow-600 pl-3">
        Mesa Operacional
      </h2>
      <div className="flex gap-4 w-full">
        {headOperacao.map((item, i) => (
          <HeadOperacaoCard
            key={i}
            item={item}
           onClick={() => { setSelectedHead(item); setShowHeadModal(true); }}
          />
       ))}
     </div>
   </section>

   {showHeadModal && selectedHead && (
  <HeadModal
    item={selectedHead}
    onClose={() => setShowHeadModal(false)}
  />
)}
        <div className="p-10 md:p-14 grid md:grid-cols-2 gap-12">



<div className="space-y-8 overflow-hidden relative isolate z-10">
  <h3 className="text-prylom-dark font-[950] uppercase text-[10px] tracking-[0.2em] border-l-3 border-prylom-gold pl-3">
    Parceiros Credenciados e Co-Brokers
  </h3>
  
  <div className="relative w-full overflow-hidden">
    {/* Máscaras de gradiente restritas a este container pelo 'isolate' acima */}
{/* Máscaras de gradiente ajustadas para o fundo do container e sem vazar lateralmente */}
<div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
<div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none"></div>

    <div className="flex gap-6 animate-scroll pb-6">
      {[...parceirosCredenciados, ...parceirosCredenciados].map((item, index) => (
        <div 
          key={index} 
          className="min-w-[180px] max-w-[180px] cursor-pointer group"
          onClick={() => handleOpenDetails(item)}
        >
          {/* CARD ESTILO IMAGEM REFERÊNCIA */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
            
            
            {/* Header Verde Escuro com a Foto */}
            <div className="bg-[#2c5363] p-3 flex justify-center items-center h-28 relative">
<div className="absolute top-2 right-2 z-20 flex flex-col items-center">
  <img
    src={BANDEIRA_URL(item.estado)}
    alt={`Bandeira ${item.estado}`}
    className="w-9 h-auto rounded-md shadow-2xl border-2 border-white/50 backdrop-blur-sm transition-transform group-hover:scale-110 drop-shadow-lg"
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
  />
  <span className="text-[10px] text-white font-black mt-1 uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
    {item.estado}
  </span>
</div>
              <div className="w-20 h-24 bg-gray-200 rounded-lg overflow-hidden shadow-lg border-2 border-white/20">
                {item.foto_url ? (
                  <img src={item.foto_url} className="w-full h-full object-cover" alt={item.nome} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl opacity-20 bg-white">👤</div>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none"></div>
            </div>

            {/* Área de Texto Branca */}
            <div className="p-3 space-y-1.5 bg-white">
              <p className="text-[10px] leading-tight text-prylom-dark truncate">
                <span className="font-extrabold uppercase">Nome:</span> {item.nome}
              </p>
              <p className="text-[10px] leading-tight text-prylom-dark">
                <span className="font-extrabold uppercase">Cargo:</span> {item.cargo || 'Co-Broker'}
              </p>
              <p className="text-[10px] leading-tight text-prylom-dark">
                <span className="font-extrabold uppercase">Região:</span> Polo {item.estado}
              </p>
              <p className="text-[10px] leading-tight text-prylom-dark">
                <span className="font-extrabold uppercase">Credencial:</span> {item.creci || '---'}
              </p>
            </div>

          </div>
        </div>
      ))}
    </div>
  </div>
</div>

{/* SEÇÃO 2: ORIGINAÇÃO - COM CARROSSEL E BRILHO LATERAL */}
<div className="space-y-8 relative isolate z-10">
  <h3 className="text-prylom-dark font-[950] uppercase text-[10px] tracking-[0.2em] border-l-3 border-prylom-gold pl-3">
    Originação e Campo
  </h3>

  <div className="relative w-full overflow-hidden">
    {/* Máscaras de gradiente laterais (Brilho) */}
    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
    <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none"></div>

    {/* Scroll Automático (Carrossel) */}
    <div className="flex gap-6 animate-scroll pb-6">
      {/* Duplicamos a lista para o efeito de loop infinito ser contínuo */}
      {[...equipeOriginaçao, ...equipeOriginaçao].map((membro, index) => (
        <div 
          key={index} 
          className="min-w-[180px] max-w-[180px] cursor-pointer group"
          onClick={() => handleOpenDetails(membro)}
        >
          {/* CARD REPLICADO DA IMAGEM DE REFERÊNCIA */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
            
            {/* Header Verde Escuro com a Foto centralizada */}
<div className="bg-[#2c5363] p-3 flex justify-center items-center h-28 relative overflow-hidden">
  
  {/* Bandeira do Estado - Posicionada na Superior Direita */}
  <div className="absolute top-2 right-2 z-20 flex flex-col items-center">
    <img
      src={BANDEIRA_URL(membro.estado)}
      alt={`Bandeira ${membro.estado}`}
      className="w-9 h-auto rounded-md shadow-2xl border-2 border-white/50 backdrop-blur-sm transition-transform group-hover:scale-110 drop-shadow-lg"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
    />
    <span className="text-[10px] text-white font-black mt-1 uppercase tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
      {membro.estado}
    </span>
  </div>

  {/* Moldura da Foto do Corretor/Membro */}
  <div className="w-20 h-24 bg-gray-200 rounded-lg overflow-hidden shadow-lg border-2 border-white/20 relative z-10 transition-transform group-hover:scale-105">
    { (membro?.foto_url) ? (
      <img 
        src={ membro.foto_url} 
        className="w-full h-full object-cover" 
        alt={ membro.nome} 
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-3xl opacity-20 bg-white">👤</div>
    )}
  </div>

  {/* Detalhe estético: Brilho no fundo para dar profundidade */}
  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none"></div>
</div>

            {/* Área de Informações Técnicas */}
            <div className="p-3 space-y-1.5 bg-white">
              <p className="text-[10px] leading-tight text-prylom-dark truncate">
                <span className="font-extrabold uppercase">Nome:</span> {membro.nome}
              </p>
              <p className="text-[10px] leading-tight text-prylom-dark">
                <span className="font-extrabold uppercase">Função:</span> {membro.cargo || 'Originador'}
              </p>
              <p className="text-[10px] leading-tight text-prylom-dark">
                <span className="font-extrabold uppercase">Região:</span> Polo {membro.estado}
              </p>
              <p className="text-[10px] leading-tight text-prylom-dark">
                <span className="font-extrabold uppercase">Status:</span> Ativo
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="flex justify-center pb-6">


</div>
  </div>
  
</div>
</div>



{/* ═══════════════════════════════════════════════════════════════
    PRYLOM GLOBAL FARMS — Cross-Border M&A & Agro Assets
═══════════════════════════════════════════════════════════════ */}
<div className="relative w-full overflow-hidden rounded-xl mt-1 mb-4 mx-auto" style={{ maxWidth: 1100 }}>
  {/* Fundo escuro compacto */}
  <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(135deg, #0a1f2e 0%, #0d2d3e 60%, #071820 100%)' }} />
  {/* Brilho dourado topo */}
  <div className="absolute top-0 left-0 right-0 h-[1.5px] z-10" style={{ background: 'linear-gradient(90deg, transparent, #B8860B, #FFD700, #B8860B, transparent)' }} />

  <div className="relative z-10 px-5 py-4">
    {/* Header compacto */}
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60" style={{ color: '#B8860B' }}>Presença Internacional</span>
          <h3
            className="text-base font-[950] uppercase tracking-tighter leading-none"
            style={{
              background: 'linear-gradient(to right, #FFD700, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Prylom Global Farms
          </h3>
          <p className="text-white/30 text-[8px] font-semibold uppercase tracking-wider mt-0.5">
            Cross-Border M&A · Agro Assets
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white/50 text-[9px] font-bold uppercase tracking-widest">
          {globalFarmsTeam.filter(m => m.status === 'Ativo').length} ativos
        </span>
      </div>
    </div>

    {/* Grid compacto — 7 cards numa linha */}
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
      {globalFarmsTeam.map((member) => (
        <div
          key={member.id}
          className="group cursor-pointer"
          onClick={() => handleOpenGlobalDetails(member)}
        >
          <div
            className="flex flex-col overflow-hidden rounded-xl border transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            {/* Foto + bandeira */}
            <div className="relative flex flex-col items-center justify-center py-3 px-2 gap-2 h-28">
              <div className="absolute top-2 right-2 flex flex-col items-center gap-0.5">
                <img
                  src={member.bandeira}
                  alt={member.pais}
                  className="w-6 h-auto rounded shadow border border-white/20 transition-transform group-hover:scale-110"
                  onError={(e: any) => { e.target.style.display = 'none'; }}
                />
                <span className="text-[7px] text-white/70 font-bold" style={{ fontSize: '6.5px', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{member.pais}</span>
              </div>
              <div className="w-11 h-14 rounded-lg overflow-hidden border border-white/15 bg-white/8 flex items-center justify-center transition-transform group-hover:scale-105">
                {member.foto_url ? (
                  <img src={member.foto_url} className="w-full h-full object-cover" alt={member.nome} />
                ) : (
                  <span className="text-xl opacity-25">👤</span>
                )}
              </div>
              <div className="absolute bottom-1.5 left-2 flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
              </div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-t-xl"
                style={{ background: 'linear-gradient(135deg, rgba(184,134,11,0.07) 0%, transparent 60%)' }} />
            </div>

            {/* Info */}
            <div className="px-2 py-2 border-t border-white/5 space-y-0.5">
              <p className="text-white text-[9px] font-black uppercase tracking-tight truncate leading-snug">{member.nome}</p>
              <p className="text-[8px] font-bold uppercase truncate" style={{ color: '#B8860B' }}>{member.cargo}</p>
              <p className="text-white/30 text-[7px] truncate">{member.cidade}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>

<div className="flex flex-col items-center gap-2 w-full max-w-[1400px] mx-auto p-0 mt-0">

  {/* --- BLOCO SUPERIOR: ACADEMY (Lidia + Explorar) --- */}
  <div className="flex flex-col items-center gap-4 p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 shadow-inner w-full max-w-[700px]">
    <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-center"
        style={{
          background: 'linear-gradient(to bottom, #FFD700 0%, #B8860B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.1))'
        }}>
      HEAD OF PRYLOM ACADEMY
    </h2>
    
    <div className="flex items-center gap-6">
      {/* Card Lidia */}
    <div className="w-[300px] flex items-stretch gap-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm h-[160px] flex-shrink-0">
      {/* Foto da Lidia */}
      <div className="w-28 h-full relative overflow-hidden bg-gray-200 rounded-xl flex-shrink-0">
        <img 
          src={lidia} 
          className="w-full h-full object-cover" 
          alt="Lidia" 
        />
        <div className="absolute top-1.5 right-1.5 z-20">

        </div>
      </div>

      {/* Informações da Lidia */}
      <div className="flex flex-col justify-center py-1 overflow-hidden">
        <p className="text-[13px] font-black uppercase text-[#2c5363] truncate">Lidia</p>
        <p className="text-[10px] leading-tight text-prylom-gold font-bold uppercase mb-2">Head of Academy</p>
        
        <div className="space-y-1 pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-600 truncate">
            <span className="font-bold text-[#2c5363]">Área:</span> Talentos
          </p>
          <p className="text-[10px] text-gray-600 truncate">
            <span className="font-bold text-[#2c5363]">Foco:</span> Performance
          </p>
           <p className="text-[10px] text-gray-600 truncate">
            <span className="font-bold text-[#2c5363]">Status:</span> Nacional
          </p>
        </div>
      </div>
    </div>

      {/* Card Explorar */}
         <div 
      className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden transition-all hover:scale-105 active:scale-95 cursor-pointer h-[160px] w-[200px] flex flex-col flex-shrink-0 group"
      onClick={() => setShowAcademyModal(true)} 
    >
      {/* Header do Card */}
      <div className="bg-[#2c5363] py-3 px-2 flex items-center justify-center border-b border-gray-200">
        <h2 className="text-sm font-black uppercase tracking-widest text-center"
            style={{
              background: 'linear-gradient(to bottom, #FFD700 0%, #B8860B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
          Prylom Academy
        </h2>
      </div>

      {/* Conteúdo Simples */}
      <div className="flex-grow flex flex-col justify-center items-center text-center p-3">
        <span className="text-3xl mb-1 group-hover:animate-bounce">🎓</span>
        <p className="text-[9px] font-bold text-gray-800 uppercase tracking-tighter">Hub de Conhecimento</p>
        <p className="text-[8px] text-gray-400 mt-1 uppercase">Clique para explorar</p>
      </div>
    </div>
  </div>
</div>
</div>


        {/* 3. Rodapé (Mantido seu original) */}
{/* 3. Rodapé com Botão de Cadastro */}
<div className="p-10 border-t border-gray-50 bg-gray-50/30 flex flex-col items-center gap-6">

  <button 
    onClick={() => setShowRegisterModal(true)}
    className="group relative px-8 py-4 bg-prylom-dark text-white rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl"
  >
    <div className="absolute inset-0 bg-prylom-gold translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
    <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.2em] group-hover:text-prylom-dark transition-colors">
      Quero ser corretor/originador Prylom
    </span>
  </button>
  
        <div className="mt-8 mb-4 mx-2 rounded-[2rem] border border-amber-200/60 bg-amber-50/40 backdrop-blur-sm p-6 md:p-8 space-y-5">
        
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 border-b border-amber-200/50 pb-4">
          <span className="text-2xl">🛡️</span>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700">
              Aviso Legal de Representação
            </h4>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-600/70 mt-0.5">
              Compliance Operacional — Prylom Ecosystem
            </p>
          </div>
        </div>

        {/* Itens */}
        <div className="space-y-4">
          
          {/* Item 1 */}
          <div className="flex gap-3">
            <div className="shrink-0 w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center mt-0.5">
              <span className="text-[8px] font-black text-amber-700">1</span>
            </div>
            <div className="space-y-1">
              <h5 className="text-[9px] font-black uppercase tracking-widest text-amber-800">
                Ausência de Vínculo Empregatício — O Escudo Trabalhista
              </h5>
              <p className="text-[9px] leading-relaxed text-amber-900/70 font-medium text-justify">
                A Rede de Originação Estratégica, Parceiros Credenciados (Co-Brokers) e representantes do Prylom Global Farms atuam como pessoas jurídicas e profissionais independentes, sob regime de parceria comercial e/ou prestação de serviços autônomos. A exibição neste painel possui caráter estritamente institucional e de networking, não configurando, sob nenhuma hipótese, vínculo empregatício (CLT), subordinação jurídica ou exclusividade com o Grupo Prylom.
              </p>
            </div>
          </div>

          {/* Item 2 */}
          <div className="flex gap-3">
            <div className="shrink-0 w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center mt-0.5">
              <span className="text-[8px] font-black text-amber-700">2</span>
            </div>
            <div className="space-y-1">
              <h5 className="text-[9px] font-black uppercase tracking-widest text-amber-800">
                Limitação de Poderes e Representação — A Trava Contra Fraudes
              </h5>
              <p className="text-[9px] leading-relaxed text-amber-900/70 font-medium text-justify">
                Nenhum Originador de Campo, Co-Broker ou Gestor Local possui mandato, procuração ou autorização legal para assinar contratos, firmar recibos de sinal, negociar valores, receber pagamentos em espécie/conta pessoal ou assumir compromissos financeiros em nome do Instituto Prylom ou da Prylom Agronegócios. Todo e qualquer fechamento transacional (Closing) é de competência <strong className="text-amber-800 uppercase">exclusiva</strong> da Diretoria Executiva na Mesa Operacional.
              </p>
            </div>
          </div>

          {/* Item 3 */}
          <div className="flex gap-3">
            <div className="shrink-0 w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center mt-0.5">
              <span className="text-[8px] font-black text-amber-700">3</span>
            </div>
            <div className="space-y-1">
              <h5 className="text-[9px] font-black uppercase tracking-widest text-amber-800">
                Conformidade Regulatória — CRECI / COFECI
              </h5>
              <p className="text-[9px] leading-relaxed text-amber-900/70 font-medium text-justify">
                As atividades de originação limitam-se à inteligência de mercado, prospecção e estruturação de teses (Business Intelligence). A formalização de intermediações imobiliárias rurais obedece às normativas do Sistema COFECI/CRECI, sendo executada exclusivamente pelos diretores e parceiros legalmente credenciados na Mesa Operacional.
              </p>
            </div>
          </div>

        </div>

        {/* Rodapé do aviso */}
        <div className="border-t border-amber-200/50 pt-3 flex items-center justify-between">
          <span className="text-[8px] font-bold text-amber-600/50 uppercase tracking-widest">
            LGPD · COAF · COFECI
          </span>
        </div>

      </div>

  <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em]">
    Prylom Ecosystem © 2026
  </span>
</div>
      </div>
    </div>

{/* Modal de Cadastro - Estilo Ficha Técnica Prylom */}
{showRegisterModal && createPortal(
  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-prylom-dark/95 backdrop-blur-md">
    <div 
      className="bg-white w-full max-w-[1000px] rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-scaleUp flex flex-col"
      style={{ maxHeight: '95vh' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header Ficha Técnica */}
{/* Header do Formulário - Atualizado para Azul Marinho e Autoridade */}
<div className="bg-[#001a35] p-8 md:p-10 relative overflow-hidden shrink-0">
  {/* Detalhe sutil de fundo para textura */}
  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
  
  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-white font-[950] uppercase text-2xl tracking-tighter leading-none">
          Corretor parceiro
        </h2>
        <span className="px-2 py-0.5 border border-prylom-gold/50 text-prylom-gold text-[8px] font-black uppercase tracking-widest rounded">
          Elite Member
        </span>
      </div>
      
      <p className="text-white/80 text-xs md:text-sm font-medium max-w-md leading-tight">
        Venda com a autoridade de quem tem o <span className="text-prylom-gold font-bold">maior ecossistema de inteligência agro</span> ao seu lado.
      </p>

      {/* Selos de Conformidade */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[8px] text-white/50 font-bold uppercase tracking-wider">Ambiente Criptografado</span>
        </div>
        <span className="text-white/20">|</span>
        <span className="text-[8px] text-white/50 font-bold uppercase tracking-wider">Conformidade LGPD & COAF</span>
      </div>
    </div>

    <div className="flex items-center gap-6">
      <div className="hidden md:block text-right">
        <p className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em]">Ficha de Credenciamento</p>
        <p className="text-white/30 text-[8px] font-bold uppercase mt-1">Prylom Ecosystem // 2026</p>
      </div>
      <button 
        onClick={() => setShowRegisterModal(false)}
        className="bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all border border-white/10"
      >
        ✕
      </button>
    </div>
  </div>
</div>

      <div className="overflow-y-auto p-8 md:p-12 space-y-10">

        {/* Barra de progresso de verificação */}
        <div className="flex items-center gap-3">
          {[
            { label: 'Identidade', done: regDocStatus === 'valid' },
            { label: 'WhatsApp', done: regIsCodeValid },
            { label: 'Confirmação', done: isRegFormValid },
          ].map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all duration-500 ${step.done ? 'bg-[#bba219] text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {step.done ? '✓' : i + 1}
                </div>
                <span className={`text-[7px] font-bold uppercase tracking-wider ${step.done ? 'text-[#bba219]' : 'text-gray-300'}`}>{step.label}</span>
              </div>
              {i < 2 && <div className={`h-px flex-1 transition-all duration-500 ${step.done ? 'bg-[#bba219]' : 'bg-gray-100'}`} />}
            </React.Fragment>
          ))}
        </div>

        <form className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DADOS BÁSICOS */}
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-gray-400">Nome Completo:</label>
            <input
              type="text"
              value={regFields.nome}
              onChange={(e) => setRegFields({ ...regFields, nome: e.target.value })}
              className="w-full border-b border-gray-200 py-1 focus:border-prylom-gold outline-none text-xs font-bold text-prylom-dark bg-transparent"
              placeholder="Nome Completo"
            />
          </div>

          {/* CPF com validação */}
          <div className="space-y-1 relative">
            <label className="text-[9px] font-black uppercase text-gray-400">CPF:</label>
            <input
              type="text"
              value={regFields.cpf}
              onChange={handleRegDocChange}
              maxLength={14}
              className={`w-full border-b py-1 outline-none text-xs font-bold text-prylom-dark bg-transparent transition-colors ${regDocStatus === 'valid' ? 'border-green-400' : regDocStatus === 'invalid' ? 'border-red-400' : 'border-gray-200 focus:border-prylom-gold'}`}
              placeholder="000.000.000-00"
            />
            <div className="absolute right-0 bottom-1.5">
              {regDocStatus === 'valid' && (
                <span className="text-[8px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Autenticado
                </span>
              )}
              {regDocStatus === 'invalid' && (
                <span className="text-[8px] font-black text-red-500 uppercase tracking-widest animate-bounce">Inválido</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-gray-400">E-mail:</label>
            <input
              type="email"
              value={regFields.email}
              onChange={(e) => setRegFields({ ...regFields, email: e.target.value })}
              className="w-full border-b border-gray-200 py-1 focus:border-prylom-gold outline-none text-xs font-bold text-prylom-dark bg-transparent"
              placeholder="contato@email.com"
            />
          </div>

          {/* TELEFONE com 2FA WhatsApp */}
          <div className="md:col-span-2 space-y-4">
            <div className="space-y-1 relative">
              <label className="text-[9px] font-black uppercase text-gray-400">WhatsApp / Telefone:</label>
              <input
                type="text"
                value={regFields.telefone}
                onChange={handleRegTelefoneChange}
                className="w-full border-b border-gray-200 py-1 focus:border-prylom-gold outline-none text-xs font-bold text-prylom-dark bg-transparent"
                placeholder="55 (00) 00000-0000"
              />
              {!regSmsSent && regFields.telefone.length >= 17 && (
                <button
                  type="button"
                  onClick={handleRegSendCode}
                  className="absolute right-0 bottom-1.5 text-[8px] font-black text-[#bba219] uppercase tracking-widest hover:underline"
                >
                  {regIsVerifying ? "Enviando..." : "Validar via WhatsApp"}
                </button>
              )}
            </div>

            {/* 2FA */}
            {regSmsSent && (
              <div className={`animate-fadeIn p-5 rounded-lg border transition-all duration-500 ${regIsCodeValid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'} space-y-3`}>
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2c5363]">Código de Verificação</label>
                  {regIsCodeValid ? (
                    <span className="text-[8px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      WhatsApp Validado
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-[#bba219] uppercase">Confirme o código recebido</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    maxLength={6}
                    disabled={regIsCodeValid || regIsVerifying}
                    value={regSmsCode}
                    onChange={(e) => setRegSmsCode(e.target.value.replace(/\D/g, ""))}
                    placeholder={regIsVerifying ? "..." : "000000"}
                    className={`w-full py-3 text-center text-lg font-black tracking-[0.5em] outline-none transition-all
                      ${regIsCodeValid ? 'bg-transparent text-green-700' : 'bg-white border border-gray-200 focus:border-[#bba219] text-[#2c5363]'}
                      ${regCodeError ? 'border-red-500' : ''}
                    `}
                  />
                  {regIsVerifying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                      <div className="w-4 h-4 border-2 border-[#bba219] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                {!regIsCodeValid && (
                  <p className="text-[8px] text-gray-400 font-medium uppercase text-center">
                    Não recebeu? <button type="button" onClick={handleRegSendCode} className="text-[#bba219] font-bold hover:underline">Reenviar código</button>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-gray-400">Região de Atuação:</label>
            <input
              type="text"
              value={regFields.regiao}
              onChange={(e) => setRegFields({ ...regFields, regiao: e.target.value })}
              className="w-full border-b border-gray-200 py-1 focus:border-prylom-gold outline-none text-xs font-bold text-prylom-dark bg-transparent"
              placeholder="Ex: Sorriso/MT"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-gray-400">Qual Vínculo:</label>
            <select
              value={regFields.vinculo}
              onChange={(e) => setRegFields({ ...regFields, vinculo: e.target.value })}
              className="w-full border-b border-gray-200 py-1 focus:border-prylom-gold outline-none text-xs font-bold text-prylom-dark bg-transparent"
            >
              <option>Corretor Direto</option>
              <option>Gerente da Fazenda</option>
              <option>Originador / Consultor Local</option>
            </select>
          </div>
        </form>

        {/* MODELO DE PERFORMANCE */}
        <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
            <h3 className="text-[10px] font-black uppercase text-prylom-dark tracking-widest">Modelo de Performance: Divisão de Honorários (50/50)</h3>
          </div>
          
          <div className="grid md:grid-cols-2">
            {/* Lado Prylom */}
            <div className="p-6 space-y-4 border-r border-gray-100">
              <h4 className="text-prylom-gold text-[10px] font-black uppercase tracking-tighter">50% Prylom Agronegócio</h4>
              <ul className="space-y-3">
                {[
                  { t: "Exposição Máxima:", d: "Inclusão no site oficial e em todos os portais especializados." },
                  { t: "Network de Elite:", d: "Acesso direto à nossa rede de investidores e fundos." },
                  { t: "Estruturação de M&A e Data Room:", d: "Coordenação documental estratégica e fechamento transacional." },
                  { t: "Curadoria de Leads:", d: "Filtro rigoroso de potenciais clientes interessados." },
                  { t: "Segurança:", d: "Gestão assistida por especialistas em todas as etapas." }
                ].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-prylom-gold text-[8px] mt-1">●</span>
                    <p className="text-[9px] leading-tight text-gray-600"><span className="font-bold text-prylom-dark">{item.t}</span> {item.d}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Lado Parceiro */}
            <div className="p-6 space-y-4 bg-gray-50/20">
              <h4 className="text-prylom-gold text-[10px] font-black uppercase tracking-tighter">50% Corretor & Gestor Regional</h4>
              <ul className="space-y-3">
                {[
                  { t: "Gestão Local:", d: "Acompanhamento técnico do Gestor Prylom da região do ativo." },
                  { t: "Interface Técnica:", d: "Diálogo estratégico entre Gestor Prylom e Corretor Parceiro." },
                  { t: "Logística:", d: "Ajuste e coordenação de visitas presenciais." },
                  { t: "Levantamento Primário:", d: "Coleta de dados, imagens e documentação preliminar in loco." },
                  { t: "Relacionamento:", d: "Contato com proprietário e acompanhamento de visitas." }
                ].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-prylom-gold text-[8px] mt-1">●</span>
                    <p className="text-[9px] leading-tight text-gray-600"><span className="font-bold text-prylom-dark">{item.t}</span> {item.d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* PROTOCOLO DE OBRIGAÇÕES */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-prylom-dark tracking-widest border-l-2 border-prylom-gold pl-3">Protocolo de Obrigações</h3>
          <div className="grid md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
            <p className="text-[9px] leading-relaxed text-gray-500 italic">
              <span className="font-bold text-prylom-dark block mb-1 uppercase">Formalização:</span>
              Assinatura de contrato de parceria específico detalhando comissões e responsabilidades.
            </p>
            <p className="text-[9px] leading-relaxed text-gray-500 italic">
              <span className="font-bold text-prylom-dark block mb-1 uppercase">A comissão mínima:</span>
              3% é o piso da parceria para garantir a sustentabilidade da operação.
            </p>
          </div>
          
          <label className="flex items-start gap-3 p-4 bg-prylom-gold/5 rounded-xl border border-prylom-gold/20 cursor-pointer hover:bg-prylom-gold/10 transition-all">
            <input
              type="checkbox"
              className="mt-1 accent-prylom-gold"
              checked={regFields.termos}
              onChange={(e) => setRegFields({ ...regFields, termos: e.target.checked })}
            />
            <p className="text-[9px] font-bold text-prylom-dark uppercase leading-tight">
              Confirmo a veracidade das informações prestadas e manifesto integral concordância com as condições de parceria, protocolos de sigilo e normas de conformidade Prylom Agronegócio.
            </p>
          </label>
        </div>

        {/* Botão Finalizar */}
        <button
          disabled={!isRegFormValid}
          className="w-full py-5 font-black uppercase text-[10px] tracking-[0.4em] rounded-2xl transition-all shadow-2xl group disabled:opacity-40 disabled:cursor-not-allowed bg-prylom-dark text-white hover:bg-prylom-gold hover:text-prylom-dark"
        >
          Finalize e aguarde.
        </button>

        
      </div>

      {/* Footer Estético do Modal */}
      <div className="h-1.5 w-full bg-gray-100 flex shrink-0">
        <div className="h-full w-1/4 bg-prylom-gold"></div>
        <div className="h-full w-1/4 bg-prylom-dark"></div>
        <div className="h-full w-1/4 bg-[#1a3a2a]"></div>
        <div className="h-full w-1/4 bg-prylom-gold"></div>
      </div>
    </div>
  </div>,
  document.body
)}
    </>
    
  );
};

const GlobalView = ({ t }: { t: any }) => {
  return (
    <>
      {/* SECTION: PRYLOM GLOBAL REAL ASSETS - FIDELIDADE TOTAL AO LAYOUT */}
      <section className="py-18 bg-[#FDFCFB]">
        <div className="max-w-5xl mx-auto px-6">
          
          {/* BARRA SUPERIOR (TÍTULO DISCRETO FORA DO CARD) */}
          <div className="bg-[#001529] py-2 px-6 text-center rounded-t-xl">
            <span className="text-white text-[10px] font-medium tracking-[0.3em] uppercase opacity-70">
              Prylom Global Real Assets
            </span>
          </div>

          {/* CONTEÚDO PRINCIPAL (CARD) */}
          <div className="bg-white shadow-2xl overflow-hidden relative border-x border-b border-gray-100 rounded-b-[2rem]">
            
            {/* HEADER: IMAGEM MUNDI/TECH AZUL */}
<div className="relative h-56 md:h-64 overflow-hidden">
  <img 
    src="https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&q=80&w=2000" 
    className="w-full h-full object-cover"
    alt="Global Business Connections"
  />
  <div className="absolute inset-0 bg-[#001D3D]/85 mix-blend-multiply"></div>
  
  <div className="absolute inset-0 flex flex-col justify-center px-10 md:px-16">
    <h2 className="text-white text-3xl md:text-4xl font-serif tracking-tight leading-none">
      PRYLOM
    </h2>
    <p className="text-white text-[9px] font-black uppercase tracking-[0.4em] mt-2 opacity-80">
      Global Real Assets
    </p>
  </div>
</div>

            {/* ÁREA BRANCA SOBREPOSTA (OFFSET NEGATIVO) */}
            <div className="relative z-20 -mt-20 mx-6 md:mx-12 bg-white rounded-2xl p-8 md:p-14 shadow-xl">
              
              {/* FRASE DE IMPACTO */}
<div className="max-w-3xl mb-12">
  <h3 className="text-xl md:text-2xl font-light text-prylom-dark leading-tight mb-5">
    Connecting Brazilian agribusiness <span className="font-semibold">to global capital</span>
  </h3>
  
  <p className="text-gray-500 text-[13px] md:text-sm leading-relaxed text-justify opacity-90">
Conectando o patrimônio do Agronegócio Brasileiro ao Capital Institucional Global. Nossa mesa de operações
internacionais estrutura e qualifica ativos reais sob os mais rigorosos padrões de ESG e Due Diligence para
Fundos de Private Equity, Family Offices e Sovereign Wealth Funds da América do Norte, Europa e Ásia.
Atendimento multilingue e compliance jurídico rigoroso para transações transnacionais seguras.
  </p>
</div>

              {/* PERFIL DO PROFESSOR - ALINHAMENTO RIGOROSO PELA LINHA SUPERIOR */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-stretch border-t border-gray-50 pt-10">
  
  {/* COLUNA DA FOTO - Agora usando h-full para alinhar com o fundo do texto */}
  <div className="md:col-span-5 flex flex-col">
    <div className="relative flex-grow">
      {/* Linha dourada superior na foto */}
      <div className="absolute -top-4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-prylom-gold to-transparent"></div>
      
      {/* Removi o aspect-ratio e usei h-full para forçar o alinhamento com o texto ao lado */}
      <div className="h-full min-h-[400px] overflow-hidden rounded-sm shadow-md">
        <img 
          src={professorHernandez}
          alt="Prof. Me. Victor E. Pérez Hernández" 
          className="w-full h-full object-cover object-top"
        />
      </div>
    </div>
  </div>

  {/* BIO TEXTO */}
  <div className="md:col-span-7 flex flex-col justify-start">
    <div className="mb-4">
      <h4 className="text-xl font-bold text-prylom-dark leading-none">Prof. Me. Victor E. Pérez Hernández</h4>
      <p className="text-prylom-gold font-bold text-[10px] uppercase tracking-widest mt-2">Senior Advisor - Global Markets</p>
    </div>

    <div className="text-gray-500 text-[13px] leading-relaxed space-y-4 text-justify">
      <p>
Com sólida formação analítica e científica, o Prof. Me. Victor Hernández é a ponte
estratégica entre o capital institucional estrangeiro e as oportunidades de alto valor no
agronegócio brasileiro.
      </p>
      <p>
Engenheiro Químico com Mestrado em Ciências pela prestigiada Universidade de São Paulo
(USP), atua como docente universitário e autor de artigos publicados. Essa presença
acadêmica constante confere a ele não apenas rigor técnico, mas uma rede de
relacionamento institucional (networking) viva e de altíssimo nível. Victor une essa
autoridade científica à sua vasta experiência executiva em comércio exterior e estruturação
de operações transfronteiriças de ativos reais (Cross-Border). Radicado em São Paulo, possui
expertise focada na atração de capital para o desenvolvimento de infraestrutura e grandes
propriedades rurais.

      </p>
      <p>
À frente da divisão Prylom Global Real Assets, atua como Senior Advisor na atração,
qualificação e direcionamento de investidores globais. Seu foco é garantir que a alocação de
capital estrangeiro no 'Deep Market' brasileiro seja estruturada com segurança, visão
analítica e alinhamento aos mais altos padrões de compliance transacional
      </p>
    </div>
  </div>

</div>
            </div>
            
            <div className="h-12 bg-white"></div>
          </div>
        </div>
      </section>
    </>
  );
};

  const OffMarketView = ({ t }: { t: any }) => (
  <div className="w-full py-16 px-6 bg-[#F4F5F7] min-h-screen flex items-center justify-center animate-fadeIn font-sans">
    <div className="max-w-5xl mx-auto bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.06)] border border-white relative overflow-hidden">
      
      {/* Glow Decorativo de Fundo */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-prylom-gold/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* 1. Header Section */}
      <div className="p-12 md:p-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-prylom-gold/10 border border-prylom-gold/20 px-4 py-1.5 rounded-full mb-4">
          <span className="text-[10px] font-black text-prylom-gold uppercase tracking-[0.3em]">Acesso Exclusivo</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-[950] text-prylom-dark leading-[0.9] tracking-tighter uppercase">
          O Mercado <span className="text-prylom-gold italic">Invisível</span> de <br/>
          Fazendas de Alto Padrão
        </h1>
        
        <p className="text-gray-500 text-lg md:text-xl font-medium max-w-3xl mx-auto leading-relaxed">
          Discrição absoluta para Investidores que buscam os melhores ativos no agronegócio <span className="text-prylom-dark font-bold underline decoration-prylom-gold/30">antes que cheguem ao público.</span>
        </p>
      </div>

      {/* 2. Seção Comparativa (Problema vs Solução) */}
      <div className="grid md:grid-cols-2 gap-px bg-gray-100 border-y border-gray-100">
        <div className="bg-white p-12 md:p-16 space-y-6">
          <h3 className="text-prylom-dark/40 font-black uppercase text-sm tracking-widest">O Mercado Tradicional</h3>
          <p className="text-gray-400 font-medium leading-relaxed">
            O mercado tradicional pulveriza o valor. O grande capital exige silêncio, curadoria e alinhamento de interesses.
          </p>
        </div>
        <div className="bg-prylom-dark p-12 md:p-16 space-y-6 relative group overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-prylom-gold font-black uppercase text-sm tracking-widest">A Solução Off-Market</h3>
            <ul className="mt-6 space-y-4">
              {['Assessoria Sigilosa de M&A', 'Sem Especulação Pública', 'Ativos de Alta Produtividade'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-white font-bold text-sm uppercase tracking-wide">
                  <div className="w-1.5 h-1.5 bg-prylom-gold rounded-full"></div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Sutil brilho no hover */}
          <div className="absolute inset-0 bg-prylom-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>
      </div>

      {/* 3. Seção: Como Funciona (Processo 3 Etapas) */}
      <div className="p-12 md:p-20 bg-gray-50/50">
        <h2 className="text-center text-prylom-dark font-black uppercase tracking-[0.2em] text-sm mb-16">O Processo de Homologação</h2>
        
        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Linha Conectora Desktop */}
          <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-[1px] bg-gray-200"></div>

          {/* Etapa 1 */}
          <div className="relative flex flex-col items-center text-center space-y-4 group">
            <div className="w-20 h-20 bg-white border border-gray-200 rounded-3xl flex items-center justify-center shadow-sm group-hover:border-prylom-gold transition-colors duration-300">
              <span className="text-3xl">👤</span>
            </div>
            <div className="space-y-1">
              <span className="text-prylom-gold font-black text-[10px] uppercase">Passo 01</span>
              <h4 className="text-prylom-dark font-black text-xs uppercase tracking-wider">Qualificação Restrita</h4>
            </div>
          </div>

          {/* Etapa 2 */}
          <div className="relative flex flex-col items-center text-center space-y-4 group">
            <div className="w-20 h-20 bg-white border border-gray-200 rounded-3xl flex items-center justify-center shadow-sm group-hover:border-prylom-gold transition-colors duration-300">
              <span className="text-3xl">📄</span>
            </div>
            <div className="space-y-1">
              <span className="text-prylom-gold font-black text-[10px] uppercase">Passo 02</span>
              <h4 className="text-prylom-dark font-black text-xs uppercase tracking-wider">Assinatura de NDA</h4>
            </div>
          </div>

          {/* Etapa 3 */}
          <div className="relative flex flex-col items-center text-center space-y-4 group">
            <div className="w-20 h-20 bg-white border border-gray-200 rounded-3xl flex items-center justify-center shadow-sm group-hover:border-prylom-gold transition-colors duration-300">
              <span className="text-3xl">📊</span>
            </div>
            <div className="space-y-1">
              <span className="text-prylom-gold font-black text-[10px] uppercase">Passo 03</span>
              <h4 className="text-prylom-dark font-black text-xs uppercase tracking-wider">Apresentação do Portfólio</h4>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Rodapé e CTA */}
      <div className="p-12 md:p-16 text-center bg-white border-t border-gray-100">
<button 
  // O onClick deve ser um atributo da tag, antes do fechamento ">"
  onClick={() => navigate('/dataroom')}
  className="bg-prylom-dark text-white hover:bg-prylom-gold hover:text-prylom-dark px-14 py-6 rounded-2xl text-[13px] font-[900] uppercase tracking-[0.25em] transition-all duration-300 shadow-xl shadow-prylom-dark/10 active:scale-95 mb-8"
>
  Solicitar acesso ao círculo fechado!
</button>
        
        <div className="flex flex-col items-center gap-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
            NÃO CONFIGURA OFERTA DE VALORES MOBILIÁRIOS
          </p>
          <div className="h-px w-12 bg-gray-200"></div>
          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest italic">Prylom Ecosystem © 2024</span>
        </div>
      </div>

    </div>
  </div>
);

useEffect(() => {
  if (viewMode === 'off' || viewMode === 'equipe' || viewMode === 'global') {
    setShowFilters(false);
  }
}, [viewMode]);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 md:py-16 animate-fadeIn pb-40 flex flex-col gap-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">{t.hubSub}</span>
          <h1 className="text-4xl font-black text-prylom-dark tracking-tighter uppercase">{t.shoppingTitle}</h1>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
            <div className="flex bg-gray-100 p-1 rounded-full overflow-x-auto no-scrollbar">
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setViewMode('grid'); }}
                    className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-white shadow-md text-prylom-dark' : 'text-gray-400 hover:text-prylom-dark'}`}
                  >
                    {cat.label}
                  </button>
                ))}
<button 
  onClick={() => !isSpecialView && setShowFilters(!showFilters)} 
  disabled={isSpecialView}
  className={`bg-white border-2 px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all 
    ${isSpecialView 
      ? 'border-gray-100 text-gray-300 cursor-not-allowed opacity-40' 
      : showFilters 
        ? 'border-prylom-gold text-prylom-gold' 
        : 'border-gray-100 text-prylom-dark'
    }`}
>
  {showFilters && !isSpecialView ? t.hideFilters : t.advancedFilters}
</button>
            <button
  onClick={onBack}
  className="
    bg-white
    text-prylom-dark
    border-2 border-prylom-gold
    px-8 py-3.5
    rounded-full
    text-[10px] font-black uppercase tracking-widest
    shadow-md
    hover:bg-prylom-gold
    hover:text-white
    transition-all
  "
>
  ← {t.btnBack}
</button>

            </div>

  <div className="flex bg-gray-100 p-1.5 rounded-full w-fit">
  <button 
    onClick={() => setViewMode('grid')} 
    className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-prylom-dark' : 'text-gray-400 hover:text-prylom-dark'}`}
  >
    {t.viewGrid}
  </button>

  <button 
    onClick={() => setViewMode('map')} 
    className={`px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-white shadow-md text-prylom-dark' : 'text-gray-400 hover:text-prylom-dark'}`}
  >
    {t.viewMap}
  </button>

  <button 
    onClick={() => setViewMode('off')}
    className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
      viewMode === 'off' 
      ? 'bg-prylom-dark text-prylom-gold shadow-lg ring-2 ring-prylom-gold/20' 
      : 'text-gray-400 hover:text-prylom-dark'
    }`}
  > 
    OFF MARKET
  </button>

  <button 
    onClick={() => setViewMode('equipe')}
    className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
      viewMode === 'equipe' 
      ? 'bg-prylom-dark text-prylom-gold shadow-lg ring-2 ring-prylom-gold/20' 
      : 'text-gray-400 hover:text-prylom-dark'
    }`}
  > 
    Equipe de Organização Estratégica
  </button>

  <button 
    onClick={() => setViewMode('global')}
    className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
      viewMode === 'global' 
      ? 'bg-prylom-dark text-prylom-gold shadow-lg ring-2 ring-prylom-gold/20' 
      : 'text-gray-400 hover:text-prylom-dark'
    }`}
  > 
    Prylom Global Assets
  </button>
</div>       



        </div>
      </div>


      {showFilters && !isSpecialView && (
        <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm animate-fadeIn space-y-10 max-h-[75vh] overflow-y-auto no-scrollbar scroll-smooth">


    {activeCategory === 'all' && (
<section className="space-y-10">
  {/* HEADER PRINCIPAL */}
  <header className="flex items-center gap-6 group">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-prylom-dark text-white rounded-2xl flex items-center justify-center shadow-xl shadow-prylom-dark/20 transition-transform group-hover:scale-105">
        <span className="text-xl">📍</span>
      </div>
      <div className="flex flex-col">
        <h4 className="text-[13px] font-black text-prylom-dark uppercase tracking-[0.25em]">
          {t.advancedFilters} <span className="text-prylom-gold">Universais</span>
        </h4>
        <div className="h-1 w-8 bg-prylom-gold rounded-full mt-1"></div>
      </div>
    </div>
    <div className="h-px flex-1 bg-gradient-to-r from-gray-200 via-gray-100 to-transparent"></div>
  </header>

  {/* GRID DE FILTROS - ALINHAMENTO CORRIGIDO */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
    
    {/* 1. LOCALIZAÇÃO */}
    <div className="group flex flex-col gap-1.5">
      <div className="min-h-[20px] flex items-end ml-1">
        <label className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] transition-colors group-focus-within:text-prylom-gold">
          {t.locationLabel}
        </label>
      </div>
      <div className="flex flex-col justify-between h-[64px] bg-white border-2 border-gray-100 rounded-xl p-1 transition-all duration-300 focus-within:border-prylom-gold shadow-sm">
        <select 
          value={filterState} 
          onChange={e => {setFilterState(e.target.value); setFilterCity('');}} 
          className="w-full h-[28px] bg-gray-50/50 rounded-md px-2 text-[10px] font-bold text-gray-500 outline-none cursor-pointer appearance-none hover:bg-gray-100 transition-colors"
        >
          <option value="">Estados (UF)</option>
          {availableStates.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <div className="relative h-[28px]">
          <select 
            value={filterCity} 
            onChange={e => setFilterCity(e.target.value)} 
            disabled={!filterState}
            className="w-full h-full bg-white px-2 pr-6 text-[11px] font-black text-prylom-dark outline-none cursor-pointer appearance-none disabled:opacity-40"
          >
            <option value="">{t.cityAll}</option>
            {availableCities.map(ct => <option key={ct} value={ct}>{ct}</option>)}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-prylom-gold">
             <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>
    </div>

    {/* 2. FAIXA DE PREÇO */}
{/* 2. FAIXA DE PREÇO - CORRIGIDO E COMPACTO */}
<div className="group flex flex-col gap-1.5 relative">
  <div className="min-h-[20px] flex justify-between items-end px-1">
    <label className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">
      💰 {t.priceRange}
    </label>
    <div className="flex bg-gray-100 p-0.5 rounded-md scale-90 origin-bottom-right">
      {['total', 'hectare'].map((mode) => (
        <button
          key={mode}
          onClick={() => setPriceMode(mode as 'total' | 'hectare')}
          className={`px-2 py-0.5 rounded text-[7px] font-black transition-all ${
            priceMode === mode ? 'bg-white text-prylom-dark shadow-xs' : 'text-gray-400'
          }`}
        >
          {mode === 'total' ? 'Total' : '/ha'}
        </button>
      ))}
    </div>
  </div>
  
  <div className="flex items-center h-[64px] bg-white border-2 border-gray-100 rounded-xl p-1.5 transition-all duration-300 focus-within:border-prylom-gold shadow-sm">
    <div className="relative flex-1 h-full">
      {/* Texto Dinâmico Restaurado Aqui */}
      <span className="absolute left-1.5 top-1 text-[7px] font-black text-gray-300 uppercase truncate pr-1">
        {priceMode === 'total' ? 'VALOR MÍNIMO' : 'VALOR/HA MÍNIMO'}
      </span>
      <div className="flex items-center h-full pt-2.5 px-1.5">
        <span className="text-[10px] font-black text-gray-300 mr-0.5">{getSymbol()}</span>
        <input 
          type="text" 
          inputMode="numeric"
          placeholder="0,00"
          value={minPrice} 
          onChange={e => setMinPrice(e.target.value.replace(/\D/g, ""))} 
          className="w-full bg-transparent text-[11px] font-black text-prylom-dark outline-none"
        />
      </div>
    </div>

    <div className="w-px h-6 bg-gray-100 mx-1"></div>

    <div className="relative flex-1 h-full">
      {/* Texto Dinâmico Restaurado Aqui */}
      <span className="absolute left-1.5 top-1 text-[7px] font-black text-gray-300 uppercase truncate pr-1">
        {priceMode === 'total' ? 'VALOR MÁXIMO' : 'VALOR/HA MÁXIMO'}
      </span>
      <div className="flex items-center h-full pt-2.5 px-1.5">
        <span className="text-[10px] font-black text-gray-300 mr-0.5">{getSymbol()}</span>
        <input 
          type="text" 
          inputMode="numeric"
          placeholder="∞"
          value={maxPrice} 
          onChange={e => setMaxPrice(e.target.value.replace(/\D/g, ""))} 
          className="w-full bg-transparent text-[11px] font-black text-prylom-dark outline-none"
        />
      </div>
    </div>
  </div>
   </div>


    {/* 3. TIPO DE TRANSAÇÃO */}
    <div className="group flex flex-col gap-1.5">
      <div className="min-h-[20px] flex items-end ml-1">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">{t.transactionType}</label>
      </div>
      <div className="relative h-[64px]">
        <select 
          value={transactionType} 
          onChange={e => setTransactionType(e.target.value as any)} 
          className="w-full h-full bg-white border-2 border-gray-100 rounded-xl px-4 pr-10 text-[12px] font-black text-prylom-dark outline-none appearance-none cursor-pointer transition-all hover:border-gray-200 focus:border-prylom-gold shadow-sm"
        >
          <option value="all">{t.transactionAll}</option>
          <option value="venda">{t.transactionSale}</option>
          <option value="arrendamento">{t.transactionLease}</option>
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-prylom-gold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>

    {/* 4. STATUS & SELO */}
    <div className="group flex flex-col gap-1.5">
      <div className="min-h-[20px] flex items-end ml-1">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">{t.statusLabel}</label>
      </div>
      <div className="relative h-[64px]">
        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)} 
          className="w-full h-full bg-white border-2 border-gray-100 rounded-xl px-4 pr-10 text-[12px] font-black text-prylom-dark outline-none appearance-none cursor-pointer transition-all hover:border-gray-200 focus:border-prylom-gold shadow-sm"
        >
          <option value="all">{t.statusAll}</option>
          <option value="ativo">{t.statusAvailable}</option>
          <option value="negociacao">{t.statusNegotiating}</option>
          <option value="verified">{t.verifiedLabel}</option>
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-prylom-gold">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
</div>
</section>
    )}

{activeCategory === 'fazendas' && (
  <div style={{ fontFamily: "'Montserrat', sans-serif" }} className="animate-slideUp">
    <div className="rounded-2xl overflow-hidden border" style={{ background: '#fff', borderColor: '#dce5ec' }}>

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ background: '#2c5363' }}>
        <span style={{ color: '#bba219', fontSize: 16, fontWeight: 900, lineHeight: 1 }}>✦</span>
        <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {t.techFiltersFarm}
        </span>
        <div className="flex items-center gap-5 ml-auto">
          {[
            { lbl: 'Filtro Financeiros', key: 'financeiros' },
            { lbl: 'Filtro de Certificação', key: 'certificacao' },
            { lbl: 'Off Marketing', key: 'offmarketing' },
          ].map(({ lbl, key }) => (
            <span
              key={key}
              onClick={() => setActiveFilterTab(prev => ({ ...prev, [key]: !prev[key] }))}
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 9,
                fontWeight: 700,
                color: activeFilterTab[key] ? '#bba219' : 'rgba(255,255,255,.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                cursor: 'pointer',
                transition: 'color .15s',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {activeFilterTab[key] && (
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#bba219', display: 'inline-block', flexShrink: 0 }} />
              )}
              {lbl}
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          BLOCO 1 — FILTROS TÉCNICOS (sempre visível)
      ══════════════════════════════════════ */}
      <div style={{ borderBottom: activeFilterTab.financeiros || activeFilterTab.certificacao || activeFilterTab.offmarketing ? '1px solid #eef1f5' : 'none' }}>

        {/* Cabeçalho da seção */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '7px 20px 5px', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#e2e8ef' }} />
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#2c5363', whiteSpace: 'nowrap' }}>
            Filtros Técnicos
          </span>
          <div style={{ flex: 1, height: 1, background: '#e2e8ef' }} />
        </div>

        {/* GRID 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 10, padding: '8px 20px 12px', borderBottom: '1px solid #eef1f5' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Código</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <input placeholder="Código" value={filterCodigo} onChange={e => setFilterCodigo(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: '0 8px', height: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Transação</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <select value={transactionType} onChange={e => setTransactionType(e.target.value as any)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', width: '100%', padding: '0 8px', height: '100%' }}>
                <option value="all">Todas</option>
                <option value="venda">Venda</option>
                <option value="arrendamento">Arrendamento</option>
                <option value="parceria">Parceria</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Estado</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <select value={filterState} onChange={e => setFilterState(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', width: '100%', padding: '0 8px', height: '100%' }}>
                <option value="">Todos</option>
                {['GO','MT','MS','MG','SP','BA','PR','RS','SC','TO','PA','MA','PI','RO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Município</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <input placeholder="Município" value={filterCity} onChange={e => setFilterCity(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: '0 8px', height: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Aptidão</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <select value={filterAptidao} onChange={e => setFilterAptidao(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', width: '100%', padding: '0 8px', height: '100%' }}>
                <option value="">Todas</option>
                <option value="soja">Soja</option><option value="milho">Milho</option><option value="cana">Cana</option>
                <option value="café">Café</option><option value="pecuária">Pecuária</option><option value="algodão">Algodão</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ height: 18, display: 'flex', gap: 4, alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 3, background: '#2c5363', color: '#fff' }}>Total</span>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 3, background: '#bba219', color: '#fff' }}>Prod.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <input type="text" inputMode="numeric" placeholder="mín total" value={minAreaTotal} onChange={e => setMinAreaTotal(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '45%', padding: '0 6px', height: '100%' }} />
              <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
              <input type="text" inputMode="numeric" placeholder="mín prod." value={minAreaProdutiva} onChange={e => setMinAreaProdutiva(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '45%', padding: '0 6px', height: '100%' }} />
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 8, fontWeight: 700, color: '#94a3b8', padding: '0 4px', flexShrink: 0 }}>ha</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Preço por ha.</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <input type="text" inputMode="numeric" placeholder="mín" value={minPriceHa} onChange={e => setMinPriceHa(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 6px', height: '100%' }} />
              <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
              <input type="text" inputMode="numeric" placeholder="máx" value={maxPriceHa} onChange={e => setMaxPriceHa(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 6px', height: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Preço área total</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <input type="text" inputMode="numeric" placeholder="mín" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 6px', height: '100%' }} />
              <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
              <input type="text" inputMode="numeric" placeholder="máx" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 6px', height: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Teor de Argila</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <input type="text" inputMode="numeric" placeholder="mín %" value={minArgila} onChange={e => setMinArgila(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 6px', height: '100%' }} />
              <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
              <input type="text" inputMode="numeric" placeholder="máx %" value={maxArgila} onChange={e => setMaxArgila(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 6px', height: '100%' }} />
            </div>
          </div>

        </div>

        {/* GRID 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 10, padding: '8px 20px 10px' }}>

          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Área Total</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <input type="text" inputMode="numeric" placeholder="mín" value={minAreaTotal} onChange={e => setMinAreaTotal(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '45%', padding: '0 6px', height: '100%' }} />
              <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
              <input type="text" inputMode="numeric" placeholder="máx" value={maxAreaTotal} onChange={e => setMaxAreaTotal(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '45%', padding: '0 6px', height: '100%' }} />
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 8, fontWeight: 700, color: '#94a3b8', padding: '0 4px', flexShrink: 0 }}>ha</span>
            </div>
          </div>

          <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Área Prod.</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <input type="text" inputMode="numeric" placeholder="mín" value={minAreaProdutiva} onChange={e => setMinAreaProdutiva(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: '0 6px', height: '100%' }} />
            </div>
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Argila &amp; Solo</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <select value={clayContent} onChange={e => setClayContent(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', width: '50%', padding: '0 6px', height: '100%' }}>
                <option value="">Argila%</option>
                <option value="15-25">15-25%</option>
                <option value="25-35">25-35%</option>
                <option value="35+">35%+</option>
              </select>
              <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
              <input placeholder="Tipo solo" value={soilType} onChange={e => setSoilType(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 6px', height: '100%' }} />
            </div>
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Clima</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <input placeholder="Pluvio." value={minPluviometria} onChange={e => setMinPluviometria(e.target.value)} inputMode="numeric" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 6px', height: '100%' }} />
              <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
              <input placeholder="Altitude" value={minAltitude} onChange={e => setMinAltitude(e.target.value)} inputMode="numeric" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 6px', height: '100%' }} />
            </div>
          </div>

          <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Topografia</span>
            <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
              <select value={topography} onChange={e => setTopography(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', appearance: 'none', width: '100%', padding: '0 8px', height: '100%' }}>
                <option value="">{t.topographyAll}</option>
                <option value="plana">{t.topographyFlat}</option>
                <option value="ondulada">{t.topographyWavy}</option>
                <option value="montanhosa">Montanhosa</option>
              </select>
            </div>
          </div>

          <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Documentação</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, background: '#f0f4f7', border: `1.5px solid ${docOnlyOk ? '#bba219' : '#dce5ec'}`, borderRadius: 9, padding: '0 10px', cursor: 'pointer', transition: 'border-color .15s', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ width: 13, height: 13, border: `2px solid ${docOnlyOk ? '#bba219' : '#cdd8e0'}`, borderRadius: 3, background: docOnlyOk ? '#bba219' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .12s' }}>
                {docOnlyOk && <div style={{ width: 5, height: 3, borderLeft: '2px solid #fff', borderBottom: '2px solid #fff', transform: 'rotate(-45deg) translateY(-1px)' }} />}
              </div>
              <input type="checkbox" checked={docOnlyOk} onChange={e => setDocOnlyOk(e.target.checked)} style={{ display: 'none' }} />
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 6.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#2c5363' }}>{t.docOk}</span>
            </label>
          </div>

        </div>

        {/* Limpar técnico */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 20px 10px' }}>
          <button
            onClick={() => {
              setDocOnlyOk(false);
              setClayContent(""); setSoilType("");
              setMinPluviometria(""); setMinAltitude("");
              setTopography("");
              setFilterCodigo(""); setFilterState(""); setFilterCity("");
              setTransactionType("all"); setFilterAptidao("");
              setMinAreaTotal(""); setMaxAreaTotal(""); setMinAreaProdutiva(""); setMaxAreaProdutiva("");
              setMinPrice(""); setMaxPrice(""); setMinPriceHa(""); setMaxPriceHa("");
              setMinArgila(""); setMaxArgila("");
            }}
            style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseOver={e => (e.currentTarget.style.color = '#e25757')}
            onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}
          >
            Limpar filtros técnicos
          </button>
        </div>

      </div>

      {/* ══════════════════════════════════════
          BLOCO 2 — FILTROS FINANCEIROS (accordion)
      ══════════════════════════════════════ */}
      {activeFilterTab.financeiros && (
        <div style={{ borderBottom: '1px solid #eef1f5' }}>

          <div style={{ display: 'flex', alignItems: 'center', padding: '7px 20px 5px', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8ef' }} />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#2c5363', whiteSpace: 'nowrap' }}>
              Filtros Financeiros
            </span>
            <div style={{ flex: 1, height: 1, background: '#e2e8ef' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 10, padding: '8px 20px 10px' }}>
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Produtiv. saca/ha</span>
              <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
                <input type="text" inputMode="numeric" placeholder="mín" value={minProdutividade} onChange={e => setMinProdutividade(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 8px', height: '100%' }} />
                <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
                <input type="text" inputMode="numeric" placeholder="máx" value={maxProdutividade} onChange={e => setMaxProdutividade(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 8px', height: '100%' }} />
              </div>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>ROI anual produção</span>
              <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
                <input type="text" inputMode="numeric" placeholder="mín %" value={minRoi} onChange={e => setMinRoi(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 8px', height: '100%' }} />
                <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
                <input type="text" inputMode="numeric" placeholder="máx %" value={maxRoi} onChange={e => setMaxRoi(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 8px', height: '100%' }} />
              </div>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Valorização da Terra</span>
              <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
                <input type="text" inputMode="numeric" placeholder="mín %" value={minValorizacao} onChange={e => setMinValorizacao(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 8px', height: '100%' }} />
                <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
                <input type="text" inputMode="numeric" placeholder="máx %" value={maxValorizacao} onChange={e => setMaxValorizacao(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 8px', height: '100%' }} />
              </div>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Payback real</span>
              <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
                <input type="text" inputMode="numeric" placeholder="mín anos" value={minPayback} onChange={e => setMinPayback(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 8px', height: '100%' }} />
                <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
                <input type="text" inputMode="numeric" placeholder="máx anos" value={maxPayback} onChange={e => setMaxPayback(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 8px', height: '100%' }} />
              </div>
            </div>
            <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#7a8fa0', textAlign: 'center', height: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>Faturamento est.</span>
              <div style={{ display: 'flex', alignItems: 'center', height: 34, background: '#f0f4f7', border: '1.5px solid #dce5ec', borderRadius: 9, overflow: 'hidden', width: '100%' }}>
                <input type="text" inputMode="numeric" placeholder="mín" value={minFaturamento} onChange={e => setMinFaturamento(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 8px', height: '100%' }} />
                <div style={{ width: 1, height: 16, background: '#dce5ec', flexShrink: 0 }} />
                <input type="text" inputMode="numeric" placeholder="máx" value={maxFaturamento} onChange={e => setMaxFaturamento(e.target.value)} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 600, color: '#9eafc0', background: 'transparent', border: 'none', outline: 'none', width: '50%', padding: '0 8px', height: '100%' }} />
              </div>
            </div>
          </div>

          {/* Limpar financeiro */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 20px 10px' }}>
            <button
              onClick={() => { setMinProdutividade(''); setMaxProdutividade(''); setMinRoi(''); setMaxRoi(''); setMinValorizacao(''); setMaxValorizacao(''); setMinPayback(''); setMaxPayback(''); setMinFaturamento(''); setMaxFaturamento(''); }}
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget.style.color = '#e25757')}
              onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}
            >
              Limpar filtros financeiros
            </button>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════
          BLOCO 3 — FILTRO DE CERTIFICAÇÃO (accordion)
      ══════════════════════════════════════ */}
      {activeFilterTab.certificacao && (
        <div style={{ borderBottom: '1px solid #eef1f5' }}>

          <div style={{ display: 'flex', alignItems: 'center', padding: '7px 20px 5px', gap: 12 }}>
            <div style={{ flex: 3, height: 1, background: '#e2e8ef' }} />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#bba219', whiteSpace: 'nowrap' }}>
              Filtro de Certificação
            </span>
            <div style={{ flex: 1, height: 1, background: '#e2e8ef' }} />
          </div>

          <div className="px-5 py-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: 'Prylom Selected', title: 'Prylom Selected', desc: 'Ativos premium com Dossiê Preliminar executado. Documentação primária, viabilidade de solo e valuation previamente auditados pela nossa curadoria.', barColor: '#c9a800', borderSel: '#c9a800', bgSel: '#fffbe6', titleColor: '#8a6e00' },
                { id: 'Prylom Verified', title: 'Prylom Verified', desc: 'Ativos com conformidade inicial. Documentação de posse e titularidade básicas apresentadas pelos originadores em nosso sistema.', barColor: '#4a58d4', borderSel: '#4a58d4', bgSel: '#eef0fc', titleColor: '#3040b0' },
                { id: 'Open Market', title: 'Open Market', desc: 'Informações declaratórias. Baseado apenas em imagens e descrição fornecidas pelo proprietário, sem validação documental prévia.', barColor: '#1e6b82', borderSel: '#1e6b82', bgSel: '#e6f4f8', titleColor: '#1e6b82' },
              ].map((tipo) => {
                const isSelected = selectedTipoAnuncio === tipo.id;
                return (
                  <button
                    key={tipo.id}
                    onClick={() => setSelectedTipoAnuncio(prev => prev === tipo.id ? "" : tipo.id)}
                    style={{ display: 'flex', alignItems: 'stretch', borderRadius: 12, border: `1.5px solid ${isSelected ? tipo.borderSel : '#c8d6e0'}`, background: isSelected ? tipo.bgSel : '#fff', cursor: 'pointer', overflow: 'hidden', minHeight: 80, position: 'relative', textAlign: 'left', transition: 'border-color .2s, background .2s', padding: 0 }}
                  >
                    <div style={{ width: 5, background: tipo.barColor, flexShrink: 0 }} />
                    <div style={{ padding: '10px 12px', flex: 1 }}>
                      <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: tipo.titleColor, marginBottom: 5 }}>{tipo.title}</p>
                      <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 8.5, fontWeight: 600, color: '#3d5a6b', lineHeight: 1.6, margin: 0 }}>{tipo.desc}</p>
                    </div>
                    {isSelected && <div style={{ position: 'absolute', top: 9, right: 9, width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Limpar certificação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 20px 10px' }}>
            <button
              onClick={() => setSelectedTipoAnuncio("")}
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget.style.color = '#e25757')}
              onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}
            >
              Limpar filtro de certificação
            </button>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════
          BLOCO 4 — OFF MARKETING (accordion)
      ══════════════════════════════════════ */}
      {activeFilterTab.offmarketing && (
        <div style={{ borderBottom: '1px solid #eef1f5' }}>

          <div style={{ display: 'flex', alignItems: 'center', padding: '7px 20px 5px', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8ef' }} />
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#94a3b8', whiteSpace: 'nowrap' }}>
              Off Marketing
            </span>
          </div>

          <div className="px-5 py-3">
            {(() => {
              const isOffMarket = selectedTipoAnuncio === 'Off Market';
              return (
                <div
                  onClick={() => setSelectedTipoAnuncio(prev => prev === 'Off Market' ? "" : 'Off Market')}
                  style={{ border: isOffMarket ? '1.5px solid #2c5363' : '1.5px dashed #cdd8e0', borderRadius: 13, padding: '14px 16px', background: isOffMarket ? '#edf4f7' : '#fff', cursor: 'pointer', transition: 'border-color .2s, background .2s' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 900, color: '#2c5363', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                        <rect x="3" y="7" width="10" height="8" rx="2" fill="#2c5363" />
                        <path d="M5 7V5a3 3 0 016 0v2" stroke="#2c5363" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      Carteira Private &amp; Off Market
                      {isOffMarket && (
                        <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', background: '#2c5363', color: '#fff', padding: '2px 8px', borderRadius: 20 }}>
                          Filtro Ativado
                        </span>
                      )}
                    </span>
                    <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '5px 14px', borderRadius: 20, border: `1.5px solid ${isOffMarket ? '#2c5363' : '#cdd8e0'}`, background: isOffMarket ? '#2c5363' : '#f0f4f7', color: isOffMarket ? '#fff' : '#94a3b8', transition: 'all .2s' }}>
                      {isOffMarket ? '✓ Ativado' : 'Ativar Acesso'}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 9, fontWeight: 500, color: '#4a6070', lineHeight: 1.7, marginBottom: 14 }}>
                    <strong style={{ color: '#2c5363', fontWeight: 800 }}>Acesse o acervo invisível ao mercado comum.</strong> Nesta categoria encontram-se ativos de alto valor estratégico cujos proprietários exigem sigilo absoluto (non-disclosure).<br />
                    <strong style={{ color: '#2c5363', fontWeight: 800 }}>Por que acessar?</strong> Você encontrará oportunidades exclusivas com menor concorrência de compra e negociações preservadas.<br />
                    <strong style={{ color: '#2c5363', fontWeight: 800 }}>Como desbloquear:</strong> Em conformidade com a LGPD e rigoroso Compliance, o acesso é liberado exclusivamente após identificação do investidor (KYC) e assinatura digital de NDA (Termo de Confidencialidade).
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
<button
  onClick={(e) => { e.stopPropagation(); navigate('/dataroom'); }}
  style={{
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 8.5,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    padding: '8px 20px',
    borderRadius: 20,
    border: `1.5px solid ${isOffMarket ? '#2c5363' : 'transparent'}`,
    background: isOffMarket ? '#2c5363' : '#b0bec5',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background .2s, border-color .2s',
  }}
>
  Saiba Mais
</button>

                  </div>
                </div>
              );
            })()}
          </div>

          {/* Limpar off market */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 20px 10px' }}>
            <button
              onClick={() => setSelectedTipoAnuncio(prev => prev === 'Off Market' ? "" : prev)}
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget.style.color = '#e25757')}
              onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}
            >
              Limpar off marketing
            </button>
          </div>

        </div>
      )}

      {/* ── FOOTER — limpar tudo ── */}
      <div className="flex justify-end px-5 py-2" style={{ background: '#fafbfc' }}>
        <button
          onClick={() => {
            setSelectedTipoAnuncio("");
            setDocOnlyOk(false);
            setClayContent("");
            setSoilType("");
            setMinPluviometria("");
            setMinAltitude("");
            setTopography("");
            setActiveFilterTab({ financeiros: false, certificacao: false, offmarketing: false });
          }}
          style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseOver={e => (e.currentTarget.style.color = '#e25757')}
          onMouseOut={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          Limpar todos os filtros
        </button>
      </div>

    </div>
  </div>
)}

          {activeCategory === 'maquinas' && (
            <div className="space-y-6 animate-fadeIn">
              <h4 className="text-[11px] font-black text-[#2c5363] uppercase tracking-[0.3em] flex items-center gap-4">
                🚜 {t.techFiltersMachine}
                <div className="h-px flex-1 bg-gray-100"></div>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.brand}</label>
                  <input value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.hoursMax}</label>
                  <input type="number" value={maxHours} onChange={e => setMaxHours(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.precisionAg}</label>
                  <select value={precisionAgFilter} onChange={e => setPrecisionAgFilter(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold">
                    <option value="">{t.precisionAg}</option>
                    <option value="sim">Sim</option>
                    <option value="não">Não</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.powerMin} (HP)</label>
                  <input type="number" value={minPower} onChange={e => setMinPower(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'avioes' && (
            <div className="space-y-6 animate-fadeIn">
              <h4 className="text-[11px] font-black text-[#2c5363] uppercase tracking-[0.3em] flex items-center gap-4">
                🛩️ {t.techFiltersPlane}
                <div className="h-px flex-1 bg-gray-100"></div>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.planeOperation}</label>
                  <select value={planeTypeFilter} onChange={e => setPlaneTypeFilter(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold">
                    <option value="">{t.planeOperation}</option>
                    <option value="agricola">{t.planeAgri}</option>
                    <option value="executivo">{t.planeExec}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.manufacturer}</label>
                  <input value={manufacturerFilter} onChange={e => setManufacturerFilter(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.yearMin}</label>
                  <input type="number" value={minYearPlane} onChange={e => setMinYearPlane(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.planeAnac}</label>
                  <select value={anacHomologFilter} onChange={e => setAnacHomologFilter(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold">
                    <option value="">{t.planeAnac}</option>
                    <option value="sim">Homologado</option>
                    <option value="experimental">Experimental</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'graos' && (
            <div className="space-y-6 animate-fadeIn">
              <h4 className="text-[11px] font-black text-[#2c5363] uppercase tracking-[0.3em] flex items-center gap-4">
                🌾 {t.techFiltersGrain}
                <div className="h-px flex-1 bg-gray-100"></div>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.cultureAll}</label>
                  <input placeholder="Soja, Milho, Trigo..." value={grainCulture} onChange={e => setGrainCulture(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.grainHarvest}</label>
                  <input placeholder="Ex: 24/25" value={grainHarvest} onChange={e => setGrainHarvest(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.grainQuality}</label>
                  <input placeholder="Exportação, Padrão..." value={grainQuality} onChange={e => setGrainQuality(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.grainVolume} (Min)</label>
                  <input type="number" value={minVolume} onChange={e => setMinVolume(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                </div>
              </div>
            </div>
          )}

          {transactionType === 'arrendamento' && (
             <div className="space-y-6 animate-fadeIn">
               <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-[0.3em] flex items-center gap-4">
                 📑 {t.leaseFilters}
                 <div className="h-px flex-1 bg-gray-100"></div>
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="space-y-2">
                   <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.leaseMod}</label>
                   <select value={arrModalidade} onChange={e => setArrModalidade(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold">
                      <option value="">{t.leaseMod}</option>
                      <option value="fixo">Pagamento Fixo</option>
                      <option value="sacas">Pagamento em Sacas</option>
                      <option value="parceria">Parceria (% Colheita)</option>
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.leaseCulture}</label>
                   <input placeholder="Soja, Milho..." value={arrCulturaBase} onChange={e => setArrCulturaBase(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                 </div>
                 <div className="space-y-2">
                   <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.leaseSafras} (Min)</label>
                   <input type="number" value={arrQtdSafras} onChange={e => setArrQtdSafras(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold" />
                 </div>
                 <div className="space-y-2">
                   <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.leaseStartMonth}</label>
                   <select value={arrMesInicioColheita} onChange={e => setArrMesInicioColheita(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold">
                      <option value="">{t.leaseStartMonth}</option>
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                   </select>
                 </div>
               </div>
             </div>
          )}

          <div className="pt-6 flex justify-end">
             <button onClick={() => {
                setFilterState(''); setFilterCity(''); setFilterCodigo(''); setMinPrice(''); setMaxPrice(''); setFilterStatus('all');
                setTransactionType('all'); setFilterAptidao('');
                setMinAreaTotal(''); setMaxAreaTotal(''); setMinAreaLavoura(''); setSoilType(''); setClayContent(''); setTopography(''); setDocOnlyOk(false);
                setMinAreaProdutiva(''); setMaxAreaProdutiva(''); setMinPluviometria(''); setMinAltitude('');
                setMinPriceHa(''); setMaxPriceHa(''); setMinArgila(''); setMaxArgila('');
                setMinProdutividade(''); setMaxProdutividade(''); setMinRoi(''); setMaxRoi('');
                setMinValorizacao(''); setMaxValorizacao(''); setMinPayback(''); setMaxPayback('');
                setMinFaturamento(''); setMaxFaturamento('');
                setBrandFilter(''); setMachineModelFilter(''); setMinYear(''); setMaxYear(''); setMaxHours(''); setConservationState(''); setPrecisionAgFilter(''); setMinPower(''); setFuelType('');
                setPlaneTypeFilter(''); setManufacturerFilter(''); setMinYearPlane(''); setMaxHoursPlane(''); setAnacHomologFilter('');
                setGrainCulture(''); setGrainHarvest(''); setGrainQuality(''); setMinVolume('');
                setArrModalidade(''); setArrAptidao(''); setMinArrArea(''); setMaxArrArea(''); setArrCulturaBase(''); setArrQtdSafras(''); setArrMesInicioColheita(''); setSelectedTipoAnuncio('');
             }} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-red-500 transition-colors">Limpar Todos os Filtros</button>
          </div>
        </div>
      )}

{loading ? (
  <div className="py-20 text-center">
    <div className="w-12 h-12 border-4 border-prylom-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
    <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">{t.marketSync}</p>
  </div>
) : (
  <>
    {viewMode === 'off' ? (
      <OffMarketView t={t} />
    ) : viewMode === 'equipe' ? (
      <EquipeView t={t} />
    ) : viewMode === 'global' ? (
      <GlobalView t={t} />
    ) : filteredProducts.length === 0 ? (
      <div className="py-20 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm">
        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">{t.marketEmpty}</p>
      </div>
    ) :
     viewMode === 'grid' ? (
            <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {topSpacerHeight > 0 && (
                <div style={{ height: topSpacerHeight, gridColumn: '1 / -1', position: 'relative' }}>
                  <div ref={topSentinelRef} style={{ position: 'absolute', bottom: 0, height: 1, width: '100%' }} aria-hidden="true" />
                </div>
              )}
              {filteredProducts.slice(visibleStart, visibleEnd).map(p => {
                const price = formatPriceParts(p.valor);
                return (
                  <div key={p.id} data-card onClick={() => onSelectProduct(p.id)} className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col group">
                    <div className="h-64 relative overflow-hidden bg-gray-50">
                      <img src={p.main_image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    
                    {/* BOTÃO DE CURTIR - POSICIONAMENTO E ESTILO */}
    <button 
      onClick={(e) => toggleFavorite(e, p.id)}
      className="absolute top-5 right-5 z-10 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transform transition-all active:scale-90 hover:scale-110"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 transition-all"
        viewBox="0 0 24 24"
        fill={favorites.includes(p.id) ? '#2c5363' : 'none'}
        stroke={favorites.includes(p.id) ? '#2c5363' : '#9ca3af'}
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
                    
                    
                    </div>
                    <div className="p-8 flex flex-col flex-1">
                      <h2 className="flex flex-wrap items-baseline gap-3 text-2xl font-black tracking-tight line-clamp-2 uppercase">
                        <span className="text-prylom-dark group-hover:text-prylom-gold transition-colors">
                          {p.titulo} 
                        </span>
                      </h2>
                      <span className={`text-[11px] font-black uppercase tracking-widest ${getStatusTextColor(p.status)}`}>
                        {getStatusLabel(p.status)}
                      </span>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-400 font-bold uppercase mb-6">
                        <span>Argila: <strong className="font-black">{p.fazenda_data?.teor_argila || '-'}%</strong></span>
                        <span>Aptidão: <strong className="font-black">{p.fazenda_data?.aptidao || '-'}</strong></span>  

                        <span>Pluviom.: <strong className="font-black">{p.fazenda_data?.precipitacao_mm || '-'} mm</strong></span>
                        <span>Altitude: <strong className="font-black">{p.fazenda_data?.altitude_m || '-'} m</strong></span>

                        <span>Área Total: <strong className="font-black">{p.fazenda_data?.area_total_ha || '-'} ha</strong></span>
                        <span>Área Prod.: <strong className="font-black">{p.fazenda_data?.area_lavoura_ha || '-'} ha</strong></span>

                        <span className="col-span-2">
                          Código: <strong className="font-black">{p.codigo}</strong>
                        </span>
                      </div>
<div className="mt-auto p-6 bg-gray-50 rounded-3xl border border-gray-100">
  <p className="text-[9px] font-black text-prylom-gold uppercase tracking-widest mb-1">
    {p.tipo_transacao === 'arrendamento' ? 'Arrendamento Disponível' : 'Ativo para Venda'}
  </p>
  
  <div className="flex flex-col gap-1">
    {p.tipo_transacao === 'arrendamento' ? (
      /* --- VISÃO ARRENDAMENTO (SACAS) --- */
      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-prylom-dark tabular-nums">
            {p.valor}
          </span>
          <span className="text-sm font-black text-prylom-dark uppercase tracking-tighter">
            sc {p.arrendamento_info?.cultura_base || 'Soja'} / ha
          </span>
        </div>
        <p className="text-[8px] font-bold text-gray-400 uppercase">Pagamento Anual em Sacas</p>
      </div>
    ) : (
      /* --- VISÃO VENDA (MOEDA) --- */
      <>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black text-prylom-dark">{price.symbol}</span>
          <span className="text-2xl font-black text-prylom-dark tabular-nums">
            {price.value}
          </span>
        </div>

        {p.area_total_ha && p.valor && (
          <div className="flex items-baseline gap-1 opacity-60">
            <span className="text-sm font-black text-gray-500">{getSymbol()}</span>
            <span className="text-lg font-black text-gray-500 tabular-nums">
              {formatPriceParts(p.valor / p.area_total_ha).value}
            </span>
            <span className="text-[10px] font-black text-gray-400">/ha</span>
          </div>
        )}
      </>
    )}
  </div>
</div>
                    </div>
                  </div>
                );
              })}
              <div ref={sentinelRef} style={{ gridColumn: '1 / -1', height: 1 }} aria-hidden="true" />
              {visibleEnd < filteredProducts.length && (
                <div style={{ gridColumn: '1 / -1' }} className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-prylom-gold border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-[600px] md:h-[700px] rounded-[4rem] overflow-hidden border-8 border-white shadow-3xl relative bg-gray-100">
                <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
                <div className="absolute top-8 right-8 z-10 bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-gray-100 pointer-events-none max-w-xs">
                    <p className="text-[10px] font-black text-prylom-gold uppercase tracking-[0.2em] mb-2">Visão Estratégica</p>
                    <p className="text-sm font-bold text-prylom-dark">Explore ativos geolocalizados. Agrupamentos mostram múltiplos anúncios no mesmo município.</p>
                </div>
            </div>
          )}
        </>
      )}

      {/* RODAPÉ DE COMPLIANCE & LEGAL */}
<footer className="mt-20 pt-10 border-t border-gray-100 space-y-8 pb-10">
  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
    
    {/* Coluna do Disclaimer */}
    <div className="md:col-span-8 space-y-4">
      <h5 className="text-[10px] font-black text-[#2c5363] uppercase tracking-[0.2em]">
        Disclaimer Legal & Compliance
      </h5>
      <p className="text-[10px] leading-relaxed text-gray-400 font-medium text-justify uppercase tracking-tight">
A Prylom atua como plataforma de inteligência e conexão para Investidores Qualificados, operada sob
rigorosa supervisão técnica (CRECI). Os ativos categorizados como "Open Marketing" são publicados
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
        <svg className="w-8 h-8 text-[#2c5363]" fill="currentColor" viewBox="0 0 24 24">
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
    </div>
  );
};

export default ShoppingCenter;
