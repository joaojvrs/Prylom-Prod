import React, { useMemo } from 'react';
import { AppLanguage, AppCurrency } from '../types';

interface Props {
  onBack: () => void;
  t: any;
  lang: AppLanguage;
  currency: AppCurrency;
}

const MarketTerminal: React.FC<Props> = ({ onBack, t, lang }) => {
  const tickerSymbols = useMemo(() => JSON.stringify([
    { proName: "FX_IDC:USDBRL", title: "Dólar / Real" },
    { proName: "CBOT:ZS1!", title: "Soja (CBOT)" },
    { proName: "CBOT:ZC1!", title: "Milho (CBOT)" },
    { proName: "CME:LE1!", title: "Boi Gordo" },
    { proName: "ICEUS:KC1!", title: "Café Arábica" },
    { proName: "ICEUS:SB1!", title: "Açúcar" },
    { proName: "INDEX:DXY", title: "DXY Index" }
  ]), []);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 md:py-16 animate-fadeIn pb-40 flex flex-col gap-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-prylom-gold uppercase tracking-[0.3em]">{t.liveFeed}</span>
          </div>
          <h1 className="text-4xl font-black text-[#2c5363] tracking-tighter uppercase">{t.btnMarket}</h1>
          <p className="text-gray-500 text-sm font-bold">{t.livePulse}</p>
        </div>
        <button onClick={onBack} className="bg-white text-prylom-dark border-2 border-gray-100 px-8 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg hover:border-prylom-gold transition-all">
          {t.btnBack}
        </button>
      </div>

      <div className="w-full bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 min-h-[72px]">
        {React.createElement('tv-ticker-tape', {
          symbols: tickerSymbols,
          colorTheme: "light",
          isTransparent: false,
          displayMode: "adaptive",
          locale: lang.toLowerCase()
        } as any)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xl font-black text-[#2c5363] uppercase tracking-widest">{t.terminalMainEvents}</h2>
          </div>

          <div className="py-20 flex flex-col items-center justify-center gap-6 bg-white rounded-[2.5rem] border border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-[2rem] flex items-center justify-center text-3xl border border-gray-100">📡</div>
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.4em] text-center">
              {t.marketEmpty || "Feed de notícias indisponível"}
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#2c5363] p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-4 block">{t.terminalDisclaimer}</span>
              <h4 className="text-xl font-black mb-4 tracking-tight">{t.terminalExecution}</h4>
              <p className="text-xs font-medium leading-relaxed opacity-70">
                {t.terminalDisclaimerDesc}
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-prylom-gold/10 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketTerminal;
