
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppLanguage, AppCurrency } from '../types';
import { supabase } from '../supabaseClient';
import AssetCRM from './AssetCRM';

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
interface FarmDocument {
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
  const [activeTab, setActiveTab] = useState<'listings' | 'crm'>('crm');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Product[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState('');
  const [minValor, setMinValor] = useState<string>('');
  const [maxValor, setMaxValor] = useState<string>('');
  const [minHa, setMinHa] = useState<string>('');
  const [maxHa, setMaxHa] = useState<string>('');

  // Campos técnicos essenciais para preencher as sub-tabelas do banco
  const camposPorCategoria: Record<string, { key: string; label: string; type: string; required?: boolean }[]> = useMemo(() => ({
fazendas: [
  // Campos existentes
  { key: 'area_total_ha', label: 'Área Total (ha)', type: 'number', required: true },
  { key: 'area_lavoura_ha', label: 'Área de Lavoura (ha)', type: 'text' },
  { key: 'valor_ha', label: 'Valor por Hectare (BRL)', type: 'number' },
  { key: 'aptidao', label: 'Aptidão', type: 'select' },
  { key: 'teor_argila', label: 'Teor de Argila %', type: 'text' },
  { key: 'topografia', label: 'Topografia', type: 'select' },
  { key: 'precipitacao_mm', label: 'Precipitação Anual (mm)', type: 'number' },
  { key: 'altitude_m', label: 'Altitude (m)', type: 'number' },
  { key: 'km_asfalto', label: 'KM do Asfalto', type: 'text' },
  { key: 'reserva_legal', label: 'Reserva Legal (%)', type: 'select' },
  { key: 'permuta', label: 'Aceita Permuta?', type: 'select' },
  { key: 'comissao', label: 'Comissão', type: 'select' },
{ key: 'sit_doc', label: 'Situação Documentação', type: 'select' },

  { key: 'proprietario', label: 'Proprietário', type: 'text' },
  { key: 'telefone_proprietario', label: 'Telefone Proprietário', type: 'text' },
  { key: 'email_proprietario', label: 'Email Proprietário', type: 'email' },
  { key: 'nome_fazenda', label: 'Nome da Fazenda', type: 'text' },
  { key: 'corretor', label: 'Corretor Responsável', type: 'text' },
  { key: 'telefone_corretor', label: 'Telefone Corretor', type: 'text' },
  { key: 'email_corretor', label: 'Email Corretor', type: 'email' },
  { key: 'estado_corretor', label: 'Estado Corretor', type: 'text' },
{ key: 'tipo_anuncio', label: 'Tipo de Anúncio', type: 'select' },
{ key: 'relevancia_anuncio', label: 'Relevância do Anúncio', type: 'select' },
{ key: 'portal_parceiro', label: 'Portais Parceiros', type: 'select' },


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
  
const [filters, setFilters] = useState({
  tipoTransacao: '',        // venda | arrendamento
  estado: '',
  cidade: '',
  aptidao: '',
  teorArgilaMin: '',
  teorArgilaMax: '',
  palavraLivre: '',
  status: [] as string[],
  situacao: [] as string[],    // checkboxes
  marketing: {
    open: false,
    off: false,
    prylom: false,
  }
});

const toggleSituacao = (value: string) => {
  setFilters(prev => ({
    ...prev,
    situacao: prev.situacao.includes(value)
      ? prev.situacao.filter(v => v !== value)
      : [...prev.situacao, value],
  }));
};

const toggleStatus = (value: string) => {
  setFilters(f => ({
    ...f,
    status: f.status.includes(value)
      ? f.status.filter(s => s !== value)
      : [...f.status, value]
  }));
};


const filteredAssets = useMemo(() => {
  return assets.filter((asset: any) => {

    // 🔎 Texto livre (titulo + descricao + codigo)
    if (filters.palavraLivre) {
      const text = filters.palavraLivre.toLowerCase();
      const haystack = `
        ${asset.titulo}
        ${asset.descricao}
        ${asset.codigo}
      `.toLowerCase();

      if (!haystack.includes(text)) return false;
    }

    // 🔁 Modalidade
    if (filters.tipoTransacao && asset.tipo_transacao !== filters.tipoTransacao) {
      return false;
    }

    // 📍 Estado / Cidade
    if (filters.estado && asset.estado !== filters.estado) return false;
    if (filters.cidade && !asset.cidade?.toLowerCase().includes(filters.cidade.toLowerCase())) return false;

    // 🌱 Aptidão (fazendas)
    if (filters.aptidao) {
       if (!asset.fazendas || asset.fazendas.aptidao !== filters.aptidao) return false;
    }

    // 🧱 Teor de Argila
const argila = asset.fazendas?.teor_argila ? Number(asset.fazendas.teor_argila) : null;
    if (filters.teorArgilaMin && (argila === null || argila < Number(filters.teorArgilaMin))) return false;

    // 📌 Status (checkbox múltiplo)
    if (filters.status.length && !filters.status.includes(asset.status)) {
      return false;
    }

    // 📢 Marketing
    if (filters.marketing.open && !asset.open_marketing) return false;
    if (filters.marketing.off && asset.open_marketing) return false;
    if (filters.marketing.prylom && !asset.prylom_selected) return false;

    return true;
  });
}, [assets, filters]);


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
      .select(`
        *, 
        arrendamentos(*), 
        produtos_imagens(image_url, ordem), 
        fazendas(*), 
        ${newAsset.categoria === 'fazendas' ? 'documentos_fazenda(*)' : ''}
      `)
      .order('created_at', { ascending: false });
    
    console.log('📦 ASSETS DO SUPABASE:', data?.[0]); // DEBUG ASSETS
    if (error) throw error;
    
    if (data) {
      const mapped = data.map((item: any) => ({
        ...item,
        main_image: item.produtos_imagens?.find((img: any) => img.ordem === 1)?.image_url || item.produtos_imagens?.[0]?.image_url,
        fazendas: item.fazendas || null  // ✅ Garantir que existe
      }));
      setAssets(mapped);
      console.log('✅ ASSETS MAPPED:', mapped[0]); // DEBUG FINAL
    }
  } catch (err) {
    console.error('❌ fetchAssets ERROR:', err);
  } finally {
    setLoading(false);
  }
};


const handleEdit = async (asset: Product) => {
 
  setLoading(true);
  setIsEditing(true);
  setCurrentId(asset.id);
  
  setNewAsset({
    codigo: asset.codigo || '',
    titulo: asset.titulo || '',
    descricao: asset.descricao || '',
    categoria: asset.categoria || 'fazendas',
    subcategoria: asset.subcategoria || '',
    tipo_transacao: asset.tipo_transacao || 'venda',
    valor: asset.valor?.toString() || '',
    unidade: asset.unidade || 'unidade',
    quantidade: asset.quantidade || 1,
    estado: asset.estado || '',
    cidade: asset.cidade || '',
    certificacao: !!asset.certificacao,
    destaque: !!asset.destaque,
    status: asset.status || 'ativo'
  });
  
  

  try {
    // ✅ DADOS TÉCNICOS - CORRIGIDO
    console.log('🔍 Buscando dados técnicos em:', asset.categoria, 'produto_id:', asset.id);
    const { data: specData, error: specError } = await supabase
      .from(asset.categoria as string)
      .select('*')
      .eq('produto_id', asset.id)
      .maybeSingle();
    
   
    
    if (specError) {
      console.error('❌ Erro sub-tabela:', specError);
      setDadosEspecificos({});
    } else if (specData && Object.keys(specData).length > 1) { // Verifica se tem dados reais
      const { produto_id, id, created_at, updated_at, ...onlyFields } = specData;

      setDadosEspecificos(onlyFields);
    } else {
      console.warn('⚠️ Nenhum dado técnico encontrado');
      setDadosEspecificos({});
    }

    // Imagens (OK)
    const { data: imgData } = await supabase
      .from('produtos_imagens')
      .select('image_url')
      .eq('produto_id', asset.id)
      .order('ordem', { ascending: true });
    setSelectedImages(imgData?.map(img => ({ url: img.image_url, isExisting: true })) || []);

    // Documentos (fazendas)
    if (asset.categoria === 'fazendas') {
      const { data: docData } = await supabase
        .from('documentos_fazenda')
        .select('documento_url')
        .eq('produto_id', asset.id);
      setSelectedDocuments(docData?.map(doc => ({ url: doc.documento_url, isExisting: true })) || []);
    }

  } catch (e) {
    console.error('❌ ERRO handleEdit:', e);
    setDadosEspecificos({});
    setSelectedImages([]);
    setSelectedDocuments([]);
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

function normalizarDados(obj: Record<string, any>) {
  const normalizado: Record<string, any> = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (
      value === '' ||
      value === undefined ||
      value === 'null'
    ) {
      normalizado[key] = null; // ✅ NULL REAL
    } else {
      normalizado[key] = value;
    }
  });

  return normalizado;
}




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
      const { data: produto, error: prodErr } = await supabase
        .from('produtos')
        .insert(produtoPayload)
        .select('id')
        .single();
      if (prodErr) throw prodErr;
      if (produto) produtoId = produto.id;
    }

    if (produtoId) {
      // 1. Salvar dados específicos da categoria
const dadosNormalizados = normalizarDados(dadosEspecificos);



const { data, error } = await supabase
  .from(newAsset.categoria)
  .upsert(
    {
      produto_id: produtoId,
      ...dadosNormalizados
    },
    { onConflict: 'produto_id' }
  );


if (error) throw error;


      // 2. Upload de IMAGENS (código existente - mantido igual)
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

      // Salvar imagens na tabela produtos_imagens
      await supabase.from('produtos_imagens').delete().eq('produto_id', produtoId);
      if (imageUrlsToSave.length > 0) {
        const validImages = imageUrlsToSave.map((url, idx) => ({
          produto_id: produtoId,
          image_url: url,
          ordem: idx + 1
        }));
        await supabase.from('produtos_imagens').insert(validImages);
      }

      // ✅ 3. NOVO: Upload de DOCUMENTOS DA FAZENDA
      if (newAsset.categoria === 'fazendas') {
        const documentUrlsToSave: string[] = [];

        for (const doc of selectedDocuments) {
          if (doc.isExisting) {
            documentUrlsToSave.push(doc.url);
          } else if (doc.file) {
            const fileExt = doc.file.name.split('.').pop();
            const fileName = `doc_${produtoId}_${Date.now()}.${fileExt}`;
            const filePath = `documentos_fazenda/${produtoId}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
              .from('documentos_fazenda')
              .upload(filePath, doc.file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('documentos_fazenda')
              .getPublicUrl(filePath);
            documentUrlsToSave.push(publicUrl);
          }
        }

        // Salvar documentos na tabela documentos_fazenda (você precisa criar esta tabela)
        await supabase.from('documentos_fazenda').delete().eq('produto_id', produtoId);
        if (documentUrlsToSave.length > 0) {
          const validDocuments = documentUrlsToSave.map((url, idx) => ({
            produto_id: produtoId,
            documento_url: url,
            ordem: idx + 1,
            created_at: new Date().toISOString()
          }));
          await supabase.from('documentos_fazenda').insert(validDocuments);
        }
      }
    }

    alert(t.adminSuccess);
    fetchAssets();
    setShowModal(false);
    setNewAsset(initialAssetState);
    setDadosEspecificos({});
    setSelectedImages([]);
    setSelectedDocuments([]); // Limpar documentos
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

const [selectedDocuments, setSelectedDocuments] = useState<FarmDocument[]>([]);
const documentsFileInputRef = useRef<HTMLInputElement>(null);

// Adicione esta função para selecionar documentos (similar a handleFileSelect):
const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    const filesArray = Array.from(e.target.files) as File[];
    const newDocuments: FarmDocument[] = filesArray.map(file => ({
      file,
      url: URL.createObjectURL(file),
      isExisting: false
    }));
    setSelectedDocuments(prev => [...prev, ...newDocuments]);
  }
};

// Adicione esta função para remover documentos:
const removeDocument = (index: number) => {
  const docToRemove = selectedDocuments[index];
  if (!docToRemove.isExisting && docToRemove.url) {
    URL.revokeObjectURL(docToRemove.url);
  }
  setSelectedDocuments(prev => prev.filter((_, i) => i !== index));
};

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'vendido', label: 'Vendido' },
];

const SITUACAO_OPTIONS = [
  { value: 'regular', label: 'Regular' },
  { value: 'irregular', label: 'Irregular' },
  { value: 'em_regularizacao', label: 'Em regularização' },
];

const APTIDAO_OPTIONS = [
  'Agricultura',
  'Pecuaria',
  'Dupla Aptidão',
  'Avicultura',
  'Suinocultura',
  'Piscicultura',
  'Silvicultura',
  'Agrofloresta',
  'Carbon Sequestration',
  'Preservação Ambiental'
];

const TOPOGRAFIA_OPTIONS = [
  'Plana',
  'Plana - ondulada',
  'Suave ondulada',
  'Ondulada',
  'Forte ondulada',
  'Montanhosa'
];

const COMISSAO_OPTIONS = [
  '3%',
  '4%',
  '5%',
  '6%'
];

const PERMUTA_OPTIONS = ['Sim', 'Não'];

const SITUACAO_DOC_OPTIONS = [
  'Regular',
  'Irregular',
  'Em análise',
  'Em Regularização'
];

const TIPO_ANUNCIO_OPTIONS = [
  'Open Marketing',
  'Off Marketing',
  'Prylom Selected'
];

const RELEVANCIA_OPTIONS = [
  'Prylom Selected',
  'Prylom Verified',
  'Marketplace'
];

const PORTAIS_OPTIONS = [
  'Chãozão',
  'E-Agro',
  'Agrofy',
  'MF Rural',
  'Imóvel Web'
];

const RESERVALEGAL_OPTIONS = [
  '80%',
  '35%',
  '20%'
];

const SELECT_FIELDS = {
  aptidao: APTIDAO_OPTIONS,
  topografia: TOPOGRAFIA_OPTIONS,
  comissao: COMISSAO_OPTIONS,
  permuta: PERMUTA_OPTIONS,
  sit_doc: SITUACAO_DOC_OPTIONS,
  tipo_anuncio: TIPO_ANUNCIO_OPTIONS,
  relevancia_anuncio: RELEVANCIA_OPTIONS,
  reserva_legal: RESERVALEGAL_OPTIONS,
  portal_parceiro: PORTAIS_OPTIONS
};


const formatDateBR = (isoString: string | null | undefined): string => {
  if (!isoString) return '---';
  
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

const daysSince = (isoString: string | null | undefined): number | null => {
  if (!isoString) return null;

  const created = new Date(isoString).getTime();
  const now = Date.now();

  const diffMs = now - created;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const handleQuickStatusChange = async (
  assetId: string,
  newStatus: 'ativo' | 'vendido'
) => {
  try {
    // Atualiza no banco
    const { error } = await supabase
      .from('produtos')
      .update({ status: newStatus })
      .eq('id', assetId);

    if (error) throw error;

    // Atualiza no estado local (sem refetch pesado)
    setAssets(prev =>
      prev.map(a =>
        a.id === assetId ? { ...a, status: newStatus } : a
      )
    );
  } catch (err) {
    console.error('❌ Erro ao alterar status:', err);
    alert('Erro ao alterar status do ativo');
  }
};

const handleToggleVendidoPrylom = async (
  assetId: string,
  currentValue: boolean
) => {
  try {
    const { error } = await supabase
      .from('produtos')
      .update({ vendido_prylom: !currentValue })
      .eq('id', assetId);

    if (error) throw error;

    setAssets(prev =>
      prev.map(a =>
        a.id === assetId
          ? { ...a, vendido_prylom: !currentValue }
          : a
      )
    );
  } catch (err) {
    console.error('Erro ao atualizar vendido_prylom:', err);
    alert('Erro ao atualizar Vendido Prylom');
  }
};

const [estados, setEstados] = useState<{ id: number; sigla: string; nome: string }[]>([]);
const [cidades, setCidades] = useState<{ id: number; nome: string }[]>([]);

const [cidadesFiltro, setCidadesFiltro] = useState<{ id: number; nome: string }[]>([]);
const [cidadesCadastro, setCidadesCadastro] = useState<{ id: number; nome: string }[]>([]);

useEffect(() => {
  fetchEstados();
}, []);

const fetchEstados = async () => {
  try {
    const res = await fetch(
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'
    );
    const data = await res.json();
    setEstados(data);
  } catch (err) {
    console.error('Erro ao buscar estados:', err);
  }
};



// 1. Busca para o FILTRO (Tela Principal)
useEffect(() => {
  if (!filters.estado) {
    setCidadesFiltro([]);
    return;
  }
  const fetchCidadesFiltro = async () => {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${filters.estado}/municipios`);
    const data = await res.json();
    setCidadesFiltro(data);
  };
  fetchCidadesFiltro();
}, [filters.estado]);

// 2. Busca para o CADASTRO (Modal)
useEffect(() => {
  if (!newAsset.estado) {
    setCidadesCadastro([]);
    return;
  }
  const fetchCidadesCadastro = async () => {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${newAsset.estado}/municipios`);
    const data = await res.json();
    setCidadesCadastro(data);
  };
  fetchCidadesCadastro();
}, [newAsset.estado]);
  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen bg-[#FDFCFB]">
      {/* SIDEBAR */}
      <aside className="w-full md:w-80 bg-prylom-dark p-10 flex flex-col text-white shadow-2xl z-50">
        <div className="mb-16">
          <div className="text-prylom-gold font-black text-3xl mb-2 tracking-tighter">Prylom<span className="text-white">.</span></div>
          <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.4em]">Intelligence Center</p>
        </div>
        <nav className="flex flex-col gap-3">
          <button 
            onClick={() => setActiveTab('crm')}
            className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'crm' ? 'bg-prylom-gold text-white shadow-2xl' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
          >
            Administração de Ativos
          </button>
          <button 
            onClick={() => setActiveTab('listings')}
            className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'listings' ? 'bg-prylom-gold text-white shadow-2xl' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
          >
            Gestão de Anúncios
          </button>
          <div className="h-px bg-white/10 my-8"></div>
          <button onClick={onLogout} className="flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-400/10 transition-all">
            Encerrar Sessão
          </button>
        </nav>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-8 md:p-14 overflow-y-auto no-scrollbar">
        {activeTab === 'crm' ? (
          <AssetCRM assets={assets} currency={currency} />
        ) : (
          <div className="animate-fadeIn">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                <div>
                   <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">Operação</span>
                   <h2 className="text-5xl font-black text-[#000080] tracking-tighter uppercase mb-2">Gestão de Anúncios</h2>
                   <p className="text-gray-400 text-sm font-medium tracking-wide">Publicação, Edição e Auditoria de Ativos no Marketplace</p>
                </div>
                <button onClick={() => { setIsEditing(false); setNewAsset(initialAssetState); setShowModal(true); }} className="bg-[#000080] text-white px-10 py-6 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-3xl hover:bg-prylom-gold transition-all">
                   Novo Anúncio
                </button>
            </header>

            <div className="bg-white rounded-[4rem] p-10 shadow-2xl border border-gray-50">
{/* BARRA DE FILTROS */}
<div className="w-full bg-white rounded-xl shadow-sm p-5 mb-6 space-y-6">

  {/* LINHA 1 — Tipo + Localização */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <select
      value={filters.tipoTransacao}
      onChange={e => setFilters(f => ({ ...f, tipoTransacao: e.target.value }))}
      className="border rounded-md px-3 py-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-1 focus:ring-prylom-gold"
    >
      <option value="">Tipo de transação</option>
      <option value="venda">Venda</option>
      <option value="arrendamento">Arrendamento</option>
    </select>

<div className="grid grid-cols-2 gap-2">
  {/* ESTADO - FILTRO (Usa filters.estado) */}
  <select
    value={filters.estado}
    onChange={e => {
      setFilters(prev => ({
        ...prev,
        estado: e.target.value,
        cidade: '' // Limpa cidade ao trocar estado no filtro
      }));
    }}
    className="w-full py-4 px-4 bg-gray-50 rounded-xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold"
  >
    <option value="">UF</option>
    {estados.map(uf => (
      <option key={uf.id} value={uf.sigla}>
        {uf.sigla} - {uf.nome}
      </option>
    ))}
  </select>

  {/* CIDADE - FILTRO (Usa filters.cidade e cidadesFiltro) */}
  <select
    value={filters.cidade}
    onChange={e => setFilters(prev => ({ ...prev, cidade: e.target.value }))}
    disabled={!filters.estado}
    className="w-full py-4 px-4 bg-gray-50 rounded-xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold"
  >
    <option value="">Município</option>
    {cidadesFiltro.map(cidade => (
      <option key={cidade.id} value={cidade.nome}>
        {cidade.nome}
      </option>
    ))}
  </select>
</div>


    <input
      placeholder="Aptidão"
      value={filters.aptidao}
      onChange={e => setFilters(f => ({ ...f, aptidao: e.target.value }))}
      className="border rounded-md px-3 py-2 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-prylom-gold"
    />
  </div>

  {/* LINHA 2 — Solo */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <input
      type="number"
      placeholder="Argila mín. (%)"
      value={filters.teorArgilaMin}
      onChange={e => setFilters(f => ({ ...f, teorArgilaMin: e.target.value }))}
      className="border rounded-md px-3 py-2 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-prylom-gold"
    />

    <input
      type="number"
      placeholder="Argila máx. (%)"
      value={filters.teorArgilaMax}
      onChange={e => setFilters(f => ({ ...f, teorArgilaMax: e.target.value }))}
      className="border rounded-md px-3 py-2 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-prylom-gold"
    />
  </div>

  {/* LINHA 3 — Status & Situação */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        Status
      </p>
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(opt => (
          <label
            key={opt.value}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={filters.status.includes(opt.value)}
              onChange={() => toggleStatus(opt.value)}
              className="accent-prylom-gold"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>

    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        Situação
      </p>
      <div className="flex flex-wrap gap-2">
        {SITUACAO_OPTIONS.map(opt => (
          <label
            key={opt.value}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
          >
            <input
              type="checkbox"
              checked={filters.situacao.includes(opt.value)}
              onChange={() => toggleSituacao(opt.value)}
              className="accent-prylom-gold"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>

  </div>

  {/* LINHA 4 — Valores & Área */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <input
      type="number"
      placeholder="Valor mín."
      value={minValor}
      onChange={e => setMinValor(e.target.value)}
      className="border rounded-md px-3 py-2 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-prylom-gold"
    />

    <input
      type="number"
      placeholder="Valor máx."
      value={maxValor}
      onChange={e => setMaxValor(e.target.value)}
      className="border rounded-md px-3 py-2 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-prylom-gold"
    />

    <input
      type="number"
      placeholder="Hectares mín."
      value={minHa}
      onChange={e => setMinHa(e.target.value)}
      className="border rounded-md px-3 py-2 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-prylom-gold"
    />

    <input
      type="number"
      placeholder="Hectares máx."
      value={maxHa}
      onChange={e => setMaxHa(e.target.value)}
      className="border rounded-md px-3 py-2 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-prylom-gold"
    />
  </div>

  {/* LINHA 5 — Busca + Marketing */}
  <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
    <input
      type="text"
      placeholder="Buscar por título, código ou observação"
      value={searchText}
      onChange={e => setSearchText(e.target.value)}
      className="border rounded-md px-3 py-2 w-full md:max-w-md bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-prylom-gold"
    />

    <label className="flex items-center gap-2 text-sm text-gray-600">
      <input
        type="checkbox"
        checked={filters.marketing.open}
        onChange={() =>
          setFilters(f => ({
            ...f,
            marketing: { ...f.marketing, open: !f.marketing.open }
          }))
        }
        className="accent-prylom-gold"
      />
      Open Marketing
    </label>
  </div>

</div>



                <div className="overflow-x-auto no-scrollbar">
                   <table className="w-full text-left">
<thead>
  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
    <th className="pb-6">Dossiê / ID</th>
    <th className="pb-6">Localização</th>
    <th className="pb-6">Categoria</th>
    <th className="pb-6">Status</th>
    <th className="pb-6">Criado em</th>
    <th className="pb-6 text-right">Controle</th>
  </tr>
</thead>

                      <tbody className="divide-y divide-gray-50">
                         {filteredAssets.map(asset => (
                            <tr key={asset.id} className="group hover:bg-[#FDFCFB] transition-colors">
                               <td className="py-8">
                                 <div className="flex items-center gap-5">
                                   <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg bg-gray-100 shrink-0 border border-gray-100">
                                     <img src={asset.main_image || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=150'} alt="" className="w-full h-full object-cover" />
                                   </div>
                                   <div>
                                     <p className="font-black text-base text-[#000080] leading-none mb-1 uppercase tracking-tight">{asset.titulo}</p>
                                     <p className="text-[8px] font-black text-prylom-gold tracking-widest uppercase">{asset.codigo || 'S/COD'}</p>
                                   </div>
                                 </div>
                               </td>
                               <td className="py-8 text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{asset.cidade}, {asset.estado}</td>
                               <td className="py-8"><span className="text-[9px] font-black text-prylom-dark uppercase bg-gray-50 px-3 py-1 rounded-md">{asset.categoria}</span></td>
<td className="py-4">
  <div className="inline-flex rounded-full border overflow-hidden">
    <button
      onClick={() => handleQuickStatusChange(asset.id, 'ativo')}
      className={`
        text-[10px] font-medium uppercase
        px-2 py-0.5
        leading-none
        transition-colors
        ${
          asset.status === 'ativo'
            ? 'bg-green-100 text-green-700'
            : 'bg-white text-gray-400 hover:bg-gray-50'
        }
      `}
    >
      Disponível
    </button>

    <button
      onClick={() => handleQuickStatusChange(asset.id, 'vendido')}
      className={`
        text-[10px] font-medium uppercase
        px-2 py-0.5
        leading-none
        transition-colors
        ${
          asset.status === 'vendido'
            ? 'bg-red-200 text-red-700'
            : 'bg-white text-gray-400 hover:bg-gray-50'
        }
      `}
    >
      Vendido
    </button>
  </div>
      {/* VENDIDO PRYLOM */}
    <button
      onClick={() =>
        handleToggleVendidoPrylom(
          asset.id,
          asset.vendido_prylom
        )
      }
      className={`
        text-[9px] font-medium uppercase
        px-2 py-0.5
        rounded-full border
        leading-none transition-colors
        ${
          asset.vendido_prylom
            ? 'bg-blue-100 text-blue-700 border-blue-200'
            : 'bg-white text-gray-400 border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      Vendido Prylom
    </button>
</td>



                               <td className="py-8">
  <div className="flex flex-col">
    <span className="text-[10px] font-bold text-gray-700">
      {formatDateBR(asset.created_at)}
    </span>

    {daysSince(asset.created_at) !== null && (
      <span className="text-[9px] text-gray-400">
        há {daysSince(asset.created_at)} dias
      </span>
    )}
  </div>
</td>

                               <td className="py-8 text-right">
                                <div className="flex justify-end gap-3">

  {/* ✏️ EDITAR */}
  <button
    onClick={() => handleEdit(asset)}
    className="w-12 h-12 flex items-center justify-center rounded-2xl
               bg-gray-50 text-[#000080]
               hover:bg-[#000080] hover:text-white
               transition-all shadow-sm"
    title="Editar ativo"
  >
    <svg xmlns="http://www.w3.org/2000/svg"
         className="h-5 w-5"
         fill="none"
         viewBox="0 0 24 24"
         stroke="currentColor">
      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536
               m-2.036-5.036a2.5 2.5 0 113.536 3.536
               L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  </button>

  {/* 🗑️ EXCLUIR */}
  <button
    onClick={() => { 
        handleDeleteConfirmed(asset);      
    }}
    className="w-12 h-12 flex items-center justify-center rounded-2xl
               bg-red-50 text-red-600
               hover:bg-red-600 hover:text-white
               transition-all shadow-sm"
    title="Excluir ativo"
  >
    <svg xmlns="http://www.w3.org/2000/svg"
         className="h-5 w-5"
         fill="none"
         viewBox="0 0 24 24"
         stroke="currentColor">
      <path strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862
               a2 2 0 01-1.995-1.858L5 7
               m5 4v6m4-6v6
               m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3
               M4 7h16" />
    </svg>
  </button>

</div>

                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
            </div>
          </div>
        )}
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
                    <input value={newAsset.codigo} onChange={e => setNewAsset({...newAsset, codigo: e.target.value.toUpperCase()})} className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none font-black text-prylom-dark border-2 border-transparent focus:border-prylom-gold transition-all" placeholder="EX: PRY-882" />
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

 
    {/* ESTADO - CADASTRO (Usa newAsset.estado) */}
    <select
      required
      value={newAsset.estado}
      onChange={e => {
        setNewAsset({
          ...newAsset,
          estado: e.target.value,
          cidade: '' // Limpa cidade ao trocar estado no cadastro
        });
      }}
      className="w-full py-4 px-6 bg-gray-50 rounded-2xl font-bold text-prylom-dark outline-none border-2 border-transparent focus:border-prylom-gold"
    >
      <option value="">UF</option>
      {estados.map(uf => (
        <option key={uf.id} value={uf.sigla}>
          {uf.sigla} - {uf.nome}
        </option>
      ))}
    </select>

    {/* CIDADE - CADASTRO (Usa newAsset.cidade e cidadesCadastro) */}
    <select
      required
      value={newAsset.cidade}
      onChange={e => setNewAsset({ ...newAsset, cidade: e.target.value })}
      disabled={!newAsset.estado}
      className="w-full py-4 px-6 bg-gray-50 rounded-2xl font-bold text-prylom-dark outline-none border-2 border-transparent focus:border-prylom-gold"
    >
      <option value="">Município</option>
      {cidadesCadastro.map(cidade => (
        <option key={cidade.id} value={cidade.nome}>
          {cidade.nome}
        </option>
      ))}
    </select>

</div>

                  </div>
                </div>
              </div>

{/* SEÇÃO 3: DADOS TÉCNICOS (LIMPO E MINIMALISTA) */}
<div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
  {camposPorCategoria[newAsset.categoria].map(campo => {
    const options = SELECT_FIELDS[campo.key as keyof typeof SELECT_FIELDS];
    const isSelect = !!options;

    return (
      <div key={campo.key} className="space-y-2">
        {/* O Label superior já é suficiente para identificar o campo */}
        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">
          {campo.label} {campo.required ? '*' : ''}
        </label>

        {isSelect ? (
          <div className="relative">
            <select
              required={campo.required}
              value={dadosEspecificos[campo.key] || ''}
              onChange={e =>
                setDadosEspecificos({
                  ...dadosEspecificos,
                  [campo.key]: e.target.value
                })
              }
              // Removido placeholders e mantido estilo limpo
              className="w-full h-[56px] py-4 px-6 bg-gray-100/50 rounded-2xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold transition-all appearance-none cursor-pointer"
            >
              {/* Opção vazia sem texto para manter o campo limpo até a seleção */}
              <option value=""></option> 
              {options.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        ) : (
          <input
            type={campo.type}
            required={campo.required}
            value={dadosEspecificos[campo.key] || ''}
            onChange={e =>
              setDadosEspecificos({
                ...dadosEspecificos,
                [campo.key]: e.target.value
              })
            }
            // Removido o atributo placeholder para limpar o interior do input
            className="w-full h-[56px] py-4 px-6 bg-gray-100/50 rounded-2xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold transition-all"
          />
        )}
      </div>
    );
  })}
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

            {/* SEÇÃO 4.5: DOCUMENTOS DA FAZENDA (SÓ APARECE PARA FAZENDAS) */}
{newAsset.categoria === 'fazendas' && (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <h4 className="text-[11px] font-black text-prylom-dark uppercase tracking-widest whitespace-nowrap">📄 Documentos da Fazenda</h4>
      <div className="h-px flex-1 bg-gray-100"></div>
    </div>
    
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      {selectedDocuments.map((doc, index) => (
        <div key={index} className="relative aspect-square bg-gray-50 rounded-3xl overflow-hidden group border border-gray-100 shadow-sm animate-fadeIn">
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <button 
            type="button" 
            onClick={() => removeDocument(index)}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm p-2">
            <p className="text-[8px] font-black text-white uppercase text-center truncate">
              {doc.isExisting ? 'Salva no Storage' : 'Novo Documento'}
            </p>
          </div>
        </div>
      ))}

      <button 
        type="button" 
        onClick={() => documentsFileInputRef.current?.click()}
        className="aspect-square flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-prylom-gold hover:text-prylom-gold transition-all group bg-gray-50/30"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">Anexar Documentos</span>
      </button>
    </div>
    
    <input 
      type="file" 
      ref={documentsFileInputRef} 
      className="hidden" 
      accept=".pdf,.doc,.docx,.jpg,.png" 
      multiple 
      onChange={handleDocumentSelect} 
    />
    
    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center">
      PDF, Word, JPG/PNG. Matrícula, CAR, CCIR, Laudos, Contratos...
    </p>
  </div>
)}


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
                  <div className="space-y-2">
    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">
      Status do Ativo
    </label>
    <select
      value={newAsset.status}
      onChange={e => setNewAsset({ ...newAsset, status: e.target.value })}
      className="w-full py-4 px-6 bg-gray-50 rounded-2xl font-bold text-prylom-dark outline-none border-2 border-transparent focus:border-prylom-gold"
    >
      <option value="ativo">Disponível</option>
      <option value="vendido">Vendida</option>
    </select>
  </div>

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
