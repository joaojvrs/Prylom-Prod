import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import logoPrylom from "../assets/logo-prylom.png";

interface FormProps {
  type: 'open' | 'offmarket' | 'selected';
  onBack: () => void;
}

const PropertyRegistrationForm: React.FC<FormProps> = ({ type, onBack }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentAssetId, setCurrentAssetId] = useState<string | null>(null);

  const [estados, setEstados] = useState<{ id: number; sigla: string; nome: string }[]>([]);
const [cidadesCadastro, setCidadesCadastro] = useState<{ id: number; nome: string }[]>([]);

const [selectedModality, setSelectedModality] = useState<'off' | 'open' | null>(null);
const [selectedTerms, setSelectedTerms] = useState({
  exclusividade: false,
  valuation: false,
  custos: false,
  semCusto: false,
  laudosGratis: false,
  regularizacao: false,
  concordoGeral: false
});

const isSelected = type === 'selected';

// Mapeamento de estilos para reuso
const theme = {
  // Cores de Fundo da Tela e Cards
  bgPage: isSelected ? 'bg-[#121212]' : 'bg-gray-50', // Cinza escuro harmonioso
  bgCard: isSelected ? 'bg-black border-prylom-gold/20' : 'bg-white border-gray-100',
  bgInput: isSelected ? 'bg-[#1A1A1A] text-white border-prylom-gold/10' : 'bg-gray-50 text-prylom-dark',
  
  // Cores de Texto e Rótulos
  textLabel: isSelected ? 'text-prylom-gold' : 'text-[#2C5266]',
  textHeader: isSelected ? 'text-prylom-gold' : 'text-white',
  textInput: isSelected ? 'placeholder:text-gray-600 text-prylom-gold' : 'text-prylom-dark',
  
  // Cabeçalho e Botões
  bgHeader: isSelected ? 'bg-black border-b border-prylom-gold/30' : 'bg-[#2C5266]'
};
// Estado interno para controlar o estado selecionado antes de salvar no formData
const [estadoSelecionado, setEstadoSelecionado] = useState('');

// Busca estados ao carregar
useEffect(() => {
  const fetchEstados = async () => {
    try {
      const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
      const data = await res.json();
      setEstados(data);
    } catch (err) {
      console.error('Erro ao buscar estados:', err);
    }
  };
  fetchEstados();
}, []);

// Busca cidades sempre que o estado no formulário mudar
useEffect(() => {
  if (!estadoSelecionado) {
    setCidadesCadastro([]);
    return;
  }
  const fetchCidades = async () => {
    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoSelecionado}/municipios`);
      const data = await res.json();
      setCidadesCadastro(data);
    } catch (err) {
      console.error('Erro ao buscar cidades:', err);
    }
  };
  fetchCidades();
}, [estadoSelecionado]);

  // ESTADO UNIFICADO PARA TODAS AS ETAPAS
  const [formData, setFormData] = useState({
    // Etapa 2: Proprietário
    nome_proprietario: '',
    telefone_whats: '',
    cpf_cnpj: '',
    email: '',
    profissao_atividade: '',
    vinculo_ativo: '',
    origem_interesse: '',
    observacoes: '',
    inventario_concluido: '',
    procuracao: '',
    declaracao_veracidade: false,
    aceite_lgpd: false, // Adicionado
    aceite_honorarios: false, // Adicionado
    // Etapa 3: Dados Técnicos
    nome_propriedade: '',
    aptidao: '',
    localizacao_municipio: '',
    teor_argila: '',
    topografia: '',
    area_total_hectares: '',
    area_producao_atual: '',
    reserva_legal: '',
    altitude: '',
    indice_pluviometrico: '',
    tipo_negociacao: '',
    valor_por_hectare: '',
    descricao_detalhada: '',
    suporte_juridico:'',
  distancia_asfalto: '',
  condicao_venda: '',
    tipo_anuncio: type
  });

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  const { name, value, type: inputType } = e.target;
  let val: any = inputType === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

  if (typeof val === "string") {
    // Máscara de MOEDA (R$)
    if (name === "valor_por_hectare") {
      val = formatCurrency(val); // Aquela função que fizemos antes
    } 
    
    // Máscara de HECTARES (Número com pontuação)
    if (name === "area_total_hectares" || name === "area_producao_atual") {
      val = formatHectares(val);
    }
  }

  setFormData(prev => ({ ...prev, [name]: val }));
};

  // Função para renderizar a Badge de Seleção no cabeçalho
const renderSelectedBadge = () => {
  if (!isSelected || !selectedModality) return null;
  
  return (
    <div className="flex items-center bg-[#1A1A1A] rounded-full p-1 border border-prylom-gold/30 shadow-inner mb-4 inline-flex">
      <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase transition-all ${selectedModality === 'open' ? 'bg-prylom-gold text-black shadow-lg' : 'text-gray-500'}`}>
        Open Market
      </span>
      <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase transition-all ${selectedModality === 'off' ? 'bg-[#37474F] text-prylom-gold shadow-lg' : 'text-gray-500'}`}>
        Off Market
      </span>
    </div>
  );
};

const VoiceTranscriptionButton: React.FC<{ 
  onTranscript: (text: string) => void, 
  theme: any,
  currentValue: string 
}> = ({ onTranscript, theme, currentValue }) => {
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Concatena com o que já existe ou define novo
      onTranscript(currentValue ? `${currentValue} ${transcript}` : transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={startListening}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all active:scale-95 ${
        isListening 
          ? 'bg-red-500 text-white animate-pulse' 
          : `${theme.bgInput} border border-prylom-gold/20 text-[9px] font-black uppercase tracking-widest ${theme.textLabel}`
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-white' : 'bg-prylom-gold'}`} />
      {isListening ? 'Ouvindo...' : '🎙️ Transcrever Áudio'}
    </button>
  );
};



  // Refs para os inputs de arquivos escondidos
const fileRefs = {
  matricula: useRef<HTMLInputElement>(null),
  solo: useRef<HTMLInputElement>(null),
  car: useRef<HTMLInputElement>(null),
  mapa: useRef<HTMLInputElement>(null),
  geo: useRef<HTMLInputElement>(null),
  memorial: useRef<HTMLInputElement>(null),
  ccir: useRef<HTMLInputElement>(null),
  fotos: useRef<HTMLInputElement>(null),
};

// Estado para armazenar os arquivos selecionados localmente antes do upload final
const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({
  matricula: null,
  solo: null,
  car: null,
  mapa: null,
  geo: null,
  memorial: null,
  ccir: null,
  fotos: [],
});

