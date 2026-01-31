import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppLanguage, AppCurrency } from '../types';
import { supabase } from '../supabaseClient';

interface Product {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  subcategoria: string;
  valor: number | null;
  unidade: string;
  quantidade: number;
  estado: string;
  cidade: string;
  status: string;
  destaque: boolean;
  certificacao: boolean;
  created_at: string;
  main_image?: string;
  tipo_transacao: 'venda' | 'arrendamento';
  arrendamentos?: any[];
}

interface ProductImage {
  file?: File;
  url: string;
  isExisting?: boolean;
}

interface Props {
  onLogout: () => void;
  t: any;
  lang: AppLanguage;
  currency: AppCurrency;
}

const AdminDashboard: React.FC<Props> = ({ onLogout, t, lang, currency }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Product[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Campos técnicos essenciais para preencher as sub-tabelas do banco
  const camposPorCategoria: Record<string, { key: string; label: string; type: string; required?: boolean }[]> = useMemo(() => ({
    fazendas: [
      { key: 'area_total_ha', label: 'Área Total (ha)', type: 'number', required: true },
      { key: 'area_lavoura_ha', label: 'Área de Lavoura (ha)', type: 'number' },
      { key: 'valor_por_ha', label: 'Valor por Hectare (BRL)', type: 'number' },
      { key: 'aptidao', label: 'Aptidão (Solo/Clima)', type: 'text' },
      { key: 'tipo_solo', label: 'Tipo de Solo', type: 'text' },
      { key: 'teor_argila', label: 'Teor de Argila %', type: 'text' },
      { key: 'topografia', label: 'Topografia (Plana/Ondulada)', type: 'text' },
      { key: 'altitude_m', label: 'Altitude (m)', type: 'number' },
      { key: 'vocacao', label: 'Vocação Principal', type: 'text' },
      { key: 'documentacao_ok', label: 'Documentação OK (Sim/Não)', type: 'text' },
      { key: 'precipitacao_mm', label: 'Precipitação Anual (mm)', type: 'number' },
      { key: 'regiao_produtiva', label: 'Microrregião / Polo', type: 'text' },
      { key: 'condicoes_negocio', label: 'Condições de Pagto/Arrend.', type: 'text' },
    ],
    maquinas: [
      { key: 'marca', label: 'Marca', type: 'text', required: true },
      { key: 'modelo', label: 'Modelo', type: 'text', required: true },
      { key: 'ano', label: 'Ano', type: 'number', required: true },
      { key: 'horas_trabalhadas', label: 'Horas Trabalhadas', type: 'number', required: true },
      { key: 'potencia', label: 'Potência (cv)', type: 'text' },
      { key: 'estado_conservacao', label: 'Estado de Conservação', type: 'text' },
      { key: 'agricultura_precisao', label: 'Agr. Precisão (Sim/Não)', type: 'text' },
      { key: 'combustivel', label: 'Combustível', type: 'text' },
    ],
    avioes: [
      { key: 'fabricante', label: 'Fabricante', type: 'text', required: true },
      { key: 'modelo', label: 'Modelo', type: 'text', required: true },
      { key: 'ano', label: 'Ano de Fabricação', type: 'number', required: true },
      { key: 'horas_voo', label: 'Total de Horas (TTAF)', type: 'number', required: true },
      { key: 'tipo_operacao', label: 'Operação (agricola/executivo)', type: 'text', required: true },
      { key: 'homologado_anac', label: 'Homologação ANAC (Sim/Não)', type: 'text' },
    ],
    graos: [
      { key: 'cultura', label: 'Cultura', type: 'text', required: true },
      { key: 'safra', label: 'Safra (Ex: 24/25)', type: 'text', required: true },
      { key: 'qualidade', label: 'Qualidade/Padrão', type: 'text', required: true },
      { key: 'estoque_toneladas', label: 'Volume Disponível (t)', type: 'number', required: true },
    ]
  }), []);

  const initialAssetState = {
    codigo: '', titulo: '', descricao: '', categoria: 'fazendas', subcategoria: '',
    tipo_transacao: 'venda' as 'venda' | 'arrendamento', valor: '', unidade: 'unidade', quantidade: 1,
    estado: '', cidade: '', certificacao: false, destaque: false, status: 'ativo'
  };

  const [newAsset, setNewAsset] = useState(initialAssetState);
  const [dadosEspecificos, setDadosEspecificos] = useState<any>({});
  const [selectedImages, setSelectedImages] = useState<ProductImage[]>([]);

  const rates = useMemo(() => ({
    [AppCurrency.BRL]: 1, [AppCurrency.USD]: 0.19, [AppCurrency.CNY]: 1.42, [AppCurrency.RUB]: 18.5
  }), []);

    const stats = useMemo(() => {
    const count = assets.length;
    const totalMoney = assets.reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
    return { count, totalMoney };
  }, [assets]);
  
  const getSymbol = () => {
    switch (currency) {
      case AppCurrency.BRL: return 'R$';
      case AppCurrency.USD: return '$';
      case AppCurrency.CNY: return '¥';
      case AppCurrency.RUB: return '₽';
      default: return 'R$';
    }
  };

  const formatPrice = (valInBrl: number | null) => {
    if (valInBrl === null) return '---';
    const converted = valInBrl * rates[currency];
    return `${getSymbol()} ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select(`*, arrendamentos (*), produtos_imagens (image_url, ordem)`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        setAssets(data.map((item: any) => ({
          ...item,
          main_image: item.produtos_imagens?.find((img: any) => img.ordem === 1)?.image_url || item.produtos_imagens?.[0]?.image_url
        })));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleEdit = async (asset: Product) => {
    setLoading(true);
    setIsEditing(true);
    setCurrentId(asset.id);
    setNewAsset({
      codigo: asset.codigo || '',
      titulo: asset.titulo,
      descricao: asset.descricao || '',
      categoria: asset.categoria,
      subcategoria: asset.subcategoria || '',
      tipo_transacao: asset.tipo_transacao,
      valor: asset.valor?.toString() || '',
      unidade: asset.unidade || 'unidade',
      quantidade: asset.quantidade || 1,
      estado: asset.estado || '',
      cidade: asset.cidade || '',
      certificacao: asset.certificacao,
      destaque: asset.destaque,
      status: asset.status
    });

    try {
      // Dados técnicos
      const { data: specData } = await supabase.from(asset.categoria).select('*').eq('produto_id', asset.id).maybeSingle();
      if (specData) {
        const { produto_id, id, ...onlyFields } = specData;
        setDadosEspecificos(onlyFields);
      } else {
        setDadosEspecificos({});
      }

      // Imagens
      const { data: imgData } = await supabase.from('produtos_imagens').select('image_url').eq('produto_id', asset.id).order('ordem', { ascending: true });
      if (imgData && imgData.length > 0) {
        setSelectedImages(imgData.map(img => ({ url: img.image_url, isExisting: true })));
      } else {
        setSelectedImages([]);
      }
    } catch (e) { 
      console.error(e); 
      setDadosEspecificos({});
      setSelectedImages([]);
    } finally { 
      setLoading(false); 
      setShowModal(true); 
    }
  };

  const handleDeleteConfirmed = async (asset: Product) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('delete_produto_completo', { p_id: asset.id });
      if (error) throw error;
      await fetchAssets();
    } catch (err: any) {
      alert("Erro ao excluir produto: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const produtoPayload = {
        codigo: newAsset.codigo,
        titulo: newAsset.titulo,
        descricao: newAsset.descricao,
        categoria: newAsset.categoria,
        subcategoria: newAsset.subcategoria,
        tipo_transacao: newAsset.tipo_transacao,
        valor: newAsset.valor ? Number(newAsset.valor) : null,
        unidade: newAsset.unidade,
        quantidade: newAsset.quantidade,
        estado: newAsset.estado,
        cidade: newAsset.cidade,
        status: newAsset.status,
        destaque: newAsset.destaque,
        certificacao: newAsset.certificacao
      };

      let produtoId = currentId;
      
      if (isEditing && currentId) {
        await supabase.from('produtos').update(produtoPayload).eq('id', currentId);
      } else {
        const { data: produto, error: prodErr } = await supabase.from('produtos').insert(produtoPayload).select('id').single();
        if (prodErr) throw prodErr;
        if (produto) produtoId = produto.id;
      }

      if (produtoId) {
        // 1. Salvar dados específicos da categoria nas sub-tabelas técnicas
        const { data: existingSpec } = await supabase.from(newAsset.categoria).select('id').eq('produto_id', produtoId).maybeSingle();
        
        if (existingSpec) {
          await supabase.from(newAsset.categoria).update({ ...dadosEspecificos }).eq('produto_id', produtoId);
        } else {
          await supabase.from(newAsset.categoria).insert({ ...dadosEspecificos, produto_id: produtoId });
        }

        // 2. Upload de NOVAS Imagens e Atualização da Galeria
        const imageUrlsToSave: string[] = [];

        for (const img of selectedImages) {
          if (img.isExisting) {
            imageUrlsToSave.push(img.url);
          } else if (img.file) {
            const fileName = `${Date.now()}-${img.file.name}`;
            const filePath = `assets/${produtoId}/${fileName}`;
            const { error: uploadError } = await supabase.storage
              .from('produtos')
              .upload(filePath, img.file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('produtos').getPublicUrl(filePath);
            imageUrlsToSave.push(publicUrl);
          }
        }

        // Deletar registros antigos e inserir a nova ordem
        await supabase.from('produtos_imagens').delete().eq('produto_id', produtoId);
        if (imageUrlsToSave.length > 0) {
          const validImages = imageUrlsToSave.map((url, idx) => ({
            produto_id: produtoId,
            image_url: url,
            ordem: idx + 1
          }));
          await supabase.from('produtos_imagens').insert(validImages);
        }
      }

      alert(t.adminSuccess);
      fetchAssets();
      setShowModal(false);
      setNewAsset(initialAssetState);
      setDadosEspecificos({});
      setSelectedImages([]);
    } catch (err: any) { 
      alert("Erro ao salvar anúncio: " + err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Fix: Explicitly cast Array.from result to File[] to resolve 'unknown' type issues in certain TS environments
      const filesArray = Array.from(e.target.files) as File[];
      const newImages: ProductImage[] = filesArray.map(file => ({
        file,
        url: URL.createObjectURL(file),
        isExisting: false
      }));
      setSelectedImages(prev => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    const imgToRemove = selectedImages[index];
    if (!imgToRemove.isExisting && imgToRemove.url) {
        URL.revokeObjectURL(imgToRemove.url);
    }
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen bg-[#FDFCFB]">
      <aside className="w-full md:w-80 bg-prylom-dark p-10 flex flex-col text-white shadow-2xl z-50">
        <div className="mb-16">
          <div className="text-prylom-gold font-black text-3xl mb-2 tracking-tighter">Prylom<span className="text-white">.</span></div>
          <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.4em]">Intelligence View</p>
        </div>
        <nav className="flex flex-col gap-3">
          <button className="flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest bg-prylom-gold text-white shadow-2xl">
            Painel Geral
          </button>
          <button onClick={onLogout} className="flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-400/10 transition-all">
            {t.btnBack}
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8 md:p-14 overflow-y-auto no-scrollbar">
         <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
            <div>
               <h2 className="text-5xl font-black text-[#000080] tracking-tighter uppercase mb-2">Administração de Ativos</h2>
               <p className="text-gray-400 text-sm font-medium tracking-wide">Controle de inventário e auditoria de anúncios</p>
            </div>
            <button onClick={() => { setIsEditing(false); setNewAsset(initialAssetState); setDadosEspecificos({}); setSelectedImages([]); setShowModal(true); }} className="bg-[#000080] text-white px-10 py-6 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-3xl hover:bg-prylom-gold transition-all">
               Anunciar Novo Ativo
            </button>
         </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex items-center gap-8 group hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-[#000080]/5 text-[#000080] rounded-[1.5rem] flex items-center justify-center text-3xl group-hover:bg-[#000080] group-hover:text-white transition-all">📋</div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Portfólio no Banco</p>
                    <p className="text-4xl font-black text-[#000080]">{stats.count} <span className="text-sm opacity-40 uppercase">Ativos</span></p>
                </div>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex items-center gap-8 group hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-prylom-gold/5 text-prylom-gold rounded-[1.5rem] flex items-center justify-center text-3xl group-hover:bg-prylom-gold group-hover:text-white transition-all">💰</div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Capital Gerido (AUM)</p>
                    <p className="text-4xl font-black text-[#000080]">{formatPrice(stats.totalMoney)}</p>
                </div>
            </div>
         </div>

         <div className="bg-white rounded-[4rem] p-10 shadow-2xl border border-gray-50">
            <div className="overflow-x-auto no-scrollbar">
               <table className="w-full text-left">
                  <thead><tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]"><th className="pb-6">Ativo / Código</th><th className="pb-6">Categoria</th><th className="pb-6">Localização</th><th className="pb-6">Preço Base</th><th className="pb-6 text-right">Ações</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                     {assets.map(asset => (
                        <tr key={asset.id} className="group hover:bg-[#FDFCFB] transition-colors">
                           <td className="py-8">
                             <div className="flex items-center gap-6">
                               <div className="w-16 h-16 rounded-[1.2rem] overflow-hidden shadow-md bg-gray-100">
                                 <img src={asset.main_image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=150'} alt="" className="w-full h-full object-cover" />
                               </div>
                               <div>
                                 <p className="font-black text-lg text-[#000080] leading-none mb-1 uppercase">{asset.titulo}</p>
                                 <p className="text-[9px] font-bold text-prylom-gold tracking-widest uppercase">ID: {asset.codigo || 'S/C'}</p>
                               </div>
                             </div>
                           </td>
                           <td className="py-8"><span className="text-[10px] font-black text-gray-500 uppercase px-4 py-1.5 rounded-full bg-gray-100">{asset.categoria}</span></td>
                           <td className="py-8 text-[11px] font-bold text-gray-600 uppercase">{asset.cidade}, {asset.estado}</td>
                           <td className="py-8 font-black text-[#000080]">{formatPrice(asset.valor)}</td>
                           <td className="py-8 text-right">
                             <div className="flex justify-end gap-2">
                               <button onClick={() => handleEdit(asset)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 text-[#000080] hover:bg-[#000080] hover:text-white transition-all shadow-sm">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                               </button>
                               <button onClick={() => handleDeleteConfirmed(asset)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                               </button>
                             </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 backdrop-blur-xl bg-prylom-dark/50">
          <div className="bg-white w-full max-w-6xl rounded-[4rem] p-10 md:p-14 shadow-3xl relative overflow-y-auto max-h-[95vh] no-scrollbar">
            <header className="flex justify-between items-center mb-10 border-b border-gray-100 pb-6">
               <div>
                  <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">{isEditing ? 'Edição de Ativo' : 'Novo Anúncio'}</span>
                  <h3 className="text-3xl font-black text-[#000080] tracking-tighter uppercase leading-none">Dossiê do Ativo</h3>
               </div>
               <button onClick={() => setShowModal(false)} className="text-gray-300 hover:text-prylom-dark p-2 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </header>

            <form onSubmit={handlePublish} className="space-y-10">
              {/* SEÇÃO 1: IDENTIFICAÇÃO E CÓDIGO (ESSENCIAL) */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h4 className="text-[11px] font-black text-prylom-dark uppercase tracking-widest whitespace-nowrap">📌 Identificação Obrigatória</h4>
                  <div className="h-px flex-1 bg-gray-100"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-3 space-y-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Código do Ativo *</label>
                    <input required value={newAsset.codigo} onChange={e => setNewAsset({...newAsset, codigo: e.target.value.toUpperCase()})} className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none font-black text-prylom-dark border-2 border-transparent focus:border-prylom-gold transition-all" placeholder="EX: PRY-882" />
                  </div>
                  <div className="md:col-span-9 space-y-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Título Público do Ativo *</label>
                    <input required value={newAsset.titulo} onChange={e => setNewAsset({...newAsset, titulo: e.target.value})} className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold transition-all" placeholder="Ex: Fazenda Prime - 2.500ha - Grãos" />
                  </div>
                  <div className="md:col-span-12 space-y-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Descrição Comercial Detalhada</label>
                    <textarea value={newAsset.descricao} onChange={e => setNewAsset({...newAsset, descricao: e.target.value})} rows={3} className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none font-medium text-gray-600 border-2 border-transparent focus:border-prylom-gold transition-all no-scrollbar" placeholder="Destaque logistica, solo, histórico e benfeitorias..." />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: CATEGORIA, FINANCEIRO E LOCALIZAÇÃO */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h4 className="text-[11px] font-black text-prylom-dark uppercase tracking-widest whitespace-nowrap">💰 Classificação, Preço e Localização</h4>
                  <div className="h-px flex-1 bg-gray-100"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Categoria Principal</label>
                    <select value={newAsset.categoria} onChange={e => { setNewAsset({...newAsset, categoria: e.target.value}); setDadosEspecificos({}); }} className="w-full py-4 px-6 bg-gray-50 rounded-2xl font-bold text-prylom-dark outline-none border-2 border-transparent focus:border-prylom-gold">
                      <option value="fazendas">Fazendas</option>
                      <option value="maquinas">Máquinas</option>
                      <option value="avioes">Aviões</option>
                      <option value="graos">Grãos</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Modalidade Transação</label>
                    <select value={newAsset.tipo_transacao} onChange={e => setNewAsset({...newAsset, tipo_transacao: e.target.value as any})} className="w-full py-4 px-6 bg-gray-50 rounded-2xl font-bold text-prylom-dark outline-none border-2 border-transparent focus:border-prylom-gold">
                      <option value="venda">Venda Direta</option>
                      <option value="arrendamento">Arrendamento</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Valor do Ativo (BRL) *</label>
                    <input required type="number" value={newAsset.valor} onChange={e => setNewAsset({...newAsset, valor: e.target.value})} className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none font-black text-prylom-dark border-2 border-transparent focus:border-prylom-gold transition-all" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Localização (UF / Cidade) *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input required placeholder="UF" value={newAsset.estado} onChange={e => setNewAsset({...newAsset, estado: e.target.value.toUpperCase()})} className="w-full py-4 px-4 bg-gray-50 rounded-xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold" maxLength={2} />
                      <input required placeholder="Município" value={newAsset.cidade} onChange={e => setNewAsset({...newAsset, cidade: e.target.value})} className="w-full py-4 px-4 bg-gray-50 rounded-xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: DADOS TÉCNICOS (PREENCHE SUB-TABELAS) */}
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-center gap-4">
                  <h4 className="text-[11px] font-black text-[#000080] uppercase tracking-widest whitespace-nowrap">📋 Dossiê Técnico: {newAsset.categoria.toUpperCase()}</h4>
                  <div className="h-px flex-1 bg-gray-100"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {camposPorCategoria[newAsset.categoria].map(campo => (
                    <div key={campo.key} className="space-y-2">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">{campo.label} {campo.required ? '*' : ''}</label>
                      <input 
                        type={campo.type} 
                        required={campo.required}
                        value={dadosEspecificos[campo.key] || ''}
                        onChange={e => setDadosEspecificos({...dadosEspecificos, [campo.key]: e.target.value})}
                        className="w-full py-4 px-6 bg-gray-100/50 rounded-2xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold transition-all" 
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* SEÇÃO 4: GALERIA DE IMAGENS (UPLOAD DE ARQUIVOS) */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h4 className="text-[11px] font-black text-prylom-dark uppercase tracking-widest whitespace-nowrap">🖼️ Galeria de Imagens</h4>
                  <div className="h-px flex-1 bg-gray-100"></div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {selectedImages.map((img, index) => (
                    <div key={index} className="relative aspect-square bg-gray-50 rounded-3xl overflow-hidden group border border-gray-100 shadow-sm animate-fadeIn">
                      <img src={img.url} className="w-full h-full object-cover" alt={`Preview ${index}`} />
                      <button 
                        type="button" 
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm p-2">
                        <p className="text-[8px] font-black text-white uppercase text-center truncate">
                          {img.isExisting ? 'Salva no Storage' : 'Novo Arquivo'}
                        </p>
                      </div>
                    </div>
                  ))}

                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-prylom-gold hover:text-prylom-gold transition-all group bg-gray-50/30"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">Anexar Fotos do Ativo</span>
                  </button>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  multiple 
                  onChange={handleFileSelect} 
                />
                
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center">Formato sugerido: JPEG/PNG. Mínimo 1200px largura.</p>
              </div>

              {/* SEÇÃO 5: CONFIGURAÇÕES DE VISIBILIDADE E AUDITORIA */}
              <div className="pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                 <label className="flex items-center gap-4 cursor-pointer p-6 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-all border-2 border-transparent hover:border-prylom-dark/10">
                    <input type="checkbox" checked={newAsset.certificacao} onChange={e => setNewAsset({...newAsset, certificacao: e.target.checked})} className="w-6 h-6 accent-[#000080]" />
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-[#000080] uppercase tracking-widest leading-none mb-1">Prylom Verified</span>
                       <span className="text-[8px] font-bold text-gray-400 uppercase">Selo de Auditoria Técnica</span>
                    </div>
                 </label>
                 <label className="flex items-center gap-4 cursor-pointer p-6 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-all border-2 border-transparent hover:border-prylom-gold/20">
                    <input type="checkbox" checked={newAsset.destaque} onChange={e => setNewAsset({...newAsset, destaque: e.target.checked})} className="w-6 h-6 accent-prylom-gold" />
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-prylom-gold uppercase tracking-widest leading-none mb-1">Destaque Prime</span>
                       <span className="text-[8px] font-bold text-gray-400 uppercase">Exibir no Topo do Hub</span>
                    </div>
                 </label>
                 <div className="flex gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-6 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-prylom-dark transition-all">Cancelar</button>
                    <button type="submit" disabled={loading} className="flex-[2] bg-prylom-dark text-white font-black py-6 rounded-full text-[10px] uppercase tracking-widest hover:bg-prylom-gold shadow-3xl active:scale-95 transition-all">
                       {loading ? 'Salvando...' : (isEditing ? 'Atualizar Ativo' : 'Publicar no Hub')}
                    </button>
                 </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;