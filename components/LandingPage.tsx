import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../supabaseClient';
import { AppLanguage, AppCurrency } from '../types';
import landingPrylom from "../assets/landingPrylom.jpeg";
import professorHernandez from "../assets/professor-hernandez.jpg";
import { useParams, useNavigate } from 'react-router-dom';

import { 
  ArrowLeft, 
  Share2, 
  MapPin, 
  Shield, 
  FileText, 
  Download, Lock // <--- ADICIONE ESTE AQUI
} from 'lucide-react';

interface Props {
  onSelectOwner: () => void;
  onSelectBroker: () => void;
  onSelectTools: () => void;
  onSelectValuation: () => void;
  onSelectMarket: () => void;
  onSelectShopping: () => void;
  onSelectLegal: () => void;
  t: any;
  lang: AppLanguage;
  currency?: AppCurrency;
}

const LandingPage: React.FC<Props> = ({ 
  onSelectOwner, 
  onSelectBroker, 
  onSelectTools, 
  onSelectValuation, 
  onSelectMarket, 
  onSelectShopping, 
  onSelectLegal,
  t,
  lang
}) => {
  const [belleMessage, setBelleMessage] = useState('');
  const [belleChat, setBelleChat] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [loadingBelle, setLoadingBelle] = useState(false);
  const [inventorySummary, setInventorySummary] = useState<string>('');
  const belleScrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    fetchInventorySummary();
  }, []);

  useEffect(() => {
    if (belleScrollRef.current) {
      belleScrollRef.current.scrollTop = belleScrollRef.current.scrollHeight;
    }
  }, [belleChat]);

  const fetchInventorySummary = async () => {
    try {
      const { data } = await supabase.from('produtos').select('titulo, categoria, cidade, estado, valor, tipo_transacao');
      if (data) {
        const summary = data.map(p => `${p.titulo} (${p.categoria}) em ${p.cidade}-${p.estado}, tipo: ${p.tipo_transacao}`).join('; ');
        setInventorySummary(summary);
      }
    } catch (e) { console.error("Error fetching inventory for Belle", e); }
  };

 const handleBelleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!belleMessage.trim()) return;
  
  const userText = belleMessage;
  setBelleMessage('');
  setBelleChat(prev => [...prev, { role: 'user', text: userText }]);
  setLoadingBelle(true);

  try {
    // Captura o usuário logado no Supabase
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || "Usuário não identificado";

    const response = await fetch('https://webhook.saveautomatik.shop/webhook/belleAI', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,           // E-mail do usuário logado
        message: userText,         // Mensagem digitada
        inventory: inventorySummary, 
        language: lang,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) throw new Error('Falha na comunicação');

    const data = await response.json();

    setBelleChat(prev => [...prev, { 
      role: 'bot', 
      text: data.response // O campo que configuraremos no seu Webhook
    }]);

  } catch (e) {
    console.error("Webhook Error:", e);
    setBelleChat(prev => [...prev, { 
      role: 'bot', 
      text: "Desculpe, meu terminal de conexão externa está offline no momento." 
    }]);
  } finally {
    setLoadingBelle(false);
  }
};
  const modules = [
    { 
      click: onSelectShopping, 
      icon: "🛒", 
      label: t.btnShopping, 
      desc: "Ativos exclusivos e oportunidades off-market com curadoria técnica.",
      color: "bg-white",
      span: "md:col-span-2"
    },
        { 
      click: onSelectTools, 
      icon: "🛠️", 
      label: t.btnTools, 
      desc: "Cálculos de barter, logística e viabilidade econômica.",
      color: "bg-white",
      span: "md:col-span-1"
    },
        { 
      click: onSelectLegal, 
      icon: "📑", 
      label: t.btnLegal, 
      desc: "Suporte técnico por IA em agronomia, zootecnia e jurídico.",
      color: "bg-gray-50",
      span: "md:col-span-1"
    },
    { 
      click: onSelectMarket, 
      icon: "📈", 
      label: t.btnMarket, 
      desc: "Terminal em tempo real com preços CBOT e radar global.",
      color: "bg-gray-50",
      span: "md:col-span-1"
    },
    { 
      click: onSelectValuation, 
      icon: "📋", 
      label: t.btnValuation, 
      desc: "Auditória técnica e avaliação oficial de valor de mercado.",
      color: "bg-prylom-dark",
      text: "text-white",
      iconBg: "bg-white/10",
      span: "md:col-span-1"
    }
  ];

  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);
  

  return (
    <div className="w-full flex flex-col animate-fadeIn bg-[#FDFCFB]">
      
      {/* SECTION 1: HERO */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden bg-prylom-dark px-6">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2400" 
            alt="Agro Prylom Horizon" 
            className="w-full h-full object-cover opacity-60 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-prylom-dark/80 via-prylom-dark/40 to-[#FDFCFB]"></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 mb-10 shadow-2xl animate-fadeIn">
            <span className="w-2 h-2 bg-prylom-gold rounded-full animate-pulse shadow-[0_0_15px_#d4a017]"></span>
            <span className="text-white text-[10px] font-black uppercase tracking-[0.5em]">Digital Intelligence Terminal</span>
          </div>
          <h1 className="text-6xl md:text-[7rem] lg:text-[9rem] font-black text-white mb-10 leading-[0.85] tracking-tighter drop-shadow-2xl">
            O Futuro dos <br/>
            <span className="text-prylom-gold">Ativos Rurais</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto font-medium leading-relaxed tracking-tight mb-14">
            Conectamos o ecossistema do agronegócio através de um terminal consultivo de alta tecnologia, segurança documental e inteligência de mercado.
          </p>
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <button onClick={onSelectTools} className="group bg-prylom-gold text-white font-black px-16 py-7 rounded-full text-[11px] uppercase tracking-[0.3em] shadow-3xl hover:bg-white hover:text-prylom-dark transition-all duration-500 w-full md:w-auto transform hover:-translate-y-2 flex items-center justify-center gap-3">
              Inteligência Agro
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button onClick={onSelectShopping} className="bg-white/10 backdrop-blur-md text-white border border-white/30 font-black px-16 py-7 rounded-full text-[11px] uppercase tracking-[0.3em] hover:bg-white hover:text-prylom-dark transition-all duration-500 w-full md:w-auto transform hover:-translate-y-2">
              Explorar Ativos
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE ECOSYSTEM GRID */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <header className="max-w-4xl mx-auto text-center mb-24 space-y-4">
            <span className="text-prylom-gold font-black uppercase text-[11px] tracking-[0.5em] block">Full Stack Solutions</span>
            <h2 className="text-4xl md:text-6xl font-black text-[#2c5363] tracking-tighter uppercase leading-none">
              Ecossistema <span className="italic font-light text-prylom-dark">Prylom</span>
            </h2>
            <p className="text-gray-500 text-lg font-medium max-w-2xl mx-auto">
              Integramos cinco pilares estratégicos para garantir que cada etapa do seu negócio agro seja baseada em dados e segurança.
            </p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {modules.map((m, idx) => (
              <div key={idx} onClick={m.click} className={`${m.span} ${m.color} ${m.text || 'text-prylom-dark'} p-12 rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer group flex flex-col justify-between overflow-hidden relative`}>
                <div className="relative z-10">
                  <div className={`${m.iconBg || 'bg-gray-100'} w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl mb-10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                    {m.icon}
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-4">{m.label}</h3>
                  <p className={`text-base font-medium opacity-60 leading-relaxed max-w-xs mb-8`}>{m.desc}</p>
                </div>
                <button className="relative z-10 w-fit text-[10px] font-black uppercase tracking-widest border-b-2 border-current pb-1 group-hover:text-prylom-gold group-hover:border-prylom-gold transition-colors">
                  Acessar Terminal
                </button>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className="text-9xl font-black">{idx + 1}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

<section className="py-16 md:py-20 px-6 bg-[#F8F9FA] relative overflow-hidden">
  <div className="max-w-6xl mx-auto">
    {/* Grid Principal: items-stretch garante que a imagem e o texto terminem na mesma linha */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
      
      {/* COLUNA DE TEXTO */}
      <div className="space-y-6 flex flex-col justify-center">
<header className="flex flex-col items-start">
  {/* Removido space-y-2 para garantir alinhamento seco na esquerda */}
  <span className="text-prylom-gold font-black uppercase text-[10px] tracking-[0.4em] block mb-1">
    Deal Flow
  </span>
  <h3 className="text-4xl md:text-5xl font-[1000] text-prylom-dark tracking-tighter leading-[0.85] uppercase">
    A Jornada do <br/> 
    <span className="text-prylom-gold">Ativo Prylom</span>
  </h3>
  <p className="text-prylom-gold font-bold text-base mt-3">
    Ciclo de M&A e Originação Estratégica
  </p>
</header>

        {/* Lista de passos com texto JUSTIFICADO */}
        <div className="space-y-6">
          {[
            { 
              step: "01", 
              title: "Curadoria e Inteligência Agronômica", 
              desc: "O ativo entra em nossa esteira passando por um rigoroso pente-fino de dados geoclimáticos, capacidade de solo e conformidade documental primária (Due Diligence inicial). Transformamos informações declaratórias em uma Tese de Propriedade Rural sólida e estruturada." 
            },
            { 
              step: "02", 
              title: "Exposição Institucional (Deep Market)", 
              desc: "Com o Teaser e o Data Room formatados, o ativo sai da obscuridade e é apresentado de forma ativa — e sob rigoroso protocolo de sigilo (Master NDA) — exclusivamente a Fundos de Private Equity, Family Offices e Capital Estrangeiro através do nosso International Desk." 
            },
            { 
              step: "03", 
              title: "Liquidez Estratégica (M&A e Closing)", 
              desc: "Nossa Mesa de Operações assume a linha de frente (Takeover). Coordenamos o fluxo de negociação, alinhamento de valuation e a estruturação transacional final, convertendo a tese do ativo em liquidez com máxima segurança corporativa para ambas as partes." 
            }
          ].map((item, i) => (
            <div key={i} className="flex gap-5 group">
              <div className="text-3xl font-black text-prylom-gold opacity-30 group-hover:opacity-100 transition-opacity leading-none">
                {item.step}
              </div>
              <div className="space-y-1 w-full">
                <h4 className="text-lg font-black text-prylom-dark uppercase tracking-tighter">
                  {item.title}
                </h4>
                {/* Texto agora com alinhamento JUSTIFY */}
                <p className="text-gray-500 font-medium leading-relaxed text-xs md:text-sm text-justify">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COLUNA DA IMAGEM - Sincronizada com a altura do texto justificado */}
      <div className="relative flex">
        <div className="bg-white rounded-[3rem] overflow-hidden shadow-xl border border-gray-100 w-full flex">
          <img 
            src={landingPrylom} 
            className="w-full h-full object-cover" 
            alt="Processo Prylom" 
          />
        </div>
      </div>
    </div>

    {/* MANIFESTO CENTRALIZADO */}
    <div className=" max-w-3xl mx-auto text-center border-t border-gray-100 pt-10">
      <p className="text-prylom-dark text-lg md:text-2xl font-[950] uppercase tracking-tighter leading-tight italic px-4">
        "Não intermediamos terras. <br className="hidden md:block" />
        <span className="text-prylom-gold">
          Elevamos o agronegócio brasileiro ao padrão de exigência do capital institucional global.
        </span>"
      </p>
    </div>
    
  </div>
</section>



<section className="py-16 md:py-20 px-6 bg-white border-t border-gray-100 font-sans">
  <div className="max-w-6xl mx-auto">
    
    {/* CARD PRINCIPAL COM FUNDO CINZA CLARO */}
    <div className="bg-[#f8f9fa] rounded-[2rem] p-8 md:p-14 border border-gray-200 shadow-sm">
      
      {/* TÍTULO PRINCIPAL CENTRALIZADO */}
      <h2 className="text-2xl md:text-3xl font-black text-prylom-dark mb-12 text-center tracking-[0.2em] uppercase">
        QUEM SOMOS:
      </h2>
      
      {/* GRID DE DUAS COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-stretch">
        
        {/* COLUNA ESQUERDA */}
        <div className="flex flex-col">
          <div className="mb-10">
            <h3 className="text-xl font-bold text-prylom-gold mb-4">
              A Nossa História é a Sua
            </h3>
            
            <div className="text-gray-500 leading-relaxed text-justify space-y-4 text-sm md:text-base">
              <p>
                O agronegócio é feito de suor, de sol e de dedicação. É a história de mãos calejadas que plantam e colhem, de famílias que constroem seu futuro no campo, tijolo por tijolo. Mas, em meio a toda essa paixão e trabalho duro, os negócios se tornaram complexos.
              </p>
              <p>
                Onde encontrar o maquinário certo? Como vender a fazenda sem dor de cabeça? Como comercializar a safra ou negociar sem perder o sono?
              </p>
              <p>
                Foi para responder a essas perguntas e simplificar a sua vida que a <strong>Prylom Agronegócios</strong> nasceu. <strong>Tudo em um único lugar.</strong> Nós não somos apenas uma empresa; somos o seu parceiro de confiança, um hub de conexão no agronegócio. Acreditamos que a confiança é o nosso maior ativo, e a segurança, o nosso principal produto.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-prylom-gold uppercase tracking-wider mb-4">
              NOSSO PROPÓSITO E VALORES
            </h3>
            <ul className="space-y-3 text-gray-500 text-justify text-sm md:text-base">
              <li className="flex gap-2">
                <span className="text-prylom-gold">•</span>
                <span><strong className="text-[#002147]">Nossa Missão:</strong> Ser o parceiro estratégico do agronegócio, unindo a expertise de nosso ecossistema de soluções para garantir negócios sólidos, seguros e altamente rentáveis para você.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-prylom-gold">•</span>
                <span><strong className="text-[#002147]">Nossa Visão:</strong> Ser a principal referência do agronegócio, reconhecida por centralizar e simplificar todas as etapas de negociação e otimização de investimentos, consolidando-se como o ecossistema mais confiável do setor.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-prylom-gold">•</span>
                <span><strong className="text-[#002147]">Nossos Valores:</strong> Confiança, Segurança, Expertise, Ética e Tradição.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="flex flex-col">
          <div className="mb-10">
            <h3 className="text-xl font-bold text-prylom-dark mb-4 uppercase">
              O ECOSSISTEMA PRYLOM
            </h3>
            <div className="text-gray-500 leading-relaxed text-justify text-sm md:text-base">
              <p>
                Enquanto o mercado atua de forma fragmentada, a Prylom se posiciona como um verdadeiro ecossistema integrado de negócios. Nosso maior patrimônio não é apenas o que negociamos, mas quem nós conectamos. Nós unimos o capital produtivo à expertise operacional, gerando valor e oportunidades em todas as etapas da cadeia do agronegócio.
              </p>
            </div>
          </div>

          <div className="flex-grow">
            <h3 className="text-lg font-bold text-prylom-gold mb-4">
              O Ciclo do Ativo:
            </h3>
            <div className="text-gray-500 leading-relaxed space-y-4 text-justify text-sm md:text-base">
              <p>
                Pense na jornada de um grande ativo rural. Quando um investidor ou um produtor consolida a negociação de uma propriedade através da nossa mesa, a nossa atuação vai muito além do aperto de mão. Nós ativamos a nossa rede estratégica para conectar essa nova fazenda a tudo o que ela precisa para iniciar ou expandir sua produção.
              </p>
              <p>
                Do mapeamento e inteligência agronômica até as conexões com as melhores tecnologias de maquinário e vias de comercialização de safra, nós intermediamos o relacionamento entre o proprietário e os parceiros mais sólidos do mercado.
              </p>
              <p>
                Para os nossos clientes, isso significa previsibilidade e força corporativa. É um ciclo contínuo de confiança: nós mapeamos a oportunidade, estruturamos a transação e integramos as pontas certas para que o seu negócio atinja a máxima performance operacional. Tudo centralizado em um único Hub.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ COM LINKS/BOTÕES ESTILO IMAGEM */}
      <div className="flex justify-around md:justify-end md:gap-24 pt-12">
        <button className="text-prylom-gold font-bold text-base md:text-lg border-b-2 border-transparent hover:border-[#b8975d] transition-all pb-1">
          Inteligência Agro
        </button>
        <button className="text-prylom-gold font-bold text-base md:text-lg border-b-2 border-transparent hover:border-[#b8975d] transition-all pb-1">
          Explorar Ativo
        </button>
      </div>
    </div>
  </div>
</section>

      {/* SECTION 5: BELLE — AGENTE DE IA (ABAIXO DE VISÃO SOBERANA) */}
<section className="py-32 px-6 bg-[#FDFCFB] border-t border-gray-100">
  <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start"> {/* items-start para não esticar a lateral */}
    
    {/* COLUNA ESQUERDA: TEXTO E SUGESTÕES */}
    <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-32"> {/* sticky para acompanhar o chat longo */}
      <div className="inline-flex items-center gap-4 bg-prylom-gold/10 p-2 pr-6 rounded-full border border-prylom-gold/20">
        <div className="w-12 h-12 bg-prylom-gold rounded-full flex items-center justify-center text-xl shadow-xl">✨</div>
        <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em]">Belle AI Assistent</span>
      </div>
      <h3 className="text-5xl font-black text-prylom-dark tracking-tighter uppercase leading-[0.9]">{t.belleTitle}</h3>
      <p className="text-lg text-gray-500 font-medium leading-relaxed">{t.belleSub}</p>
      
      <div className="grid grid-cols-1 gap-3">
        {[
          "Como acesso o portfólio de ativos exclusivos?",
          "Como cadastro minha propriedade na plataforma?",
          "Como funcionam as soluções de Máquinas, Grãos?",
          "Como funciona a Curadoria e estruturação de ativos da Prylom?"
        ].map((suggestion, i) => (
          <button key={i} onClick={() => setBelleMessage(suggestion)} className="p-5 rounded-2xl bg-white border border-gray-100 text-left text-xs font-bold text-prylom-dark hover:border-prylom-gold hover:shadow-lg transition-all group flex justify-between items-center">
            {suggestion}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0">→</span>
          </button>
        ))}
      </div>
    </div>

    {/* COLUNA DIREITA: CHAT + COMPLIANCE EXTERNO */}
    <div className="lg:col-span-7 space-y-6"> {/* Espaçamento vertical entre Chat e Compliance */}
      
      {/* CONTAINER DO CHAT - ALTURA FIXA PRESERVADA */}
      <div className="bg-white h-[650px] rounded-[3rem] border border-gray-100 shadow-4xl flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #d4a017 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        <header className="p-6 border-b border-gray-50 flex items-center gap-5 bg-white/80 backdrop-blur-md relative z-10">
          <div className="relative">
            <div className="w-12 h-12 bg-prylom-dark rounded-xl flex items-center justify-center shadow-lg border border-prylom-gold/30 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" alt="Belle" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h4 className="text-md font-black text-prylom-dark uppercase tracking-tight">Belle</h4>
            <p className="text-[9px] font-black text-prylom-gold uppercase tracking-[0.2em]">Consultora Virtual Prylom</p>
          </div>
        </header>

        <div ref={belleScrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar relative z-10">
          <div className="flex justify-start">
            <div className="max-w-[85%] p-5 rounded-[2rem] bg-gray-50 text-prylom-dark text-sm font-medium leading-relaxed rounded-tl-none border border-gray-100 shadow-sm">
              {t.belleGreeting}
            </div>
          </div>
          {belleChat.map((chat, i) => (
            <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm ${chat.role === 'user' ? 'bg-[#2c5363] text-white rounded-tr-none' : 'bg-white text-prylom-dark rounded-tl-none border border-gray-100'}`}>
                {chat.text}
              </div>
            </div>
          ))}
          {loadingBelle && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex gap-2">
                <div className="w-2 h-2 bg-prylom-gold rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-prylom-gold rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
                <div className="w-2 h-2 bg-prylom-gold rounded-full animate-bounce" style={{animationDelay:'0.4s'}}></div>
              </div>
            </div>
          )}
        </div>

<form onSubmit={handleBelleSubmit} className="p-6 bg-white border-t border-gray-50 relative z-10">
  <div className="flex bg-gray-50 rounded-full p-2 border-2 border-transparent focus-within:border-prylom-gold transition-all shadow-inner">
    <input 
      type="text" 
      value={belleMessage} 
      onChange={e => setBelleMessage(e.target.value)}
      placeholder={user ? t.bellePlaceholder : "Faça o login para conversar com a Belle ✨"}
      disabled={!user}
      className="flex-1 bg-transparent px-6 py-3 text-sm font-medium outline-none text-prylom-dark disabled:cursor-not-allowed disabled:opacity-50"
    />
    <button 
      type="submit" 
      disabled={loadingBelle || !user} 
      onClick={!user ? () => navigate("/login") : undefined}
      className="bg-prylom-dark text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-prylom-gold transition-all shadow-xl disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </button>
  </div>
</form>
      </div>

      {/* AVISO DE COMPLIANCE - Fora da caixa branca para não empurrar o layout */}
      <div className="px-6 py-4 rounded-[2rem] bg-gray-100/50 border border-gray-200/50">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-lg bg-prylom-dark/5 flex items-center justify-center text-prylom-dark/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040L3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622l-.982-3.016z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h5 className="text-[9px] font-black text-prylom-dark/60 uppercase tracking-widest">Compliance Protocol</h5>
            <div className="text-[10px] leading-relaxed text-gray-400 font-medium">
              <div className="text-prylom-dark/70 uppercase"> Aviso de Compliance: A Belle é uma Inteligência Artificial consultiva. Suas respostas são
simulações automatizadas e NÃO constituem oferta vinculante, laudo técnico, garantia jurídica ou
promessa de rentabilidade. Em estrita conformidade com a LGPD e a Lei 9.613/98 (Prevenção à
Lavagem de Dinheiro), todos os diálogos são registrados e auditáveis. O uso deste canal implica na
aceitação integral do nosso [Termo de Uso - MSA].
</div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</section>
    </div>
  );
};

export default LandingPage;