const [suporteJuridico, setSuporteJuridico] = useState(false);

 const handleSaveStep2 = async () => {
  if (!formData.declaracao_veracidade || !formData.aceite_lgpd || !formData.aceite_honorarios) {
    alert("Para prosseguir, você deve aceitar todos os termos e declarações.");
    return;
  }
  
  setLoading(true);
  const finalType = isSelected ? `selected_${selectedModality}` : type;

  const payload = {
    nome_proprietario: formData.nome_proprietario,
    telefone_whats: formData.telefone_whats,
    cpf_cnpj: formData.cpf_cnpj,
    email: formData.email,
    profissao_atividade: formData.profissao_atividade,
    vinculo_ativo: formData.vinculo_ativo,
    origem_interesse: formData.origem_interesse,
    observacoes: formData.observacoes,
    inventario_concluido: formData.vinculo_ativo === 'Sucessor' ? formData.inventario_concluido : null,
    procuracao: formData.vinculo_ativo === 'Representante' ? formData.procuracao : null,
    tipo_anuncio: finalType
  };

  try {
    let result;

    if (currentAssetId) {
      // Se já existe um ID, usamos UPDATE para evitar duplicar o registro ao navegar
      result = await supabase
        .from('ativos_cadastro')
        .update(payload)
        .eq('id', currentAssetId)
        .select();
    } else {
      // Primeira vez salvando, usamos INSERT
      result = await supabase
        .from('ativos_cadastro')
        .insert([payload])
        .select();
    }

    if (result.error) throw result.error;
    if (result.data) setCurrentAssetId(result.data[0].id);
    
    setStep(3);
  } catch (error: any) {
    alert('Erro ao processar dados do proprietário: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  // ATUALIZAR ETAPA 3 (FINALIZAR)
  const handleFinalizeStep3 = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('ativos_cadastro')
        .update({
          nome_propriedade: formData.nome_propriedade,
          aptidao: formData.aptidao,
          localizacao_municipio: formData.localizacao_municipio,
          teor_argila: formData.teor_argila,
          topografia: formData.topografia,
          area_total_hectares: formData.area_total_hectares,
          area_producao_atual: formData.area_producao_atual,
          reserva_legal: formData.reserva_legal,
          altitude: formData.altitude,
          indice_pluviometrico: formData.indice_pluviometrico,
          distancia_asfalto: formData.distancia_asfalto, 
          condicao_venda: formData.condicao_venda,
          tipo_negociacao: formData.tipo_negociacao,
          valor_por_hectare: formData.valor_por_hectare,
          descricao_detalhada: formData.descricao_detalhada,
          suporte_juridico: formData.suporte_juridico
        })
        .eq('id', currentAssetId);

      if (error) throw error;
      onBack();
    } catch (error: any) {
      alert('Erro ao salvar dados técnicos: ' + error.message);
    } 
  };

const handleFinalizeRegistration = async () => {
  setLoading(true);
  try {
    // 1. Atualiza os dados técnicos (ativos_cadastro)
    const { error: updateError } = await supabase
      .from('ativos_cadastro')
      .update({
        nome_propriedade: formData.nome_propriedade,
        aptidao: formData.aptidao,
        localizacao_municipio: formData.localizacao_municipio,
        teor_argila: formData.teor_argila,
        topografia: formData.topografia,
        area_total_hectares: formData.area_total_hectares,
        area_producao_atual: formData.area_producao_atual,
        reserva_legal: formData.reserva_legal,
        altitude: formData.altitude,
        indice_pluviometrico: formData.indice_pluviometrico,
        tipo_negociacao: formData.tipo_negociacao,
        valor_por_hectare: formData.valor_por_hectare,
        descricao_detalhada: formData.descricao_detalhada
      })
      .eq('id', currentAssetId);

    if (updateError) throw updateError;

    // 2. Loop principal de arquivos (Documentos + Galeria de Fotos)
    const uploadPromises = Object.entries(selectedFiles).map(async ([tipo, data]) => {
      if (!data || (Array.isArray(data) && data.length === 0)) return;

      if (tipo === 'fotos' && Array.isArray(data)) {
        // --- TRATAMENTO PARA MÚLTIPLAS FOTOS ---
        const fotoPromises = data.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${currentAssetId}/foto_${index}_${Date.now()}.${fileExt}`;

          // Upload para o storage "produtos"
          const { error: storageError } = await supabase.storage
            .from('produtos')
            .upload(fileName, file);

          if (storageError) throw storageError;

          const { data: { publicUrl } } = supabase.storage.from('produtos').getPublicUrl(fileName);

          // Salva na tabela iduuid com a ordem correta
const { error: dbImgError } = await supabase
            .from('cadastrados_imagens') 
            .insert([{
              cadastro_id: currentAssetId, // ID do ativo
              image_url: publicUrl,           // Link da imagem
              ordem: index                    // Posição na galeria
            }]);

          if (dbImgError) throw dbImgError;
        });
        
        return Promise.all(fotoPromises);

      } else if (!Array.isArray(data)) {
        // --- TRATAMENTO PARA DOCUMENTOS ÚNICOS ---
        const file = data as File;
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentAssetId}/${tipo}_${Date.now()}.${fileExt}`;

        const { error: storageError } = await supabase.storage
          .from('documentos_fazenda')
          .upload(fileName, file);

        if (storageError) throw storageError;

        const { data: { publicUrl } } = supabase.storage.from('documentos_fazenda').getPublicUrl(fileName);

        const { error: dbDocError } = await supabase
          .from('documentos_cadastro')
          .insert([{
            cadastro_id: currentAssetId,
            documento_url: publicUrl,
            tipo_documento: tipo,
            suporte_juridico: suporteJuridico
          }]);

        if (dbDocError) throw dbDocError;
      }
    });

    await Promise.all(uploadPromises);
    setStep(5);
  } catch (error: any) {
    console.error(error);
    alert('Erro ao finalizar cadastro: ' + error.message);
  } finally {
    setLoading(false);
  }
};

const formatCurrency = (value: string) => {
  // Remove tudo que não é número
  const digits = value.replace(/\D/g, "");
  
  // Converte para decimal (ex: 1500 vira 15.00)
  const amount = (Number(digits) / 100).toFixed(2);
  
  // Formata para o padrão brasileiro
  return amount.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const formatHectares = (value: string) => {
  // Remove tudo que não é dígito ou vírgula
  let cleanValue = value.replace(/[^\d,]/g, "");

  // Garante que só exista uma vírgula
  const parts = cleanValue.split(",");
  if (parts.length > 2) {
    cleanValue = parts[0] + "," + parts.slice(1).join("");
  }

  // Formata a parte antes da vírgula com pontos de milhar
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return parts.length > 1 ? `${parts[0]},${parts[1]}` : parts[0];
};


const BackButton = ({ toStep }: { toStep: number }) => (
  <button
    onClick={() => setStep(toStep)}
    className={`
      flex items-center gap-3 px-8 py-4 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all duration-300 active:scale-95 border-2
      ${isSelected
        ? 'bg-black border-prylom-gold/40 text-prylom-gold hover:bg-prylom-gold hover:text-black shadow-[0_0_15px_rgba(212,175,55,0.1)]'
        : 'bg-[#2C5266] border-[#2C5266] text-white hover:bg-white hover:text-[#2C5266] shadow-[0_4px_14px_0_rgba(44,82,102,0.39)]'}
    `}
  >
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
    </svg>
    Voltar
  </button>
);

  // Validação da Etapa 2 (Proprietário)
const validateStep2 = () => {
  const { nome_proprietario, telefone_whats, cpf_cnpj, vinculo_ativo, aceite_lgpd, aceite_honorarios, declaracao_veracidade } = formData;
  if (!nome_proprietario || !telefone_whats || !cpf_cnpj || !vinculo_ativo) {
    alert("Preencha todos os dados de identificação do proprietário.");
    return false;
  }
  if (!aceite_lgpd || !aceite_honorarios || !declaracao_veracidade) {
    alert("Você precisa aceitar os termos de segurança e honorários para prosseguir.");
    return false;
  }
  return true;
};

// Validação da Etapa 3 (Dados Técnicos)
const validateStep3 = () => {
  const { nome_propriedade, aptidao, area_total_hectares, tipo_negociacao, valor_por_hectare } = formData;
  if (!nome_propriedade || !aptidao || !estadoSelecionado || !formData.localizacao_municipio || !area_total_hectares || !tipo_negociacao || !valor_por_hectare) {
    alert("Dados essenciais do ativo (Nome, Aptidão, Localização, Área e Valor) são obrigatórios.");
    return false;
  }
  return true;
};

// Validação da Etapa 4 (Documentos)
const validateStep4 = () => {
  // Se não marcar suporte jurídico, a matrícula torna-se obrigatória
  if (!suporteJuridico && !selectedFiles.matricula) {
    alert("Anexe a Matrícula do imóvel ou solicite Suporte Jurídico para continuar.");
    return false;
  }
  return true;
};

  // ETAPA 2 RODAPÉ
  const footerStep2 = (
    <footer className={`${isSelected ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} w-full border-t p-8 flex justify-between items-center shrink-0 shadow-2xl`}>
      <BackButton toStep={1} />
      <button onClick={() => validateStep3() && handleFinalizeStep3()} disabled={loading} className="bg-prylom-gold text-black px-20 py-4 rounded-xl font-black uppercase text-[12px] tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-50">
        {loading ? 'Salvando...' : 'Próxima etapa'}
      </button>
    </footer>
  );

  // ETAPA 3 RODAPÉ
  const footerStep3 = (
    <footer className={`${isSelected ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} w-full border-t p-8 flex justify-between items-center shrink-0 shadow-2xl`}>
      <BackButton toStep={2} />
      <button onClick={() => validateStep3() && setStep(4)} className="bg-prylom-gold text-black px-20 py-4 rounded-xl font-black uppercase text-[12px] tracking-[0.2em] shadow-xl active:scale-95">
        Próxima etapa: Documentos
      </button>
    </footer>
  );

  // ETAPA 4 RODAPÉ
  const footerStep4 = (
    <footer className={`${isSelected ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} w-full border-t p-8 flex justify-between items-center shrink-0 shadow-2xl`}>
      <BackButton toStep={3} />
      <button onClick={() => validateStep4() && handleFinalizeRegistration()} disabled={loading} className="bg-prylom-gold text-black px-20 py-4 rounded-xl font-black uppercase text-[12px] tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-50">
        {loading ? 'Enviando Dossiê...' : 'Finalizar Cadastro'}
      </button>
    </footer>
  );


  // ETAPA 1: INFORMATIVA
  const renderStep1 = () => (
    <div className="flex flex-col">
      <header className="bg-[#2C5266] py-12 px-10 text-center shrink-0 md:rounded-b-[4rem] shadow-2xl z-10">
        <h1 className="text-prylom-gold text-2xl md:text-5xl font-black uppercase tracking-tighter mb-2 leading-none">
          Bem-vindo ao Open Market
        </h1>
        <p className="text-white/60 text-[10px] md:text-[12px] font-bold tracking-[0.4em] uppercase">
          Integração ao Ecossistema Global Prylom
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-8 md:p-16 space-y-16 scrollbar-hide pb-32 bg-gray-50">
        <section className="max-w-4xl mx-auto">
              <p className="text-[14px] md:text-[16px] text-gray-500 font-medium leading-relaxed text-justify uppercase tracking-tight italic">
                Sua propriedade não será apenas anunciada; ela será integrada ao ecossistema de ativos de alta performance da Prylom. Promovemos visibilidade máxima através de uma curadoria digital que conecta seu ativo diretamente a redes de investimento e network, nos principais portais do agronegócio. Através de nossa tecnologia proprietária de matching de dados, focamos o direcionamento de sua oferta em perfis com real capacidade de aporte, visando otimizar o tempo de negociação e mitigar especuladores.
              </p>
        </section>

        <section className="space-y-10">
          <h3 className="text-[#2C5266] text-[12px] font-black uppercase tracking-[0.5em] text-center opacity-40">
            Protocolo de Governança
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { fase: "01", title: "Compliance e Qualificação de Leads", desc: "Todo potencial comprador passa por uma curadoria rigorosa de idoneidade e veracidade. Operamos alinhados às diretrizes de prevenção à lavagem de dinheiro (Lei nº 9.613/98), exigindo dos proponentes a comprovação de capacidade de aporte e idoneidade comercial." },
                  { fase: "02", title: "Blindagem de Informações (NDA)", desc: "Antes de qualquer troca de dados sensíveis, estabelecemos um NDA (Non-Disclosure Agreement). Este contrato de confidencialidade protege ambas as partes contra o vazamento de informações estratégicas." },
                  { fase: "03", title: "Notificação e Transparência", desc: "Você, proprietário, será notificado sobre cada interesse real, recebendo o dossiê de qualificação do proponente antes de qualquer autorização de visita." },
                  { fase: "04", title: "Suporte ao Fechamento e Due Diligence", desc: "No momento da proposta oficial, nossa plataforma exige a transparência dos dados técnicos essenciais (GEO, CAR, Matrícula). Atuamos na mediação estratégica entre as partes, orientando o alinhamento documental para que a Due Diligence (auditoria técnica e jurídica de responsabilidade do comprador) transcorra com máxima segurança e clareza." }
                ].map((item, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                <span className="text-prylom-gold text-[10px] font-black uppercase tracking-widest border-b border-gray-50 pb-2">Fase {item.fase}</span>
                <h4 className="text-[#2C5266] text-lg font-black uppercase tracking-tighter">{item.title}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="w-full bg-white border-t border-gray-200 p-8 flex justify-between items-center shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.4em]">Prylom Intelligence Ecosystem &copy; 2026</p>
        <button 
          onClick={() => setStep(2)}
          className="bg-prylom-gold text-[#2C5266] px-16 py-5 rounded-2xl font-black uppercase text-[12px] tracking-[0.3em] hover:shadow-2xl transition-all flex items-center gap-4 active:scale-95 shadow-xl"
        >
          Avançar para Dados do Ativo
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </button>
      </footer>
    </div>
  );

  // ETAPA 2: PROPRIETÁRIO
const renderStep2 = () => (
<form 
    onSubmit={(e) => {
      e.preventDefault(); // Impede o recarregamento da página
      if (validateStep2()) handleSaveStep2();
    }}
    className={`flex flex-col ${theme.bgPage} animate-fadeIn`}
  >
    <header className={`${theme.bgHeader} py-10 px-10 shrink-0 md:rounded-b-[4rem] shadow-2xl z-10 relative`}>
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* EXIBIÇÃO DA BADGE CONSTANTE */}
        {renderSelectedBadge()}
        
<h1 className={`${theme.textHeader} text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4 flex items-center justify-center gap-3 md:gap-5`}>
  {isSelected && (
    <img 
src={logoPrylom} // Sem aspas, usando a variável importada
  alt="Prylom Logo"
      className="h-[1.5em] md:h-[1.8em] w-auto object-contain flex-shrink-0" 
    />
  )}
  <span>
    {isSelected ? 'Ecossistema Prylom Selected' : 'Inicie a gestão estratégica do seu ativo'}
  </span>
</h1>
        <p className="text-prylom-gold text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] animate-pulse">
      Protegido pela LGPD (Lei 13.709/18)
    </p>
        {isSelected && (
          <p className="text-white font-medium text-sm opacity-80 uppercase tracking-widest">
            Formalize sua entrada no Círculo Restrito de Ativos Selected
          </p>
        )}
      </div>
    </header>

    {/* STEPPER DINÂMICO */}
    <div className="max-w-4xl mx-auto w-full pt-10 px-6">
      <div className={`flex items-center gap-12 mb-2 text-[11px] font-black uppercase tracking-widest ${theme.textLabel}`}>
        <span className="border-b-2 border-prylom-gold pb-1">Etapa 1/3: Proprietário</span>
        <span className="opacity-30">Ativo</span>
        <span className="opacity-30">Documentos</span>
      </div>
      <div className={`w-full h-1 ${isSelected ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
        <div className="w-1/3 h-full bg-prylom-gold shadow-[0_0_10px_#D4AF37]"></div>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
      {/* CARD DO FORMULÁRIO (BRANCO OU PRETO) */}
      <div className={`max-w-4xl mx-auto ${theme.bgCard} rounded-[3rem] p-12 shadow-sm border grid grid-cols-1 md:grid-cols-2 gap-8`}>
        
        <div className="space-y-2">
          <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Dados do Originador</label>
          <input name="nome_proprietario" required value={formData.nome_proprietario} onChange={handleInputChange} type="text" placeholder="Nome completo" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold transition-all`} />
        </div>

        <div className="space-y-2">
          <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Telefone / whats</label>
          <input name="telefone_whats" required value={formData.telefone_whats} onChange={handleInputChange} type="text" placeholder="(00) 00000-0000" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold transition-all`} />
        </div>

        <div className="space-y-2">
          <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>CPF/CNPJ</label>
          <input name="cpf_cnpj" required value={formData.cpf_cnpj} onChange={handleInputChange} type="text" placeholder="CPF ou CNPJ" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold transition-all`} />
        </div>

        <div className="space-y-2">
          <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>E-mail</label>
          <input name="email" required value={formData.email} onChange={handleInputChange} type="email" placeholder="seuemail@exemplo.com" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold transition-all`} />
        </div>

        <div className="space-y-2">
          <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Profissão / Atividade</label>
          <input name="profissao_atividade" required value={formData.profissao_atividade} onChange={handleInputChange} type="text" placeholder="Sua profissão" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold transition-all`} />
        </div>

<div className="space-y-2 relative">
  <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>
    Vínculo com Ativo
  </label>
  
  <select 
    required // <-- Adicione apenas isso aqui
    name="vinculo_ativo" 
    value={formData.vinculo_ativo} 
    onChange={handleInputChange} 
    className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm cursor-pointer appearance-none outline-none focus:ring-1 focus:ring-prylom-gold`}
  >
    {/* O navegador entende que value="" é um campo vazio/inválido para o required */}
    <option value="">Selecione uma opção</option>
    
    <option value="Titular">Titular (pessoa física)</option>
    <option value="Sócio">Sócio / Administrador</option>
    <option value="Sucessor">Sucessor / Herdeiro</option>
    <option value="Gestor">Gestor de Family Office / Asset</option>
    <option value="Representante">Procurador / Representante legal</option>
  </select>
</div>

        {formData.vinculo_ativo === 'Sucessor' && (
          <div className={`md:col-span-2 ${isSelected ? 'bg-prylom-gold/10' : 'bg-prylom-gold/5'} p-6 rounded-2xl border ${isSelected ? 'border-prylom-gold/30' : 'border-prylom-gold/20'}`}>
            <p className={`text-[12px] font-black uppercase mb-4 ${theme.textLabel}`}>O Inventário está concluído e registrado em matrícula?</p>
            <div className="flex gap-8">
              {['Sim', 'Não'].map(opt => (
                <label key={opt} className={`flex items-center gap-2 cursor-pointer ${isSelected ? 'text-white' : 'text-prylom-dark'}`}>
                  <input type="radio" name="inventario_concluido" value={opt} checked={formData.inventario_concluido === opt} onChange={handleInputChange} className="accent-prylom-gold" />
                  <span className="text-xs font-bold uppercase">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        )}
                {formData.vinculo_ativo === 'Representante' && (
          <div className={`md:col-span-2 ${isSelected ? 'bg-prylom-gold/10' : 'bg-prylom-gold/5'} p-6 rounded-2xl border ${isSelected ? 'border-prylom-gold/30' : 'border-prylom-gold/20'}`}>
            <p className={`text-[12px] font-black uppercase mb-4 ${theme.textLabel}`}>Possui Procuração Pública com poderes específicos para alienar (vender) o imóvel?</p>
            <div className="flex gap-8">
              {['Sim', 'Não'].map(opt => (
                <label key={opt} className={`flex items-center gap-2 cursor-pointer ${isSelected ? 'text-white' : 'text-prylom-dark'}`}>
                  <input type="radio" name="procuracao" value={opt} checked={formData.procuracao === opt} onChange={handleInputChange} className="accent-prylom-gold" />
                  <span className="text-xs font-bold uppercase">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Origem de Interesse</label>
          <input name="origem_interesse" value={formData.origem_interesse} onChange={handleInputChange} type="text" placeholder="Como conheceu a Prylom" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold transition-all`} />
        </div>

        <div className="space-y-2">
          <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Obs</label>
          <input name="observacoes" value={formData.observacoes} onChange={handleInputChange} type="text" placeholder="..." className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold transition-all`} />
        </div>

<div className="md:col-span-2 space-y-4 pt-6 border-t border-gray-100">
  
  {/* CHECKBOX LGPD - Alterado para verde */}
  <div className="flex items-start gap-3">
    <input 
      name="aceite_lgpd" 
      type="checkbox" 
      checked={formData.aceite_lgpd} 
      onChange={handleInputChange} 
      className="w-5 h-5 mt-0.5 accent-green-600 shrink-0" 
    />
    <p className={`text-[10px] font-bold uppercase leading-tight ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
      <span className="text-prylom-gold">SIGILO E PROTEÇÃO DE DADOS (LGPD):</span> "Autorizo a Prylom Agronegócios a realizar a curadoria e exibição do ativo em formato Blind (sem expor a localização exata), em conformidade com nossos Termos de Uso e a Lei Geral de Proteção de Dados."
    </p>
  </div>

  {/* CHECKBOX HONORÁRIOS - Alterado para verde */}
  <div className="flex items-start gap-3">
    <input 
      name="aceite_honorarios" 
      type="checkbox" 
      checked={formData.aceite_honorarios} 
      onChange={handleInputChange} 
      className="w-5 h-5 mt-0.5 accent-green-600 shrink-0" 
    />
    <p className={`text-[10px] font-bold uppercase leading-tight ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
      <span className="text-prylom-gold">MODELO DE NEGÓCIO E HONORÁRIOS:</span> ESTOU
CIENTE DAS DIRETRIZES DO PROGRAMA PRYLOM SELECTED. GARANTO O PAGAMENTO
DOS HONORÁRIOS DE INTERMEDIAÇÃO E ESTRUTURAÇÃO À PRYLOM — CALCULADOS
COM BASE NAS PRÁTICAS E TABELAS VIGENTES DE MERCADO — CASO O FECHAMENTO
DO NEGÓCIO OCORRA COM QUALQUER INVESTIDOR, FUNDO OU SEUS RESPECTIVOS
GRUPOS ECONÔMICOS OFICIALMENTE APRESENTADOS PELA PLATAFORMA. CASO EU NÃO
SEJA O PROPRIETÁRIO DIRETO DO ATIVO, DECLARO SOB AS PENAS DA LEI POSSUIR
AUTORIZAÇÃO EXPRESSA PARA A OFERTA E ASSUMO A RESPONSABILIDADE SOLIDÁRIA
PELO RESGUARDO E PAGAMENTO INTEGRAL DOS HONORÁRIOS DEVIDOS À PRYLOM.
    </p>
  </div>

  {/* DECLARAÇÃO DE VERACIDADE - Alterado para verde */}
  <div className="flex items-start gap-3 pt-2">
    <input 
      name="declaracao_veracidade" 
      type="checkbox" 
      checked={formData.declaracao_veracidade} 
      onChange={handleInputChange} 
      className="w-5 h-5 mt-0.5 accent-green-600 shrink-0" 
    />
    <p className={`text-[10px] font-black uppercase leading-tight ${isSelected ? 'text-gray-500' : 'text-gray-400'}`}>
      Declaro, sob as penas da lei, que as informações prestadas são verídicas e assumo responsabilidade civil e criminal pela legitimidade dos dados e pela autorização de negociação deste ativo.
    </p>
  </div>
</div>
      </div>
    </div>

<footer className={`${isSelected ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} w-full border-t p-8 flex justify-between items-center shrink-0 shadow-2xl`}>
<BackButton toStep={1} />
<button 
  type="submit" // 1. Define que este botão dispara a validação do formulário
  disabled={loading} 
  className="bg-prylom-gold text-black px-20 py-4 rounded-xl font-black uppercase text-[12px] tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
>
  {loading ? 'Processando...' : 'Próxima etapa'}
</button>
</footer>
 </form>
);

// ETAPA 3: DADOS TÉCNICOS (ADAPTÁVEL PREMIUM)
  const renderStep3 = () => (
<form 
onSubmit={(e) => {
  e.preventDefault(); 
  // Se a validação passar, salva os dados e pula para a etapa 3
  if (validateStep2()) {
    handleSaveStep2(); // Salva no banco/estado
    setStep(3);        // COMANDO PARA AVANÇAR (Certifique-se que o nome da função/estado é este)
  } else {
    alert("Por favor, preencha todos os campos obrigatórios.");
  }
}}
    className={`flex flex-col ${theme.bgPage} animate-fadeIn`}
  >
    <header className={`${theme.bgHeader} py-10 px-10 shrink-0 md:rounded-b-[4rem] shadow-2xl z-10 relative`}>
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* EXIBIÇÃO DA BADGE CONSTANTE */}
        {renderSelectedBadge()}
        
<h1 className={`${theme.textHeader} text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4 flex items-center justify-center gap-3 md:gap-5`}>
  {isSelected && (
    <img 
src={logoPrylom} // Sem aspas, usando a variável importada
  alt="Prylom Logo"
      className="h-[1.5em] md:h-[1.8em] w-auto object-contain flex-shrink-0" 
    />
  )}
  <span>
    {isSelected ? 'Ecossistema Prylom Selected' : 'Inicie a gestão estratégica do seu ativo'}
  </span>
</h1>
        <p className="text-prylom-gold text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] animate-pulse">
      Protegido pela LGPD (Lei 13.709/18)
    </p>
        {isSelected && (
          <p className="text-white font-medium text-sm opacity-80 uppercase tracking-widest">
            Formalize sua entrada no Círculo Restrito de Ativos Selected
          </p>
        )}
      </div>
    </header>

      <div className="max-w-4xl mx-auto w-full pt-10 px-6">
        <div className={`flex items-center gap-12 mb-2 text-[11px] font-black uppercase tracking-widest ${theme.textLabel}`}>
          <span className="opacity-30">Proprietário</span>
          <span className="border-b-2 border-prylom-gold pb-1">Etapa 2/3: Ativo</span>
          <span className="opacity-30">Documentos</span>
        </div>
        <div className={`w-full h-1 ${isSelected ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
          <div className="w-2/3 h-full bg-prylom-gold shadow-[0_0_10px_#D4AF37]"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
        <div className={`max-w-4xl mx-auto ${theme.bgCard} rounded-[3rem] p-12 shadow-sm border grid grid-cols-1 md:grid-cols-2 gap-8`}>
          
          <div className="space-y-1">
            <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Nome da Propriedade</label>
            <input name="nome_propriedade" value={formData.nome_propriedade} onChange={handleInputChange} placeholder="Fazenda Prylom" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold transition-all`} />
          </div>

          <div className="space-y-1">
            <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Aptidão</label>
            <select name="aptidao" value={formData.aptidao} onChange={handleInputChange} className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none cursor-pointer`}>
              <option value="">Selecione</option>
              <option value="Agricultura">Agricultura</option>
              <option value="Pecuária">Pecuária</option>
              <option value="Dupla aptidão">Dupla aptidão</option>
              <option value="Agroflorestais">Agroflorestais</option>
              <option value="Piscicultura">Piscicultura</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Estado</label>
            <select
              value={estadoSelecionado}
              onChange={(e) => {
                setEstadoSelecionado(e.target.value);
                setFormData({ ...formData, localizacao_municipio: '' });
              }}
              className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none cursor-pointer`}
            >
              <option value="">Selecione o Estado</option>
              {estados.map((uf) => (
                <option key={uf.id} value={uf.sigla}>{uf.nome} ({uf.sigla})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Localização (Mun)</label>
            <select
              name="localizacao_municipio"
              value={formData.localizacao_municipio.split(' - ')[0]}
              disabled={!estadoSelecionado}
              onChange={(e) => setFormData({ ...formData, localizacao_municipio: `${e.target.value} - ${estadoSelecionado}` })}
              className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm disabled:opacity-50 outline-none cursor-pointer`}
            >
              <option value="">Selecione o Município</option>
              {cidadesCadastro.map((cidade) => (
                <option key={cidade.id} value={cidade.nome}>{cidade.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Teor de argila</label>
            <input name="teor_argila" value={formData.teor_argila} onChange={handleInputChange} placeholder="15% a 20%" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold`} />
          </div>

<div className="space-y-1">
  <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>
    Área Total (Hectares)
  </label>
  <input 
    type="text"
    name="area_total_hectares" 
    value={formData.area_total_hectares} 
    onChange={handleInputChange} 
    placeholder="1.250,50" 
    className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold`} 
  />
</div>

          <div className="space-y-1">
            <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Topografia</label>
            <select name="topografia" value={formData.topografia} onChange={handleInputChange} className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none cursor-pointer`}>
              <option value="">Selecione</option>
              <option value="Plana">Plana</option>
              <option value="Ondulada">Ondulada</option>
              <option value="Declive">Declive</option>
              <option value="Aclive">Aclive</option>
              <option value="Levemente Ondulada">Levemente Ondulada</option>
            </select>
          </div>

<div className="space-y-1">
  <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>
    Área de Produção Atual
  </label>
  <input 
    type="text"
    name="area_producao_atual" 
    value={formData.area_producao_atual} 
    onChange={handleInputChange} 
    placeholder="800,00" 
    className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold`} 
  />
</div>

          <div className="space-y-1">
            <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Reserva Legal</label>
            <input name="reserva_legal" value={formData.reserva_legal} onChange={handleInputChange} placeholder="20%" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold`} />
          </div>

          <div className="space-y-1">
            <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Valor Total Pretendido</label>
            <div className={`flex ${theme.bgInput} rounded-xl overflow-hidden border ${isSelected ? 'border-prylom-gold/20' : 'border-transparent'}`}>
               <span className="p-4 text-prylom-gold font-black bg-black/40 shadow-inner">R$</span>
<input 
  type="text" // Importante: mudar de number para text
  name="valor_por_hectare" 
  value={formData.valor_por_hectare} 
  onChange={handleInputChange} 
  placeholder="0,00" 
  className="w-full bg-transparent border-none p-4 text-sm font-black outline-none" 
/>
            </div>
          </div>

          <div className="space-y-1">
            <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Tipo de Negociação</label>
            <select name="tipo_negociacao" value={formData.tipo_negociacao} onChange={handleInputChange} className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none cursor-pointer`}>
              <option value="">Selecione</option>
              <option value="Venda">Venda</option>
              <option value="Arrendamento">Arrendamento</option>
            </select>
          </div>
          <div className="space-y-1">
    <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Distância do Asfalto</label>
    <input name="distancia_asfalto" value={formData.distancia_asfalto} onChange={handleInputChange} placeholder="Ex: 15km" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold`} />
  </div>

  <div className="space-y-1">
    <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Índice Pluviométrico</label>
    <input name="indice_pluviometrico" value={formData.indice_pluviometrico} onChange={handleInputChange} placeholder="Ex: 1800mm" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold`} />
  </div>

  <div className="space-y-1">
    <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>Altitude</label>
    <input name="altitude" value={formData.altitude} onChange={handleInputChange} placeholder="Ex: 800m" className={`w-full ${theme.bgInput} border-none p-4 rounded-xl text-sm outline-none focus:ring-1 focus:ring-prylom-gold`} />
  </div>
  {/* Novo Bloco: Condição de Venda */}
<div className={`md:col-span-2 ${isSelected ? 'bg-prylom-gold/10' : 'bg-prylom-gold/5'} p-6 rounded-2xl border ${isSelected ? 'border-prylom-gold/30' : 'border-prylom-gold/20'} mt-2`}>
  <p className={`text-[12px] font-black uppercase mb-4 ${theme.textLabel}`}>Condição de Venda</p>
  <div className="flex gap-12">
    {['Porteira Fechada', 'Porteira Aberta'].map(opt => (
      <label key={opt} className={`flex items-center gap-3 cursor-pointer ${isSelected ? 'text-white' : 'text-prylom-dark'}`}>
        <input 
          type="radio" 
          name="condicao_venda" 
          value={opt} 
          checked={formData.condicao_venda === opt} 
          onChange={handleInputChange} 
          className="w-5 h-5 accent-prylom-gold" 
        />
        <span className="text-xs font-bold uppercase tracking-wider">{opt}</span>
      </label>
    ))}
  </div>
</div>

<div className="md:col-span-2 space-y-1">
  <div className="flex justify-between items-end px-2 mb-1">
    <label className={`text-[11px] font-black uppercase ${theme.textLabel}`}>
      Descrição detalhada
    </label>
    
    {/* Botão de Transcrição integrado ao seu estado formData */}
    <VoiceTranscriptionButton 
      theme={theme}
      currentValue={formData.descricao_detalhada}
      onTranscript={(newText) => {
        setFormData(prev => ({ ...prev, descricao_detalhada: newText }));
      }}
    />
  </div>

  <textarea 
    name="descricao_detalhada" 
    value={formData.descricao_detalhada} 
    onChange={handleInputChange} 
    placeholder="Descreva tudo que sua propriedade tem de melhor..." 
    className={`w-full ${theme.bgInput} border-none p-6 rounded-[2rem] text-sm h-32 outline-none focus:ring-1 focus:ring-prylom-gold shadow-inner`} 
  />
