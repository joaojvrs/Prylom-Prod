import { useState, useMemo } from 'react';
import logoPrylom from "../assets/logo-prylom.png";
import NationalProtocol from './dataroom/NationalProtocol';
import InternationalProtocol from './dataroom/InternationalProtocol';
import PrivateProtocol from './dataroom/PrivateProtocol';

const DataRoomModal = ({ product, onBack }: any) => {
  const [step, setStep] = useState(1);
  const [origin, setOrigin] = useState<'BR' | 'INT' | 'PRIVATE' | null>(null);
  const [openMarketAccepted, setOpenMarketAccepted] = useState(false);

  const isOpenMarket = useMemo(() => {
    const relevancia = product?.relevancia_anuncio || product?.fazenda_data?.relevancia_anuncio;
    const tipo = product?.tipo_anuncio || product?.fazenda_data?.tipo_anuncio;
    return relevancia === 'Open Market' || tipo === 'Open Market';
  }, [product]);

  const getStepTitle = () => {
    if (origin === 'INT') return "Protocol for International Investors";
    if (origin === 'PRIVATE') return "Prylom Private Executive Protocol";
    return "Protocolo de Identificação do Investidor Nacional";
  };

  const [subStep, setSubStep] = useState(1);

  const handleBack = () => {
    if (step === 3 && subStep > 1) {
      setSubStep(subStep - 1);
    } else if (step > 1) {
      setStep(step - 1);
      setSubStep(1);
    } else {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col animate-fadeIn overflow-y-auto font-['Montserrat'] text-[#2c5363]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;900&display=swap');`}</style>

      {/* HEADER */}
      <nav className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <button onClick={handleBack} className="group flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2c5363] hover:text-[#bba219] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          {step === 1 ? "Voltar ao Ativo" : "Anterior"}
        </button>
        <div className="text-right">
          <span className="block text-[10px] font-medium text-gray-400 uppercase tracking-widest">Data Room Seguro</span>
          <span className="text-sm font-black tracking-tighter">{product?.codigo || "PRY-OFF MARKET"}</span>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4 lg:p-16">
        <div className="bg-white w-full max-w-5xl rounded-xl shadow-[0_20px_50px_rgba(44,83,99,0.1)] border border-gray-100 overflow-hidden">

      {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 animate-fadeIn">
              {/* Coluna Principal: Conteúdo e Ação */}
              <div className="lg:col-span-8 p-10 lg:p-16 space-y-10 bg-white">
                <div className="space-y-6">
                  <div className="h-1.5 w-24 bg-[#bba219]"></div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none text-slate-900">
                    PROTOCOLO DE ACESSO AO <br/>
                    <span className="text-[#bba219]">DATA ROOM TÉCNICO</span>
                  </h2>

                  <div className="space-y-4">
                    <p className="text-lg font-semibold text-slate-700">
                      Este é um ambiente sigiloso de dados parametrizados. Para acessar os relatórios preliminares, é necessária identificação completa.
                    </p>

                    <div className="bg-gray-50 p-6 rounded-sm border-l-4 border-[#2c5363]">
                       <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <li className="flex gap-2"><strong>1.</strong> Compliance Ambiental</li>
                        <li className="flex gap-2"><strong>2.</strong> Raio-X do Solo</li>
                        <li className="flex gap-2"><strong>3.</strong> Hidrografia e Clima</li>
                        <li className="flex gap-2"><strong>4.</strong> Histórico PRODES</li>
                      </ul>
                    </div>
                  </div>

{isOpenMarket && (
  <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl space-y-4 animate-slideDown">
    <div className="flex items-center gap-2 text-amber-700">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span className="text-[11px] font-black uppercase tracking-widest">
        Atenção: Ativo Open Market
      </span>
    </div>

    <label className="flex items-start gap-4 cursor-pointer group">
      <input
        type="checkbox"
        checked={openMarketAccepted}
        onChange={(e) => setOpenMarketAccepted(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-amber-700 cursor-pointer"
      />
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-black text-amber-900 uppercase tracking-tighter">
          CIÊNCIA DE ATIVO OPEN MARKET
        </span>
        <span className="text-[10px] font-bold text-amber-900/80 leading-relaxed uppercase">
          Estou ciente de que este imóvel se encontra na modalidade de Mercado Aberto (Open Market)
          e os dados iniciais possuem natureza declaratória. Compreendo que a consolidação do
          Data Room Técnico e a liberação dos relatórios preliminares dependem da colaboração
          e do envio de documentos por parte do proprietário ou originador parceiro, podendo
          o prazo de entrega ser estendido.
        </span>
      </div>
    </label>
  </div>
)}
                </div>

                <button
                  disabled={isOpenMarket && !openMarketAccepted}
                  onClick={() => setStep(2)}
                  className={`w-full lg:w-max px-10 py-6 rounded-sm font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-xl
                    ${(isOpenMarket && !openMarketAccepted)
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-[#2c5363] text-white hover:bg-[#bba219] hover:-translate-y-1'}`}
                >
                  {isOpenMarket && !openMarketAccepted ? "Aceite o termo para continuar" : "Entendi e quero iniciar credenciamento"}
                </button>
              </div>

              {/* Coluna Lateral */}
              <div className="lg:col-span-4 bg-[#2c5363] p-12 flex flex-col justify-center items-center text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rotate-45"></div>
                <p className="italic text-lg font-light opacity-90 leading-relaxed z-10 uppercase tracking-tighter">
                  "Segurança de dados e conformidade jurídica Prylom."
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-10 lg:p-20 space-y-12 animate-fadeIn">
              <div className="text-center space-y-4">
                <h3 className="text-3xl font-black uppercase tracking-tighter">Tipo de Investidor</h3>
                <p className="text-gray-400 text-[11px] font-bold uppercase tracking-[0.2em]">Selecione o seu perfil de investidor e a modalidade de Atendimento</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{/* Botão Nacional */}
<button
  onClick={() => { setOrigin('BR'); setStep(3); setSubStep(1); }}
  className="group p-8 border border-gray-200 hover:border-[#bba219] transition-all flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-gray-50 shadow-sm rounded-lg hover:shadow-xl min-w-[200px] min-h-[220px]"
>
  <div className="relative group-hover:scale-110 transition-transform duration-300">
    <img
      src="https://flagcdn.com/w80/br.png"
      alt="BR"
      className="w-14 h-auto object-contain drop-shadow-md"
    />
  </div>
  <span className="font-black text-[11px] uppercase tracking-[0.15em] text-gray-700 text-center">
    Nacional
  </span>
</button>

{/* Botão Internacional */}
<button
  onClick={() => { setOrigin('INT'); setStep(3); setSubStep(1); }}
  className="group p-8 border border-gray-200 hover:border-[#bba219] transition-all flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-gray-50 shadow-sm rounded-lg hover:shadow-xl min-w-[200px] min-h-[220px]"
>
  <div className="text-gray-400 group-hover:text-[#bba219] group-hover:scale-110 transition-all duration-300">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  </div>
  <span className="font-black text-[11px] uppercase tracking-[0.15em] text-gray-700 text-center">
    International
  </span>
</button>


<button
  onClick={() => { setOrigin('PRIVATE'); setStep(3); setSubStep(1); }}
  className="group p-8 bg-black border border-black hover:border-[#bba219] transition-all flex flex-col items-center gap-4 shadow-2xl rounded-lg min-w-[240px]"
>
  <div className="flex flex-col items-center gap-3">
    <div className="flex items-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
      <img
        src="https://flagcdn.com/w80/br.png"
        alt="Brasil"
        className="w-5 h-auto object-contain rounded-[1px]"
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#bba219"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    </div>

    <div className="relative group-hover:scale-105 transition-transform duration-300">
<img
  src={logoPrylom}
  alt="Prylom Logo"
  className="h-16 w-auto object-contain..."
/>
    </div>
  </div>

  <div className="flex flex-col items-center gap-1">
    <span className="font-black text-[12px] uppercase tracking-[0.2em] text-[#bba219]">
      Selected
    </span>
<span className="text-[10px] font-bold text-[#bba219] uppercase tracking-wider text-center max-w-[150px] leading-tight mt-1 animate-bounce duration-1000"
      style={{ textShadow: '0 0 8px rgba(186, 162, 25, 0.5)' }}>
  Mandato Exclusivo de <br /> Aquisição (Buy-Side)
</span>
  </div>
</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 lg:p-16 space-y-10 animate-fadeIn">
              <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tighter">{getStepTitle()}</h3>
                <span className="text-[9px] font-black uppercase text-gray-300 tracking-widest">v2.6 SECURE</span>
              </div>
              {origin === 'BR' && (
      <NationalProtocol
        product={product}
        onComplete={() => {}}
        onBack={onBack}
        subStep={subStep}
        setSubStep={setSubStep}
      />
    )}
              {origin === 'INT' && <InternationalProtocol product={product}
        onComplete={() => {}}
        onBack={onBack}
        subStep={subStep}
        setSubStep={setSubStep}
      />}
              {origin === 'PRIVATE' && <PrivateProtocol product={product}
        onBack={onBack}
        subStep={subStep}
        setSubStep={setSubStep}
      />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DataRoomModal;
