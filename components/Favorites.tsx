import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { AppLanguage, AppCurrency } from '../types';

interface Props {
  onSelectProduct: (id: string) => void;
  onBack: () => void;
  t: any;
  currency: AppCurrency;
}

const Favorites: React.FC<Props> = ({ onSelectProduct, onBack, t, currency }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          produtos_imagens (image_url, ordem)
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error("Erro na query:", error);
    }

    if (data) {
      // O Supabase às vezes retorna como objeto único ou array
const favList = data.map(item => {
  // Garante que p seja o objeto do produto, mesmo que venha dentro de um array
  const p: any = Array.isArray(item.produtos) ? item.produtos[0] : item.produtos;
  
  if (!p) return null;

  // Acessamos as imagens. Se produtos_imagens também for array (e deve ser), pegamos a ordem 1
  const imagens = p.produtos_imagens;
  const mainImg = Array.isArray(imagens) 
    ? (imagens.find((img: any) => img.ordem === 1)?.image_url || imagens[0]?.image_url)
    : null;

  return { ...p, main_image: mainImg };
}).filter(p => p !== null);

      setProducts(favList);
    }
  }
  setLoading(false);
};
    fetchFavorites();
  }, []);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-16 animate-fadeIn min-h-screen">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">Sua Seleção</span>
          <h1 className="text-4xl font-black text-prylom-dark tracking-tighter uppercase">Meus Favoritos</h1>
        </div>
        <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-prylom-dark transition-colors">
          Voltar ao Shopping
        </button>
      </header>

      {loading ? (
        <div className="py-20 text-center animate-pulse font-black text-gray-300 uppercase text-[10px] tracking-widest">Sincronizando Favoritos...</div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm">
          <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest text-center px-10 leading-relaxed">
            Você ainda não favoritou nenhum ativo.<br/>Explore o Shopping e clique no coração.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map(p => (
            <div 
              key={p.id} 
              onClick={() => onSelectProduct(p.id)}
              className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col group"
            >
              {/* Reaproveite aqui o estilo do card do ShoppingCenter */}
              <div className="h-48 overflow-hidden bg-gray-50">
                <img src={p.main_image || 'https://via.placeholder.com/400x300'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <div className="p-6">
                <h3 className="font-black text-prylom-dark uppercase text-sm mb-2 truncate">{p.titulo}</h3>
                <p className="text-prylom-gold font-black text-xs uppercase tracking-widest">Ver Detalhes →</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;