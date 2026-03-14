
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
  updated_at: string;
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
  const [activeTab, setActiveTab] = useState<'listings' | 'crm' | 'corretores' | 'cadastrados'>('crm');
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

const [selectedDocuments, setSelectedDocuments] = useState<FarmDocument[]>([]);
const [autorizacaoVenda, setAutorizacaoVenda] = useState<FarmDocument | null>(null); // Slot único
const documentsFileInputRef = useRef<HTMLInputElement>(null);
const authFileInputRef = useRef<HTMLInputElement>(null); // Ref para o input da autorização

const [produtosCadastrados, setProdutosCadastrados] = useState<any[]>([]);
const fetchProdutosCadastrados = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from('ativos_cadastro')
      .select(`
        *,
        documentos_cadastro(*),
        cadastrados_imagens(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data) {
      setProdutosCadastrados(data.map((item: any) => ({
        ...item,
        // Pega a primeira imagem da tabela cadastrados_imagens como capa
        main_image: item.cadastrados_imagens?.[0]?.image_url
      })));
    }
  } catch (err) {
    console.error('Erro ao buscar cadastrados:', err);
  } finally {
    setLoading(false);
  }
};

// Chame no useEffect inicial
useEffect(() => {
  fetchAssets();
  fetchCorretores();
  fetchProdutosCadastrados(); // Nova chamada
}, []);

const [showViewCadastrado, setShowViewCadastrado] = useState(false);
const [viewingCadastrado, setViewingCadastrado] = useState<any>(null);
  // Campos técnicos essenciais para preencher as sub-tabelas do banco
  const camposPorCategoria: Record<string, { key: string; label: string; type: string; required?: boolean }[]> = useMemo(() => ({
fazendas: [
  // Campos existentes
  { key: 'area_total_ha', label: 'Área Total (ha)', type: 'number', required: true },
  { key: 'area_lavoura_ha', label: 'Área de Lavoura (ha)', type: 'text' },
  { key: 'aptidao', label: 'Aptidão', type: 'select' },
  { key: 'teor_argila', label: 'Teor de Argila %', type: 'text' },
  { key: 'topografia', label: 'Topografia', type: 'select' },
  { key: 'precipitacao_mm', label: 'Precipitação Anual (mm)', type: 'number' },
  { key: 'altitude_m', label: 'Altitude (m)', type: 'number' },
  { key: 'km_asfalto', label: 'Asfalto/Cidade', type: 'text' },
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
  const [dadosEspecificos, setDadosEspecificos] = useState<any>({
  portal_parceiro: []
});

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
        fazendas(
          *,
          corretores(*) 
        ),
        documentos_fazenda(*)
      `)
      .order('created_at', { ascending: false });

    // DEBUG: Se der erro, vamos ver o objeto de erro completo
    if (error) {
       console.error('🔴 Erro detalhado do Supabase:', error);
       throw error;
    }

    if (data) {
      const mapped = data.map((item: any) => ({
        ...item,
        main_image: item.produtos_imagens?.find((img: any) => img.ordem === 1)?.image_url 
                    || item.produtos_imagens?.[0]?.image_url,
        // Mantemos o objeto aninhado. O corretor estará em asset.fazendas.corretores
        fazendas: item.fazendas?.[0] || item.fazendas || null,
        documentos_fazenda: item.documentos_fazenda || []
      }));

      setAssets(mapped);
      console.log('✅ Dados carregados:', mapped.length);
    }
  } catch (err) {
    console.error('❌ fetchAssets CATCH ERROR:', err);
    alert("Erro ao carregar ativos. Abra o console (F12) e veja o 'Erro detalhado do Supabase'.");
  } finally {
    setLoading(false);
  }
};


