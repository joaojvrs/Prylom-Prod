import React, { useState, useEffect, useRef } from 'react';
import { AppLanguage, AppCurrency } from '../types';
import { supabase } from '../supabaseClient';

interface Props {
  onBack: () => void;
  t: any;
  lang: AppLanguage;
  currency: AppCurrency;
}

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  attachment?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    name: string;
  };
}

const AI_CAPABILITIES = [
  { icon: '🔬', label: 'Identificação de Pragas e Doenças',     desc: 'Tire uma foto ou vídeo da planta — a IA identifica a praga, doença, daninha ou deficiência.' },
  { icon: '🌱', label: 'Dúvidas Gerais do Campo',               desc: 'Pergunte sobre manejo, plantio, colheita e boas práticas. Simples assim.' },
  { icon: '🧪', label: 'Defensivos e Insumos',                  desc: 'Qual produto usar, qual dose, registro MAPA, alternativas biológicas.' },
  { icon: '🧱', label: 'Análise de Solo e Adubação',            desc: 'Envie o resultado da análise e receba o cálculo de calagem e adubação.' },
  { icon: '⚙️', label: 'Cálculos Agronômicos',                  desc: 'Pulverizador, plantadeira, perdas na colheita, irrigação e muito mais.' },
  { icon: '📄', label: 'Leitura de Documentos',                 desc: 'Foto de nota fiscal, planilha manuscrita ou laudo — a IA extrai os dados pra você.' },
  { icon: '📑', label: 'Geração de Laudos e Relatórios',        desc: 'A IA escreve o laudo técnico, relatório de visita ou receituário por você.' },
  { icon: '🌤️', label: 'Clima para o Campo',                    desc: 'Previsão agrícola, janela de aplicação, risco de geada e veranico.' },
  { icon: '📰', label: 'Notícias e Cotações',                   desc: 'Preço da soja, milho, boi — notícias do agronegócio em tempo real.' },
  { icon: '💰', label: 'Gestão Financeira',                     desc: 'Controle de custos, fluxo de caixa e rentabilidade da sua propriedade.' },
  { icon: '📅', label: 'Agenda Agrícola',                       desc: 'Lembretes de plantio, colheita, aplicações e eventos importantes.' },
  { icon: '🔍', label: 'Pesquisas na Internet',                  desc: 'Peças de máquinas, vagas, arrendamentos, preços de terra e muito mais.' },
  { icon: '🌿', label: 'Fisiologia de Plantas e Animais',       desc: 'Estádios fenológicos, nutrição, sanidade e metabolismo animal.' },
  { icon: '📚', label: 'Pesquisa Técnica e Científica',         desc: 'Artigos, teses, livros e publicações agronômicas resumidas.' },
  { icon: '🖼️', label: 'Busca de Imagens de Referência',        desc: 'A IA busca fotos para comparação e validação do seu diagnóstico.' },
  { icon: '🎨', label: 'Criação de Imagens',                    desc: 'Arte para marketing rural, visualizações técnicas e materiais visuais.' },
  { icon: '🇺🇸', label: 'Inglês Agronômico',                    desc: 'Tradução de rótulos, manuais e artigos técnicos em inglês.' },
];

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const LegalAgro: React.FC<Props> = ({ onBack, t, lang, currency }) => {
  const [activeTab, setActiveTab] = useState<'radar' | 'modules' | 'agronomo' | 'risk' | 'ai'>('ai');
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  // Arquivo (imagem/vídeo)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);

  // Áudio
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal de tópicos
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicContent, setTopicContent] = useState<string | null>(null);
  const loadingTopic = false;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loadingAi]);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  // ── Arquivo ──────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return;
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(file);
    setFileType(isImage ? 'image' : 'video');
    setFilePreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
  };

  // ── Áudio ────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch {
      alert('Para gravar áudio, permita o acesso ao microfone do dispositivo.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  // ── Envio ────────────────────────────────────────────────
const sendToLegalAi = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!aiMessage.trim() && !selectedFile && !audioBlob) return;

  const userText = aiMessage;
  const file = selectedFile;
  const preview = filePreview;
  const fType = fileType;
  const aBlob = audioBlob;
  const aUrl = audioUrl;

  setAiMessage('');
  clearFile();
  setAudioBlob(null);
  setAudioUrl(null);
  setRecordingTime(0);
  setLoadingAi(true);

  const userMsg: ChatMessage = { role: 'user', text: userText };
  if (file && preview && fType) {
    userMsg.attachment = { type: fType, url: preview, name: file.name };
  } else if (aBlob && aUrl) {
    userMsg.attachment = { type: 'audio', url: aUrl, name: 'audio.webm' };
  }
  setChatHistory(prev => [...prev, userMsg]);

  try {
    // ── Captura o email do usuário logado ──────────────────
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'Usuário não identificado';

    // ── Determina o messageType ────────────────────────────
    const hasText = !!userText.trim();
    const baseType = file ? fType : aBlob ? 'audio' : null;
    const messageType = baseType
      ? hasText ? `text+${baseType}` : baseType
      : 'text';

    // ── Monta o FormData ───────────────────────────────────
    const formData = new FormData();
    formData.append('userEmail', userEmail);
    formData.append('messageType', messageType);
    if (userText) formData.append('message', userText);
    if (file)    formData.append('file', file);
    if (aBlob)   formData.append('file', aBlob, 'audio.webm');

    const response = await fetch('https://webhook.saveautomatik.shop/webhook/prylomIA', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    const botReply =
      (Array.isArray(data) ? data[0]?.output || data[0]?.text || data[0]?.message : null) ||
      data?.output || data?.text || data?.message || data?.response ||
      'Resposta recebida.';

    setChatHistory(prev => [...prev, { role: 'bot', text: String(botReply) }]);
  } catch {
    setChatHistory(prev => [...prev, { role: 'bot', text: 'Erro ao conectar. Verifique sua internet e tente novamente.' }]);
  } finally {
    setLoadingAi(false);
  }
};
  // ── Tópicos ──────────────────────────────────────────────
  const handleTopicClick = (topic: string) => {
    setSelectedTopic(topic);
    setTopicContent(null);

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

    setTopicContent(predefined[topic] || 'Conteúdo não disponível para este tópico.');
  };

  const hasAttachment = !!selectedFile || !!audioBlob;
  const canSend = (aiMessage.trim().length > 0 || hasAttachment) && !loadingAi && !isRecording;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 md:py-16 animate-fadeIn pb-40 flex flex-col gap-10">

      {/* MODAL DE TÓPICO */}
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
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Consultando Base Legal...</p>
                </div>
              ) : (
                <div className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap animate-fadeIn">{topicContent}</div>
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

      {/* AVISO */}
      <div className="bg-[#FFF9F5] border border-orange-100 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-sm">
        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div>
          <h4 className="text-orange-800 font-black uppercase text-xs tracking-widest mb-1">{t.legalDisclaimerTitle}</h4>
          <p className="text-orange-700 text-sm font-medium leading-relaxed">{t.legalDisclaimerContent}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-gray-100 p-1.5 rounded-[2rem] w-fit overflow-x-auto no-scrollbar self-center md:self-start">
        {[
          { id: 'ai',      label: t.legalAiChat,  icon: '🧠' },
          { id: 'radar',   label: t.legalRadar,   icon: '🚨' },
          { id: 'modules', label: 'Proprietário', icon: '🚜' },
          { id: 'agronomo',label: 'Agrônomo',     icon: '🪪' },
          { id: 'risk',    label: t.legalRiskMap, icon: '⚠️' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white shadow-md text-prylom-dark' : 'text-gray-400 hover:text-prylom-dark'}`}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      <div className="min-h-[60vh]">

        {/* ══ ABA IA ══════════════════════════════════════════ */}
        {activeTab === 'ai' && (
          <div className="flex flex-col gap-8 animate-fadeIn">

            {/* EXPLICAÇÃO — acessível e bonita */}
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
              {/* Cabeçalho da seção */}
              <div className="bg-prylom-dark px-10 py-10 flex items-center gap-6">
                <div className="w-16 h-16 bg-prylom-gold/20 rounded-2xl flex items-center justify-center text-3xl shrink-0">🧠</div>
                <div>
                  <h2 className="text-white text-2xl font-black tracking-tight uppercase leading-tight">Seu Consultor do Campo</h2>
                  <p className="text-white/60 text-sm font-medium mt-1">Fale por texto, foto, vídeo ou áudio — a IA entende e responde.</p>
                </div>
              </div>

              {/* Lista de capacidades */}
              <div className="p-8 md:p-10">
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-8">O que você pode perguntar ou enviar:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AI_CAPABILITIES.map((cap, i) => (
                    <div key={i} className="flex items-start gap-4 p-5 rounded-2xl hover:bg-gray-50 transition-colors">
                      <span className="text-2xl leading-none mt-0.5 shrink-0">{cap.icon}</span>
                      <div>
                        <p className="font-black text-prylom-dark text-sm leading-tight">{cap.label}</p>
                        <p className="text-gray-400 text-xs font-medium mt-1 leading-relaxed">{cap.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CHAT */}
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl flex flex-col overflow-hidden" style={{ minHeight: '65vh' }}>
              {/* Cabeçalho do chat */}
              <header className="p-7 border-b border-gray-50 flex items-center gap-4 bg-gray-50/60 shrink-0">
                <div className="w-11 h-11 bg-prylom-dark text-prylom-gold rounded-2xl flex items-center justify-center text-xl shadow-lg">🧠</div>
                <div>
                  <h3 className="text-base font-black text-prylom-dark uppercase tracking-tight">IA Agronômica Prylom</h3>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Disponível 24h · Texto · Foto · Vídeo · Áudio</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Online</span>
                </div>
              </header>

              {/* Mensagens */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-5 no-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-5 py-16 opacity-50">
                    <span className="text-6xl">🌾</span>
                    <div>
                      <p className="text-base font-black text-prylom-dark">Olá! Como posso ajudar?</p>
                      <p className="text-xs font-medium text-gray-400 mt-2 max-w-xs leading-relaxed">
                        Digite sua dúvida, envie uma foto da lavoura ou grave um áudio com sua pergunta.
                      </p>
                    </div>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {msg.attachment && (
                        <div className="rounded-[1.5rem] overflow-hidden border border-gray-200 shadow-sm max-w-[260px]">
                          {msg.attachment.type === 'image' && (
                            <img src={msg.attachment.url} alt="imagem" className="w-full max-h-52 object-cover" />
                          )}
                          {msg.attachment.type === 'video' && (
                            <video src={msg.attachment.url} controls className="w-full max-h-52" />
                          )}
                          {msg.attachment.type === 'audio' && (
                            <div className="bg-gray-50 px-5 py-4 flex items-center gap-3">
                              <span className="text-xl">🎙️</span>
                              <audio src={msg.attachment.url} controls className="h-9 w-48" />
                            </div>
                          )}
                        </div>
                      )}
                      {msg.text && (
                        <div className={`p-5 rounded-[2rem] text-sm font-medium leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[#2c5363] text-white rounded-tr-none' : 'bg-gray-100 text-prylom-dark rounded-tl-none border border-gray-200'}`}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loadingAi && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-6 py-5 rounded-[2rem] border border-gray-200 flex gap-2 items-center rounded-tl-none">
                      <div className="w-2.5 h-2.5 bg-prylom-gold rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-prylom-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2.5 h-2.5 bg-prylom-gold rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
              </div>

              {/* INPUT */}
              <form onSubmit={sendToLegalAi} className="p-5 border-t border-gray-100 bg-white shrink-0">

                {/* Preview de arquivo */}
                {filePreview && fileType && (
                  <div className="mb-3 flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-200">
                    {fileType === 'image'
                      ? <img src={filePreview} alt="preview" className="w-14 h-14 object-cover rounded-xl border border-gray-200 shrink-0" />
                      : <video src={filePreview} className="w-14 h-14 object-cover rounded-xl border border-gray-200 shrink-0" muted />
                    }
                    <span className="text-xs font-bold text-gray-500 flex-1 truncate">{selectedFile?.name}</span>
                    <button type="button" onClick={clearFile} className="text-gray-300 hover:text-red-400 transition-colors p-1 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}

                {/* Preview de áudio gravado */}
                {audioUrl && !isRecording && (
                  <div className="mb-3 flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-200">
                    <span className="text-xl shrink-0">🎙️</span>
                    <audio src={audioUrl} controls className="h-9 flex-1 min-w-0" />
                    <button type="button" onClick={clearAudio} className="text-gray-300 hover:text-red-400 transition-colors p-1 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}

                {/* Indicador de gravação */}
                {isRecording && (
                  <div className="mb-3 flex items-center gap-3 bg-red-50 rounded-2xl px-5 py-3 border border-red-200">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shrink-0"></span>
                    <span className="text-red-600 font-black text-sm">Gravando…</span>
                    <span className="text-red-400 font-mono text-sm font-bold">{formatTime(recordingTime)}</span>
                    <button type="button" onClick={stopRecording} className="ml-auto bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all">
                      Parar
                    </button>
                  </div>
                )}

                <div className="flex bg-gray-50 rounded-full p-2 border border-gray-200 focus-within:border-prylom-gold transition-all gap-2 items-center">
                  {/* Botão de arquivo */}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    title="Enviar foto ou vídeo"
                    className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-prylom-dark transition-all shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />

                  {/* Botão de microfone */}
                  <button type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                    className={`w-11 h-11 flex items-center justify-center rounded-full transition-all shrink-0 ${isRecording ? 'bg-red-100 text-red-500 hover:bg-red-200' : 'hover:bg-gray-200 text-gray-400 hover:text-prylom-dark'}`}>
                    {isRecording
                      ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    }
                  </button>

                  {/* Campo de texto */}
                  <input type="text" value={aiMessage} onChange={e => setAiMessage(e.target.value)}
                    placeholder={isRecording ? 'Gravando áudio…' : 'Digite sua dúvida…'}
                    disabled={isRecording}
                    className="flex-1 bg-transparent px-3 py-3 text-sm font-medium outline-none text-prylom-dark min-w-0 disabled:opacity-40" />

                  {/* Botão enviar */}
                  <button type="submit" disabled={!canSend}
                    className="bg-prylom-dark text-white px-7 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-prylom-gold transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
                    Enviar
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

        {/* ══ RADAR ═══════════════════════════════════════════ */}
        {activeTab === 'radar' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fadeIn">
            <div className="md:col-span-2 space-y-6">
              <h3 className="text-xl font-black text-[#2c5363] uppercase tracking-tighter px-2">Alertas Estratégicos Recentes</h3>
              {[
                { type: 'danger',  title: 'Novas Regras de ITR 2026',  desc: 'Receita Federal endurece fiscalização sobre valor da Terra Nua declarado.' },
                { type: 'warning', title: 'Prazos de CAR em MT/GO',    desc: 'Vencimento de retificações obrigatórias para áreas em bioma Cerrado.' },
                { type: 'success', title: 'Normativa Incentiva Barter', desc: 'Novo decreto facilita registro de garantias em contratos de troca.' }
              ].map((alert, i) => (
                <div key={i} className="p-8 rounded-[3rem] border bg-white shadow-sm flex flex-col gap-4 border-gray-100">
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

        {/* ══ MÓDULOS PROPRIETÁRIO ════════════════════════════ */}
        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn">
            {[
              { id: 'env', title: t.legalEnvironmental, icon: '🌱', items: ['O que é crime ambiental?', 'Checklist APP e Reserva', 'Queimadas e Uso do Fogo'] },
              { id: 'tax', title: t.legalFiscal,        icon: '💸', items: ['ITR e Valor de Terra Nua', 'Funrural e Contribuições', 'ICMS Interestadual'] },
              { id: 'prac',title: t.legalPractical,     icon: '📜', items: ['Como regularizar o CAR', 'CCIR e Certificação Incra', 'Licenças de Instalação'] },
              { id: 'rel', title: t.legalRelations,     icon: '🤝', items: ['Riscos no Arrendamento', 'Parceria vs Locação', 'Sucessão Familiar'] }
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

        {/* ══ FOCO AGRÔNOMO ═══════════════════════════════════ */}
        {activeTab === 'agronomo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn">
            {[
              { id: 'rt',    title: "Responsabilidade Técnica", icon: '⚖️', items: ['Gestão de ART', 'Responsabilidade Civil Técnica', 'Checklist de ARTs'] },
              { id: 'op',    title: "Operação Técnica",         icon: '🧪', items: ['Receituário Agronômico', 'Normas de Defensivos', 'Laudos de Perda de Safra'] },
              { id: 'etica', title: "Regulação e Ética",        icon: '🪪', items: ['Relação com o CREA', 'Ética Profissional', 'Compliance Técnico'] }
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

        {/* ══ MATRIZ DE RISCO ═════════════════════════════════ */}
        {activeTab === 'risk' && (
          <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl animate-fadeIn">
            <header className="mb-12 text-center">
              <h3 className="text-3xl font-black text-prylom-dark uppercase tracking-tighter">Matriz de Risco Jurídico Prylom</h3>
              <p className="text-gray-400 font-bold text-sm mt-2">Nível de criticidade por tema agro-legal.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { level: 'High',   color: 'bg-red-500',    themes: ['Queimada sem licença', 'Defensivo sem receituário', 'ART Vencida', 'Desmate sem reserva legal'] },
                { level: 'Medium', color: 'bg-orange-400', themes: ['CAR em análise', 'Consultoria Verbal', 'Contrato sem registro', 'ITR abaixo do VTI'] },
                { level: 'Low',    color: 'bg-green-500',  themes: ['CCIR atualizado', 'Georreferenciamento OK', 'Outorga ativa', 'ART Baixada'] }
              ].map(risk => (
                <div key={risk.level} className="flex flex-col h-full">
                  <div className={`p-4 rounded-t-[2rem] text-white font-black text-center uppercase tracking-widest text-[10px] ${risk.color}`}>
                    Risco {risk.level === 'High' ? 'Alto' : risk.level === 'Medium' ? 'Médio' : 'Baixo'}
                  </div>
                  <div className="flex-1 bg-gray-50 p-8 rounded-b-[2.5rem] border-x border-b border-gray-100 space-y-4">
                    {risk.themes.map((th, i) => (
                      <div key={i} className="p-4 bg-white rounded-2xl shadow-sm font-bold text-xs text-gray-700 flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${risk.color}`}></span> {th}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LegalAgro;