</div>
        </div>
      </div>

<footer className={`${isSelected ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} w-full border-t p-8 flex justify-between items-center shrink-0 shadow-2xl`}>
<BackButton toStep={2} />
<button 
  type="submit" // Agora ele valida os campos obrigatórios antes de prosseguir
  disabled={loading} 
  className="bg-prylom-gold text-black px-20 py-4 rounded-xl font-black uppercase text-[12px] tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95"
>
  Próxima etapa: Documentos
</button>
</footer>
 </form>
  );

const renderStep4 = () => (
<div className={` flex flex-col  ${theme.bgPage} animate-fadeIn`}>
    <header className={`${theme.bgHeader} py-10 px-10 shrink-0 md:rounded-b-[4rem] shadow-2xl z-10 relative`}>
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* EXIBIÇÃO DA BADGE CONSTANTE */}
        {renderSelectedBadge()}
        
<h1 className={`${theme.textHeader} text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-4 flex items-center justify-center gap-3 md:gap-5`}>
  {isSelected && (
    <img 
src={logoPrylom} // Sem aspas, usando a variável importada
  alt="Prylom Logo"
      className="h-[1.5em] md:h-[1.8em] w-auto object-contain flex-shrink-0" 
    />
  )}
  <span>
    {isSelected ? 'Ecossistema Prylom Selected' : 'Inicie a gestão estratégica do seu ativo'}
  </span>