const handleEdit = async (asset: Product) => {
  setLoading(true);
  setIsEditing(true);
  setCurrentId(asset.id);

  // Limpa estados de arquivos para não carregar lixo do ativo anterior
  setSelectedImages([]);
  setSelectedDocuments([]);
  setAutorizacaoVenda(null);

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
    // 1. DADOS TÉCNICOS
    const { data: specData, error: specError } = await supabase
      .from(asset.categoria as string)
      .select('*')
      .eq('produto_id', asset.id)
      .maybeSingle();

    if (specData) {
      if (specData.portal_parceiro && typeof specData.portal_parceiro === 'string') {
        specData.portal_parceiro = JSON.parse(specData.portal_parceiro);
      }
      const { produto_id, id, created_at, updated_at, ...onlyFields } = specData;
      setDadosEspecificos(onlyFields);
    }

    // 2. IMAGENS
    const { data: imgData } = await supabase
      .from('produtos_imagens')
      .select('image_url')
      .eq('produto_id', asset.id)
      .order('ordem', { ascending: true });
    
    if (imgData) {
      setSelectedImages(imgData.map(img => ({ url: img.image_url, isExisting: true })));
    }

    // 3. DOCUMENTOS (FAZENDAS) - CORREÇÃO AQUI
    if (asset.categoria === 'fazendas') {
      const { data: docData } = await supabase
        .from('documentos_fazenda')
        .select('*')
        .eq('produto_id', asset.id);

      if (docData) {
        // Como a coluna é TEXT, comparamos com a string "1"
        const auth = docData.find(d => String(d.autorizacao) == "1");

        if (auth) {
          console.log("✅ Autorização encontrada:", auth.documento_url);
          setAutorizacaoVenda({
            url: auth.documento_url,
            isExisting: true
          });
        }

        // Documentos gerais (tudo que NÃO for autorização "1")
        const gerais = docData.filter(d => String(d.autorizacao) !== "1");
        setSelectedDocuments(gerais.map(doc => ({
          url: doc.documento_url,
          isExisting: true
        })));
      }
    }
  } catch (e) {
    console.error('❌ ERRO handleEdit:', e);
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
      status: isEditing ? newAsset.status : 'ativo',
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

const { 
        corretor, 
        telefone_corretor, 
        email_corretor, 
        estado_corretor, 
        _display_corretor_nome, 
        _display_corretor_creci,
        ...dadosParaBanco 
      } = dadosEspecificos;



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
// ✅ 3. Upload de DOCUMENTOS (Consolidado: Autorização + Gerais)
if (newAsset.categoria === 'fazendas') {
  const allDocsToSave = [];

  // A. Processar Autorização de Venda (Se houver)
  if (autorizacaoVenda) {
    if (autorizacaoVenda.isExisting) {
      allDocsToSave.push({ url: autorizacaoVenda.url, isAuth: 1 });
    } else if (autorizacaoVenda.file) {
      const path = `documentos_fazenda/${produtoId}/venda/autorizacao_${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from('documentos_fazenda').upload(path, autorizacaoVenda.file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('documentos_fazenda').getPublicUrl(path);
      allDocsToSave.push({ url: publicUrl, isAuth: 1 });
    }
  }

  // B. Processar Documentos Gerais
  for (const doc of selectedDocuments) {
    if (doc.isExisting) {
      allDocsToSave.push({ url: doc.url, isAuth: 0 });
    } else if (doc.file) {
      const path = `documentos_fazenda/${produtoId}/anexos/${Date.now()}_${doc.file.name}`;
      const { error: upErr } = await supabase.storage.from('documentos_fazenda').upload(path, doc.file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('documentos_fazenda').getPublicUrl(path);
      allDocsToSave.push({ url: publicUrl, isAuth: 0 });
    }
  }

  // C. Salvar tudo na tabela documentos_fazenda
  await supabase.from('documentos_fazenda').delete().eq('produto_id', produtoId);
  if (allDocsToSave.length > 0) {
    const finalPayload = allDocsToSave.map((d, idx) => ({
      produto_id: produtoId,
      documento_url: d.url,
      ordem: idx + 1,
      autorizacao: d.isAuth // Grava 1 para autorização, 0 para o resto
    }));
    await supabase.from('documentos_fazenda').insert(finalPayload);
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

const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    setLoading(true);

    // 1. Forçamos o cast para File[] para que o loop reconheça o tipo 'file'
    const filesArray = Array.from(e.target.files) as File[];
    
    const processedImages: ProductImage[] = [];

    for (const file of filesArray) {
      try {
        // 2. A função agora recebe um File e retorna uma Promise<File>
        const fileWithBrand = await applyPrylomWatermark(file);
        
        processedImages.push({
          file: fileWithBrand,
          url: URL.createObjectURL(fileWithBrand),
          isExisting: false
        });
      } catch (error) {
        console.error("Erro ao processar imagem:", file.name, error);
      }
    }

    setSelectedImages(prev => [...prev, ...processedImages]);
    setLoading(false);
    
    // 3. Limpa o valor do input para permitir selecionar a mesma imagem novamente se necessário
    e.target.value = '';
  }
};

  const removeImage = (index: number) => {
    const imgToRemove = selectedImages[index];
    if (!imgToRemove.isExisting && imgToRemove.url) {
        URL.revokeObjectURL(imgToRemove.url);
    }
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };



const handleAuthSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    setAutorizacaoVenda({
      file,
      url: URL.createObjectURL(file),
      isExisting: false
    });
  }
};

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
  'Não Apresentado',
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
  'Open Marketing'
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


const togglePortalParceiro = (portal: string) => {
  const currentPortals = Array.isArray(dadosEspecificos.portal_parceiro) 
    ? dadosEspecificos.portal_parceiro 
    : [];
    
  const updatedPortals = currentPortals.includes(portal)
    ? currentPortals.filter(p => p !== portal) // Remove se já existe
    : [...currentPortals, portal];            // Adiciona se não existe

  setDadosEspecificos({
    ...dadosEspecificos,
    portal_parceiro: updatedPortals
  });
};

const [corretores, setCorretores] = useState<any[]>([]);
// Estados para a aba de Corretores
const [corretoresData, setCorretoresData] = useState<any[]>([]);
const [showCorretorModal, setShowCorretorModal] = useState(false);
const [fotoFile, setFotoFile] = useState<File | null>(null);
const [newCorretor, setNewCorretor] = useState({
  nome: '',
  estado: '',
  telefone: '',
  email: '',
  creci: '',
  foto_url: '',
  cargo: '',
  descricao:''
});
// Adicione dentro do useEffect que já existe ou crie um novo
useEffect(() => {
  fetchAssets();
  fetchCorretores();
  fetchCorretoresList();
}, []);

const fetchCorretores = async () => {
  const { data, error } = await supabase
    .from('corretores')
    .select('*')
    .order('nome', { ascending: true });
  
  if (data) setCorretores(data);
  if (error) console.error("Erro corretores:", error);
};

// No handleSelectCorretor, em vez de espalhar strings, salve a referência
const handleSelectCorretor = (id: string) => {
  if (!id) {
    setDadosEspecificos((prev: any) => ({
      ...prev,
      corretor_id: null, // Apenas a FK
    }));
    return;
  }

  const corretor = corretores.find(c => c.id === id);
  if (corretor) {
    setDadosEspecificos((prev: any) => ({
      ...prev,
      corretor_id: corretor.id, // Salva o ID para o banco
      // Você pode manter as outras apenas no ESTADO para exibição em tela (read-only)
      _display_corretor_nome: corretor.nome, 
      _display_corretor_creci: corretor.creci,
    }));
  }
};



const uploadFoto = async (file: File) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('fotos_corretores')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('fotos_corretores')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Erro no upload:', error);
    return null;
  }
};

const fetchCorretoresList = async () => {
  const { data, error } = await supabase.from('corretores').select('*').order('nome');
  if (data) setCorretoresData(data);
};

const [isEditingCorretor, setIsEditingCorretor] = useState(false);
const [currentCorretorId, setCurrentCorretorId] = useState<string | null>(null);

const handleEditCorretor = (corretor: any) => {
  setIsEditingCorretor(true);
  setCurrentCorretorId(corretor.id);
  setNewCorretor({
    nome: corretor.nome,
    estado: corretor.estado,
    telefone: corretor.telefone,
    email: corretor.email,
    creci: corretor.creci,
    foto_url: corretor.foto_url,
    cargo: corretor.cargo || '',
    descricao: corretor.descricao || '' // Adicionado
  });
  setShowCorretorModal(true);
};

const handleSaveCorretor = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    let publicUrl = newCorretor.foto_url;

    if (fotoFile) {
      const uploadedUrl = await uploadFoto(fotoFile);
      if (uploadedUrl) publicUrl = uploadedUrl;
    }

const payload = { 
  nome: newCorretor.nome,
  estado: newCorretor.estado,
  telefone: newCorretor.telefone,
  email: newCorretor.email,
  creci: newCorretor.creci,
  foto_url: publicUrl,
  cargo: newCorretor.cargo,
  descricao: newCorretor.descricao // Adicionado
};

    if (isEditingCorretor && currentCorretorId) {
      const { error } = await supabase
        .from('corretores')
        .update(payload)
        .eq('id', currentCorretorId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('corretores').insert([payload]);
      if (error) throw error;
    }

    // Reset Total
    setShowCorretorModal(false);
    setFotoFile(null);
    setNewCorretor({ nome: '', estado: '', telefone: '', email: '', creci: '', foto_url: '', cargo: '', descricao: '' });
    fetchCorretoresList();
  } catch (err: any) {
    alert("Erro ao salvar: " + err.message);
  } finally {
    setLoading(false);
  }
};

// Cálculo automático de Valor por Hectare
useEffect(() => {
  if (newAsset.categoria === 'fazendas') {
    const valorTotal = Number(newAsset.valor);
    const areaTotal = Number(dadosEspecificos.area_total_ha);

    if (valorTotal > 0 && areaTotal > 0) {
      const calculoHa = (valorTotal / areaTotal).toFixed(2);
      
      // Só atualiza se o valor for diferente para evitar loops infinitos
      if (dadosEspecificos.valor_ha !== calculoHa) {
        setDadosEspecificos((prev: any) => ({
          ...prev,
          valor_ha: calculoHa
        }));
      }
// No seu useEffect de cálculo, ajuste esta parte:
} else {
  // Em vez de string vazia, use null para colunas numéricas do banco
  if (dadosEspecificos.valor_ha !== null) {
    setDadosEspecificos((prev: any) => ({ ...prev, valor_ha: null }));
  }
}
  }
}, [newAsset.valor, dadosEspecificos.area_total_ha]);

const [showViewModal, setShowViewModal] = useState(false);
const [viewingAsset, setViewingAsset] = useState<any>(null);

// Estados para controle de arraste
const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

// Transforma qualquer foto em destaque (move para index 0)
const setAsMainImage = (index: number) => {
  if (index === 0) return;
  setSelectedImages(prev => {
    const newArr = [...prev];
    const [item] = newArr.splice(index, 1);
    newArr.unshift(item); // Coloca no início
    return newArr;
  });
};

// Lógica de Reordenar por Arraste
const handleDragStart = (index: number) => setDraggedIndex(index);

const handleDragOver = (e: React.DragEvent, index: number) => {
  e.preventDefault();
  if (draggedIndex === null || draggedIndex === index) return;

  setSelectedImages(prev => {
    const newArr = [...prev];
    const draggedItem = newArr[draggedIndex];
    newArr.splice(draggedIndex, 1);
    newArr.splice(index, 0, draggedItem);
    setDraggedIndex(index); // Atualiza o índice sendo arrastado
    return newArr;
  });
};

const applyPrylomWatermark = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      const imgAtivo = new Image();
      imgAtivo.src = result;
      
      imgAtivo.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        canvas.width = imgAtivo.width;
        canvas.height = imgAtivo.height;

        // 1. Desenha a foto original
        ctx.drawImage(imgAtivo, 0, 0);

        // 2. Carrega a marca
        const logo = new Image();
        logo.src = '/assets/marca-prylom.png'; 
        
        logo.onload = () => {
          // --- AJUSTE DE TAMANHO (Aumentado para 50% da largura da foto) ---
          const watermarkWidth = canvas.width * 0.5; 
          const aspectRatio = logo.height / logo.width;
          const watermarkHeight = watermarkWidth * aspectRatio;

          // --- AJUSTE DE POSIÇÃO (Centralizado perfeitamente) ---
          const x = (canvas.width - watermarkWidth) / 2;
          const y = (canvas.height - watermarkHeight) / 2;

          // Transparência para marca d'água centralizada (mais sutil para não tampar a foto)
          ctx.globalAlpha = 0.5; 
          
          ctx.drawImage(logo, x, y, watermarkWidth, watermarkHeight);
          
          ctx.globalAlpha = 1.0;

          // 3. Converte para JPEG com boa qualidade
          canvas.toBlob((blob) => {
            if (blob) {
              const finalFile = new File([blob], file.name, { type: 'image/jpeg' });
              resolve(finalFile);
            }
          }, 'image/jpeg', 0.90);
        };
      };
    };
  });
};

const [loadingAI, setLoadingAI] = useState(false);

const handleImproveDescription = async () => {
  if (!newAsset.descricao) {
    alert("Por favor, digite uma descrição para que a IA possa trabalhar.");
    return;
  }

  setLoadingAI(true);
  try {
    const response = await fetch('https://webhook.saveautomatik.shop/webhook/descricaoprylom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao: newAsset.descricao }),
    });

    if (!response.ok) throw new Error(`Status: ${response.status}`);

    // Primeiro pegamos como texto para não quebrar o JSON.parse
    const textData = await response.text();
    let novaDescricao = "";

    try {
      // Tenta converter para JSON
      const jsonData = JSON.parse(textData);
      novaDescricao = jsonData.descricao || jsonData.output || jsonData.text || textData;
    } catch (e) {
      // Se não for JSON (for o texto puro do Agent), usamos o texto direto
      novaDescricao = textData;
    }

    if (novaDescricao && novaDescricao.trim() !== "") {
      setNewAsset(prev => ({ ...prev, descricao: novaDescricao }));
    } else {
      alert("A IA retornou um conteúdo vazio.");
    }

  } catch (err) {
    console.error("Erro detalhado na conexão IA:", err);
    alert("Não foi possível conectar à IA. Verifique se o Webhook está ativo e aceita conexões externas (CORS).");
  } finally {
    setLoadingAI(false);
  }
};

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
  onClick={() => setActiveTab('corretores')} // Você pode renomear para 'corretores' se preferir
  className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'corretores' ? 'bg-prylom-gold text-white' : 'text-white/60'}`}
>
  Gestão de Corretores
</button>

          <button 
            onClick={() => setActiveTab('listings')}
            className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'listings' ? 'bg-prylom-gold text-white shadow-2xl' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
          >
            Gestão de Anúncios
          </button>
          <button 
  onClick={() => setActiveTab('cadastrados')}
  className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cadastrados' ? 'bg-prylom-gold text-white' : 'text-white/60 hover:bg-white/5'}`}
>
  Produtos Cadastrados
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
        ) : activeTab === 'corretores' ? (
    /* NOVA ABA DE CORRETORES */
    <div className="animate-fadeIn">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
        <div>
          <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">Parceiros</span>
          <h2 className="text-5xl font-black text-[#000080] tracking-tighter uppercase mb-2">Gestão de Corretores</h2>
          <p className="text-gray-400 text-sm font-medium tracking-wide">Cadastro e controle de corretores credenciados</p>
        </div>
<button 
  type="button" // ADICIONE ISSO
  onClick={(e) => {
    e.preventDefault(); // GARANTIA ADICIONAL
    setIsEditingCorretor(false);
    setCurrentCorretorId(null);
    setNewCorretor({ nome: '', estado: '', telefone: '', email: '', creci: '', foto_url: '' });
    setShowCorretorModal(true);
  }}
          className="bg-[#000080] text-white px-10 py-6 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-3xl hover:bg-prylom-gold transition-all"
        >
          Novo Corretor
        </button>
      </header>

      <div className="bg-white rounded-[4rem] p-10 shadow-2xl border border-gray-50">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                <th className="pb-6">Nome / CRECI</th>
                <th className="pb-6">Localização</th>
                <th className="pb-6">Contato</th>
                <th className="pb-6 text-right">Ações</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-50">
  {corretoresData.map((corretor) => (
    <tr key={corretor.id} className="group hover:bg-[#FDFCFB] transition-colors">
      <td className="py-8 flex items-center gap-4">
        {/* Avatar na Lista */}
        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
          {corretor.foto_url ? (
            <img src={corretor.foto_url} alt={corretor.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-[8px] text-gray-400">N/A</div>
          )}
        </div>
        <div>
          <div className="font-bold text-prylom-dark">{corretor.nome}</div>
          <div className="text-[10px] text-gray-400 font-black uppercase">CRECI: {corretor.creci}</div>
        </div>
      </td>
      <td className="py-8 font-medium text-gray-600">{corretor.estado}</td>
      <td className="py-8">
        <div className="text-xs font-bold text-prylom-dark">{corretor.telefone}</div>
        <div className="text-[10px] text-gray-400">{corretor.email}</div>
      </td>
      <td className="py-8 text-right space-x-2">
        <button 
          onClick={() => handleEditCorretor(corretor)}
          className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-blue-50 text-blue-500 hover:bg-[#000080] hover:text-white transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button 
          onClick={async () => {
            if(confirm("Deseja excluir este corretor?")) {
              await supabase.from('corretores').delete().eq('id', corretor.id);
              fetchCorretoresList();
            }
          }}
          className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  ))}
</tbody>
          </table>
          {corretoresData.length === 0 && (
            <div className="py-20 text-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
              Nenhum corretor cadastrado.
            </div>
          )}
        </div>
      </div>
    </div>
  ) : activeTab === 'cadastrados' ? (
 <div className="animate-fadeIn">
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
      <div>
        <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">Intelligence Base</span>
        <h2 className="text-5xl font-black text-[#000080] tracking-tighter uppercase mb-2">Produtos Cadastrados</h2>
        <p className="text-gray-400 text-sm font-medium tracking-wide">Base completa de captação e auditoria (ativos_cadastro)</p>
      </div>
      <button onClick={fetchProdutosCadastrados} className="bg-[#000080] text-white px-10 py-6 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-3xl hover:bg-prylom-gold transition-all">
        Sincronizar Dados
      </button>
    </header>

    <div className="bg-white rounded-[4rem] p-10 shadow-2xl border border-gray-50">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
              <th className="pb-6">Propriedade / Dono</th>
              <th className="pb-6">Localização</th>
              <th className="pb-6">Financeiro</th>
              <th className="pb-6 text-center">Arquivos</th>
              <th className="pb-6 text-right">Controle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {produtosCadastrados.map((item) => (
              <tr key={item.id} className="group hover:bg-[#FDFCFB] transition-colors">
                <td className="py-8">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg bg-gray-100 shrink-0 border border-gray-100">
                      <img src={item.cadastrados_imagens?.[0]?.image_url || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <p className="font-black text-base text-[#000080] leading-none mb-1 uppercase tracking-tight">{item.nome_propriedade || 'Sem Nome'}</p>
                      <p className="text-[9px] font-bold text-prylom-gold uppercase">{item.nome_proprietario}</p>
                    </div>
                  </div>
                </td>
                <td className="py-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter">{item.localizacao_municipio}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">{item.aptidao}</span>
                  </div>
                </td>
                <td className="py-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[#000080] uppercase tracking-tighter">{item.valor_por_hectare}</span>
                    <span className="text-[9px] font-bold text-prylom-gold uppercase">{item.tipo_negociacao}</span>
                  </div>
                </td>
                <td className="py-8 text-center">
                   <div className="flex flex-col items-center gap-1">
                      <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-2 py-1 rounded-md uppercase">{item.cadastrados_imagens?.length || 0} FOTOS</span>
                      <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-1 rounded-md uppercase">{item.documentos_cadastro?.length || 0} DOCS</span>
                   </div>
                </td>
                <td className="py-8 text-right">
                  <button 
                    onClick={() => { setViewingCadastrado(item); setShowViewCadastrado(true); }}
                    className="w-12 h-12 inline-flex items-center justify-center rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  ) : (
          <div className="animate-fadeIn">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                <div>
                   <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">Operação</span>
                   <h2 className="text-5xl font-black text-[#000080] tracking-tighter uppercase mb-2">Gestão de Anúncios</h2>
                   <p className="text-gray-400 text-sm font-medium tracking-wide">Publicação, Edição e Auditoria de Ativos no Marketplace</p>
                </div>
                <button onClick={() => { 
    setIsEditing(false); 
    setCurrentId(null); // Importante limpar o ID atual
    setNewAsset(initialAssetState); // Aqui o status volta para 'ativo' automaticamente
    setDadosEspecificos({ portal_parceiro: [] }); // Limpa dados técnicos
    setSelectedImages([]);
    setSelectedDocuments([]);
    setAutorizacaoVenda(null);
    setShowModal(true); 
  }} className="bg-[#000080] text-white px-10 py-6 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-3xl hover:bg-prylom-gold transition-all">
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

{/* LOCALIZAÇÃO - FILTRO (ESTADO E CIDADE EMPILHADOS) */}
<div className="flex flex-col gap-2">
  {/* ESTADO */}
  <select
    value={filters.estado}
    onChange={e => {
      setFilters(prev => ({
        ...prev,
        estado: e.target.value,
        cidade: '' 
      }));
    }}
    className="w-full py-2 px-3 bg-gray-50 rounded-lg outline-none font-bold text-prylom-dark border border-gray-200 focus:border-prylom-gold text-[11px]"
  >
    <option value="">Todos os Estados</option>
    {estados.map(uf => (
      <option key={uf.id} value={uf.sigla}>
        {uf.nome} ({uf.sigla})
      </option>
    ))}
  </select>

  {/* CIDADE */}
  <select
    value={filters.cidade}
    onChange={e => setFilters(prev => ({ ...prev, cidade: e.target.value }))}
    disabled={!filters.estado}
    className="w-full py-2 px-3 bg-gray-50 rounded-lg outline-none font-bold text-prylom-dark border border-gray-200 focus:border-prylom-gold text-[11px] disabled:opacity-50"
  >
    <option value="">Todos os Municípios</option>
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
    <th className="pb-6">Atualizado em</th>
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

<td className="py-8">
  <div className="flex flex-col">
    <span className="text-[10px] font-bold text-[#000080]">
      {formatDateBR(asset.updated_at)}
    </span>
    {daysSince(asset.updated_at) !== null && (
      <span className="text-[9px] text-prylom-gold font-medium">
        {daysSince(asset.updated_at) === 0 ? 'hoje' : `há ${daysSince(asset.updated_at)} dias`}
      </span>
    )}
  </div>
</td>
                               <td className="py-8 text-right">
                                <div className="flex justify-end gap-3">

{/* 👁️ VISUALIZAR */}
  <button
    onClick={() => {
      setViewingAsset(asset);
      setShowViewModal(true);
    }}
    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
    title="Visualizar Dossiê"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  </button>

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

{showCorretorModal && (
  <div 
    className="fixed inset-0 z-[3000] flex items-center justify-center p-6 backdrop-blur-xl bg-prylom-dark/80"
    onClick={() => setShowCorretorModal(false)} 
  >
    <div 
      className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-3xl animate-fadeIn"
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="mb-8">
        <span className="text-prylom-gold text-[9px] font-black uppercase tracking-[0.4em] block mb-1">Cadastro</span>
        <h3 className="text-3xl font-black text-[#000080] uppercase tracking-tighter">
          {isEditingCorretor ? 'Editar Corretor' : 'Novo Corretor Parceiro'}
        </h3>
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveCorretor(e);
        }} 
        className="grid grid-cols-2 gap-5"
      >
        
        {/* ÁREA DE UPLOAD DE FOTO */}
        <div 
          className="col-span-2 flex items-center gap-6 p-6 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 mb-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-20 h-20 rounded-full bg-white overflow-hidden border-2 border-[#000080] shrink-0 shadow-lg">
            {fotoFile ? (
              <img src={URL.createObjectURL(fotoFile)} className="w-full h-full object-cover" alt="Preview" />
            ) : newCorretor.foto_url ? (
              <img src={newCorretor.foto_url} className="w-full h-full object-cover" alt="Corretor" />
            ) : (
              <div className="flex items-center justify-center h-full text-[10px] font-black text-gray-300 uppercase">Sem Foto</div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[9px] font-black text-[#000080] uppercase tracking-widest">Foto do Perfil</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
              className="text-[9px] font-bold text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-[#000080] file:text-white hover:file:bg-prylom-gold cursor-pointer"
            />
          </div>
        </div>

        {/* NOME COMPLETO */}
        <div className="col-span-2 space-y-1" onClick={(e) => e.stopPropagation()}>
          <label className="text-[9px] font-black text-gray-400 uppercase px-1">Nome Completo</label>
          <input 
            required 
            autoComplete="off"
            value={newCorretor.nome} 
            onChange={e => setNewCorretor(prev => ({...prev, nome: e.target.value}))} 
            className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-prylom-gold font-bold text-prylom-dark" 
          />
        </div>

        {/* ESTADO */}
        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          <label className="text-[9px] font-black text-gray-400 uppercase px-1">Estado (UF)</label>
          <input 
            required 
            maxLength={2} 
            autoComplete="off"
            value={newCorretor.estado} 
            onChange={e => setNewCorretor(prev => ({...prev, estado: e.target.value.toUpperCase()}))} 
            className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-prylom-gold font-bold text-prylom-dark" 
            placeholder="Ex: MT" 
          />
        </div>

        {/* CRECI */}
        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          <label className="text-[9px] font-black text-gray-400 uppercase px-1">CRECI</label>
          <input 
            required 
            autoComplete="off"
            value={newCorretor.creci} 
            onChange={e => setNewCorretor(prev => ({...prev, creci: e.target.value}))} 
            className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-prylom-gold font-bold text-prylom-dark" 
          />
        </div>

        {/* TELEFONE */}
        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          <label className="text-[9px] font-black text-gray-400 uppercase px-1">Telefone</label>
          <input 
            required 
            autoComplete="off"
            value={newCorretor.telefone} 
            onChange={e => setNewCorretor(prev => ({...prev, telefone: e.target.value}))} 
            className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-prylom-gold font-bold text-prylom-dark" 
          />
        </div>

        {/* EMAIL */}
        <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
          <label className="text-[9px] font-black text-gray-400 uppercase px-1">E-mail</label>
          <input 
            required 
            type="email" 
            autoComplete="off"
            value={newCorretor.email} 
            onChange={e => setNewCorretor(prev => ({...prev, email: e.target.value}))} 
            className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-prylom-gold font-bold text-prylom-dark" 
          />
        </div>

        {/* CARGO - SELECT */}
<div className="col-span-2 space-y-1" onClick={(e) => e.stopPropagation()}>
  <label className="text-[9px] font-black text-gray-400 uppercase px-1">Cargo / Função</label>
  <select 
    required
    value={newCorretor.cargo} 
    onChange={e => setNewCorretor(prev => ({...prev, cargo: e.target.value}))} 
    className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-prylom-gold font-bold text-prylom-dark appearance-none"
  >
    <option value="" disabled>Selecione o cargo</option>
    <option value="Co-Broker">Co-Broker</option>
    <option value="Originador Estratégico">Originador Estratégico</option>
  </select>
</div>
{/* DESCRIÇÃO DO CORRETOR */}
<div className="col-span-2 space-y-1" onClick={(e) => e.stopPropagation()}>
  <label className="text-[9px] font-black text-gray-400 uppercase px-1">Breve Descrição / Bio</label>
  <textarea 
    value={newCorretor.descricao} 
    onChange={e => setNewCorretor(prev => ({...prev, descricao: e.target.value}))} 
    rows={3}
    placeholder="Conte um pouco sobre a experiência do corretor..."
    className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none border-2 border-transparent focus:border-prylom-gold font-bold text-prylom-dark resize-none" 
  />
</div>
        {/* BOTÕES DE AÇÃO */}
        <div className="col-span-2 flex gap-4 mt-6">
          <button 
            type="button" 
            onClick={() => {
               setShowCorretorModal(false);
               setFotoFile(null);
            }} 
            className="flex-1 py-5 font-black uppercase text-[10px] text-gray-400 hover:text-red-500 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="flex-[2] bg-prylom-dark text-white py-5 rounded-full font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:bg-prylom-gold transition-all disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar Cadastro'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
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
  <div className="flex justify-between items-end px-1">
    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">
      Descrição Comercial Detalhada (Priorize termos como: Estimado, Potencial, Aproximadamente)
    </label>
    
    <button
      type="button"
      onClick={handleImproveDescription}
      disabled={loadingAI}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
        loadingAI 
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
        : 'bg-prylom-gold/10 text-prylom-gold hover:bg-prylom-gold hover:text-white shadow-sm'
      }`}
    >
      <svg className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {loadingAI ? 'Processando...' : 'Melhorar com IA'}
    </button>
  </div>

  <textarea 
    value={newAsset.descricao} 
    onChange={e => setNewAsset({...newAsset, descricao: e.target.value})} 
    rows={5} 
    className="w-full py-4 px-6 bg-gray-50 rounded-2xl outline-none font-medium text-gray-600 border-2 border-transparent focus:border-prylom-gold transition-all no-scrollbar" 
    placeholder="Destaque logistica, solo, histórico e benfeitorias..." 
  />
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
<div className="md:col-span-3 space-y-3 bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">Localização do Ativo</label>
  
  <div className="space-y-3">
    {/* ESTADO - CADASTRO */}
    <select
      required
      value={newAsset.estado}
      onChange={e => {
        setNewAsset({
          ...newAsset,
          estado: e.target.value,
          cidade: '' 
        });
      }}
      className="w-full py-3 px-5 bg-white rounded-xl font-bold text-prylom-dark outline-none border-2 border-transparent focus:border-prylom-gold text-[12px] shadow-sm"
    >
      <option value="">Selecione o Estado</option>
      {estados.map(uf => (
        <option key={uf.id} value={uf.sigla}>
          {uf.nome} - {uf.sigla}
        </option>
      ))}
    </select>

    {/* CIDADE - CADASTRO */}
    <select
      required
      value={newAsset.cidade}
      onChange={e => setNewAsset({ ...newAsset, cidade: e.target.value })}
      disabled={!newAsset.estado}
      className="w-full py-3 px-5 bg-white rounded-xl font-bold text-prylom-dark outline-none border-2 border-transparent focus:border-prylom-gold text-[12px] shadow-sm disabled:bg-gray-100"
    >
      <option value="">Selecione o Município</option>
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

{/* SEÇÃO 3: DADOS TÉCNICOS */}
<div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
  {camposPorCategoria[newAsset.categoria].map(campo => {
    const options = SELECT_FIELDS[campo.key as keyof typeof SELECT_FIELDS];
    const isSelect = !!options;

    return (
      <React.Fragment key={campo.key}>
        {/* INSERÇÃO DE LINHAS DIVISORAS PRETAS */}
        {['proprietario', 'corretor', 'tipo_anuncio'].includes(campo.key) && (
          <div className="col-span-full mt-8 mb-4">
            <div className="flex items-center gap-4">
              <div className="h-[2px] flex-1 bg-prylom-dark"></div>
              <span className="text-[10px] font-black text-prylom-dark uppercase tracking-[0.3em]">
                {campo.key === 'proprietario' && "Dados de Origem / Proprietário"}
                {campo.key === 'corretor' && "Gestão de Parceria / Corretor"}
                {campo.key === 'tipo_anuncio' && "Configurações de Publicidade"}
              </span>
              <div className="h-[2px] w-10 bg-prylom-dark"></div>
            </div>
          </div>
        )}

        <div className={`space-y-2 ${campo.key === 'portal_parceiro' ? 'md:col-span-3 xl:col-span-4' : ''}`}>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-1">
            {campo.label} {campo.required ? '*' : ''}
          </label>

          {/* LÓGICA EXISTENTE DOS CAMPOS (CORRETOR, PORTAL, SELECT, INPUT) */}
          {campo.key === 'corretor' ? (
            <div className="relative">
              <select
                value={corretores.find(c => c.nome === dadosEspecificos.corretor)?.id || ''}
                onChange={(e) => handleSelectCorretor(e.target.value)}
                className="w-full h-[56px] py-4 px-6 bg-gray-100/50 rounded-2xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold appearance-none cursor-pointer text-[11px]"
              >
                <option value="">Sem Corretor Responsável</option>
                {corretores.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.creci})</option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          ) : ['telefone_corretor', 'email_corretor', 'estado_corretor', 'creci'].includes(campo.key) ? (
            <input
              type={campo.type}
              value={dadosEspecificos[campo.key] || ''}
              readOnly
              className="w-full h-[56px] py-4 px-6 bg-gray-50/30 rounded-2xl outline-none font-medium text-gray-400 border-2 border-dashed border-gray-200 text-[10px] cursor-not-allowed"
              tabIndex={-1}
            />
          ) : campo.key === 'portal_parceiro' ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {PORTAIS_OPTIONS.map(portal => {
                const isSelected = dadosEspecificos.portal_parceiro?.includes(portal);
                return (
                  <button
                    key={portal}
                    type="button"
                    onClick={() => togglePortalParceiro(portal)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-tight transition-all border-2 ${
                      isSelected ? 'bg-prylom-gold border-prylom-gold text-white shadow-md' : 'bg-gray-100/50 border-transparent text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {portal}
                  </button>
                );
              })}
            </div>
          ) : isSelect ? (
            <div className="relative">
              <select
                required={campo.required}
                value={dadosEspecificos[campo.key] || ''}
                onChange={e => setDadosEspecificos({ ...dadosEspecificos, [campo.key]: e.target.value })}
                className="w-full h-[56px] py-4 px-6 bg-gray-100/50 rounded-2xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold appearance-none cursor-pointer"
              >
                <option value=""></option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
              onChange={e => setDadosEspecificos({ ...dadosEspecificos, [campo.key]: e.target.value })}
              className="w-full h-[56px] py-4 px-6 bg-gray-100/50 rounded-2xl outline-none font-bold text-prylom-dark border-2 border-transparent focus:border-prylom-gold transition-all"
            />
          )}
        </div>
      </React.Fragment>
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
    <div 
      key={index}
      draggable
      onDragStart={() => handleDragStart(index)}
      onDragOver={(e) => handleDragOver(e, index)}
      onDragEnd={() => setDraggedIndex(null)}
      className={`relative aspect-square bg-gray-100 rounded-3xl overflow-hidden group border-2 transition-all cursor-move
        ${draggedIndex === index ? 'opacity-30 scale-95' : 'opacity-100'}
        ${index === 0 ? 'border-prylom-gold shadow-xl' : 'border-transparent hover:border-gray-300'}`}
    >
      <img src={img.url} className="w-full h-full object-cover pointer-events-none" alt="" />
      
      {/* Botão flutuante: Tornar Destaque */}
      {index !== 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setAsMainImage(index); }}
          className="absolute top-2 left-2 w-7 h-7 bg-white/90 text-prylom-dark hover:bg-prylom-gold hover:text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all z-20"
          title="Tornar capa"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      )}

      {/* Selo fixo na capa */}
      {index === 0 && (
        <div className="absolute top-2 left-2 bg-prylom-gold text-white text-[7px] font-black uppercase px-2 py-1 rounded-full shadow-lg z-20">
          Capa do Ativo
        </div>
      )}

      {/* Overlay de Deleção */}
      <button 
        type="button" 
        onClick={() => removeImage(index)}
        className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      {/* Indicador de Ordem */}
      <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm py-1">
        <p className="text-[7px] font-black text-white uppercase text-center">Posição {index + 1}</p>
      </div>
    </div>
  ))}

  {/* Botão de Adicionar (mantido seu estilo original) */}
  <button 
    type="button" 
    onClick={() => fileInputRef.current?.click()}
    className="aspect-square flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-prylom-gold hover:text-prylom-gold transition-all bg-gray-50/30"
  >
    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
    <span className="text-[9px] font-black uppercase tracking-widest text-center">Adicionar</span>
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

{/* SEÇÃO AUTORIZAÇÃO DE VENDA - CORRIGIDA */}
{newAsset.categoria === 'fazendas' && (
  <div className="mb-8 p-6 bg-prylom-gold/5 border-2 border-dashed border-prylom-gold/30 rounded-[2.5rem]">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h4 className="text-[11px] font-black text-prylom-dark uppercase tracking-widest">🛡️ Autorização de Venda</h4>
        <p className="text-[9px] text-gray-400 font-bold uppercase">Documento obrigatório de exclusividade</p>
      </div>
      
      {/* Botão sempre visível para permitir troca de arquivo */}
      <button 
        type="button" 
        onClick={() => authFileInputRef.current?.click()}
        className="bg-prylom-dark text-white px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-prylom-gold transition-all"
      >
        {autorizacaoVenda ? 'Substituir Arquivo' : 'Anexar Autorização'}
      </button>
    </div>

    {/* EXIBIÇÃO DO STATUS DO ARQUIVO */}
    {autorizacaoVenda ? (
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-prylom-gold/20 animate-fadeIn">
        <div className="w-10 h-10 bg-prylom-gold/10 rounded-xl flex items-center justify-center text-prylom-gold">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-[10px] font-black text-prylom-dark truncate uppercase">
            {autorizacaoVenda.isExisting ? "✅ DOCUMENTO JÁ VINCULADO NO SISTEMA" : (autorizacaoVenda.file?.name || "ARQUIVO SELECIONADO")}
          </p>
          <p className="text-[8px] text-green-600 font-bold uppercase italic">Status: Validado no Dossiê</p>
        </div>
        <button type="button" onClick={() => setAutorizacaoVenda(null)} className="text-red-400 hover:text-red-600 transition-colors">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6" /></svg>
        </button>
      </div>
    ) : (
      <div className="py-4 text-center border border-dashed border-gray-200 rounded-2xl">
        <p className="text-[9px] text-gray-400 font-bold uppercase italic">Nenhum documento de autorização anexado no momento</p>
      </div>
    )}
    
    <input 
      type="file" 
      ref={authFileInputRef} 
      className="hidden" 
      onChange={handleAuthSelect} 
      accept=".pdf,.jpg,.png" 
    />
  </div>
)}
{/* --- FIM DO BLOCO --- */}
    
    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center">
      PDF, Word, JPG/PNG. Matrícula, CAR, CCIR, Laudos, Contratos...
    </p>
  </div>
)}


              {/* SEÇÃO 5: CONFIGURAÇÕES DE VISIBILIDADE E AUDITORIA */}
              <div className="pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
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
      
      
{/* MODAL VIEW (DOSSIÊ COMPLETO) */}
{showViewModal && viewingAsset && (
  <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 md:p-6 backdrop-blur-2xl bg-prylom-dark/90">
    <div className="bg-white w-full max-w-6xl rounded-[3rem] md:rounded-[4rem] p-8 md:p-12 shadow-3xl relative overflow-y-auto max-h-[95vh] no-scrollbar border border-white/20">
      
      {/* HEADER */}
      <header className="flex justify-between items-start mb-10 border-b border-gray-100 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-prylom-gold text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Dossiê de Inteligência</span>
            <span className="text-gray-400 text-[9px] font-black uppercase tracking-widest">Cod: {viewingAsset.codigo || 'S/COD'}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-[#000080] tracking-tighter uppercase mb-2">{viewingAsset.titulo}</h2>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">{viewingAsset.cidade} - {viewingAsset.estado} | {viewingAsset.categoria}</p>
        </div>
        <button onClick={() => setShowViewModal(false)} className="bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 p-4 rounded-full transition-all group">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* COLUNA 1: DADOS COMERCIAIS E TÉCNICOS */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* CARDS DE DESTAQUE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#000080] p-6 rounded-[2rem] text-white shadow-xl">
              <p className="text-[8px] font-black uppercase opacity-60 mb-1 tracking-[0.2em]">Valor de Oferta</p>
              <p className="text-2xl font-black tracking-tighter">{formatPrice(viewingAsset.valor)}</p>
            </div>
            <div className="bg-prylom-dark p-6 rounded-[2rem] text-white shadow-xl">
              <p className="text-[8px] font-black uppercase opacity-60 mb-1 tracking-[0.2em]">Área Total</p>
              <p className="text-2xl font-black tracking-tighter">{viewingAsset.fazendas?.area_total_ha || '---'} <span className="text-xs">ha</span></p>
            </div>
            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
              <p className="text-[8px] font-black text-prylom-gold uppercase mb-1 tracking-[0.2em]">Valor por Hectare</p>
              <p className="text-2xl font-black text-prylom-dark tracking-tighter">
                {viewingAsset.valor && viewingAsset.fazendas?.area_total_ha 
                  ? formatPrice(viewingAsset.valor / viewingAsset.fazendas.area_total_ha) 
                  : '---'}
              </p>
            </div>
          </div>

{/* DESCRIÇÃO - COMPACTA, CINZA E EM ITÁLICO */}

<section className="animate-fadeIn">
  <h4 className="text-[9px] font-black text-prylom-dark uppercase tracking-[0.3em] mb-2 border-l-2 border-prylom-gold pl-2">
    Apresentação do Ativo
  </h4>
  <div className="bg-gray-50/40 p-4 rounded-[1.5rem] border border-gray-100/60 shadow-sm">
    <p 
      className="text-gray-400 leading-tight italic text-[11px] md:text-[12px] text-justify tracking-tight"
      style={{ whiteSpace: 'pre-wrap' }}
    >
      "{viewingAsset.descricao || 'Nenhuma descrição detalhada disponível.'}"
    </p>
  </div>
</section>

{/* ESPECIFICAÇÕES TÉCNICAS (DINÂMICAS) */}
<section>
  <h4 className="text-[11px] font-black text-prylom-dark uppercase tracking-[0.3em] mb-6">Especificações Técnicas</h4>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 bg-gray-50 p-8 rounded-[2.5rem]">
    {camposPorCategoria[viewingAsset.categoria]
      .filter((c: any) => !['proprietario', 'corretor', 'portal_parceiro', 'telefone_corretor', 'email_corretor', 'telefone_proprietario', 'email_proprietario'].includes(c.key))
      .map((campo: any) => {
        // Pegamos o valor original do banco
        const valor = viewingAsset.fazendas?.[campo.key];
        
        return (
          <div key={campo.key} className="border-b border-gray-200 pb-2">
            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">{campo.label}</p>
            <p className="text-xs font-bold text-prylom-dark">
              {valor ? (
                // Se for o campo de km_asfalto, concatena o 'km'
                campo.key === 'km_asfalto' ? `${valor} km` : valor
              ) : '---'}
            </p>
          </div>
        );
      })}
  </div>
</section>
        </div>

        {/* COLUNA 2: RESPONSÁVEIS, PORTAIS E ANEXOS */}
        <div className="space-y-8">
          
          {/* GALERIA DE IMAGENS */}
          <section>
            <h4 className="text-[10px] font-black text-prylom-dark uppercase tracking-[0.3em] mb-4">Evidências Visuais</h4>
            <div className="grid grid-cols-2 gap-3">
              {viewingAsset.produtos_imagens?.length > 0 ? viewingAsset.produtos_imagens.map((img: any, i: number) => (
                <a key={i} href={img.image_url} target="_blank" rel="noreferrer" className="aspect-square rounded-2xl overflow-hidden border border-gray-100 hover:ring-2 ring-prylom-gold transition-all shadow-sm">
                  <img src={img.image_url} className="w-full h-full object-cover" alt="" />
                </a>
              )) : <div className="col-span-2 py-10 bg-gray-50 rounded-2xl text-center text-[10px] font-bold text-gray-400 uppercase">Sem fotos</div>}
            </div>
          </section>

          {/* DOCUMENTOS PARA DOWNLOAD */}
{/* DOCUMENTOS PARA DOWNLOAD - FILTRADO PARA NÃO MOSTRAR A AUTORIZAÇÃO DUPLICADA */}
<section>
  <h4 className="text-[10px] font-black text-prylom-dark uppercase tracking-[0.3em] mb-4">Documentação Técnica</h4>
  <div className="space-y-2">
    {/* Adicionamos o .filter para pegar apenas documentos onde autorizacao NÃO é 1 */}
    {viewingAsset.documentos_fazenda?.filter((d: any) => Number(d.autorizacao) !== 1).length > 0 ? (
      viewingAsset.documentos_fazenda
        .filter((d: any) => Number(d.autorizacao) !== 1) // Remove a autorização desta lista
        .map((doc: any, i: number) => (
          <a key={i} href={doc.documento_url} download target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-gray-50 hover:bg-[#000080] hover:text-white rounded-2xl border border-gray-100 transition-all group">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-prylom-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="text-[10px] font-black uppercase tracking-wider">Documento Anexo {i + 1}</span>
            </div>
            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </a>
        ))
    ) : (
      <p className="text-[10px] text-gray-400 italic">Nenhum documento técnico anexado.</p>
    )}
  </div>
</section>

{/* EXIBIÇÃO EXCLUSIVA DA AUTORIZAÇÃO NO DOSSIÊ */}
<section className="mb-6 mt-8">
  <h4 className="text-[10px] font-black text-prylom-dark uppercase tracking-[0.3em] mb-4">Documento de Origem</h4>
  {viewingAsset.documentos_fazenda?.find((d: any) => Number(d.autorizacao) === 1) ? (
    <a 
      href={viewingAsset.documentos_fazenda.find((d: any) => Number(d.autorizacao) === 1).documento_url} 
      target="_blank" rel="noreferrer"
      className="flex items-center gap-4 p-5 bg-green-50 border-2 border-green-500 rounded-[2rem] hover:bg-green-500 hover:text-white transition-all group shadow-lg"
    >
      {/* Ícone de Sinal de Segurança/Escudo */}
      <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-green-500 transition-colors">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest">Autorização de Venda</p>
        <p className="text-[8px] font-bold opacity-60 uppercase italic">Documento Verificado & Seguro</p>
      </div>
      <div className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
    </a>
  ) : (
    <div className="p-5 border-2 border-dashed border-red-200 rounded-[2rem] text-center text-[10px] font-black text-red-400 uppercase">
      ⚠️ Autorização pendente ou não anexada
    </div>
  )}
</section>

{/* CORRETOR NO DOSSIÊ - CORRIGIDO */}
<section className="bg-prylom-dark p-8 rounded-[2.5rem] text-white shadow-2xl border border-white/5">
  <h4 className="text-[9px] font-black text-prylom-gold uppercase tracking-[0.2em] mb-5">
    Corretor Responsável
  </h4>
  
  {/* Ajuste do caminho: acessando o objeto 'corretores' vindo do join */}
  <p className="text-xl font-black uppercase mb-4 tracking-tighter">
    {viewingAsset.fazendas?.corretores?.nome || 'Sem corretor vinculado'}
  </p>

  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-4">
      <div>
        <p className="text-[8px] text-prylom-gold font-black uppercase mb-1">Creci</p>
        <p className="text-[11px] font-bold">
          {viewingAsset.fazendas?.corretores?.estado || 'UF'} - {viewingAsset.fazendas?.corretores?.creci || '---'}
        </p>
      </div>
      <div>
        <p className="text-[8px] text-prylom-gold font-black uppercase mb-1">Contato</p>
        <p className="text-[11px] font-bold">
          {viewingAsset.fazendas?.corretores?.telefone || '---'}
        </p>
      </div>
    </div>

    <div className="group cursor-pointer" 
         onClick={() => {
           if(viewingAsset.fazendas?.corretores?.email) {
             navigator.clipboard.writeText(viewingAsset.fazendas.corretores.email);
             alert('E-mail copiado!');
           }
         }}
    >
      <p className="text-[8px] text-prylom-gold font-black uppercase mb-1 flex justify-between">
        E-mail 
        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[7px] text-white bg-white/10 px-2 py-0.5 rounded">Clique para copiar</span>
      </p>
      <p className="text-[11px] font-bold break-all lowercase underline underline-offset-4 decoration-prylom-gold/30">
        {viewingAsset.fazendas?.corretores?.email || 'Não informado'}
      </p>
    </div>
  </div>
</section>

          {/* PORTAIS */}
          <section>
            <h4 className="text-[10px] font-black text-prylom-dark uppercase tracking-[0.3em] mb-4">Portais de Veiculação</h4>
            <div className="flex flex-wrap gap-2">
              {(() => {
                let portais = viewingAsset.fazendas?.portal_parceiro;
                if (typeof portais === 'string') try { portais = JSON.parse(portais); } catch (e) { portais = []; }
                if (!Array.isArray(portais) || portais.length === 0) return <span className="text-gray-400 text-xs italic">Nenhum portal.</span>;
                return portais.map((p: string) => (
                  <span key={p} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-[9px] font-black uppercase">{p}</span>
                ));
              })()}
            </div>
          </section>

        </div>
      </div>

      <footer className="mt-12 pt-8 border-t border-gray-100 flex gap-4 justify-end">
        <button onClick={() => setShowViewModal(false)} className="bg-prylom-dark text-white font-black px-12 py-5 rounded-full text-[10px] uppercase tracking-widest hover:bg-[#000080] transition-all shadow-2xl">
          Fechar Dossiê
        </button>
      </footer>
    </div>
  </div>
)}            



{/* MODAL DE CORRETOR - POSICIONADO FORA DAS ABAS PARA EVITAR CONFLITOS */}



{showViewCadastrado && viewingCadastrado && (
  <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 backdrop-blur-2xl bg-prylom-dark/95">
    <div className="bg-white w-full max-w-7xl rounded-[4rem] p-12 shadow-3xl relative overflow-y-auto max-h-[95vh] no-scrollbar">
      <header className="flex justify-between items-start mb-12 border-b border-gray-100 pb-8">
        <div>
          <span className="bg-prylom-gold text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 inline-block">Dossiê de Origem Completo</span>
          <h2 className="text-5xl font-black text-[#000080] tracking-tighter uppercase">{viewingCadastrado.nome_propriedade}</h2>
          <p className="text-gray-400 font-bold uppercase text-xs mt-2 tracking-[0.3em]">{viewingCadastrado.localizacao_municipio} | {viewingCadastrado.aptidao}</p>
        </div>
        <button onClick={() => setShowViewCadastrado(false)} className="bg-gray-100 text-gray-400 p-4 rounded-full hover:bg-red-50 hover:text-red-500 transition-all">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* PROPRIETÁRIO E ORIGEM */}
        <div className="space-y-8 bg-gray-50 p-8 rounded-[3rem] border border-gray-100">
          <h4 className="text-[11px] font-black text-prylom-gold uppercase tracking-widest border-b border-prylom-gold/20 pb-4">👤 Dados do Proprietário</h4>
          <div className="space-y-4">
            <div><p className="text-[8px] font-black text-gray-400 uppercase">Nome</p><p className="text-sm font-bold text-prylom-dark uppercase">{viewingCadastrado.nome_proprietario}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[8px] font-black text-gray-400 uppercase">WhatsApp</p><p className="text-sm font-bold text-prylom-dark">{viewingCadastrado.telefone_whats}</p></div>
              <div><p className="text-[8px] font-black text-gray-400 uppercase">CPF/CNPJ</p><p className="text-sm font-bold text-prylom-dark">{viewingCadastrado.cpf_cnpj}</p></div>
            </div>
            <div><p className="text-[8px] font-black text-gray-400 uppercase">E-mail</p><p className="text-sm font-bold text-prylom-dark">{viewingCadastrado.email}</p></div>
            <div><p className="text-[8px] font-black text-gray-400 uppercase">Profissão</p><p className="text-sm font-bold text-prylom-dark uppercase">{viewingCadastrado.profissao_atividade}</p></div>
            <div className="pt-4 border-t border-gray-200">
               <p className="text-[8px] font-black text-prylom-gold uppercase">Origem/Interesse</p>
               <p className="text-xs font-bold text-gray-600 italic">"{viewingCadastrado.origem_interesse}"</p>
            </div>
          </div>
        </div>

        {/* DADOS TÉCNICOS */}
        <div className="lg:col-span-2 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="bg-[#000080] p-6 rounded-3xl text-white shadow-xl"><p className="text-[8px] font-black uppercase opacity-60">Área Total</p><p className="text-2xl font-black">{viewingCadastrado.area_total_hectares} ha</p></div>
             <div className="bg-prylom-dark p-6 rounded-3xl text-white shadow-xl"><p className="text-[8px] font-black uppercase opacity-60">Produção</p><p className="text-2xl font-black">{viewingCadastrado.area_producao_atual} ha</p></div>
             <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200"><p className="text-[8px] font-black text-prylom-gold">Teor Argila</p><p className="text-2xl font-black">{viewingCadastrado.teor_argila}</p></div>
             <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200"><p className="text-[8px] font-black text-prylom-gold">Valor/ha</p><p className="text-2xl font-black text-prylom-dark">{viewingCadastrado.valor_por_hectare}</p></div>
          </div>

          <div className="grid grid-cols-2 gap-y-8 gap-x-12 bg-gray-50/50 p-10 rounded-[3rem]">
             {[
               { l: "Topografia", v: viewingCadastrado.topografia },
               { l: "Reserva Legal", v: viewingCadastrado.reserva_legal },
               { l: "Altitude", v: viewingCadastrado.altitudetext || viewingCadastrado.altitude },
               { l: "Índice Pluviométrico", v: viewingCadastrado.indice_pluviometrico },
               { l: "Vínculo Ativo", v: viewingCadastrado.vinculo_ativotext || viewingCadastrado.vinculo_ativo },
               { l: "Tipo Anúncio", v: viewingCadastrado.tipo_anuncio },
               { l: "Inventário Concluído", v: viewingCadastrado.inventario_concluido },
               { l: "Procuração", v: viewingCadastrado.procuracao }
             ].map(f => (
               <div key={f.l} className="border-b border-gray-200 pb-2">
                 <p className="text-[8px] font-black text-gray-400 uppercase mb-1">{f.l}</p>
                 <p className="text-[13px] font-bold text-prylom-dark uppercase">{f.v || '---'}</p>
               </div>
             ))}
          </div>
          
          <div className="bg-[#000080]/5 p-8 rounded-[2rem] border border-[#000080]/10">
             <h4 className="text-[10px] font-black text-[#000080] uppercase mb-4 tracking-widest">Observações e Descritivo</h4>
             <p className="text-xs text-gray-600 leading-relaxed mb-4 italic">"{viewingCadastrado.descricao_detalhada}"</p>
             <div className="h-px bg-gray-200 my-4"></div>
             <p className="text-[11px] font-medium text-gray-500"><strong>Notas Internas:</strong> {viewingCadastrado.observacoes}</p>
          </div>
        </div>
      </div>

      <footer className="mt-16 pt-12 border-t border-gray-100 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section>
          <h4 className="text-[11px] font-black text-[#000080] uppercase tracking-widest mb-6">🖼️ Fotos do Cadastro</h4>
          <div className="grid grid-cols-4 gap-4">
            {viewingCadastrado.cadastrados_imagens?.map((img: any, i: number) => (
              <a key={i} href={img.image_url} target="_blank" className="aspect-square rounded-2xl overflow-hidden shadow-md border border-gray-100"><img src={img.image_url} className="w-full h-full object-cover" alt="" /></a>
            ))}
          </div>
        </section>
        <section>
          <h4 className="text-[11px] font-black text-[#000080] uppercase tracking-widest mb-6">📄 Documentos Recebidos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {viewingCadastrado.documentos_cadastro?.map((doc: any, i: number) => (
              <a key={i} href={doc.documento_url} target="_blank" className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-prylom-gold hover:text-white transition-all group">
                <svg className="w-5 h-5 text-prylom-gold group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-[10px] font-black uppercase truncate">Documento {i + 1}</span>
              </a>
            ))}
          </div>
        </section>
      </footer>
    </div>
  </div>
)}
    </div>    
  );
};

export default AdminDashboard;
