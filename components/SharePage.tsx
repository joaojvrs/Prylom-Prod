import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AppLanguage, AppCurrency } from '../types';
import { translations } from '../translations';
import ProductDetails from './ProductDetails';

const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [productId, setProductId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');

  const t = translations[AppLanguage.PT];

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    (async () => {
      const { data, error } = await supabase.rpc('validate_share_token', { p_token: token });
      if (error || !data || data.length === 0) {
        setStatus('invalid');
      } else {
        setProductId(data[0].produto_id);
        setStatus('valid');
      }
    })();
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#1a2332] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#bba219]/30 border-t-[#bba219] rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-[#1a2332] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-[#bba219] font-black text-4xl tracking-tighter mb-2">
            Prylom<span className="text-white">.</span>
          </div>
          <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.4em] mb-12">
            Intelligence Platform
          </p>
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
            Link Expirado
          </h1>
          <p className="text-white/40 text-sm font-medium leading-relaxed">
            Este link de acesso não é mais válido. Ele pode ter expirado ou sido revogado pelo responsável.
          </p>
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-8">
            Solicite um novo link ao responsável pelo ativo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <div className="bg-[#1a2332] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#bba219] font-black text-lg tracking-tighter">
            Prylom<span className="text-white">.</span>
          </span>
          <span className="text-white/20 text-[8px] font-black uppercase tracking-[0.3em]">
            Acesso Restrito · Off Market
          </span>
        </div>
        <span className="text-white/20 text-[8px] font-black uppercase tracking-widest">
          Link temporário
        </span>
      </div>

      <ProductDetails
        productId={productId}
        onBack={() => {}}
        onSelectProduct={(id: string) => navigate(`/product/${id}`)}
        t={t}
        lang={AppLanguage.PT}
        currency={AppCurrency.BRL}
      />
    </div>
  );
};

export default SharePage;