</h1>
        <p className="text-prylom-gold text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] animate-pulse">
      Protegido pela LGPD (Lei 13.709/18)
    </p>
        {isSelected && (
          <p className="text-white font-medium text-sm opacity-80 uppercase tracking-widest">
            Formalize sua entrada no Círculo Restrito de Ativos Selected
          </p>
        )}
      </div>
    </header>

      {/* STEPPER DINÂMICO */}
      <div className="max-w-4xl mx-auto w-full pt-10 px-6">
        <div className={`flex items-center gap-12 mb-2 text-[11px] font-black uppercase tracking-widest ${theme.textLabel}`}>
          <span className="opacity-40">Proprietário</span>
          <span className="opacity-40">Ativo</span>
          <span className="border-b-2 border-prylom-gold pb-1">Etapa 3/3: Documentos</span>
        </div>
        <div className={`w-full h-1 ${isSelected ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
          <div className="w-full h-full bg-prylom-gold shadow-[0_0_10px_#D4AF37]"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { label: 'Matrícula/ Procuração Pública', key: 'matricula' },
            { label: 'Análise de Solo', key: 'solo' },
            { label: 'CAR', key: 'car' },
            { label: 'Mapa Digital do Imóvel', key: 'mapa' },
            { label: 'GEO / SIGEF', key: 'geo' },
            { label: 'Arquivos Digitais', key: 'memorial' },
            { label: 'CCIR / ITR', key: 'ccir' },
            { label: 'Fotos e Vídeos', key: 'fotos' },
          ].map((doc) => (
            <div key={doc.key} className="space-y-2">
              <label className={`text-[11px] font-black uppercase ${theme.textLabel} ml-2`}>
                {doc.label}
              </label>
              <div 
                onClick={() => fileRefs[doc.key as keyof typeof fileRefs].current?.click()}
                className={`relative flex items-center justify-between p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
                  selectedFiles[doc.key] 
                    ? 'bg-green-500/10 border-green-500' 
                    : isSelected 
                      ? 'bg-black border-prylom-gold/20 hover:border-prylom-gold' 
                      : 'bg-gray-100 border-gray-300 hover:border-prylom-gold'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* ÍCONE DE CLIPE (ESTILO IMAGEM 75816f) */}
                  <svg 
                    className={`w-6 h-6 ${selectedFiles[doc.key] ? 'text-green-500' : isSelected ? 'text-prylom-gold/50' : 'text-gray-400'}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className={`text-[10px] font-bold uppercase truncate max-w-[200px] ${isSelected && !selectedFiles[doc.key] ? 'text-gray-600' : isSelected ? 'text-white' : 'text-gray-500'}`}>
                    {selectedFiles[doc.key] ? selectedFiles[doc.key]?.name : 'Clique para anexar'}
                  </span>
                </div>

                {/* ÍCONE DE ESCUDO (ESTILO IMAGEM 75816f) */}
                <svg 
                  className={`w-5 h-5 transition-opacity ${selectedFiles[doc.key] ? 'text-green-500 opacity-100' : 'text-prylom-gold opacity-20'}`} 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>

                <input 
                  type="file" 
                  ref={fileRefs[doc.key as keyof typeof fileRefs]} 
                  className="hidden" 
                  multiple={doc.key === 'fotos'}
                  onChange={(e) => {
    const files = e.target.files;
    if (!files) return;
    
    if (doc.key === 'fotos') {
      // Transforma a FileList em um array comum
      setSelectedFiles(prev => ({ ...prev, fotos: Array.from(files) }));
    } else {
      setSelectedFiles(prev => ({ ...prev, [doc.key]: files[0] }));
    }
  }}
/>
              </div>
            </div>
          ))}

          {/* CHECKBOX DE SUPORTE JURÍDICO */}
          <div className={`md:col-span-2 flex items-start gap-4 p-6 ${theme.bgCard} rounded-3xl border mt-4 shadow-xl`}>
            <input 
              type="checkbox" 
              checked={suporteJuridico}
              onChange={(e) => setSuporteJuridico(e.target.checked)}
              className="w-6 h-6 mt-1 accent-prylom-gold cursor-pointer"
            />
            <p className={`text-[11px] font-bold uppercase leading-relaxed ${isSelected ? 'text-gray-400' : 'text-gray-500'}`}>
              Não estou com os documentos digitais no momento. Solicito que a Equipe de Curadoria e Estruturação da Prylom entre em contato para orientar a estruturação deste ativo.
            </p>
          </div>
        </div>
      </div>

<footer className={`${isSelected ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} w-full border-t p-8 flex justify-between items-center shrink-0 shadow-2xl`}>
<BackButton toStep={3} />
  <button 
    onClick={handleFinalizeRegistration} 
    disabled={loading} 
    className="bg-prylom-gold text-black px-20 py-4 rounded-xl font-black uppercase text-[12px] tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
  >
    {loading ? 'Enviando Dossiê...' : 'Finalizar Cadastro'}
  </button>
</footer>
    </div>
  );

const renderStepSuccess = () => (
<div className={`flex flex-col ${theme.bgPage} animate-fadeIn`}>
    <header className={`${theme.bgHeader} py-12 px-10 text-center shrink-0 md:rounded-b-[4rem] shadow-2xl z-10`}>
      {/* TEXTO PERSONALIZADO SELECTED */}
   
   {isSelected && (
        <img src={logoPrylom} // Sem aspas, usando a variável importada
  alt="Prylom Logo" className="h-20 w-auto mb-6 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
      )}

      <div className="bg-prylom-gold text-black px-8 py-2 rounded-full inline-block font-black text-xl md:text-2xl uppercase mb-4 shadow-lg">
        {isSelected ? `Você é Selected, ${formData.nome_proprietario}!` : `Parabéns ${formData.nome_proprietario.split(' ')[0]}!`}
      </div>
      <h1 className={`${theme.textHeader} text-xl md:text-2xl font-bold uppercase tracking-tight leading-tight max-w-2xl mx-auto`}>
        Dossiê recebido. Iniciamos agora a fase de <span className="text-prylom-gold font-black underline decoration-prylom-gold/30">Curadoria & Compliance</span> para apresentar seu ativo com máxima autoridade ao mercado.
      </h1>
    </header>

    <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 space-y-12 max-w-4xl mx-auto w-full">
      
      {/* FLUXOGRAMA DE ETAPAS PREMIUM */}
      <div className={`${theme.bgCard} w-full p-10 rounded-[3rem] shadow-2xl border flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden`}>
        {/* Marca d'água Selected no fundo do card */}
        {isSelected && <div className="absolute -right-4 -bottom-4 opacity-5 text-prylom-gold font-black text-6xl rotate-12 pointer-events-none">SELECTED</div>}
        
        {[
          { id: 1, label: 'Cadastro', active: true },
          { id: 2, label: 'Curadoria documental', active: false },
          { id: 3, label: 'Estruturação Comercial', active: false },
          { id: 4, label: 'Apresentação de Mercado', active: false },
        ].map((item, idx) => (
          <React.Fragment key={item.id}>
            <div className="flex flex-col items-center text-center space-y-3 z-10">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 transition-all duration-700 ${item.active ? 'bg-green-500 border-green-100/20 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]' : isSelected ? 'bg-gray-900 border-gray-800 text-gray-700' : 'bg-gray-100 border-gray-50 text-gray-400'}`}>
                {item.active ? (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="font-black text-lg">{item.id}</span>
                )}
              </div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${item.active ? 'text-green-500' : isSelected ? 'text-gray-600' : 'text-gray-400'}`}>
                {item.label}
              </p>
            </div>
            {idx < 3 && (
              <div className={`hidden md:block flex-1 h-[2px] transition-colors duration-700 ${item.active ? 'bg-green-500' : isSelected ? 'bg-gray-800' : 'bg-gray-100'}`}></div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* BOTÃO RECIBO ESTILIZADO */}
      <button className={`${isSelected ? 'bg-black border border-prylom-gold text-prylom-gold hover:bg-prylom-gold hover:text-black' : 'bg-[#607D8B] text-white'} px-12 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-4 shadow-xl transition-all active:scale-95 group`}>
        <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
        </svg>
        Download Recibo de Custódia Documental
      </button>

      {/* PROTOCOLO DE SIGILO PREMIUM */}
      <div className={`${isSelected ? 'bg-black border border-prylom-gold/30' : 'bg-[#607D8B]'} p-8 rounded-[3rem] w-full text-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]`}>
          <div className="absolute inset-0 opacity-10 flex justify-center items-center pointer-events-none">
            <svg className={`w-44 h-44 ${isSelected ? 'text-prylom-gold' : 'text-white'}`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className={`${isSelected ? 'text-prylom-gold' : 'text-white'} text-sm md:text-lg font-black uppercase tracking-widest relative z-10 leading-tight`}>
            Protocolo de sigilo ativado. Seus dados estão criptografados e sob custódia exclusiva do nosso Comitê de Governança e Compliance.
          </h3>
      </div>
    </div>

    {/* FOOTER ADAPTADO */}
    <footer className={`p-8 ${isSelected ? 'bg-black border-t border-gray-800' : 'bg-white border-t'} flex justify-center`}>
      <button onClick={onBack} className={`${theme.textLabel} font-black uppercase text-[10px] tracking-widest hover:underline transition-all`}>
        Encerrar Protocolo e Voltar ao Terminal
      </button>
    </footer>
  </div>
);

// ETAPA 1: INFORMATIVA ESPECÍFICA PARA OFF MARKET
  const renderStep1OffMarket = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* CABEÇALHO DARK PREMIUM */}
      <header className="bg-[#2C5266] py-12 px-10 text-center shrink-0 md:rounded-b-[4rem] shadow-2xl z-10">
        <h1 className="text-prylom-gold text-2xl md:text-5xl font-black uppercase tracking-tighter mb-2 leading-none">
          Bem-vindo ao Off Market
        </h1>
        <p className="text-white/60 text-[10px] md:text-[12px] font-bold tracking-[0.4em] uppercase">
          Integração ao Ecossistema Global Prylom
        </p>
      </header>

      {/* CONTEÚDO ESPECÍFICO OFF MARKET */}
      <div className="flex-1 overflow-y-auto p-8 md:p-16 space-y-10 max-w-4xl mx-auto scrollbar-hide pb-32">
        <section className="space-y-4">
          <h3 className="text-[#1a1a1a] text-sm font-black uppercase text-center">
            Off Market: Network Estratégico e Discrição Rigorosa
          </h3>
          <p className="text-[13px] text-gray-500 font-medium leading-relaxed text-justify uppercase tracking-tight">
Posicionamos seu patrimônio a investidores institucionais, Family Offices e grupos de elite através de nosso exclusivo network e parcerias estratégicas, operando de forma estritamente confidencial e sem qualquer exposição pública. Sua propriedade permanece invisível ao mercado geral, mas ativamente monitorada por nossa Inteligência de Matching: quando um investidor qualificado da nossa rede busca um ativo, o sistema apresenta sua oportunidade de forma seleta. Para maximizar a segurança, links de visualização temporária, mantendo o dossiê protegido no ambiente Prylom. No site, apenas sinalizamos a existência de ativos por região (Estado/Município), atraindo investidores de alto calibre sem identificar seu patrimônio. Segurança jurídica rigorosa e acesso direto ao topo do mercado.
          </p>
        </section>

        {/* FLUXO DE GOVERNANÇA (REUTILIZADO) */}
        <section className="space-y-10">
          <h3 className="text-[#2C5266] text-[12px] font-black uppercase tracking-[0.5em] text-center opacity-40">
            Fluxo de Governança Prylom (O Passo a Passo)
          </h3>
          <div className="space-y-4">
            {[
              { f: "01", t: "Compliance e Qualificação de Leads", d: "Todo potencial comprador passa por uma curadoria rigorosa de idoneidade e veracidade. Operamos em estrita conformidade com as normas do COAF (Lei nº 9.613/98), exigindo dos proponentes a comprovação de capacidade de aporte e idoneidade comercial." },
              { f: "02", t: "Blindagem de Informações (NDA)", d: "Antes de qualquer troca de dados sensíveis, estabelecemos um NDA (Non-Disclosure Agreement). Este contrato de confidencialidade protege ambas as partes contra o vazamento de informações estratégicas." },
              { f: "03", t: "Notificação e Transparência", d: "Você, proprietário, será notificado sobre cada interesse real, recebendo o dossiê de qualificação do proponente antes de qualquer autorização de visita." },
              { f: "04", t: "Due Diligence e Regularização", d: "Analisamos os dados técnicos (GEO, CAR, Matrícula) para antecipar gargalos. Caso existam passivos ambientais ou documentais, atuamos na mediação estratégica entre as partes e orientamos a busca por soluções especializadas, aumentando a segurança do negócio." }
            ].map((item) => (
              <div key={item.f} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                <span className="text-prylom-gold text-[10px] font-black uppercase tracking-widest border-b border-gray-50 pb-2">Fase {item.f}</span>
                <div>
                  <h4 className="text-[#2C5266] text-lg font-black uppercase tracking-tighter">{item.t}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* COMPLIANCE LGPD */}
        <section className="bg-gray-100/50 p-6 rounded-[2rem] border border-dashed border-gray-200">
          <h3 className="text-[#1a1a1a] text-[10px] font-black uppercase mb-3 flex items-center gap-2">
            <svg className="h-4 w-4 text-prylom-gold" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Segurança Jurídica e Proteção de Ativos (Compliance LGPD)
          </h3>
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed uppercase">
        Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), a Prylom compromete-se a
não fornecer dados técnicos ou pessoais da propriedade a terceiros sem o consentimento prévio e formal do
proprietário. Os documentos anexados nesta plataforma são protegidos por criptografia de ponta e
resguardados pelo sigilo profissional, sendo utilizados exclusivamente para a análise de viabilidade e
estruturação da tese de venda. O envio antecipado da documentação otimiza o processo de curadoria e
prepara seu ativo para uma negociação célere quando o comprador ideal surgir.    
          </p>
        </section>
      </div>

      {/* RODAPÉ */}
      <footer className="p-8 bg-white border-t border-gray-100 flex justify-end shrink-0 shadow-2xl">
        <button 
          onClick={() => setStep(2)}
         className="bg-prylom-gold text-[#2C5266] px-16 py-5 rounded-2xl font-black uppercase text-[12px] tracking-[0.3em] hover:shadow-2xl transition-all flex items-center gap-4 active:scale-95 shadow-xl"
        >
          Próxima etapa
        </button>
      </footer>
    </div>
  );

  const renderStep1Selected = () => (
  <div className="flex-1 flex flex-col overflow-hidden animate-fadeIn">
    {/* HEADER PREMIUM BLACK & GOLD */}
    <header className="bg-gradient-to-r from-black via-[#1a1a1a] to-black py-12 px-10 text-center shrink-0 md:rounded-b-[4rem] shadow-2xl z-10 border-b-2 border-prylom-gold/50">
      <div className="flex justify-center items-center gap-4 mb-4">
    
<h1 className="text-prylom-gold text-2xl md:text-5xl font-black uppercase tracking-tighter leading-none flex items-center gap-3 md:gap-5">
  <img 
src={logoPrylom} // Sem aspas, usando a variável importada
  alt="Prylom Logo"
    className="h-[1.5em] md:h-[1.8em] w-auto object-contain flex-shrink-0" 
  />
  <span>Ecosystem Prylom Selected</span>
</h1>
        <span className="text-prylom-gold text-2xl font-light">〉〉〉</span>
      </div>
      <p className="text-prylom-gold text-[10px] md:text-[14px] font-black tracking-[0.5em] uppercase">
        Prylom Selected: Benefícios e Diferenciais
      </p>
    </header>

    <div className="flex-1 overflow-y-auto p-8 md:p-16 space-y-12 max-w-5xl mx-auto bg-white pb-32 scrollbar-hide text-[#2C5266]">
      <section className="text-center space-y-4">
        <p className="text-[14px] md:text-[17px] font-bold leading-relaxed text-justify uppercase tracking-tight italic border-l-4 border-prylom-gold pl-6">
          Ao ingressar no Prylom Selected, sua propriedade recebe um tratamento técnico e comercial de elite para potencializar a percepção de valor do seu patrimônio perante o mercado.
        </p>
      </section>

      {/* GRID DE DIFERENCIAIS */}
      <div className="grid grid-cols-1 gap-8">
        {/* Bloco 1 */}
        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
          <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-3">
            <span className="text-prylom-gold">1.</span> Inteligência e Saúde da Terra
          </h3>
          <p className="text-sm font-bold mb-4">Para garantir a transparência sobre a saúde do ativo, coordenamos diligências técnicas (Due
Diligence Agronômica) executadas por laboratórios e especialistas homologados:</p>
          <ul className="space-y-2 text-xs font-bold uppercase list-disc pl-5 opacity-80">
            <li>Se for Agricultura: Análise Foliar (Tecido Vegetal), Bioanálise de Solo (Saúde do Solo), Análise Granulométrica (Física), Análise de Nematoides, Análise de Água para Irrigação e Diagnóstico de Estrutura do Solo (DRESS).</li>
            <li>Se for Pecuária: Análise de Solo (Base da Produção), Análise de Forragem (Qualidade do Pasto) e Indicadores Zootécnicos (Produção Animal).</li>
            <li className="text-prylom-gold font-black italic">Custo Zero : Ao assinar o mandato de exclusividade, a Prylom assume 100% dos custos e a
coordenação deste pacote de inteligência agronômica.</li>
          </ul>
        </div>

        {/* Bloco 2 */}
        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
          <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-3">
            <span className="text-prylom-gold">2.</span> Apresentação Técnica e Especializada
          </h3>
          <ul className="space-y-3 text-xs font-bold uppercase opacity-80">
            <li>• <span className="text-[#2C5266]">Vídeo Narrado:</span> Produção com Drone narrada por nosso agrônomo ou zootecnista, detalhando cada ponto técnico da propriedade.</li>
            <li>• <span className="text-[#2C5266]">Visita Acompanhada:</span> Todas as visitas são guiadas por nossos especialistas (agrônomo se for agricultura ou zootecnista na pecuária) para apresentar os dados produtivos reais aos interessados.</li>
            <li>• <span className="text-[#2C5266]">ORGANIZAÇÃO DOCUMENTAL E FINANCEIRA:</span> ORGANIZAÇÃO DOCUMENTAL ESTRATÉGICA PARA MONTAR A APRESENTAÇÃO TÉCNICA (certidões ambientais e dossiê de transferência), além de análise financeira, estudo de viabilidade e avaliação mercadológica.</li>
          </ul>
        </div>

        {/* Bloco 3, 4 e 5 resumidos conforme texto enviado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-black p-8 rounded-[2.5rem] text-white">
                <h3 className="text-prylom-gold text-lg font-black uppercase mb-4">3. Estratégias de Comercialização</h3>
                <p className="text-[10px] uppercase font-bold leading-relaxed opacity-80">Você escolhe como deseja conectar seu patrimônio ao mercado: Modo Selected Off Market (Total preservação/Sem vitrines) ou Modo Selected Open Market (Exposição máxima/YouTube/LinkedIn).</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
                <h3 className="text-lg font-black uppercase mb-4">4. Conexões de Negócios</h3>
                <p className="text-[10px] uppercase font-bold leading-relaxed opacity-80">Apresentação sob medida (Tailor-Made) para o nosso grupo de compradores
qualificados, com integração ao ecossistema Prylom e apresentação ativa e sigilosa para Fundos de
Investimento e Family Offices mediante assinatura prévia de NDA
</p>
            </div>
        </div>

        <div className="bg-[#2C5266] p-8 rounded-[2.5rem] text-white shadow-xl">
          <h3 className="text-prylom-gold text-xl font-black uppercase mb-4 flex items-center gap-3">5. Transparência e Segurança</h3>
          <p className="text-xs font-bold uppercase mb-2">• Selo de Qualidade Prylom: QUALIFICAÇÃO TÉCNICA E COMERCIAL (Due Diligence Preliminar).</p>
          <p className="text-xs font-bold uppercase">• Relatório Mensal de Prospecção: Você recebe o "Termômetro do Mercado" com feedbacks reais de fundos.</p>
        </div>

        {/* REGRAS DO PROTOCOLO */}
        <div className="border-t-2 border-gray-100 pt-10">
          <h3 className="text-[#2C5266] font-black uppercase text-center mb-8 tracking-widest italic">Exigências e Regras do Protocolo Selected</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] font-bold uppercase opacity-70">
            <p>• Documentação Obrigatória: Fornecimento de Matrículas, CAR, GEO, CCIR e Arquivos Digitais .</p>
            <p>• Regularização: Propriedades com pendências só serão aprovadas se houver processo jurídico em curso. Não cobrimos custos de regularização.</p>
            <p>• PRECIFICAÇÃO COMERCIAL: ATIVOS NO VALOR DE MERCADO = MANDATO DE 6
MESES. ATIVOS COM VALUATION PREMIUM (ÁGIO ESPECULATIVO) = MANDATO DE 12
MESES</p>
            <p>• Exclusividade: O MANDATO ENTRA EM VIGOR NO ATO DA ASSINATURA. O PROPRIETÁRIO TEM
O PRAZO DE 72 HORAS PARA EXIGIR A RETIRADA DE QUALQUER ANÚNCIO DE TERCEIROS
E ENVIAR A COMPROVAÇÃO FORMAL DESSA SOLICITAÇÃO PARA A PRYLOM, SOB PENA DE
QUEBRA CONTRATUAL.</p>
          </div>
        </div>

<div className="space-y-10 pt-10 border-t-2 border-prylom-gold/20">
  <section className="space-y-8">
    <div className="flex flex-col items-center gap-2">
      <h4 className="text-base font-black uppercase tracking-[0.2em] text-black">
        1. Estratégia de Comercialização
      </h4>
      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
        Selecione o protocolo de posicionamento do ativo
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* MODO SELECTED OFF MARKET */}
      <button 
        onClick={() => setSelectedModality('off')}
        className={`group relative p-8 rounded-[2rem] border-2 transition-all duration-500 text-left flex flex-col gap-4 ${
          selectedModality === 'off' 
          ? 'bg-black border-prylom-gold shadow-[0_20px_50px_rgba(0,0,0,0.3)] scale-[1.02]' 
          : 'bg-white border-gray-100 text-gray-400 hover:border-prylom-gold/30'
        }`}
      >
        <div className="flex justify-between items-center w-full">
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
            selectedModality === 'off' ? 'border-prylom-gold bg-prylom-gold' : 'border-gray-200'
          }`}>
            {selectedModality === 'off' && <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${selectedModality === 'off' ? 'text-prylom-gold' : 'text-gray-300'}`}>
            Protocolo Sigiloso
          </span>
        </div>

        <div>
          <p className={`font-black text-sm uppercase tracking-tight mb-2 ${selectedModality === 'off' ? 'text-prylom-gold' : 'text-[#2C5266]'}`}>
            Modo Selected Off Market
          </p>
          <p className={`text-[11px] leading-relaxed font-medium ${selectedModality === 'off' ? 'text-gray-400' : 'text-gray-400'}`}>
            Foco em **discrição absoluta**. Seu ativo será apresentado exclusivamente ao nosso Círculo Restrito de Compradores e Fundos via inteligência de matching, originação direta e abordagens ativas sigilosas.
          </p>
        </div>
      </button>

      {/* MODO SELECTED OPEN MARKETING */}
      <button 
        onClick={() => setSelectedModality('open')}
        className={`group relative p-8 rounded-[2rem] border-2 transition-all duration-500 text-left flex flex-col gap-4 ${
          selectedModality === 'open' 
          ? 'bg-[#2C5266] border-prylom-gold shadow-[0_20px_50px_rgba(44,82,102,0.3)] scale-[1.02]' 
          : 'bg-white border-gray-100 text-gray-400 hover:border-prylom-gold/30'
        }`}
      >
        <div className="flex justify-between items-center w-full">
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
            selectedModality === 'open' ? 'border-prylom-gold bg-prylom-gold' : 'border-gray-200'
          }`}>
            {selectedModality === 'open' && <svg className="w-4 h-4 text-[#2C5266]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${selectedModality === 'open' ? 'text-prylom-gold' : 'text-gray-300'}`}>
            Exposição de Elite
          </span>
        </div>

        <div>
          <p className={`font-black text-sm uppercase tracking-tight mb-2 ${selectedModality === 'open' ? 'text-white' : 'text-[#2C5266]'}`}>
            Modo Selected Open Market
          </p>
          <p className={`text-[11px] leading-relaxed font-medium ${selectedModality === 'open' ? 'text-white/70' : 'text-gray-400'}`}>
            Foco em **alcance máximo**. Exposição em destaque em portais premium do agronegócio, redes sociais corporativas
(LinkedIn/YouTube)
 e campanhas de tráfego pago de alta precisão (direcionadas a investidores qualificados).
          </p>
        </div>
      </button>
    </div>
  </section>


<section className="space-y-4 bg-gray-50 p-8 rounded-[3rem]">
  <h4 className="text-xs font-black uppercase text-center mb-6">2. Termos e Condições do Protocolo Selected</h4>
  <div className="space-y-4">
    {[
      { 
        key: 'exclusividade', 
        text: 'EXCLUSIVIDADE & COMPLIANCE: Entendo que o mandato entra em vigor na assinatura e que a Inteligência Prylom monitorará o mercado. Aceito o prazo de exclusividade (6 ou 12 meses) condicionado à adequação do Valuation (preço) ao mercado.' 
      },
      { 
        key: 'investimento', 
        text: 'INVESTIMENTO PRYLOM (DUE DILIGENCE): Compreendo que a Prylom financiará integralmente o pacote de inteligência agronômica para agregar valor ao meu ativo. Este investimento será ressarcido pelo proprietário exclusivamente em casos de desistência da venda DURANTE A VIGÊNCIA DO CONTRATO, quebra de exclusividade ou omissão dolosa de passivos da área.' 
      },
      { 
        key: 'responsabilidade', 
        text: 'RESPONSABILIDADE DOCUMENTAL: Confirmo que a regularização fundiária (taxas governamentais, cartórios e passivos) é de minha inteira responsabilidade, não sendo coberta pela estrutura financeira da Prylom.' 
      }
    ].map((term) => (
      <label key={term.key} className="flex items-start gap-3 cursor-pointer group">
        <input 
          type="checkbox" 
          checked={selectedTerms[term.key as keyof typeof selectedTerms]}
          onChange={(e) => setSelectedTerms({...selectedTerms, [term.key]: e.target.checked})}
          className="w-5 h-5 mt-1 accent-prylom-gold shrink-0" 
        />
        <span className="text-[9px] font-bold uppercase leading-snug group-hover:text-black transition-colors">
          {term.text}
        </span>
      </label>
    ))}
  </div>
</section>

          {/* CONCORDÂNCIA FINAL */}
          <div className="pt-8 flex flex-col items-center gap-6">
            <label className="flex items-center gap-4 p-6 bg-prylom-gold/10 rounded-2xl border-2 border-prylom-gold/30 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedTerms.concordoGeral}
                  onChange={(e) => setSelectedTerms({...selectedTerms, concordoGeral: e.target.checked})}
                  className="w-8 h-8 accent-[#2C5266]" 
                />
                <p className="text-[12px] font-black uppercase text-[#2C5266]">Li e concordo com os Termos do Protocolo Selected</p>
            </label>
          </div>
        </div>
      </div>
    </div>

    <footer className="w-full bg-white border-t border-gray-200 p-8 flex justify-end shrink-0 shadow-2xl">
      <button 
        onClick={() => setStep(2)}
        disabled={
      !selectedTerms.concordoGeral || 
      !selectedTerms.exclusividade || 
      !selectedTerms.investimento || 
      !selectedTerms.responsabilidade || 
      !selectedModality
    }
        className="bg-prylom-gold text-[#2C5266] px-20 py-5 rounded-xl font-black uppercase text-[12px] tracking-[0.2em] shadow-xl hover:bg-[#d4b386] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Iniciar Cadastro Selected
      </button>
    </footer>
  </div>
);

return createPortal(
  <div className="fixed inset-0 z-[999999] bg-white flex flex-col h-screen w-screen overflow-hidden">
    <nav className={`w-full py-4 px-8 flex items-center shadow-lg shrink-0 ${type === 'selected' ? 'bg-black border-b border-prylom-gold/50' : 'bg-[#2C5266]'}`}>
      <button onClick={onBack} className="text-white/80 hover:text-white flex items-center gap-3 font-black uppercase text-[10px] tracking-widest transition-all">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        Sair do Cadastro
      </button>

    </nav>

<div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
      {step === 1 && (type === 'open' ? renderStep1() : type === 'offmarket' ? renderStep1OffMarket() : renderStep1Selected())}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStepSuccess()}
    </div>
  </div>,
  document.body
);
};
export default PropertyRegistrationForm;