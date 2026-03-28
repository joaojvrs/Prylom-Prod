
import React, { useState } from 'react';
import { BrokerFormData, AppLanguage, AppCurrency } from '../types';

interface Props {
  onComplete: () => void;
  onBack: () => void;
  t: any;
  lang?: AppLanguage;
  currency?: AppCurrency;
}

const BrokerFlow: React.FC<Props> = ({ onComplete, onBack, t }) => {
  const [formData, setFormData] = useState<BrokerFormData>({
    name: '',
    creci: '',
    agency: '',
    region: '',
    partnershipType: 'exclusivo',
    acceptedTerms: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.acceptedTerms) onComplete();
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8 md:py-20 flex flex-col items-center animate-fadeIn pb-32">
      <div className="bg-white shadow-xl rounded-[3rem] p-16 w-full border border-gray-100">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="bg-prylom-dark text-prylom-gold p-6 rounded-[2rem] mb-6 shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h1 className="text-4xl font-black text-prylom-dark mb-4">{t.brokerTitle}</h1>
          <p className="text-gray-500 text-sm font-medium">{t.brokerSub}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nome</label>
              <input required type="text" className="w-full text-xl font-bold bg-transparent outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}/>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CRECI</label>
              <input required type="text" className="w-full text-xl font-bold bg-transparent outline-none" value={formData.creci} onChange={e => setFormData({...formData, creci: e.target.value})}/>
            </div>
          </div>
          <button type="submit" disabled={!formData.acceptedTerms} className="w-full bg-prylom-dark text-white font-black py-5 rounded-full text-xl shadow-xl transition-all">Solicitar Acesso</button>
        </form>
      </div>
      <button onClick={onBack} className="mt-8 text-gray-400 font-black uppercase text-[10px] tracking-widest py-4">Voltar</button>
    </div>
  );
};

export default BrokerFlow;
