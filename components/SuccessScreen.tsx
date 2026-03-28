
import React from 'react';
import { AppLanguage, AppCurrency } from '../types';

interface Props {
  onRestart: () => void;
  t: any;
  lang?: AppLanguage;
  currency?: AppCurrency;
}

const SuccessScreen: React.FC<Props> = ({ onRestart, t }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8 animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-4xl font-black text-prylom-dark mb-4">{t.successTitle}</h1>
      <p className="text-xl text-gray-500 max-w-lg mb-12">
        {t.successSub}
      </p>
      
      <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 max-w-md w-full mb-12 text-left">
        <h3 className="font-bold text-prylom-dark mb-4 border-b pb-4">{t.successNextSteps}</h3>
        <ul className="space-y-4">
          <li className="flex gap-3">
            <span className="bg-prylom-gold text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
            <p className="text-sm text-gray-600">{t.successStep1}</p>
          </li>
          <li className="flex gap-3">
            <span className="bg-prylom-gold text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
            <p className="text-sm text-gray-600">{t.successStep2}</p>
          </li>
          <li className="flex gap-3">
            <span className="bg-prylom-gold text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
            <p className="text-sm text-gray-600">{t.successStep3}</p>
          </li>
        </ul>
      </div>

      <button 
        onClick={onRestart}
        className="text-prylom-dark font-bold underline hover:no-underline"
      >
        {t.successRestart}
      </button>
    </div>
  );
};

export default SuccessScreen;
