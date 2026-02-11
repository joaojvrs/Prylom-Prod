import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../supabaseClient';
import { AppLanguage } from '../types';

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `Você é Belle, a Assistente Virtual Consultiva do ecossistema Prylom.
      Seu tom é premium, executivo, prestativo e conhecedor profundo do agronegócio.
      Seu objetivo é tirar dúvidas sobre o site Prylom e informar sobre ativos disponíveis.
      
      ESTRUTURA DO SITE:
      - Ativos & Negócios: Marketplace de fazendas, máquinas, aviões e grãos (módulo atual).
      - Agro Terminal: Dados em tempo real (CBOT, Clima).
      - Inteligência Agro: Ferramentas de cálculo de ROI, Barter e Frete.
      - Auditoria e Avaliação: Centro de valuation oficial.
      - Legal Agro: Radar jurídico e conformidade ambiental.
      - Anunciar: Onde proprietários cadastram seus bens.
      
      INVENTÁRIO ATUAL (CONTEXTO REAL):
      ${inventorySummary || "Nenhum ativo listado no momento."}
      
      REGRAS:
      1. Se o usuário perguntar por ativos, consulte a lista acima.
      2. Seja concisa mas elegante.
      3. Se o usuário quiser acessar um módulo, sugira o nome do módulo.
      4. Responda estritamente em ${lang}.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userText,
        config: { systemInstruction }
      });

      setBelleChat(prev => [...prev, { role: 'bot', text: response.text || "Desculpe, tive um erro no meu terminal." }]);
    } catch (e) {
      setBelleChat(prev => [...prev, { role: 'bot', text: "Houve um erro de conexão com minha inteligência central." }]);
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
            <h2 className="text-4xl md:text-6xl font-black text-[#000080] tracking-tighter uppercase leading-none">
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

      {/* SECTION 3: THE JOURNEY */}
      <section className="py-32 px-6 bg-[#F8F9FA] relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <header className="space-y-4">
                <span className="text-prylom-gold font-black uppercase text-[11px] tracking-[0.5em] block">How it Works</span>
                <h3 className="text-5xl md:text-6xl font-black text-[#000080] tracking-tighter leading-tight uppercase">
                  A Jornada do <br/> <span className="text-prylom-gold">Ativo Prylom</span>
                </h3>
              </header>
              <div className="space-y-12">
                {[
                  { step: "01", title: "Auditoria Técnica", desc: "Coletamos dados geo-climáticos, solo e documentação para gerar um dossiê de viabilidade real." },
                  { step: "02", title: "Conexão de Valor", desc: "Apresentamos o ativo a investidores qualificados ou traders no modelo on-market ou confidencial." },
                  { step: "03", title: "Liquidez Estratégica", desc: "Acompanhamos o fechamento com suporte jurídico e econômico, garantindo a rentabilidade do produtor." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-8 group">
                    <div className="text-4xl font-black text-prylom-gold opacity-30 group-hover:opacity-100 transition-opacity">{item.step}</div>
                    <div className="space-y-2">
                      <h4 className="text-2xl font-black text-prylom-dark uppercase tracking-tighter">{item.title}</h4>
                      <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-[5rem] overflow-hidden shadow-3xl border border-gray-100 aspect-square lg:aspect-auto lg:h-[650px]">
                <img src="https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?auto=format&fit=crop&q=80&w=1200" className="w-full h-full object-cover" alt="Processo Prylom" />
                <div className="absolute inset-0 bg-gradient-to-t from-prylom-dark/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-16 left-16 right-16">
                  <div className="p-8 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20">
                    <p className="text-white text-xl font-bold leading-relaxed">"Transformamos terras em ativos financeiros de alta performance."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: INSTITUCIONAL & CEO */}
      <section className="py-40 px-6 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-24 items-center">
          <div className="lg:col-span-6 space-y-12">
             <div className="space-y-6">
                <span className="text-prylom-gold font-black uppercase text-[11px] tracking-[0.5em] block">{t.aboutMainTitle}</span>
                <h3 className="text-5xl md:text-7xl font-black text-[#000080] tracking-tighter leading-none uppercase">Visão <br/> <span className="italic font-light text-prylom-dark">Soberana</span></h3>
             </div>
             <p className="text-xl text-[#000080]/70 leading-relaxed font-medium max-w-xl">{t.aboutMainDesc}</p>
             <div className="flex gap-4">
                <button onClick={onSelectLegal} className="text-prylom-gold font-black text-[11px] uppercase tracking-widest border-b-2 border-prylom-gold pb-1 hover:text-prylom-dark hover:border-prylom-dark transition-all">Compliance & Ética</button>
                <button onClick={onSelectValuation} className="text-prylom-gold font-black text-[11px] uppercase tracking-widest border-b-2 border-prylom-gold pb-1 hover:text-prylom-dark hover:border-prylom-dark transition-all ml-8">Métodos de Auditoria</button>
             </div>
          </div>
          <div className="lg:col-span-6">
             <div className="relative group overflow-hidden rounded-[5.5rem] shadow-4xl aspect-[4/5] lg:aspect-auto lg:h-[750px] border border-gray-200">
                <img src="https://raw.githubusercontent.com/ai-gen-images/prylom/main/jairo-founder.png" alt="Founder Jairo Alves" className="absolute inset-0 w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=1200"; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#000080] via-transparent to-transparent opacity-60"></div>
                <div className="absolute inset-0 p-16 flex flex-col justify-end">
                  <div className="space-y-6 max-w-md">
                    <div>
                      <span className="text-prylom-gold font-black uppercase text-[11px] tracking-[0.5em] block mb-4">{t.ceoRole}</span>
                      <h4 className="text-6xl font-black text-white tracking-tighter leading-none">{t.ceoName}</h4>
                    </div>
                    <p className="text-white/80 text-lg leading-relaxed font-bold italic border-l-4 border-prylom-gold pl-6">"Nossa tecnologia não substitui o aperto de mão, ela o torna mais valioso e seguro para quem produz."</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: BELLE — AGENTE DE IA (ABAIXO DE VISÃO SOBERANA) */}
      <section className="py-32 px-6 bg-[#FDFCFB] border-t border-gray-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
           <div className="lg:col-span-5 space-y-8">
              <div className="inline-flex items-center gap-4 bg-prylom-gold/10 p-2 pr-6 rounded-full border border-prylom-gold/20">
                 <div className="w-12 h-12 bg-prylom-gold rounded-full flex items-center justify-center text-xl shadow-xl">✨</div>
                 <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em]">Belle AI Agent</span>
              </div>
              <h3 className="text-5xl font-black text-prylom-dark tracking-tighter uppercase leading-[0.9]">{t.belleTitle}</h3>
              <p className="text-lg text-gray-500 font-medium leading-relaxed">{t.belleSub}</p>
              
              <div className="grid grid-cols-1 gap-4">
                 {[
                   "Temos fazendas disponíveis no Mato Grosso?",
                   "Como funciona a Auditoria Prylom?",
                   "Quais são os módulos de inteligência?",
                   "Existem aviões agrícolas à venda?"
                 ].map((suggestion, i) => (
                   <button key={i} onClick={() => setBelleMessage(suggestion)} className="p-5 rounded-2xl bg-white border border-gray-100 text-left text-xs font-bold text-prylom-dark hover:border-prylom-gold hover:shadow-lg transition-all group flex justify-between items-center">
                     {suggestion}
                     <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                   </button>
                 ))}
              </div>
           </div>

           <div className="lg:col-span-7">
              <div className="bg-white h-[650px] rounded-[4rem] border border-gray-100 shadow-4xl flex flex-col overflow-hidden relative">
                 <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #d4a017 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                 
                 <header className="p-8 border-b border-gray-50 flex items-center gap-5 bg-white/50 backdrop-blur-md relative z-10">
                    <div className="relative">
                      <div className="w-14 h-14 bg-prylom-dark rounded-2xl flex items-center justify-center text-2xl shadow-2xl border border-prylom-gold/30 overflow-hidden">
                        <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" alt="Belle" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white rounded-full"></div>
                    </div>
                    <div>
                       <h4 className="text-lg font-black text-prylom-dark uppercase tracking-tight">Belle</h4>
                       <p className="text-[10px] font-black text-prylom-gold uppercase tracking-widest">Consultora Virtual Prylom</p>
                    </div>
                 </header>

                 <div ref={belleScrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar relative z-10">
                    <div className="flex justify-start">
                       <div className="max-w-[85%] p-6 rounded-[2.5rem] bg-gray-50 text-prylom-dark text-sm font-medium leading-relaxed rounded-tl-none border border-gray-100 shadow-sm">
                          {t.belleGreeting}
                       </div>
                    </div>
                    {belleChat.map((chat, i) => (
                      <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[85%] p-6 rounded-[2.5rem] text-sm font-medium leading-relaxed shadow-sm ${chat.role === 'user' ? 'bg-[#000080] text-white rounded-tr-none' : 'bg-white text-prylom-dark rounded-tl-none border border-gray-100'}`}>
                            {chat.text}
                         </div>
                      </div>
                    ))}
                    {loadingBelle && (
                      <div className="flex justify-start animate-pulse">
                         <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 flex gap-2">
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
                         placeholder={t.bellePlaceholder}
                         className="flex-1 bg-transparent px-8 py-4 text-sm font-medium outline-none text-prylom-dark"
                       />
                       <button type="submit" disabled={loadingBelle} className="bg-prylom-dark text-white w-14 h-14 rounded-full flex items-center justify-center hover:bg-prylom-gold transition-all shadow-xl disabled:opacity-50">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                       </button>
                    </div>
                 </form>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;