
import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { GoogleGenAI } from "@google/genai";

interface Props {
  onBack: () => void;
  /**
   * Optional callback for when the user confirms the selection.
   * Making this optional allows standalone usage of the component where a result is not needed.
   */
  onConfirm?: (data: any) => void;
  t: any;
  lang: string;
  currency?: any;
}

const SmartMapReport: React.FC<Props> = ({ onBack, onConfirm, t, lang }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const tempPoints = useRef<L.LatLng[]>([]);

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'point' | 'polygon'>('polygon');
  const [analysis, setAnalysis] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [realtimeArea, setRealtimeArea] = useState<number | null>(null);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        center: [-15.7801, -47.9292],
        zoom: 4,
      });
      
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg', {
        maxZoom: 19,
      }).addTo(leafletMap.current);

      leafletMap.current.on('click', (e: L.LeafletMouseEvent) => {
        handleMapInteraction(e.latlng);
      });

      setTimeout(() => leafletMap.current?.invalidateSize(), 400);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.off();
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Cálculo de área esférica (fórmula de Gauss/Green aproximada)
  const calculateArea = (latlngs: L.LatLng[]) => {
    if (latlngs.length < 3) return 0;
    const radius = 6378137;
    const len = latlngs.length;
    let area = 0;
    for (let i = 0; i < len; i++) {
      const p1 = latlngs[i];
      const p2 = latlngs[(i + 1) % len];
      area += ((p2.lng - p1.lng) * Math.PI / 180) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
    }
    area = area * radius * radius / 2;
    return Math.abs(area) / 10000; // ha
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !leafletMap.current) return;

    setSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=br`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newPos = new L.LatLng(parseFloat(lat), parseFloat(lon));
        leafletMap.current.setView(newPos, 14);
      }
    } catch (err) {
      console.error("Erro na busca:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleMapInteraction = (latlng: L.LatLng) => {
    if (!leafletMap.current) return;

    if (mode === 'point') {
      if (markerRef.current) markerRef.current.setLatLng(latlng);
      else {
        markerRef.current = L.marker(latlng, {
          icon: L.divIcon({
            className: 'custom-pin',
            html: `<div class="bg-prylom-gold w-8 h-8 rounded-full border-4 border-white shadow-2xl animate-pulse ring-4 ring-prylom-gold/20"></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(leafletMap.current);
      }
      runGeoAnalysis(latlng, null);
    } else {
      tempPoints.current.push(latlng);
      if (polygonRef.current) {
        polygonRef.current.setLatLngs(tempPoints.current);
      } else {
        polygonRef.current = L.polygon(tempPoints.current, {
          color: '#d4a017',
          fillColor: '#d4a017',
          fillOpacity: 0.35,
          weight: 4,
          dashArray: '5, 10'
        }).addTo(leafletMap.current);
      }

      if (tempPoints.current.length >= 2) {
        setRealtimeArea(calculateArea(tempPoints.current));
      }

      if (tempPoints.current.length >= 3) {
        runGeoAnalysis(latlng, tempPoints.current);
      }
    }
  };

  const clearDrawing = () => {
    tempPoints.current = [];
    if (polygonRef.current) polygonRef.current.remove();
    if (markerRef.current) markerRef.current.remove();
    polygonRef.current = null;
    markerRef.current = null;
    setRealtimeArea(null);
    setAnalysis(null);
  };

  const runGeoAnalysis = async (center: L.LatLng, points: L.LatLng[] | null) => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Analista agroambiental Prylom Senior. Lat: ${center.lat}, Lng: ${center.lng}.
        ${points ? 'O usuário delimitou um perímetro (polígono/circunferência).' : 'O usuário marcou um ponto central.'}
        Retorne um JSON estrito em português com:
        - municipio, estado, regiao_agricola, bioma
        - area_hectares (estimada ou calculada)
        - clima: {aptidao_score(0-10), chuvas_anual_mm, risco_hidrico}
        - logistica: {distancia_rodovia_km, distancia_porto_km, principal_escoamento}
        - mercado: {preco_terra_ha_brl, liquidez_regional}
        - risco_territorial: {classificacao (Baixo/Medio/Alto), detalhes}
        - confidence_score: (0-100)
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');
      setAnalysis(data);
    } catch (e) {
      console.error("Análise falhou", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col md:flex-row h-screen w-screen bg-white">
      {/* MAPA INTERATIVO */}
      <div className="relative w-full h-[45vh] md:h-full md:w-2/3 bg-gray-100">
        <div ref={mapRef} className="absolute inset-0 z-0"></div>
        
        {/* BUSCA E CONTROLES SUPERIORES */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1010] w-[95%] max-w-3xl flex flex-col gap-3">
          <form onSubmit={handleSearch} className="flex bg-prylom-dark/95 backdrop-blur-xl p-2 rounded-[2.5rem] shadow-3xl border border-white/10">
            <input 
              type="text" 
              placeholder="Digite o município, fazenda ou endereço..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm font-medium px-6 outline-none placeholder:text-gray-400"
            />
            <button type="submit" className="bg-prylom-gold text-white px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          <div className="flex gap-2 justify-center">
            <button onClick={() => { setMode('polygon'); clearDrawing(); }} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'polygon' ? 'bg-[#000080] text-white shadow-xl scale-105' : 'bg-white/90 text-gray-500'}`}>Delimitar Perímetro</button>
            <button onClick={() => { setMode('point'); clearDrawing(); }} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'point' ? 'bg-[#000080] text-white' : 'bg-white/90 text-gray-500'}`}>Ponto Central</button>
            <button onClick={clearDrawing} className="px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/90 text-red-500">Limpar Desenho</button>
          </div>
        </div>

        {/* ÁREA EM TEMPO REAL */}
        {realtimeArea !== null && realtimeArea > 0 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1010] bg-prylom-dark text-white px-10 py-5 rounded-[2rem] border-2 border-prylom-gold shadow-3xl animate-fadeIn">
            <p className="text-[10px] font-black text-prylom-gold uppercase tracking-widest mb-1 text-center">Área Delimitada</p>
            <p className="text-3xl font-black">{realtimeArea.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-sm">ha</span></p>
          </div>
        )}

        <button onClick={onBack} className="absolute bottom-8 left-8 z-[1010] bg-white text-prylom-dark p-5 rounded-full shadow-2xl border border-gray-100">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
      </div>

      {/* PAINEL DE ANÁLISE */}
      <div className="w-full h-[55vh] md:h-full md:w-1/3 overflow-y-auto bg-[#FDFCFB] shadow-[-20px_0_80px_rgba(0,0,0,0.15)] z-[1020] flex flex-col p-8 md:p-12 no-scrollbar border-l border-gray-100">
        {!analysis && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10">
            <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-inner border border-gray-100 animate-pulse">🌍</div>
            <div>
              <h3 className="text-3xl font-black text-[#000080] tracking-tighter uppercase mb-4 leading-none">Delimitação de Área</h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">Desenhe o perímetro (circunferência) exato da sua fazenda no mapa para disparar a auditoria técnica Prylom.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
            <div className="w-16 h-16 border-8 border-gray-100 border-t-prylom-gold rounded-full animate-spin"></div>
            <p className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] animate-pulse text-center">Cruzando Dados Orbitais<br/>e Geográficos</p>
          </div>
        )}

        {analysis && !loading && (
          <div className="animate-fadeIn space-y-10">
            <header className="border-b border-gray-100 pb-8">
              <span className="bg-[#000080] text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block shadow-lg">Auditória em Tempo Real</span>
              <h2 className="text-4xl font-black text-[#000080] tracking-tighter leading-[0.9] uppercase mb-4">{analysis.municipio}, {analysis.estado}</h2>
              <div className="flex flex-wrap gap-2">
                 <span className="bg-gray-100 text-prylom-dark text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{analysis.bioma}</span>
                 <span className="bg-gray-100 text-prylom-dark text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{analysis.regiao_agricola}</span>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4">
               <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Área Auditada</p>
                  <p className="text-4xl font-black text-prylom-dark">{analysis.area_hectares} <span className="text-sm">ha</span></p>
               </div>
               <div className="bg-prylom-dark text-white p-8 rounded-[2.5rem] shadow-2xl">
                  <p className="text-prylom-gold text-[10px] font-black uppercase tracking-widest mb-2">Estimativa de Mercado</p>
                  <p className="text-2xl font-black">R$ {Number(analysis.mercado?.preco_terra_ha_brl).toLocaleString()}<span className="text-xs opacity-50"> /ha</span></p>
               </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 flex justify-between items-center">
                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Aptidão Agrícola</span>
                 <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <div key={s} className={`w-3 h-1.5 rounded-full ${s <= (analysis.clima?.aptidao_score / 2) ? 'bg-prylom-gold' : 'bg-gray-200'}`}></div>
                    ))}
                 </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 flex justify-between items-center">
                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Risco Ambiental</span>
                 <span className={`text-[10px] font-black uppercase ${analysis.risco_territorial?.classificacao === 'Baixo' ? 'text-green-600' : 'text-red-500'}`}>{analysis.risco_territorial?.classificacao}</span>
              </div>
            </div>

            {/* Conditionally render confirm button if onConfirm callback is provided */}
            {onConfirm && (
              <button 
                onClick={() => onConfirm({ type: mode, analysis, coords: tempPoints.current })}
                className="w-full bg-[#000080] text-white font-black py-7 rounded-full shadow-3xl hover:bg-prylom-gold transition-all text-xs uppercase tracking-[0.2em] group active:scale-95"
              >
                Confirmar e Prosseguir
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartMapReport;
