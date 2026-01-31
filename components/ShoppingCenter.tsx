import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppLanguage, AppCurrency } from '../types';
import { supabase } from '../supabaseClient';
import L from 'leaflet';

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
}

interface Props {
  onBack: () => void;
  onSelectProduct: (productId: string) => void;
  t: any;
  lang: AppLanguage;
  currency: AppCurrency;
}

const ShoppingCenter: React.FC<Props> = ({ onBack, onSelectProduct, t, lang, currency }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [transactionType, setTransactionType] = useState<'all' | 'venda' | 'arrendamento'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const geoCache = useRef<Record<string, L.LatLng>>({});

  // Filtros Universais
  const [filterState, setFilterState] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [priceMode, setPriceMode] = useState<'total' | 'hectare'>('total');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filtros Inteligentes (Fazendas)
  const [minAreaTotal, setMinAreaTotal] = useState<string>('');
  const [maxAreaTotal, setMaxAreaTotal] = useState<string>('');
  const [minAreaLavoura, setMinAreaLavoura] = useState<string>('');
  const [soilType, setSoilType] = useState<string>('');
  const [clayContent, setClayContent] = useState<string>('');
  const [topography, setTopography] = useState<string>('');
  const [docOnlyOk, setDocOnlyOk] = useState<boolean>(false);

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
    if (mapInstance.current && mapLayersRef.current) {
        renderMarkers();
    }
  }, [mapGrouping, mapHeatmap, mapOnlyFarms, mapOnlyLeases, products, activeCategory, transactionType, filterState, filterCity, filterStatus, minPrice, maxPrice, minAreaTotal, brandFilter, grainCulture, planeTypeFilter, arrModalidade, arrAptidao, minArrArea, maxArrArea, arrCulturaBase, arrQtdSafras, arrMesInicioColheita]);

  useEffect(() => {
    if (activeCategory !== 'fazendas' && activeCategory !== 'all') {
      setTransactionType('all');
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
        .order('created_at', { ascending: false });
      
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

  const filteredProducts = useMemo(() => {
    let filtered = products;

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
    if (filterCity) filtered = filtered.filter(p => p.cidade === filterCity);

    if (filterStatus !== 'all') {
      if (filterStatus === 'verified') filtered = filtered.filter(p => p.certificacao);
      else filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (minPrice || maxPrice) {
      filtered = filtered.filter(p => {
        if (p.tipo_transacao === 'arrendamento') return true;
        if (!p.valor) return false;
        let valueToCompare = p.valor;
        if (priceMode === 'hectare' && p.area_total_ha) {
          valueToCompare = p.valor / p.area_total_ha;
        }
        if (minPrice && valueToCompare < Number(minPrice)) return false;
        if (maxPrice && valueToCompare > Number(maxPrice)) return false;
        return true;
      });
    }

    // Filtros Técnicos Fazendas
    if (activeCategory === 'fazendas' || activeCategory === 'all') {
      if (minAreaTotal) filtered = filtered.filter(p => p.area_total_ha && p.area_total_ha >= Number(minAreaTotal));
      if (maxAreaTotal) filtered = filtered.filter(p => p.area_total_ha && p.area_total_ha <= Number(maxAreaTotal));
      if (minAreaLavoura) filtered = filtered.filter(p => p.fazenda_data?.area_lavoura_ha && p.fazenda_data?.area_lavoura_ha >= Number(minAreaLavoura));
      if (soilType) filtered = filtered.filter(p => p.fazenda_data?.tipo_solo?.toLowerCase().includes(soilType.toLowerCase()));
      if (clayContent) filtered = filtered.filter(p => p.fazenda_data?.teor_argila?.includes(clayContent));
      if (topography) filtered = filtered.filter(p => p.fazenda_data?.topografia?.toLowerCase().includes(topography.toLowerCase()));
      if (docOnlyOk) filtered = filtered.filter(p => p.fazenda_data?.documentacao_ok?.toLowerCase().includes('sim') || p.fazenda_data?.documentacao_ok?.toLowerCase().includes('ok'));
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
  }, [products, activeCategory, transactionType, filterState, filterCity, filterStatus, minPrice, maxPrice, priceMode, minAreaTotal, maxAreaTotal, minAreaLavoura, soilType, clayContent, topography, docOnlyOk, brandFilter, machineModelFilter, minYear, maxYear, maxHours, conservationState, precisionAgFilter, minPower, fuelType, planeTypeFilter, manufacturerFilter, minYearPlane, maxHoursPlane, anacHomologFilter, grainCulture, grainHarvest, grainQuality, minVolume, arrModalidade, arrAptidao, minArrArea, maxArrArea, arrCulturaBase, arrQtdSafras, arrMesInicioColheita, viewMode]);

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
    
    mapLayersRef.current.markers.clearLayers();
    mapLayersRef.current.heatmap.clearLayers();

    const grouped = filteredProducts.reduce((acc, p) => {
      const key = `${p.cidade}-${p.estado}`.toLowerCase();
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {} as Record<string, Product[]>);

    const bounds = L.latLngBounds([]);
    
    for (const key in grouped) {
      const items = grouped[key];
      const firstItem = items[0];
      const searchTerm = `${firstItem.cidade}, ${firstItem.estado}, Brasil`;

      let pos: L.LatLng | null = null;
      if (geoCache.current[searchTerm]) {
          pos = geoCache.current[searchTerm];
      } else {
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=1`);
          const data = await resp.json();
          if (data?.[0]) {
            pos = new L.LatLng(parseFloat(data[0].lat), parseFloat(data[0].lon));
            geoCache.current[searchTerm] = pos;
          }
        } catch (e) { console.warn("Geocoding failed for:", key); }
      }
      
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
                             <p class="text-[10px] font-bold text-prylom-gold">${pd.symbol} ${pd.value}</p>
                          </div>
                       </div>
                     `}).join('')}
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
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-white shadow-md text-prylom-dark' : 'text-gray-400 hover:text-prylom-dark'}`}
                  >
                    {cat.label}
                  </button>
                ))}
            </div>

            <div className="flex bg-gray-100 p-1 rounded-full">
                <button onClick={() => setViewMode('grid')} className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${viewMode === 'grid' ? 'bg-white shadow-md text-prylom-dark' : 'text-gray-400 hover:text-prylom-dark'}`}>{t.viewGrid}</button>
                <button onClick={() => setViewMode('map')} className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${viewMode === 'map' ? 'bg-white shadow-md text-prylom-dark' : 'text-gray-400 hover:text-prylom-dark'}`}>{t.viewMap}</button>
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`bg-white border-2 px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${showFilters ? 'border-prylom-gold text-prylom-gold' : 'border-gray-100 text-prylom-dark'}`}>
              {showFilters ? t.hideFilters : t.advancedFilters}
            </button>
            <button onClick={onBack} className="bg-white text-prylom-dark border-2 border-gray-100 px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:border-prylom-gold transition-all">{t.btnBack}</button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-2xl animate-fadeIn space-y-10 max-h-[75vh] overflow-y-auto no-scrollbar scroll-smooth">
          {/* SEÇÃO 1: FILTROS UNIVERSAIS */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-black text-prylom-dark uppercase tracking-[0.3em] flex items-center gap-4">
              📌 {t.advancedFilters} Universais
              <div className="h-px flex-1 bg-gray-100"></div>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1 leading-tight">{t.locationLabel}</label>
                <div className="grid grid-cols-2 gap-3">
                  <select value={filterState} onChange={e => {setFilterState(e.target.value); setFilterCity('');}} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none appearance-none border border-transparent focus:border-prylom-gold transition-all">
                    <option value="">{t.stateAll}</option>
                    {availableStates.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                  <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none appearance-none border border-transparent focus:border-prylom-gold transition-all">
                    <option value="">{t.cityAll}</option>
                    {availableCities.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1 mb-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider leading-tight">{t.priceRange}</label>
                  <div className="flex bg-gray-100 p-0.5 rounded-lg text-[8px] font-black uppercase">
                    <button onClick={() => setPriceMode('total')} className={`px-2 py-1 rounded-md ${priceMode === 'total' ? 'bg-white shadow-sm text-prylom-dark' : 'text-gray-400'}`}>{t.priceTotal}</button>
                    <button onClick={() => setPriceMode('hectare')} className={`px-2 py-1 rounded-md ${priceMode === 'hectare' ? 'bg-white shadow-sm text-prylom-dark' : 'text-gray-400'}`}>{t.priceHectare}</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder={t.areaMin} value={minPrice} onChange={e => setMinPrice(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold transition-all" />
                  <input type="number" placeholder={t.areaMax} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1 leading-tight">{t.transactionType}</label>
                <select value={transactionType} onChange={e => setTransactionType(e.target.value as any)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none appearance-none border border-transparent focus:border-prylom-gold transition-all">
                  <option value="all">{t.transactionAll}</option>
                  <option value="venda">{t.transactionSale}</option>
                  <option value="arrendamento">{t.transactionLease}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1 leading-tight">{t.statusLabel}</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none appearance-none border border-transparent focus:border-prylom-gold transition-all">
                  <option value="all">{t.statusAll}</option>
                  <option value="ativo">{t.statusAvailable}</option>
                  <option value="negociacao">{t.statusNegotiating}</option>
                  <option value="verified">{t.verifiedLabel}</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: FILTROS TÉCNICOS POR CATEGORIA */}
          {activeCategory === 'fazendas' && (
            <div className="space-y-6 animate-fadeIn">
              <h4 className="text-[11px] font-black text-[#000080] uppercase tracking-[0.3em] flex items-center gap-4">
                🌱 {t.techFiltersFarm}
                <div className="h-px flex-1 bg-gray-100"></div>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.soilAptitude}</label>
                  <input placeholder={t.soilType} value={soilType} onChange={e => setSoilType(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.clayContent}</label>
                  <select value={clayContent} onChange={e => setClayContent(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold">
                    <option value="">{t.catAll}</option>
                    <option value="15-25">15% - 25%</option>
                    <option value="25-35">25% - 35%</option>
                    <option value="35+">35% + (Alta Argila)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{t.topographyLabel}</label>
                  <select value={topography} onChange={e => setTopography(e.target.value)} className="w-full py-4 px-5 bg-gray-50 rounded-2xl text-[11px] font-bold text-prylom-dark outline-none border border-transparent focus:border-prylom-gold">
                    <option value="">{t.topographyAll}</option>
                    <option value="plana">{t.topographyFlat}</option>
                    <option value="ondulada">{t.topographyWavy}</option>
                  </select>
                </div>
                <div className="flex items-end">
                   <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-prylom-gold transition-all w-full">
                      <input type="checkbox" checked={docOnlyOk} onChange={e => setDocOnlyOk(e.target.checked)} className="w-4 h-4 accent-prylom-gold" />
                      <span className="text-[10px] font-black text-prylom-dark uppercase tracking-widest">{t.docOk}</span>
                   </label>
                </div>
              </div>
            </div>
          )}

          {activeCategory === 'maquinas' && (
            <div className="space-y-6 animate-fadeIn">
              <h4 className="text-[11px] font-black text-[#000080] uppercase tracking-[0.3em] flex items-center gap-4">
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
              <h4 className="text-[11px] font-black text-[#000080] uppercase tracking-[0.3em] flex items-center gap-4">
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
              <h4 className="text-[11px] font-black text-[#000080] uppercase tracking-[0.3em] flex items-center gap-4">
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
                // Reset de todos os filtros
                setFilterState(''); setFilterCity(''); setMinPrice(''); setMaxPrice(''); setFilterStatus('all');
                setMinAreaTotal(''); setMaxAreaTotal(''); setMinAreaLavoura(''); setSoilType(''); setClayContent(''); setTopography(''); setDocOnlyOk(false);
                setBrandFilter(''); setMachineModelFilter(''); setMinYear(''); setMaxYear(''); setMaxHours(''); setConservationState(''); setPrecisionAgFilter(''); setMinPower(''); setFuelType('');
                setPlaneTypeFilter(''); setManufacturerFilter(''); setMinYearPlane(''); setMaxHoursPlane(''); setAnacHomologFilter('');
                setGrainCulture(''); setGrainHarvest(''); setGrainQuality(''); setMinVolume('');
                setArrModalidade(''); setArrAptidao(''); setMinArrArea(''); setMaxArrArea(''); setArrCulturaBase(''); setArrQtdSafras(''); setArrMesInicioColheita('');
             }} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-red-500 transition-colors">Limpar Todos os Filtros</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center"><div className="w-12 h-12 border-4 border-prylom-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">{t.marketSync}</p></div>
      ) : (
        <>
          {filteredProducts.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm">
              <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">{t.marketEmpty}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map(p => {
                const price = formatPriceParts(p.valor);
                return (
                  <div key={p.id} onClick={() => onSelectProduct(p.id)} className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col group">
                    <div className="h-64 relative overflow-hidden bg-gray-50">
                      <img src={p.main_image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                      <div className="absolute top-6 left-6 flex gap-2">
                        <span className="bg-prylom-dark/80 backdrop-blur-md text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                          {p.tipo_transacao === 'venda' ? t.transactionSale : t.transactionLease}
                        </span>
                        {p.certificacao && <span className="bg-prylom-gold text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">{t.verifiedLabel}</span>}
                      </div>
                    </div>
                    <div className="p-8 flex flex-col flex-1">
                      <h3 className="text-2xl font-black text-prylom-dark mb-1 tracking-tight line-clamp-1 group-hover:text-prylom-gold uppercase">{p.titulo}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-6">{p.cidade} - {p.estado}</p>
                      <div className="mt-auto p-6 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-[9px] font-black text-prylom-gold uppercase tracking-widest mb-1">{p.tipo_transacao === 'arrendamento' ? t.transactionLease : t.transactionSale}</p>
                        <div className="flex items-baseline justify-between">
                          <p className="text-3xl font-black text-prylom-dark">{price.symbol} {price.value}</p>
                          {p.area_total_ha && (
                            <p className="text-[9px] font-black text-gray-400 uppercase">
                              {getSymbol()} {formatPriceParts(p.valor! / p.area_total_ha).value} <span className="opacity-60">{t.priceHectare}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
};

export default ShoppingCenter;