import React, { useState, useEffect, useRef } from 'react';
import { AppLanguage, AppCurrency } from '../types';

interface Props {
  onBack: () => void;
  t: any;
  lang: AppLanguage;
  currency: AppCurrency;
}

const LegalAgro: React.FC<Props> = ({ onBack, t, lang, currency }) => {
  const [activeTab, setActiveTab] = useState<'radar' | 'modules' | 'agronomo' | 'risk' | 'ai'>('radar');
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const loadingAi = false;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Estados para o Modal de Tópicos
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicContent, setTopicContent] = useState<string | null>(null);
  const loadingTopic = false;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleTopicClick = async (topic: string) => {
    setSelectedTopic(topic);
    setTopicContent(null);

    // CONTEÚDO PRÉ-DEFINIDO (CURADORIA PRYLOM)
    const predefined: Record<string, string> = {
      "Gestão de ART": `🔍 O que é a ART (Anotação de Responsabilidade Técnica)
A ART é o documento fundamental que vincula o agrônomo à obra ou serviço técnico. Ela define o limite da sua responsabilidade.

⚠️ Onde mora o perigo para o Agrônomo:
• Emitir ART genérica ("Assistência Técnica") sem detalhar o escopo.
• Não dar baixa na ART após o encerramento do contrato.
• Prestar consultoria verbal sem o registro documental correspondente.

🚨 Risco de Omissão:
Se ocorrer um dano ambiental ou perda de safra em uma área onde você é o RT (Responsável Técnico), mas não detalhou suas limitações na ART, a justiça pode presumir responsabilidade total sobre o evento.

✅ Prática Recomendada Prylom:
✔ Detalhe cada cultura e área específica na ART.
✔ Mantenha cópias digitais de todas as ARTs emitidas por safra.
✔ Em caso de rescisão, formalize imediatamente a baixa no CREA.`,

      "Receituário Agronômico": `🔍 Regras de Ouro da Prescrição
O receituário agronômico não é apenas um papel para compra, é uma prescrição de natureza jurídica e técnica.

📌 Pontos Críticos:
• Prescrição "em branco": Jamais assine receitas sem o preenchimento total de cultura, praga e dosagem.
• Uso "Off-Label": Recomendar produtos fora da bula oficial do MAPA gera responsabilidade civil e criminal imediata.
• Destruição de Embalagens: O agrônomo deve orientar formalmente o descarte correto.

🚨 Consequência de Erro:
Autuações que recaem sobre o CPF do profissional e podem gerar suspensão do registro profissional.`,

      "Responsabilidade Civil Técnica": `🔍 Riscos nas Recomendações
O agrônomo responde civilmente por danos causados por "erro de diagnóstico" ou "negligência na assistência".

🧱 Tipos de Responsabilidade:
1. Contratual: O que você prometeu entregar ao produtor.
2. Extracontratual: Danos causados a vizinhos (ex: deriva de aplicação aérea).

🛡️ Proteção do Profissional:
O registro em diário de campo (físico ou digital) é sua maior prova de que as orientações foram dadas corretamente.`,

      "O que é crime ambiental?": `Crime ambiental ocorre quando há dano ou risco grave ao meio ambiente, praticado com dolo ou culpa, e previsto na Lei de Crimes Ambientais (Lei nº 9.605/1998).

⚠️ Importante:
• Nem toda infração ambiental é crime
• Algumas geram apenas multa administrativa
• Outras podem virar processo criminal

🚨 Exemplos comuns no agro
Situação | Multa | Crime
Desmatar APP sem autorização | ✅ | ✅
Queimada sem licença | ✅ | ✅
Uso irregular de defensivos | ✅ | ✅`,

      "Checklist APP e Reserva": `→ 📌 O que é APP (Área de Preservação Permanente)
São áreas protegidas por lei, independentemente de registro.

Exemplos:
• Margens de rios
• Nascentes
• Encostas íngremes

⚠️ Não pode explorar, salvo exceções legais com autorização.`,

      "ITR e Valor de Terra Nua": `🔍 O que é o ITR
O Imposto sobre a Propriedade Territorial Rural (ITR) é um imposto federal, cobrado anualmente.

📌 Valor da Terra Nua (VTN)
O VTN é o valor da terra sem benfeitorias (casas, galpões, cercas, lavouras).

⚠️ O maior erro no ITR é declarar um VTN muito abaixo do valor de mercado para fugir do imposto, gerando malha fina e multas pesadas.`,

      "Sucessão Familiar": `🔍 O que é sucessão no meio rural
Sucessão é a transferência do patrimônio rural aos herdeiros. No agro, a falta de planejamento é a maior causa de perda de patrimônio e paralisação da produção.`
    };

    if (predefined[topic]) {
      setTopicContent(predefined[topic]);
      return;
    }

    setTopicContent('Conteúdo não disponível para este tópico.');
  };

  const sendToLegalAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;
    const userText = aiMessage;
    setAiMessage('');
    setChatHistory(prev => [
      ...prev,
      { role: 'user', text: userText },
      { role: 'bot', text: 'Serviço de consulta IA temporariamente indisponível.' }
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 md:py-16 animate-fadeIn pb-40 flex flex-col gap-10">
      
      {/* MODAL DE DETALHAMENTO DE TÓPICO */}
      {selectedTopic && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 backdrop-blur-xl bg-prylom-dark/60">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 md:p-14 shadow-3xl relative animate-fadeIn flex flex-col max-h-[85vh]">
            <button onClick={() => setSelectedTopic(null)} className="absolute top-8 right-8 text-gray-300 hover:text-prylom-dark p-2 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <header className="mb-8 shrink-0">
               <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">Dossiê Jurídico Prylom</span>
               <h3 className="text-3xl font-black text-[#2c5363] tracking-tighter uppercase leading-tight">{selectedTopic}</h3>
            </header>
            <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
               {loadingTopic ? (
                 <div className="py-20 flex flex-col items-center justify-center gap-6">
                    <div className="w-10 h-10 border-4 border-prylom-gold/20 border-t-prylom-gold rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse tracking-[0.4em]">Consultando Base Legal...</p>
                 </div>
               ) : (
                 <div className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap animate-fadeIn">
                   {topicContent}
                 </div>
               )}
            </div>
            <footer className="mt-8 pt-6 border-t border-gray-100 shrink-0">
               <button onClick={() => setSelectedTopic(null)} className="w-full bg-prylom-dark text-white font-black py-5 rounded-full text-[10px] uppercase tracking-widest hover:bg-prylom-gold transition-all shadow-xl">Fechar Dossiê</button>
            </footer>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.3em] mb-2 block">Intelligence & Compliance</span>
          <h1 className="text-4xl font-black text-prylom-dark tracking-tighter uppercase">{t.btnLegal}</h1>
          <p className="text-gray-500 text-sm font-bold">{t.legalSub}</p>
        </div>
        <button onClick={onBack} className="bg-white text-prylom-dark border-2 border-gray-100 px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:border-prylom-gold transition-all">
          {t.btnBack}
        </button>
      </div>

      {/* POSITIONING NOTICE */}
      <div className="bg-[#FFF9F5] border border-orange-100 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-sm">
        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div>
          <h4 className="text-orange-800 font-black uppercase text-xs tracking-widest mb-1">{t.legalDisclaimerTitle}</h4>
          <p className="text-orange-700 text-sm font-medium leading-relaxed">{t.legalDisclaimerContent}</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-gray-100 p-1.5 rounded-[2rem] w-fit overflow-x-auto no-scrollbar self-center md:self-start">
        {[
          { id: 'radar', label: t.legalRadar, icon: '🚨' }, 
          { id: 'modules', label: 'Proprietário', icon: '🚜' }, 
          { id: 'agronomo', label: 'Foco Agrônomo', icon: '🪪' },
          { id: 'risk', label: t.legalRiskMap, icon: '⚠️' }, 
          { id: 'ai', label: t.legalAiChat, icon: '🧠' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white shadow-md text-prylom-dark' : 'text-gray-400 hover:text-prylom-dark'}`}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="min-h-[60vh]">
        {activeTab === 'radar' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fadeIn">
            <div className="md:col-span-2 space-y-6">
              <h3 className="text-xl font-black text-[#2c5363] uppercase tracking-tighter px-2">Alertas Estratégicos Recentes</h3>
              {[
                { type: 'danger', title: 'Novas Regras de ITR 2026', desc: 'Receita Federal endurece fiscalização sobre valor da Terra Nua declarado.' },
                { type: 'warning', title: 'Prazos de CAR em MT/GO', desc: 'Vencimento de retificações obrigatórias para áreas em bioma Cerrado.' },
                { type: 'success', title: 'Normativa Incentiva Barter', desc: 'Novo decreto facilita registro de garantias em contratos de troca.' }
              ].map((alert, i) => (
                <div key={i} className={`p-8 rounded-[3rem] border bg-white shadow-sm flex flex-col gap-4 border-gray-100`}>
                  <div className="flex justify-between items-start">
                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${alert.type === 'danger' ? 'bg-red-100 text-red-700' : alert.type === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {alert.type === 'danger' ? 'URGENTE' : alert.type === 'warning' ? 'ATENÇÃO' : 'OPORTUNIDADE'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400">Há 2 dias</span>
                  </div>
                  <h4 className="text-2xl font-black text-prylom-dark tracking-tighter">{alert.title}</h4>
                  <p className="text-gray-600 text-sm font-medium">{alert.desc}</p>
                </div>
              ))}
            </div>
            <div className="bg-prylom-dark text-white p-10 rounded-[4rem] shadow-2xl relative overflow-hidden h-fit">
               <div className="relative z-10 space-y-6">
                  <h4 className="text-xl font-black uppercase tracking-tight">Checklist de Conformidade</h4>
                  <ul className="space-y-4">
                     {['CCIR e ITR atualizados', 'Georreferenciamento averbado', 'CAR validado sem sobreposição', 'Outorga d\'água ativa'].map((item, i) => (
                       <li key={i} className="flex gap-3 text-sm font-medium opacity-80"><span className="text-prylom-gold">✓</span> {item}</li>
                     ))}
                  </ul>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn">
            {[
              { id: 'env', title: t.legalEnvironmental, icon: '🌱', items: ['O que é crime ambiental?', 'Checklist APP e Reserva', 'Queimadas e Uso do Fogo'] },
              { id: 'tax', title: t.legalFiscal, icon: '💸', items: ['ITR e Valor de Terra Nua', 'Funrural e Contribuições', 'ICMS Interestadual'] },
              { id: 'prac', title: t.legalPractical, icon: '📜', items: ['Como regularizar o CAR', 'CCIR e Certificação Incra', 'Licenças de Instalação'] },
              { id: 'rel', title: t.legalRelations, icon: '🤝', items: ['Riscos no Arrendamento', 'Parceria vs Locação', 'Sucessão Familiar'] }
            ].map(mod => (
              <div key={mod.id} className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group cursor-default">
                 <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{mod.icon}</div>
                 <h4 className="text-xl font-black text-prylom-dark uppercase tracking-tighter mb-6">{mod.title}</h4>
                 <div className="space-y-3">
                    {mod.items.map((item, i) => (
                      <button key={i} onClick={() => handleTopicClick(item)} className="w-full flex items-center justify-between text-xs font-bold text-gray-500 border-b border-gray-50 pb-2 hover:text-prylom-gold transition-colors text-left group/item">
                        <span>{item}</span>
                        <span className="group-hover/item:translate-x-1 transition-transform">→</span>
                      </button>
                    ))}
                 </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'agronomo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn">
            {[
              { id: 'rt', title: "Responsabilidade Técnica", icon: '⚖️', items: ['Gestão de ART', 'Responsabilidade Civil Técnica', 'Checklist de ARTs'] },
              { id: 'op', title: "Operação Técnica", icon: '🧪', items: ['Receituário Agronômico', 'Normas de Defensivos', 'Laudos de Perda de Safra'] },
              { id: 'etica', title: "Regulação e Ética", icon: '🪪', items: ['Relação com o CREA', 'Ética Profissional', 'Compliance Técnico'] }
            ].map(mod => (
              <div key={mod.id} className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group cursor-default">
                 <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{mod.icon}</div>
                 <h4 className="text-xl font-black text-prylom-dark uppercase tracking-tighter mb-6">{mod.title}</h4>
                 <div className="space-y-3">
                    {mod.items.map((item, i) => (
                      <button key={i} onClick={() => handleTopicClick(item)} className="w-full flex items-center justify-between text-xs font-bold text-gray-500 border-b border-gray-50 pb-2 hover:text-prylom-gold transition-colors text-left group/item">
                        <span>{item}</span>
                        <span className="group-hover/item:translate-x-1 transition-transform">→</span>
                      </button>
                    ))}
                 </div>
              </div>
            ))}
            <div className="md:col-span-2 lg:col-span-3 bg-prylom-dark text-white p-12 rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-12 border border-white/5 overflow-hidden relative">
               <div className="flex-1 space-y-6 z-10">
                  <h4 className="text-3xl font-black uppercase tracking-tight">O Agrônomo como Barreira de Risco</h4>
                  <p className="text-lg opacity-70 font-medium leading-relaxed">No ecossistema Prylom, o profissional técnico é o guardião jurídico da produtividade. Cada receituário e ART são documentos de compliance.</p>
               </div>
               <div className="w-full md:w-80 h-40 bg-white/10 rounded-3xl flex items-center justify-center text-5xl z-10 border border-white/10">🎓</div>
               <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-prylom-gold/20 rounded-full blur-[100px]"></div>
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl animate-fadeIn">
             <header className="mb-12 text-center">
                <h3 className="text-3xl font-black text-prylom-dark uppercase tracking-tighter">Matriz de Risco Jurídico Prylom</h3>
                <p className="text-gray-400 font-bold text-sm mt-2">Nível de criticidade por tema agro-legal.</p>
             </header>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { level: 'High', color: 'bg-red-500', themes: ['Queimada sem licença', 'Defensivo sem receituário', 'ART Vencida', 'Desmate sem reserva legal'] },
                  { level: 'Medium', color: 'bg-orange-400', themes: ['CAR em análise', 'Consultoria Verbal', 'Contrato sem registro', 'ITR abaixo do VTI'] },
                  { level: 'Low', color: 'bg-green-500', themes: ['CCIR atualizado', 'Georreferenciamento OK', 'Outorga ativa', 'ART Baixada'] }
                ].map(risk => (
                  <div key={risk.level} className="flex flex-col h-full">
                     <div className={`p-4 rounded-t-[2rem] text-white font-black text-center uppercase tracking-widest text-[10px] ${risk.color}`}>Risco {risk.level === 'High' ? 'Alto' : risk.level === 'Medium' ? 'Médio' : 'Baixo'}</div>
                     <div className="flex-1 bg-gray-50 p-8 rounded-b-[2.5rem] border-x border-b border-gray-100 space-y-4">
                        {risk.themes.map((t, i) => (
                          <div key={i} className="p-4 bg-white rounded-2xl shadow-sm font-bold text-xs text-gray-700 flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${risk.color}`}></span> {t}</div>
                        ))}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="bg-white h-[70vh] rounded-[4rem] border border-gray-100 shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
             <header className="p-8 border-b border-gray-50 flex items-center gap-4 bg-gray-50/50">
                <div className="w-12 h-12 bg-prylom-dark text-prylom-gold rounded-2xl flex items-center justify-center text-2xl shadow-lg">🧠</div>
                <div><h3 className="text-lg font-black text-prylom-dark uppercase tracking-tight">{t.legalAiChat}</h3><p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Orientação Técnica 100% Real-Time</p></div>
             </header>
             <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                    <p className="text-sm font-bold">Faça uma pergunta sobre burocracia ou risco agro.</p>
                    <p className="text-[10px] uppercase font-black tracking-widest italic max-w-xs">"Ex: Quais as multas para queima sem licença?" ou "Como funciona a sucessão no arrendamento?"</p>
                  </div>
                )}
                {chatHistory.map((chat, i) => (
                  <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-6 rounded-[2rem] text-sm font-medium leading-relaxed ${chat.role === 'user' ? 'bg-[#2c5363] text-white rounded-tr-none' : 'bg-gray-100 text-prylom-dark rounded-tl-none border border-gray-200'}`}>{chat.text}</div>
                  </div>
                ))}
                {loadingAi && <div className="flex justify-start"><div className="bg-gray-100 p-6 rounded-[2rem] border border-gray-200 flex gap-2"><div className="w-2 h-2 bg-prylom-gold rounded-full animate-bounce"></div><div className="w-2 h-2 bg-prylom-gold rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div><div className="w-2 h-2 bg-prylom-gold rounded-full animate-bounce" style={{animationDelay:'0.4s'}}></div></div></div>}
             </div>
             <form onSubmit={sendToLegalAi} className="p-6 border-t border-gray-100 bg-white">
                <div className="flex bg-gray-50 rounded-full p-2 border border-gray-200 focus-within:border-prylom-gold transition-all">
                   <input type="text" value={aiMessage} onChange={e => setAiMessage(e.target.value)} placeholder="Sua dúvida jurídica..." className="flex-1 bg-transparent px-6 py-3 text-sm font-medium outline-none text-prylom-dark" />
                   <button type="submit" disabled={loadingAi} className="bg-prylom-dark text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-prylom-gold transition-all shadow-xl">Enviar</button>
                </div>
             </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalAgro;