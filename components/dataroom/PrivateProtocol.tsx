import React, { useState, useEffect, useMemo } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { supabase } from '../../supabaseClient';
import { InputLine, SelectLine, useWhatsAppValidation, API_COUNTRIES } from './shared';

const PrivateProtocol = ({
  product,
  onBack,
  subStep,
  setSubStep
}: {
  product: any,
  onBack: () => void,
  subStep: number,
  setSubStep: (s: number) => void
}) => {

  const [acceptedConditions, setAcceptedConditions] = useState(false);
  const [privateOrigin, setPrivateOrigin] = useState<'BR' | 'INT' | null>(null);


 const [fields, setFields] = useState({
  // Campos base (ambos os fluxos)
  nome: '',
  email: '',
  phone: '',
  telefone: '',
  pofFile: null as File | null,
  pofDuringScreening: false,
  meetingTime: '',
  meetingDate: '',
  company: '',
  scope: 'STANDARD',
  countryCode: 'us',
  // Fluxo Internacional (INT)
  investorType: '',
  country: '',
  companyName: '',
  taxId: '',
  hasBrazilRep: 'No',
  isMajorityForeign: false,
  repName: '',
  hasMandate: false,
  repCapacity: '',
  directCompany: '',
  advisoryFirm: '',
  endBuyer: '',
  passportFile: null as File | null,
  ticketSize: '',
  sourceFunds: '',
  thesis: '',
  pep: 'No',
  // Fluxo Nacional (BR)
  doc: '',
  perfil: '',
  capacidadeAporte: '',
  descricaoPermuta: '',
  hectares: '',
  estadosAtuacao: '',
  creciOab: '',
  clienteRepresentadoNome: '',
  clienteRepresentadoDoc: '',
  declaracaoOrigem: false,
  tipoPatrimonial: '',
  modalidadeCaptacao: '',
  statusCredito: '',
});

  const { smsSent, smsCode, setSmsCode, isVerifying, setIsVerifying, isCodeValid, codeError, handleSendCode } = useWhatsAppValidation({
    phone: fields.phone,
    nome: fields.nome,
    projeto: "Prylom Global Desk",
    errorMessage: "Invalid code. Please check your WhatsApp.",
  });

 const [countries, setCountries] = useState<string[]>(['United States', 'China', 'United Kingdom', 'United Arab Emirates', 'Saudi Arabia', 'Germany', 'Switzerland']);
const [docStatus, setDocStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

useEffect(() => {
  const fetchCountries = async () => {
    const restrictedCountries = [
      'Iran',
      'North Korea',
      'Syria',
      'Cuba',
      'Russia',
      'Myanmar'
    ];

    try {
      const res = await fetch(API_COUNTRIES);
      const data = await res.json();

      const countryList = data
        .map((c: any) => c.name.common)
        .filter((name: string) => !restrictedCountries.includes(name))
        .sort((a: string, b: string) => a.localeCompare(b));

      setCountries(countryList);
    } catch (err) {
      console.error("Erro ao carregar países, usando lista padrão segura.");
      setCountries(['United States', 'China', 'United Kingdom', 'United Arab Emirates', 'Saudi Arabia', 'Germany', 'Switzerland']);
    }
  };
  fetchCountries();
}, []);

  const isOpenMarket = useMemo(() => {
    const relevancia = product?.relevancia_anuncio || product?.fazenda_data?.relevancia_anuncio;
    const tipo = product?.tipo_anuncio || product?.fazenda_data?.tipo_anuncio;
    return relevancia === 'Open Market' || tipo === 'Open Market';
  }, [product]);

const uploadFile = async (bucket: string, file: File, userName: string) => {
  try {
    const cleanUserName = userName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').toLowerCase();
    const fileExt = file.name.split('.').pop();
    const fileName = `${cleanUserName}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error(`Erro no upload para ${bucket}:`, error);
    throw error;
  }
};

const handleFinalSubmit = async () => {
  setIsVerifying(true);
  try {
    let passportUrl = null;
    let pofUrl = null;

    const identifier = fields.companyName || fields.nome || fields.repName || 'anonymous';

    if (fields.passportFile) {
      passportUrl = await uploadFile('passports', fields.passportFile, identifier);
    }

    if (fields.pofFile && !fields.pofDuringScreening) {
      pofUrl = await uploadFile('proof-of-funds', fields.pofFile, identifier);
    }

    const protocolData = {
      origin: privateOrigin,
      full_name: fields.companyName || fields.nome || fields.repName,
      email: fields.email,
      phone: fields.phone,
      document_id: fields.taxId || fields.doc || fields.clienteRepresentadoDoc,
      passport_url: passportUrl,
      pof_url: pofUrl,
      meeting_date: fields.meetingDate,
      meeting_time: fields.meetingTime,
      form_metadata: {
        ...fields,
        passportFile: undefined,
        pofFile: undefined,
        submitted_at: new Date().toISOString()
      }
    };

    const { error } = await supabase
      .from('private_protocols')
      .insert([protocolData]);

    if (error) throw error;

    setSubStep(4);

  } catch (error: any) {
    console.error("Erro crítico no salvamento:", error);
    alert(`Erro ao processar mandato: ${error.message || 'Verifique sua conexão'}`);
  } finally {
    setIsVerifying(false);
  }
};

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    else value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    setFields({ ...fields, doc: value });
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (!v.startsWith("55")) v = "55" + v;
    v = v.slice(0, 13);
    v = v.replace(/^(\d{2})(\d{2})(\d)/g, "$1 ($2) $3");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    setFields({ ...fields, telefone: v });
  };

  return (
    <div className="animate-fadeIn space-y-12 text-left text-[#2c5363] max-w-4xl mx-auto">

{subStep === 1 && (
  <div className="space-y-10 animate-fadeIn w-full">
    {/* HEADER */}
    <div className="text-center space-y-4">
      <h2 className="text-3xl font-black uppercase tracking-tighter">PRYLOM PRIVATE: MANDATO DE AQUISIÇÃO & ADVISORY</h2>
      <p className="text-[#bba219] font-bold tracking-[0.3em] text-[11px] uppercase italic">"Acesso ao Off-Market. Inteligência Técnica. Logística Executiva."</p>
    </div>

    {/* CONTEÚDO PRINCIPAL */}
    <div className="space-y-8">

      {/* GRID DE 3 CARDS - LARGURA TOTAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD 1: ADVISORY */}
        <section className="flex flex-col h-full space-y-4 p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-black uppercase text-[11px] text-[#2c5363] flex items-center gap-2 tracking-widest">
            <span className="w-2 h-2 bg-[#bba219] rounded-full"></span> 01. Full-Stack Advisory
          </h4>
          <div className="flex-1 space-y-4">
            <p className="text-gray-400 text-[10px] font-bold uppercase leading-relaxed">
              Não vendemos apenas terra; entregamos inteligência estratégica para validação do ativo:
            </p>
            <div className="space-y-2 text-[10px] font-black uppercase text-[#2c5363]">
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> COORDENAÇÃO ESTRATÉGICA DE DUE DILIGENCE LEGAL & TRIBUTÁRIA</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Engenharia Agronômica: Solo & Produtividade</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Zootecnia Estratégica: Suporte & Infra</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Relatórios: Mapas de Argila & Pluviometria</p>
            </div>
          </div>
        </section>

        {/* CARD 2: LOGÍSTICA */}
        <section className="flex flex-col h-full space-y-4 p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-black uppercase text-[11px] text-[#2c5363] flex items-center gap-2 tracking-widest">
            <span className="w-2 h-2 bg-[#bba219] rounded-full"></span> 02. Logística Executiva
          </h4>
          <div className="flex-1 space-y-4">
            <p className="text-gray-400 text-[10px] font-bold uppercase leading-relaxed">
              Sua única preocupação deve ser a decisão. A Prylom estrutura e financia 100% da sua jornada de vistoria técnica:

            </p>
            <div className="space-y-2 text-[10px] font-black uppercase text-[#2c5363]">
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Nacional: Transfer de base ou aeroporto</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Internacional: Receptivo blindado & aéreo (Deslocamento de aeronave executiva se for necessário)</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Visita técnica "Door-to-Farm" sem custos</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Nacional & Internacional: Receptivo aeroportuário, veículos blindados e deslocamento via aeronave executiva (sob demanda).
</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Alinhamento de Risco: A PRYLOM arca integralmente com os custos operacionais e logísticos
durante o período de busca. Este investimento será abatido exclusivamente do Success Fee
(comissão) apenas após o fechamento do negócio.</p>
            </div>
          </div>
        </section>

        {/* CARD 3: THE VAULT */}
        <section className="flex flex-col h-full space-y-4 p-6 bg-[#2c5363] text-white shadow-xl transform hover:-translate-y-1 transition-all">
          <h4 className="font-black uppercase text-[11px] text-[#bba219] flex items-center gap-2 tracking-widest">
            <span className="w-2 h-2 bg-[#bba219] rounded-full shadow-[0_0_8px_#bba219]"></span> 03. The Vault
          </h4>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[11px] font-medium leading-relaxed uppercase tracking-wider opacity-90">
              Desbloqueie o acesso ao portfólio <span className="text-[#bba219] font-black">Off-Market</span>. Ativos estressados e fazendas de alta performance protegidas por sigilo absoluto.
            </p>
          </div>
          <div className="pt-4 border-t border-white/10">
              <span className="text-[8px] font-black tracking-[0.3em] text-[#bba219] uppercase">Acesso Prioritário</span>
          </div>
        </section>
      </div>

{/* COMMAND CENTER - OCUPA A LARGURA TODA ABAIXO DOS CARDS */}
<section className="w-full space-y-4 p-8 bg-gray-50 border-l-4 border-[#bba219] shadow-inner">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <h4 className="font-black uppercase text-[13px] text-[#2c5363] flex items-center gap-2 tracking-tighter">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
      </span>
      4. "Command Center": Inspeção Remota High-Tech
    </h4>
    <span className="text-[9px] font-black bg-[#2c5363] text-white px-3 py-1 rounded-full uppercase tracking-widest">
      Conexão Satelital Starlink
    </span>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
    <div className="space-y-3">
      <p className="text-gray-600 text-[11px] font-semibold leading-relaxed uppercase">
        Tecnologia a serviço da sua Due Diligence. Vistoria via Drone em tempo real com narração técnica.
      </p>
      <ul className="space-y-2 text-[10px] text-gray-500 font-bold uppercase tracking-tight">
        <li className="flex gap-2"><span className="text-[#bba219] font-black">›</span> <span>Vistoria Técnica Narrada por Engenheiro Agrônomo.</span></li>
        <li className="flex gap-2"><span className="text-[#bba219] font-black">›</span> <span>Interatividade Total: Você direciona o voo remotamente.</span></li>
        <li className="flex gap-2 text-green-700 font-black"><span className="text-[#bba219]">›</span> <span>Zero Filtro: Realidade nua e crua do ativo.</span></li>
      </ul>
    </div>
    <div className="space-y-3 bg-white/50 p-4 rounded border border-gray-200">
      <p className="text-[10px] text-gray-400 font-bold uppercase leading-tight">
        Eliminamos a "visita exploratória". A visita presencial torna-se apenas uma etapa de <span className="text-[#2c5363]">Confirmação e Fechamento</span>.
      </p>
      <p className="text-[9px] font-black text-[#bba219] uppercase italic pt-2">
        Resultado: Certeza de negócio antes da alocação aérea/terrestre.
      </p>
    </div>
  </div>
</section>

      {/* CONDIÇÕES DO MANDATO */}
<div className="bg-gray-100/80 p-10 rounded-sm space-y-8 border border-gray-200">
  <div className="text-center space-y-2">
    <h5 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#2c5363]">
      As Condições do Mandato (Leia com Atenção)
    </h5>
    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
      Operamos sob o modelo internacional de Buyer's Agent (Representante do Comprador)
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2c5363] text-[#bba219] text-[10px] font-black">01</span>
        <h6 className="text-[10px] font-black uppercase text-[#2c5363]">Exclusividade</h6>
      </div>
      <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">
        A Prylom atuará como sua <span className="text-[#2c5363]">única mandatária</span> PARA BUSCA E ESTRUTURAÇÃO DE ATIVOS DENTRO
DO ESCOPO GEOGRÁFICO E FINANCEIRO ACORDADO, PELO PERÍODO DE 90 DIAS.
      </p>
    </div>

    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2c5363] text-[#bba219] text-[10px] font-black">02</span>
        <h6 className="text-[10px] font-black uppercase text-[#2c5363]">Proof of Funds</h6>
      </div>
      <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">
        Ativação condicionada à aprovação de <span className="text-[#2c5363]">Compliance Financeiro</span>, com liquidez compatível ao ticket (R$ 30MM+).
      </p>
    </div>

    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2c5363] text-[#bba219] text-[10px] font-black">03</span>
        <h6 className="text-[10px] font-black uppercase text-[#2c5363]">Mandato de Compra</h6>
      </div>
      <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">
        Assinatura digital do contrato de representação e <span className="text-[#2c5363]">NDA</span> antes da abertura do Data Room Off-Market.
      </p>
    </div>
  </div>
</div>
    </div>

{/* O HARD GATE / BOTÕES DESBLOQUEÁVEIS */}
<div className="pt-12 space-y-10 text-center">
  <div className="inline-block p-6 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm transition-all hover:border-[#bba219]">
    <label className="flex items-center gap-4 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          checked={acceptedConditions}
          onChange={(e) => setAcceptedConditions(e.target.checked)}
          className="peer w-8 h-8 opacity-0 absolute cursor-pointer"
        />
        <div className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center peer-checked:bg-[#bba219] peer-checked:border-[#bba219] transition-all">
          <svg className="w-5 h-5 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <span className="text-[12px] font-black uppercase tracking-tighter text-gray-400 group-hover:text-[#2c5363] transition-colors text-left max-w-sm">
        Declaro que li e aceito as condições de Exclusividade e Comprovação de Fundos para acessar o serviço Prylom Private.
      </span>
    </label>
  </div>

  <div className="space-y-6">
    <p className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${acceptedConditions ? 'text-[#bba219] opacity-100' : 'text-gray-300 opacity-50'}`}>
      Selecione sua origem para iniciar o onboarding:
    </p>

    <div className={`flex flex-col md:flex-row gap-6 max-w-2xl mx-auto transition-all duration-700 ${acceptedConditions ? 'opacity-100 translate-y-0' : 'opacity-10 pointer-events-none translate-y-4 grayscale'}`}>
      <button
        onClick={() => { setPrivateOrigin('BR'); setSubStep(2); }}
        className="group flex-1 flex items-center justify-center gap-4 py-6 bg-[#2c5363] text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#bba219] transition-all shadow-xl hover:-translate-y-1 active:scale-95"
      >
        <span className="text-xl group-hover:scale-125 transition-transform">🇧🇷</span>
        Investidor Nacional
      </button>

      <button
        onClick={() => { setPrivateOrigin('INT'); setSubStep(2); }}
        className="group flex-1 flex items-center justify-center gap-4 py-6 border-2 border-[#2c5363] text-[#2c5363] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-gray-50 transition-all shadow-lg hover:-translate-y-1 active:scale-95"
      >
        <span className="text-xl group-hover:scale-125 transition-transform">🌎</span>
        International Investor
      </button>
    </div>
  </div>
</div>
  </div>
)}

{subStep === 2 && (
  <div className="space-y-10 animate-fadeIn w-full">
    <div className="border-b border-gray-100 pb-6 flex justify-between items-center">
      <div>
        <h3 className="text-2xl font-black uppercase tracking-tighter">Private Onboarding</h3>
        <p className="text-[#bba219] text-[10px] font-bold uppercase tracking-[0.3em]">
          {privateOrigin === 'BR' ? 'Mandato Nacional' : 'International Mandate'} & Alocação Técnica
        </p>
      </div>
      <span className="text-[9px] bg-[#bba219] text-white px-4 py-1.5 font-black rounded-full uppercase tracking-[0.2em]">Priority Pass</span>
    </div>

{privateOrigin === 'INT' && (

  <div className="space-y-10 animate-fadeIn text-left text-[#2c5363]">
    {/* ETAPA 1: ENTITY & JURISDICTION */}
    <section className="space-y-6">
      <div className="border-l-4 border-[#bba219] pl-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 1: Entity & Jurisdiction</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase">Primary Buyer Legal Identification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SelectLine
          label="Investor Type *"
          options={['Select...', 'Family Office', 'Private Equity / Hedge Fund', 'Sovereign Wealth Fund', 'Corporate / Agribusiness Group','Individual High-Net-Worth']}
          value={fields.investorType}
          onChange={(e) => setFields({...fields, investorType: e.target.value})}
        />
<div className="space-y-1">
  <SelectLine
    label="Country of Origin / Tax Residence *"
    options={['Select Country...', ...countries]}
    value={fields.country}
    onChange={(e) => setFields({...fields, country: e.target.value})}
  />
  <p className="text-[10px] text-gray-400 italic">
    * Countries under international sanctions or FATF blacklist are not eligible for registration.
  </p>
</div>
        <InputLine label="Company Name / Full Name *" placeholder="Legal Entity Name" value={fields.companyName} onChange={(e) => setFields({...fields, companyName: e.target.value})} />
        <InputLine label="Tax ID / Registration Number *" placeholder="EIN, VAT, or Registration No." value={fields.taxId} onChange={(e) => setFields({...fields, taxId: e.target.value})} />
<div className="space-y-6">
  <SelectLine
    label="Do you have CNPJ or representation in Brazil? *"
    options={['Select...', 'Yes (Ready structure)', 'No (Need structuring)']}
    value={fields.hasBrazilRep}
    onChange={(e) => setFields({...fields, hasBrazilRep: e.target.value})}
  />

  {fields.hasBrazilRep === 'Yes (Ready structure)' && (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-4 animate-fadeIn">
      <label className="flex items-start gap-4 cursor-pointer group">
        <div className="relative flex items-center pt-1">
          <input
            type="checkbox"
            className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-gray-300 rounded-md checked:bg-[#2c5363] checked:border-[#2c5363] transition-all"
            required
            checked={fields.isMajorityForeign}
            onChange={(e) => setFields({...fields, isMajorityForeign: e.target.checked})}
          />
          <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none top-2 left-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#2c5363] group-hover:text-[#bba219] transition-colors leading-relaxed">
            Is this Brazilian entity majority-owned by foreign capital? *
          </span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-1">
            (Esta entidade brasileira é controlada majoritariamente por capital estrangeiro?)
          </span>
        </div>
      </label>
    </div>
  )}
</div>
      </div>
    </section>


    <hr className="border-gray-100" />

    {/* ETAPA 2: CONTACT & REPRESENTATIVE */}
    <section className="space-y-6">
      <div className="border-l-4 border-[#2c5363] pl-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 2: Contact & Representative</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase">Liaison and Identity Verification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <div className="space-y-8 animate-fadeIn">
  <InputLine
    label="Full Name of Representative *"
    placeholder="Full Legal Name (As in Passport)"
    value={fields.repName}
    onChange={(e) => setFields({...fields, repName: e.target.value})}
  />

  <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
    <label className="flex items-start gap-4 cursor-pointer group">
      <div className="relative flex items-center pt-1">
        <input
          type="checkbox"
          className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-gray-300 rounded-md checked:bg-[#2c5363] checked:border-[#2c5363] transition-all"
          checked={fields.hasMandate}
          onChange={(e) => setFields({...fields, hasMandate: e.target.checked})}
        />
        <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none top-2 left-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
      <span className="text-[10px] font-black uppercase tracking-wider text-[#2c5363] leading-relaxed">
        REPRESENTATION MANDATE: I hereby legally declare, under penalty of perjury, that I am an authorized signatory, officer, or legally mandated broker holding a valid Power of Attorney (POA) to act and sign on behalf of the Primary Entity.
      </span>
    </label>
  </div>

  {fields.hasMandate && (
    <div className="space-y-6 pt-4 animate-slideDown">
      <SelectLine
        label="Representative Capacity *"
        options={[
          'Select...',
          'Corporate Officer / Director',
          'Authorized Signatory (Power of Attorney - POA)',
          'External Broker / Advisor (Mandated)'
        ]}
        value={fields.repCapacity}
        onChange={(e) => setFields({...fields, repCapacity: e.target.value})}
      />

      {(fields.repCapacity === 'Corporate Officer / Director' ||
        fields.repCapacity === 'Authorized Signatory (Power of Attorney - POA)') && (
        <div className="animate-fadeIn">
          <InputLine
            label="Company / Fund You Directly Represent *"
            placeholder="Ex: BlackRock Inc., Sovereign Wealth Fund"
            value={fields.directCompany}
            onChange={(e) => setFields({...fields, directCompany: e.target.value})}
          />
        </div>
      )}

      {fields.repCapacity === 'External Broker / Advisor (Mandated)' && (
        <div className="space-y-6 p-6 bg-[#2c5363]/5 border-l-4 border-[#2c5363] animate-fadeIn">
          <InputLine
            label="1. Advisory Firm / Brokerage Name *"
            placeholder="Ex: JLL, CBRE, Independent Advisor"
            value={fields.advisoryFirm}
            onChange={(e) => setFields({...fields, advisoryFirm: e.target.value})}
          />
          <InputLine
            label="2. End-Buyer / Fund Represented *"
            placeholder="Ex: Name of the exact Fund or Buyer holding the capital"
            value={fields.endBuyer}
            onChange={(e) => setFields({...fields, endBuyer: e.target.value})}
          />
          <p className="text-[9px] font-bold text-gray-400 uppercase">
            Note: The NDA will cover both the Advisory Firm and the End-Buyer.
          </p>
        </div>
      )}
    </div>
  )}
</div>


<div className="flex flex-col gap-2 relative">
  <div className="absolute -top-3 left-0 w-full pointer-events-none">
    <span className="text-[7px] font-black text-[#bba219] uppercase tracking-[0.2em] opacity-80 block whitespace-nowrap">
      Encrypted upload • GDPR & LGPD Compliant
    </span>
  </div>

  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
    Passport Number / ID (Photo Upload) <span className="text-red-500">*</span>
  </label>

  <div className="relative border-b border-gray-200 py-2 group">
    <input
      type="file"
      id="passport-upload"
      accept="image/*,.pdf"
      onChange={(e) => setFields({ ...fields, passportFile: e.target.files ? e.target.files[0] : null })}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
    />

    <div className="flex items-center gap-4">
      <div className="py-1 px-3 rounded-full bg-gray-100 text-[#2c5363] text-[9px] font-black uppercase tracking-widest group-hover:bg-[#2c5363] group-hover:text-white transition-all">
        Choose File
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate max-w-[120px]">
        {fields.passportFile ? fields.passportFile.name : "No file selected"}
      </span>
    </div>

    {fields.passportFile && (
      <span className="absolute right-0 bottom-3 text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        ID Attached
      </span>
    )}
  </div>
</div>
        <InputLine label="Official Corporate E-mail *" placeholder="name@company.com" type="email" value={fields.email} onChange={(e) => setFields({...fields, email: e.target.value})} />

        {/* WHATSAPP COM VALIDAÇÃO 2FA INTEGRADA */}
  <div className="space-y-2 group animate-fadeIn">
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-focus-within:text-[#bba219] transition-colors">
      Direct WhatsApp (Verified) *
    </label>

    <div className="relative border-b border-gray-200 focus-within:border-[#bba219] transition-all pb-1 flex items-center">
      <PhoneInput
        country={fields.countryCode?.toLowerCase() || 'us'}
        value={fields.phone}
        onChange={(phone) => setFields({...fields, phone: '+' + phone})}
        enableSearch={true}
        placeholder="Enter phone number"
        containerClass="prylom-phone-container"
        inputClass="prylom-phone-input"
        buttonClass="prylom-phone-button"
        dropdownClass="prylom-phone-dropdown"
        specialLabel=""
      />

      {!smsSent && fields.phone?.length > 8 && (
        <button
          onClick={handleSendCode}
          className="absolute right-0 bottom-2 text-[9px] font-black text-[#bba219] uppercase hover:underline z-10 bg-white pl-2"
        >
          {isVerifying ? "Sending..." : "Validate WhatsApp"}
        </button>
      )}
    </div>
  </div>

  {smsSent && (
    <div className={`animate-fadeIn p-6 rounded-lg border transition-all duration-500 ${isCodeValid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'} space-y-4`}>
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2c5363]">
          Verification Code
        </label>

        {isCodeValid ? (
          <span className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            WhatsApp Verified
          </span>
        ) : (
          <span className="text-[9px] font-bold text-[#bba219] uppercase">Check your WhatsApp for the code</span>
        )}
      </div>

      <div className="relative">
        <input
          maxLength={6}
          disabled={isCodeValid || isVerifying}
          value={smsCode}
          onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
          placeholder={isVerifying ? "..." : "000000"}
          className={`w-full py-4 text-center text-xl font-black tracking-[0.5em] outline-none transition-all
            ${isCodeValid ? 'bg-transparent text-green-700' : 'bg-white border border-gray-200 focus:border-[#bba219] text-[#2c5363]'}
            ${codeError ? 'border-red-500 animate-shake' : ''}
          `}
        />

        {isVerifying && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <div className="w-5 h-5 border-2 border-[#bba219] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {!isCodeValid && (
        <p className="text-[9px] text-gray-400 font-medium uppercase text-center">
          Didn't receive it? <button type="button" onClick={handleSendCode} className="text-[#bba219] font-bold hover:underline">Resend Code</button>
        </p>
      )}
    </div>
  )}

  <style dangerouslySetInnerHTML={{__html: `
    .prylom-phone-container { width: 100% !important; border: none !important; }
    .prylom-phone-input {
      width: 100% !important; border: none !important; background: transparent !important;
      font-size: 13px !important; font-weight: 700 !important; color: #2c5363 !important;
      padding-left: 45px !important;
    }
    .prylom-phone-button { border: none !important; background: transparent !important; }
    .prylom-phone-dropdown {
      font-size: 11px !important; text-transform: uppercase !important;
      font-weight: 700 !important; color: #2c5363 !important;
    }
  `}} />
</div>
    </section>

    <hr className="border-gray-100" />

    {/* ETAPA 3: INVESTMENT PROFILE */}
    <section className="space-y-6">
      <div className="border-l-4 border-[#bba219] pl-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 3: Investment Profile</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase">Capital Capacity and Strategic Thesis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SelectLine
          label="Target Ticket Size (USD) *"
          options={['Select range...', 'U$ 1M - U$ 5M', 'U$ 5M - U$ 20M', 'U$ 20M - U$ 50M', 'Above U$ 50M']}
          value={fields.ticketSize}
          onChange={(e) => setFields({...fields, ticketSize: e.target.value})}
        />
<SelectLine
  label="Source of Funds *"
  options={[
    'Select...',
    'Equity / Cash (Recursos Próprios à vista)',
    'Bank Financing / Leverage (Financiamento Bancário)',
    'Committed Capital',
    'Sovereign Wealth (Fundo Soberano / State Funds)'
  ]}
  value={fields.sourceFunds}
  onChange={(e) => setFields({...fields, sourceFunds: e.target.value})}
/>
<div className="space-y-8">
  <SelectLine
    label="Investment Thesis *"
    options={[
      'Select...',
      'Land Appreciation (Asset Wealth)',
      'Production / Commodity Trading',
      'Yield / Leaseback Strategy',
      'Carbon Credits / Preservation'
    ]}
    value={fields.thesis}
    onChange={(e) => setFields({...fields, thesis: e.target.value})}
  />

  <div className="pt-4 border-t border-gray-100">
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-4">
      Are you a Politically Exposed Person (PEP) or closely related to one? <span className="text-red-500">*</span>
    </label>

    <div className="flex gap-8">
      {['No', 'Yes'].map((option) => (
        <label key={option} className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center">
            <input
              type="radio"
              name="pep-declaration"
              value={option}
              checked={fields.pep === option}
              onChange={(e) => setFields({...fields, pep: e.target.value})}
              className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-gray-300 rounded-full checked:border-[#2c5363] transition-all"
            />
            <div className="absolute w-2.5 h-2.5 bg-[#2c5363] rounded-full scale-0 peer-checked:scale-100 left-1.25 top-1.25 transition-transform mx-auto inset-0 my-auto"></div>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${fields.pep === option ? 'text-[#2c5363]' : 'text-gray-400 group-hover:text-[#bba219]'}`}>
            {option}
          </span>
        </label>
      ))}
    </div>

    {fields.pep === 'Yes' && (
      <div className="mt-4 p-4 bg-red-50 border-l-2 border-red-500 animate-slideDown">
        <p className="text-[10px] font-bold text-red-700 uppercase tracking-tight leading-relaxed">
          <strong className="block mb-1">Enhanced Due Diligence Required:</strong>
          As a PEP, your application will undergo a specialized compliance review by our legal committee in accordance with international AML standards.
        </p>
      </div>
    )}
  </div>

<hr className="border-gray-200" />

</div>


      </div>
    </section>


  </div>
)}

{privateOrigin === 'BR' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

<div className="relative">
  <InputLine
    label="CPF / CNPJ"
    placeholder="000.000.000-00"
    value={fields.doc}
    onChange={handleDocChange}
  />

  <div className="absolute right-0 bottom-3">
    {docStatus === 'valid' && (
      <span className="text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        Autenticado
      </span>
    )}
    {docStatus === 'invalid' && (
      <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 animate-bounce">
        Documento Inválido
      </span>
    )}
  </div>
</div>
            <InputLine
              label="Nome Completo / Razão Social"
              placeholder="Identificação oficial"
              value={fields.nome}
              onChange={(e) => setFields({...fields, nome: e.target.value})}
            />
            {/* CAMPO DE TELEFONE */}
<div className="space-y-4">
    <div className="relative border-b border-gray-200 focus-within:border-[#bba219] transition-all pb-1 flex items-center">
      <PhoneInput
        country={fields.countryCode?.toLowerCase() || 'us'}
        value={fields.phone}
        onChange={(phone) => setFields({...fields, phone: '+' + phone})}
        enableSearch={true}
        placeholder="Enter phone number"
        containerClass="prylom-phone-container"
        inputClass="prylom-phone-input"
        buttonClass="prylom-phone-button"
        dropdownClass="prylom-phone-dropdown"
        specialLabel=""
      />
      {!smsSent && fields.phone.length >= 14 && (
        <button
          onClick={handleSendCode}
          className="absolute right-0 bottom-2 text-[9px] font-black text-[#bba219] uppercase tracking-widest hover:underline"
        >
          {isVerifying ? "Enviando..." : "Validar via WhatsApp"}
        </button>
      )}
    </div>

   {smsSent && (
  <div className={`animate-fadeIn p-6 rounded-lg border transition-all duration-500 ${isCodeValid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'} space-y-4`}>
    <div className="flex justify-between items-center">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2c5363]">
        Código de Verificação
      </label>
      {isCodeValid ? (
        <span className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          WhatsApp Validado
        </span>
      ) : (
        <span className="text-[9px] font-bold text-[#bba219] uppercase">Confirme o código recebido</span>
      )}
    </div>

    <div className="relative">
      <input
        maxLength={6}
        disabled={isCodeValid || isVerifying}
        value={smsCode}
        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
        placeholder={isVerifying ? "..." : "000000"}
        className={`w-full py-4 text-center text-xl font-black tracking-[0.5em] outline-none transition-all
          ${isCodeValid ? 'bg-transparent text-green-700' : 'bg-white border border-gray-200 focus:border-[#bba219] text-[#2c5363]'}
          ${codeError ? 'border-red-500 animate-shake' : ''}
        `}
      />
      {isVerifying && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="w-5 h-5 border-2 border-[#bba219] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>

    {!isCodeValid && (
      <p className="text-[9px] text-gray-400 font-medium uppercase text-center">
        Não recebeu? <button type="button" onClick={handleSendCode} className="text-[#bba219] font-bold hover:underline">Reenviar código</button>
      </p>
    )}
  </div>
    )}
  </div>

  {/* COLUNA EMAIL */}
  <div className="flex flex-col justify-start">
    <InputLine
      label="E-mail Principal / Corporativo"
      placeholder="contato@empresa.com"
      type="email"
      value={fields.email}
      onChange={(e) => setFields({...fields, email: e.target.value})}
    />
  </div>
          </div>



        </div>
      )}

<div className="space-y-4">


<div className="md:col-span-2 space-y-4 bg-gray-50 p-8 rounded-sm border border-dashed border-gray-200 relative pt-10">
  <div className="absolute top-4 left-0 w-full flex justify-center pointer-events-none">
    <span className="text-[7px] font-black text-[#bba219] uppercase tracking-[0.2em] opacity-80">
      Encrypted upload • Tier 1 Financial Privacy
    </span>
  </div>

  <label className="text-[10px] font-black uppercase text-[#2c5363] flex items-center justify-center gap-2">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    Proof of Funds (POF) *
  </label>

  <p className="text-[9px] text-gray-400 uppercase font-bold text-center italic leading-relaxed">
    ATTACH PROOF OF INVESTMENT CAPACITY (STATEMENT, BANK LETTER, OR CUSTODY REPORT).
  </p>

  <div className={`flex justify-center transition-all duration-500 ${fields.pofDuringScreening ? 'opacity-20 grayscale pointer-events-none' : 'opacity-100'}`}>
    <div className="relative group">
      <input
        type="file"
        id="pof-upload"
        accept=".pdf,image/*"
        required={!fields.pofDuringScreening}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        onChange={(e) => setFields({...fields, pofFile: e.target.files ? e.target.files[0] : null})}
      />

      <div className="flex items-center gap-4 bg-white border border-gray-200 py-2 px-6 rounded-full shadow-sm group-hover:border-[#bba219] transition-all">
        <div className="bg-[#2c5363] text-white text-[9px] font-black uppercase px-3 py-1 rounded-full group-hover:bg-[#bba219]">
          Choose File
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate max-w-[150px]">
          {fields.pofFile ? fields.pofFile.name : "No file selected"}
        </span>
      </div>

      {fields.pofFile && (
        <span className="absolute -right-24 top-2 text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Attached
        </span>
      )}
    </div>
  </div>

  <div className="pt-4 border-t border-gray-200 mt-4">
    <label className="flex items-center justify-center gap-3 cursor-pointer group">
      <div className="relative flex items-center">
        <input
          type="checkbox"
          className="peer h-4 w-4 cursor-pointer appearance-none border-2 border-gray-300 rounded-sm checked:bg-[#bba219] checked:border-[#bba219] transition-all"
          checked={fields.pofDuringScreening}
          onChange={(e) => setFields({...fields, pofDuringScreening: e.target.checked})}
        />
        <svg className="absolute h-3 w-3 text-[#2c5363] opacity-0 peer-checked:opacity-100 pointer-events-none left-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-[9px] font-black uppercase tracking-tight text-[#2c5363] group-hover:text-[#bba219] transition-colors text-center">
        I opt to present my proof of funds confidentially to the Board <br className="hidden md:block"/> during the Screening Meeting.
      </span>
    </label>
  </div>
</div>

      {/* AGENDAMENTO */}
      <div className="md:col-span-2 space-y-6">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#2c5363]">
          AGENDAMENTO DE ALINHAMENTO ESTRATÉGICO (COM A DIRETORIA) *
        </label>

        <div className="bg-white border border-gray-200 p-8 rounded-sm shadow-sm grid grid-cols-1 md:grid-cols-2 gap-10">

          <div className="space-y-3">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">1. Selecione a Data:</p>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={fields.meetingDate}
              onChange={(e) => setFields({...fields, meetingDate: e.target.value})}
              className="w-full bg-transparent border-b-2 border-gray-100 py-3 text-sm font-black text-[#2c5363] outline-none focus:border-[#bba219] transition-all cursor-pointer"
            />
          </div>

          <div className="space-y-4">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">2. Janela de Horário (Brasília):</p>
            <div className="grid grid-cols-3 gap-2">
              {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setFields({...fields, meetingTime: time})}
                  className={`py-2 text-[10px] font-black border rounded-sm transition-all
                    ${fields.meetingTime === time ? 'bg-[#2c5363] border-[#2c5363] text-white' : 'bg-transparent border-gray-100 text-gray-400 hover:border-[#2c5363] hover:text-[#2c5363]'}
                  `}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 pt-4 border-t border-gray-50">
             <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest italic text-center">
               * Agendamento sujeito a confirmação técnica via WhatsApp ou E-mail.
             </p>
          </div>
        </div>
      </div>
    </div>

{privateOrigin==='INT' &&(<button
  onClick={() => setSubStep(3)}
  disabled={
    (!fields.companyName && !fields.nome) ||
    (!fields.pofFile && !fields.pofDuringScreening) ||
    !isCodeValid ||
    !fields.scope ||
    !fields.investorType ||
    !fields.country ||
    !fields.taxId ||
    !fields.repName ||
    !fields.passportFile ||
    !fields.ticketSize ||
    !fields.sourceFunds ||
    !fields.thesis
  }
  className={`w-full py-6 font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl
    ${(
      (!fields.companyName && !fields.nome) ||
      (!fields.pofFile && !fields.pofDuringScreening) ||
      !isCodeValid ||
      !fields.scope ||
      !fields.investorType ||
      !fields.country ||
      !fields.taxId ||
      !fields.repName ||
      !fields.passportFile ||
      !fields.ticketSize ||
      !fields.sourceFunds ||
      !fields.thesis
    )
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : 'bg-[#2c5363] text-white hover:bg-[#bba219] active:scale-95'}
  `}
>
  {(!fields.companyName && !fields.nome) ? "Enter Company Name" :
   (!fields.pofFile && !fields.pofDuringScreening) ? "Attach POF or Select Screening" :
   !isCodeValid ? "Verify WhatsApp to Proceed" :
   !fields.scope ? "Select NDA Scope" :
   !fields.investorType ? "Select Investor Type" :
   !fields.country ? "Select Country" :
   !fields.taxId ? "Enter Tax ID" :
   !fields.repName ? "Enter Representative Name" :
   !fields.passportFile ? "Upload Passport/ID" :
   !fields.ticketSize ? "Select Ticket Size" :
   !fields.sourceFunds ? "Enter Source of Funds" :
   !fields.thesis ? "Enter Investment Thesis" :
   "Generate NCND Agreement"}
</button>) }

{privateOrigin==='BR' &&(<button
  onClick={() => setSubStep(3)}
  disabled={
    (!fields.companyName && !fields.nome) ||
    (!fields.pofFile && !fields.pofDuringScreening) ||
    !isCodeValid ||
    !fields.scope
  }
  className={`w-full py-6 font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl
    ${((!fields.companyName && !fields.nome) || (!fields.pofFile && !fields.pofDuringScreening) || !isCodeValid || !fields.scope)
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : 'bg-[#2c5363] text-white hover:bg-[#bba219] active:scale-95'}
  `}
>
  {(!fields.companyName && !fields.nome) ? "Enter Company Name" :
   (!fields.pofFile && !fields.pofDuringScreening) ? "Attach POF or Select Screening" :
   !isCodeValid ? "Verify WhatsApp to Proceed" :
   !fields.scope ? "Select NDA Scope" :
   "Generate NCND Agreement"}
</button>)}

  </div>
)}

{subStep === 3 && (
  <>
    {/* --- FLUXO NACIONAL (BR) --- */}
    {privateOrigin === 'BR' && (
  <div className="space-y-8 animate-fadeIn text-left text-[#2c5363]">
    <div className="mb-6 border-l-4 border-[#bba219] pl-4">
      <h3 className="text-xl font-black uppercase tracking-tighter">Qualificação do Investidor</h3>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ajuste o perfil para carregar as métricas de aporte</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
      <SelectLine
        label="Qual seu perfil principal? *"
        value={fields.perfil}
        onChange={(e) => setFields({...fields, perfil: e.target.value})}
        options={['Selecione...', 'Produtor Rural', 'Investidor Patrimonial', 'Representante Legal']}
      />

      <SelectLine
        label="Capacidade de Aporte *"
        value={fields.capacidadeAporte}
        onChange={(e) => setFields({...fields, capacidadeAporte: e.target.value})}
        options={['Selecione...', 'Recursos Próprios', 'Financiamento', 'Troca/Permuta']}
      />
{fields.capacidadeAporte === 'Troca/Permuta' && (
        <div className="md:col-span-2">
          <InputLine
            label="Natureza do ativo ofertado em permuta *"
            placeholder="Descreva brevemente o ativo (Ex: Imóveis urbanos, frotas, outras áreas...)"
            value={fields.descricaoPermuta}
            onChange={(e) => setFields({...fields, descricaoPermuta: e.target.value})}
          />
        </div>
      )}
      {fields.perfil === 'Produtor Rural' && (
        <>
          <InputLine
            label="Quantos hectares planta atualmente? *"
            placeholder="0.000 ha"
            value={fields.hectares}
            onChange={(e) => setFields({...fields, hectares: e.target.value})}
          />
          <InputLine
            label="Em quais estados atua? *"
            placeholder="Ex: MT, GO, MG"
            value={fields.estadosAtuacao}
            onChange={(e) => setFields({...fields, estadosAtuacao: e.target.value})}
          />
        </>
      )}

{fields.perfil === 'Representante Legal' && (
  <>
    <InputLine
      label="Número CRECI ou OAB *"
      placeholder="Digite sua inscrição profissional"
      value={fields.creciOab}
      onChange={(e) => setFields({...fields, creciOab: e.target.value})}
    />

    <InputLine
      label="Nome do Cliente Representado *"
      placeholder="Nome completo do comprador final"
      value={fields.clienteRepresentadoNome}
      onChange={(e) => setFields({...fields, clienteRepresentadoNome: e.target.value})}
    />

    <InputLine
      label="CPF / CNPJ do Cliente Representado *"
      placeholder="000.000.000-00"
      value={fields.clienteRepresentadoDoc}
      onChange={(e) => {
        setFields({...fields, clienteRepresentadoDoc: e.target.value})
      }}
    />
  </>
)}

      <SelectLine
        label="Você é uma Pessoa Exposta Politicamente (PEP)? *"
        value={fields.pep}
        onChange={(e) => setFields({...fields, pep: e.target.value})}
        options={['Não', 'Sim']}
      />
    </div>
{fields.capacidadeAporte === 'Recursos Próprios' && (
      <div className="mt-4 p-6 bg-gray-50 border border-gray-100 rounded-sm space-y-4">
        <label className="flex gap-4 cursor-pointer group">
          <div className="mt-1">
            <input
              type="checkbox"
              className="sr-only"
              checked={fields.declaracaoOrigem}
              onChange={(e) => setFields({...fields, declaracaoOrigem: e.target.checked})}
            />
            <div className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${fields.declaracaoOrigem ? 'bg-[#2c5363] border-[#2c5363]' : 'bg-white border-gray-300 group-hover:border-[#bba219]'}`}>
              {fields.declaracaoOrigem && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2c5363]">
              DECLARAÇÃO DE ORIGEM DE FUNDOS E COMPLIANCE COAF *
            </span>
            <p className="text-[10px] leading-relaxed font-medium text-gray-500 uppercase">
              Declaro ciência de que a Prylom opera sob rigorosas políticas de Prevenção à Lavagem de Dinheiro.
              Compreendo que não são aceitos pagamentos em espécie e que a integralidade dos recursos utilizados
              nas transações deve possuir origem lícita e rastreabilidade bancária comprovada, sujeita às
              normativas do COAF e Banco Central.
            </p>
          </div>
        </label>
      </div>
    )}
    {fields.perfil === 'Investidor Patrimonial' && (
        <div className="md:col-span-2">
          <SelectLine
            label="Tipo de Investidor Patrimonial *"
            value={fields.tipoPatrimonial}
            onChange={(e) => setFields({...fields, tipoPatrimonial: e.target.value})}
            options={[
              'Selecione...',
              'Family Office / Multi-Family Office',
              'Holding Patrimonial / PJ',
              'Fundo de Investimento (FII / FIP)',
              'Pessoa Física (Diversificação de Portfólio)'
            ]}
          />
        </div>
      )}
      {fields.capacidadeAporte === 'Financiamento' && (
        <>
          <SelectLine
            label="Modalidade de Captação Prevista *"
            value={fields.modalidadeCaptacao}
            onChange={(e) => setFields({...fields, modalidadeCaptacao: e.target.value})}
            options={[
              'Selecione...',
              'Mercado de Capitais (Emissão de CRI / CRA / Fiagro)',
              'Cédula de Produto Rural (CPR Financeira / Física)',
              'Crédito Rural Tradicional / Repasses (BNDES / FCO)'
            ]}
          />
          <SelectLine
            label="Status de Aprovação do Crédito *"
            value={fields.statusCredito}
            onChange={(e) => setFields({...fields, statusCredito: e.target.value})}
            options={[
              'Selecione...',
              'Crédito Pré-Aprovado / Limite de Risco Liberado',
              'Em fase de estruturação / Análise de Comitê',
              'Necessito de assessoria para estruturação de capital'
            ]}
          />
        </>
      )}

<button
  onClick={handleFinalSubmit}
  disabled={
    isVerifying ||
    !fields.perfil || fields.perfil === 'Selecione...' ||
    !fields.capacidadeAporte || fields.capacidadeAporte === 'Selecione...' ||
    !fields.meetingDate || !fields.meetingTime ||
    (fields.capacidadeAporte === 'Recursos Próprios' && !fields.declaracaoOrigem)
  }
  className={`w-full py-6 font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl mt-8 flex items-center justify-center gap-3
    ${(isVerifying || !fields.perfil || !fields.meetingDate || (fields.capacidadeAporte === 'Recursos Próprios' && !fields.declaracaoOrigem))
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : 'bg-[#2c5363] text-white hover:bg-[#bba219] active:scale-95'}
  `}
>
  {isVerifying ? (
    <>
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      Processando Protocolo...
    </>
  ) : "Finalizar Mandato Private"}
</button>
  </div>
)}

    {/* --- FLUXO INTERNACIONAL (INT) --- */}
    {privateOrigin === 'INT' && (
  <div className="space-y-6 animate-fadeIn">
    <div className="bg-[#2c5363]/5 p-6 border-l-4 border-[#bba219]">
      <p className="text-[11px] font-black uppercase text-[#2c5363] tracking-widest">
        Confirmação de Mandato Internacional
      </p>
      <p className="text-[10px] text-gray-500 font-medium uppercase mt-2">
        Ao finalizar, seus documentos serão processados via criptografia de ponta a ponta para análise do comitê de compliance.
      </p>
    </div>

    <button
      onClick={handleFinalSubmit}
      disabled={isVerifying || !fields.meetingDate || !fields.meetingTime}
      className={`w-full py-6 font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl flex items-center justify-center gap-3
        ${(isVerifying || !fields.meetingDate || !fields.meetingTime)
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-[#2c5363] text-white hover:bg-[#bba219] active:scale-95'}
      `}
    >
      {isVerifying ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Processing...
        </>
      ) : "Finalize & Secure Mandate"}
    </button>
  </div>
)}
  </>
)}

{subStep === 4 && (
  privateOrigin === 'BR' ? (
    <div className="py-20 px-6 text-center space-y-10 animate-fadeIn flex flex-col items-center justify-center min-h-[500px] bg-[#2c5363] text-white rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#bba219]/20">
        <div className="h-full bg-[#bba219] w-1/3 animate-pulse"></div>
      </div>
      <div className="relative">
        <div className="w-24 h-24 border border-white/10 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-[#bba219]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="absolute inset-0 w-24 h-24 border-t-2 border-[#bba219] rounded-full animate-spin"></div>
      </div>
      <div className="space-y-4">
        <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">
          Solicitação em Análise de <br/>
          <span className="text-[#bba219]">Compliance</span>
        </h3>
        <p className="text-[10px] font-black text-[#bba219] uppercase tracking-[0.3em] opacity-60">STATUS: CRIPTOGRAFADO E AUTENTICADO</p>
      </div>
      <div className="space-y-6 text-sm font-light leading-relaxed max-w-lg opacity-90 uppercase tracking-wide">
        <p>
          Obrigado, <span className="font-black text-white">{(fields.nome || fields.companyName || '').split(' ')[0] || 'Investidor'}</span>.
          Seus dados foram recebidos e protegidos por criptografia de ponta a ponta.
        </p>
        <div className="bg-black/20 p-6 rounded-lg space-y-2 border border-white/5">
          <p className="text-[10px] font-bold text-[#bba219] uppercase tracking-widest leading-none">SLA DE ANÁLISE DO COMITÊ :</p>
          <p className="text-xl font-black italic tracking-tighter text-white">ATÉ 24 HORAS ÚTEIS</p>
        </div>
        <p className="text-[10px] text-gray-400 font-medium max-w-xs mx-auto">
          O acesso ao Data Room será enviado via <span className="text-white">E-mail</span> e <span className="text-white">WhatsApp</span> após aprovação do comitê.
        </p>
      </div>
      <div className="pt-8 w-full max-w-xs">
        <button
          onClick={onBack}
          className="w-full bg-white text-[#2c5363] py-5 rounded-sm font-black text-[11px] uppercase tracking-[0.3em] hover:bg-[#bba219] hover:text-white transition-all shadow-xl active:scale-95"
        >
          Finalizar e Sair
        </button>
      </div>
    </div>
  ) : (
    <div className="py-16 px-6 text-center space-y-8 bg-[#2c5363] text-white rounded-xl animate-fadeIn">
      <div className="w-20 h-20 border-2 border-[#bba219]/30 rounded-full flex items-center justify-center mx-auto relative">
        <div className="absolute inset-0 border-t-2 border-[#bba219] rounded-full animate-spin"></div>
        <span className="text-xs">KYC/AM</span>
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-black uppercase tracking-tighter">Under Compliance Review</h3>
        <p className="text-[9px] text-[#bba219] font-black uppercase tracking-[0.3em]">EXECUTING KYC & COMPLIANCE CLEARANCE...</p>
      </div>
      <p className="text-xs font-light leading-relaxed max-w-sm mx-auto opacity-70 uppercase tracking-widest">
        Thank you. Our international desk is validating your accreditation. ESTIMATED CLEARANCE TIME: 24 TO 48 HOURS.
      </p>
      <button onClick={onBack} className="bg-white text-[#2c5363] px-8 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-[#bba219] hover:text-white transition-all">
        RETURN TO PORTFOLIO
      </button>
    </div>
  )
)}
    </div>
  );
};

export default PrivateProtocol;
