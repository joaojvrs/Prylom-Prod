import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { AppCurrency } from '../types';
import { useNavigate } from 'react-router-dom';

interface Props {
  onSelectProduct?: (id: string) => void;
  onBack: () => void;
  t: any;
  currency: AppCurrency;
}

const getStatusLabel = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'vendido': return 'Indisponível';
    case 'ativo': return 'Disponível';
    default: return 'Em Negociação';
  }
};

const getStatusTextColor = (status: string) => {
  switch (status) {
    case 'ativo': return 'text-green-600';
    case 'vendido': return 'text-red-600';
    case 'reservado': return 'text-yellow-600';
    default: return 'text-gray-400';
  }
};

const Favorites: React.FC<Props> = ({ onBack, t, currency }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const rates = useMemo(() => ({
    [AppCurrency.BRL]: 1,
    [AppCurrency.USD]: 0.19,
    [AppCurrency.CNY]: 1.42,
    [AppCurrency.RUB]: 18.5,
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
    return { symbol: getSymbol(), value: formattedNum };
  };

  const fetchFavorites = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          asset_id,
          produtos:produtos (
            *,
            fazendas (*),
            maquinas (*),
            avioes (*),
            graos (*),
            arrendamentos (*),
            produtos_imagens (image_url, ordem)
          )
        `)
        .eq('user_id', user.id);

      if (error) console.error('Erro ao buscar favoritos:', error);

      if (data) {
        const favList = data.map(item => {
          const p: any = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;
          if (!p) return null;

          const arr = Array.isArray(p.arrendamentos) ? p.arrendamentos[0] : p.arrendamentos;
          const faz = Array.isArray(p.fazendas) ? p.fazendas[0] : p.fazendas;
          const maq = Array.isArray(p.maquinas) ? p.maquinas[0] : p.maquinas;
          const avi = Array.isArray(p.avioes) ? p.avioes[0] : p.avioes;
          const gra = Array.isArray(p.graos) ? p.graos[0] : p.graos;
          const mainImg = Array.isArray(p.produtos_imagens)
            ? (p.produtos_imagens.find((img: any) => img.ordem === 1)?.image_url || p.produtos_imagens[0]?.image_url)
            : null;

          return {
            ...p,
            fazenda_data: faz,
            maquina_data: maq,
            aviao_data: avi,
            grao_data: gra,
            area_total_ha: faz?.area_total_ha || null,
            tem_arrendamento_ativo: !!arr && arr.ativo,
            arrendamento_info: arr,
            main_image: mainImg,
          };
        }).filter(Boolean);

        setProducts(favList);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const removeFavorite = async (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('asset_id', assetId);

    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== assetId));
    }
  };

  const openProduct = (id: string) => {
    navigate(`/product/${id}`, { state: { fromFavorites: true } });
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 md:py-16 animate-fadeIn pb-40 flex flex-col gap-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">Sua Seleção</span>
          <h1 className="text-4xl font-black text-prylom-dark tracking-tighter uppercase">Meus Favoritos</h1>
        </div>
        <button
          onClick={onBack}
          className="bg-white text-prylom-dark border-2 border-prylom-gold px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-prylom-gold hover:text-white transition-all"
        >
          ← Voltar ao Shopping
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse font-black text-gray-300 uppercase text-[10px] tracking-widest">
          Sincronizando Favoritos...
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm">
          <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
            Você ainda não favoritou nenhum ativo.<br />Explore o Shopping e clique no coração.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map(p => {
            const price = formatPriceParts(p.valor);
            return (
              <div
                key={p.id}
                onClick={() => openProduct(p.id)}
                className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer flex flex-col group"
              >
                <div className="h-64 relative overflow-hidden bg-gray-50">
                  <img
                    src={p.main_image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800'}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <button
                    onClick={(e) => removeFavorite(e, p.id)}
                    className="absolute top-5 right-5 z-10 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transform transition-all active:scale-90 hover:scale-110"
                    title="Remover dos favoritos"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="#2c5363"
                      stroke="#2c5363"
                      strokeWidth={0}
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

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-400 font-bold uppercase mb-6 mt-3">
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
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-prylom-dark tabular-nums">{p.valor}</span>
                            <span className="text-sm font-black text-prylom-dark uppercase tracking-tighter">
                              sc {p.arrendamento_info?.cultura_base || 'Soja'} / ha
                            </span>
                          </div>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">Pagamento Anual em Sacas</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-prylom-dark">{price.symbol}</span>
                            <span className="text-2xl font-black text-prylom-dark tabular-nums">{price.value}</span>
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
        </div>
      )}
    </div>
  );
};

export default Favorites;
