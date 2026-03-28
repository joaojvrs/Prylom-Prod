
import React, { useState } from 'react';
import { OwnerFormData, AppCurrency } from '../types';
import SmartMapReport from './SmartMapReport';

interface Props {
  onComplete: () => void;
  onBack: () => void;
  onOpenMap: () => void;
  t: any;
  lang: string;
  currency?: AppCurrency;
}

const OwnerWizard: React.FC<Props> = ({ onComplete, onBack, t, lang }) => {
  const [step, setStep] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [formData, setFormData] = useState<OwnerFormData & { geoAnalysis?: any }>({
    location: null,
    areaType: '',
    sizeHectares: '',
    objective: '',
    name: '',
    whatsapp: ''
  });

  

  const totalSteps = 5;

  const handleNext = () => {
    if (step < totalSteps) setStep(s => s + 1);
    else onComplete();
  };

  const handlePrev = () => {
    if (step === 0) onBack();
    else setStep(s => s - 1);
  };

  const handleMapConfirm = (geoData: any) => {
    setFormData({
      ...formData,
      location: geoData.coords,
      sizeHectares: geoData.analysis?.area_hectares?.toString() || '',
      geoAnalysis: geoData.analysis
    });
    setShowMap(false);
    setStep(2); // Salta para vocação com dados geo-auditados
  };

  if (showMap) {
    return <SmartMapReport onBack={() => setShowMap(false)} onConfirm={handleMapConfirm} t={t} lang={lang} />;
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col items-center animate-fadeIn text-center">
            <div className="bg-prylom-dark rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 w-full mb-12 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row gap-8 md:gap-14 items-center text-left">
                <div className="flex-1">
                  <span className="bg-prylom-gold text-white text-[11px] font-black px-4 py-2 rounded-full uppercase tracking-widest mb-6 inline-block">{t.wizardConsultancy}</span>
                  <h3 className="text-4xl md:text-5xl font-black mb-6 leading-[0.85] tracking-tighter uppercase">{t.wizardNoAuction}</h3>
                  <p className="text-gray-300 text-base md:text-lg font-medium leading-relaxed opacity-80">
                    {t.wizardMission}
                  </p>
                </div>
              </div>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-[#000080] mb-6 px-4 uppercase tracking-tighter leading-none">{t.wizardTitle}</h2>
            <p className="text-gray-500 mb-14 max-w-lg px-4 font-medium text-lg">{t.wizardSub}</p>
            <button onClick={handleNext} className="bg-prylom-gold text-white font-black py-8 px-24 rounded-full text-2xl shadow-3xl hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em]">{t.wizardStartBtn}</button>
          </div>
        );
      case 1:
        return (
          <div className="animate-fadeIn max-w-5xl mx-auto w-full px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black text-[#000080] mb-4 tracking-tighter uppercase">Onde fica a área?</h2>
              <p className="text-gray-500 font-medium max-w-2xl mx-auto text-lg">Delimite sua área para disparar a auditoria técnica imediata ou informe os hectares manualmente.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              {/* Opção 1: Geo-Engine (Mapa / Circunferência/Perímetro) */}
              <div 
                onClick={() => setShowMap(true)} 
                className="group cursor-pointer bg-white rounded-[4rem] p-10 relative flex flex-col items-center justify-center overflow-hidden border-2 border-dashed border-gray-100 hover:border-prylom-gold hover:bg-gray-50/50 transition-all shadow-xl"
              >
                 <div className="bg-[#000080] p-10 rounded-[2.5rem] shadow-3xl text-prylom-gold group-hover:scale-110 group-hover:bg-prylom-gold group-hover:text-white transition-all duration-700 mb-8 ring-8 ring-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                 </div>
                 <div className="text-center">
                    <p className="font-black text-[#000080] uppercase text-xl tracking-[0.3em] mb-2">Abrir Prylom Geo-Engine</p>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Mapa, Polígonos e Auditoria Digital</p>
                 </div>
              </div>

              {/* Opção 2: Entrada Manual de Hectares */}
              <div className="bg-prylom-dark text-white rounded-[4rem] p-12 shadow-2xl flex flex-col justify-center border border-white/5 relative overflow-hidden">
                 <div className="relative z-10 space-y-10">
                    <div>
                      <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-4 block">Entrada Manual</span>
                      <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Quantos hectares?</h3>
                      <p className="text-gray-400 text-sm font-medium">Informe a área total da sua fazenda para estimativas rápidas.</p>
                    </div>
                    <div className="relative">
                       <input 
                         type="number" 
                         placeholder="0" 
                         value={formData.sizeHectares} 
                         onChange={(e) => setFormData({...formData, sizeHectares: e.target.value})}
                         className="w-full bg-white/5 border-b-4 border-prylom-gold text-6xl font-black p-4 outline-none text-white tracking-tighter transition-all focus:bg-white/10"
                       />
                       <span className="absolute right-4 bottom-4 text-prylom-gold font-black text-xs uppercase tracking-widest">Hectares (ha)</span>
                    </div>
                    <button onClick={handleNext} className="w-full bg-white text-prylom-dark font-black py-7 rounded-full text-xs uppercase tracking-widest hover:bg-prylom-gold hover:text-white transition-all shadow-xl">
                       Continuar com este valor
                    </button>
                 </div>
                 <div className="absolute -top-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
              </div>
            </div>

            <div className="flex justify-center mt-12">
               <button onClick={handleNext} className="text-[#000080] font-black underline text-[10px] tracking-[0.4em] uppercase py-4 hover:text-prylom-gold transition-colors">Pular localização por enquanto</button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="animate-fadeIn w-full px-4 max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black text-[#000080] mb-10 md:text-center tracking-tighter uppercase">{t.wizardStep2Title}</h2>
            {formData.geoAnalysis && (
              <div className="mb-12 p-10 bg-prylom-dark text-white rounded-[3rem] flex items-center gap-8 shadow-3xl border border-white/5">
                <div className="w-20 h-20 bg-prylom-gold text-white rounded-[1.5rem] flex items-center justify-center text-4xl">📍</div>
                <div className="flex-1">
                  <p className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-2">Localização Auditada</p>
                  <p className="text-3xl font-black uppercase tracking-tighter">{formData.geoAnalysis.municipio}, {formData.geoAnalysis.estado}</p>
                  <p className="text-sm font-bold opacity-60 mt-1 uppercase">Área: {formData.sizeHectares} ha</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
              {[{ id: 'lavoura', label: t.wizardStep2Lavoura, icon: '🌾' }, { id: 'pecuaria', label: t.wizardStep2Pecuaria, icon: '🐄' }].map(item => (
                <button 
                  key={item.id} 
                  onClick={() => { setFormData({...formData, areaType: item.id}); handleNext(); }} 
                  className="p-14 rounded-[3.5rem] border-2 border-gray-100 bg-white hover:border-prylom-gold transition-all flex flex-col items-center gap-8 group shadow-sm hover:shadow-3xl"
                >
                  <span className="text-7xl group-hover:scale-110 transition-transform duration-500">{item.icon}</span>
                  <div className="text-center">
                    <h3 className="font-black text-3xl text-[#000080] uppercase tracking-tighter mb-2">{item.label}</h3>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Definir Vocação Ativo</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="animate-fadeIn max-w-2xl mx-auto text-center w-full px-4">
            <h2 className="text-4xl md:text-5xl font-black text-[#000080] mb-10 tracking-tighter uppercase">{t.wizardStep3Title}</h2>
            <div className="bg-white p-20 md:p-28 rounded-[5rem] shadow-3xl border border-gray-50 relative group">
              <input 
                type="number" 
                placeholder="0" 
                value={formData.sizeHectares} 
                onChange={(e) => setFormData({...formData, sizeHectares: e.target.value})} 
                className="w-full text-center text-8xl md:text-[11rem] font-black py-6 bg-transparent border-b-8 border-gray-100 focus:border-prylom-gold outline-none text-[#000080] tracking-tighter transition-all" 
              />
              <span className="block mt-12 text-[11px] text-gray-400 font-black uppercase tracking-[0.5em]">Hectares Totais (ha)</span>
              {formData.geoAnalysis && (
                 <div className="absolute top-10 right-10 bg-prylom-gold/10 text-prylom-gold px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest">Detectado: {formData.geoAnalysis.area_hectares} ha</div>
              )}
            </div>
            <button onClick={handleNext} className="mt-12 bg-[#000080] text-white font-black py-7 px-16 rounded-full text-lg shadow-3xl hover:bg-prylom-gold transition-all uppercase tracking-widest">Confirmar e Avançar</button>
          </div>
        );
      case 4:
        return (
          <div className="animate-fadeIn max-w-2xl mx-auto w-full px-4">
            <h2 className="text-4xl md:text-5xl font-black text-[#000080] mb-12 text-center tracking-tighter uppercase">{t.wizardStep4Title}</h2>
            <div className="flex flex-col gap-8">
              {[
                {id: 'Venda', label: t.wizardStep4Sale, desc: 'Anúncio estratégico e off-market no ecossistema Prylom.'}, 
                {id: 'Avaliação', label: t.wizardStep4Valuation, desc: 'Laudo técnico oficial de mercado e auditoria de valor.'}
              ].map(o => (
                <button 
                  key={o.id} 
                  onClick={() => { setFormData({...formData, objective: o.id}); handleNext(); }} 
                  className="p-12 rounded-[3rem] font-black border-2 border-gray-100 bg-white text-left hover:border-prylom-gold hover:shadow-3xl transition-all group"
                >
                  <p className="text-3xl text-[#000080] uppercase tracking-tighter group-hover:text-prylom-gold">{o.label}</p>
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest font-black mt-2 leading-relaxed">{o.desc}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="animate-fadeIn max-w-2xl mx-auto w-full px-4">
            <h2 className="text-4xl md:text-5xl font-black text-[#000080] mb-10 text-center tracking-tighter uppercase">{t.wizardStep5Title}</h2>
            <div className="space-y-8 mb-14">
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl transition-all focus-within:border-prylom-gold focus-within:shadow-3xl group">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.5em] mb-6 group-focus-within:text-prylom-gold transition-colors">Identificação Consultoria</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="w-full p-2 text-4xl font-black outline-none bg-transparent text-[#000080]" 
                  placeholder="Seu nome completo" 
                />
              </div>
            </div>
            <button 
              onClick={handleNext} 
              className="w-full bg-[#000080] text-white font-black py-9 rounded-full text-2xl shadow-3xl hover:bg-prylom-gold transition-all uppercase tracking-[0.3em] active:scale-95"
            >
              Finalizar Auditoria
            </button>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 md:py-24 flex-1 flex flex-col">
      <div className="flex-1 flex flex-col justify-center">{renderStep()}</div>
      {step > 0 && (
        <div className="mt-16 pt-10 flex justify-between items-center border-t border-gray-100 px-4">
          <button onClick={handlePrev} className="text-gray-400 font-black text-[11px] uppercase tracking-[0.6em] flex items-center gap-4 py-4 hover:text-[#000080] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Voltar
          </button>
          <div className="flex gap-3">
            {[0,1,2,3,4,5].map(s => (
              <div key={s} className={`h-2 rounded-full transition-all duration-700 ${s <= step ? 'w-12 bg-prylom-gold' : 'w-3 bg-gray-200'}`}></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerWizard;
