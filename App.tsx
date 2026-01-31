import React, { useState, useEffect } from 'react';
import { AppView, AppLanguage, AppCurrency } from './types';
import LandingPage from './components/LandingPage';
import OwnerWizard from './components/OwnerWizard';
import BrokerFlow from './components/BrokerFlow';
import SuccessScreen from './components/SuccessScreen';
import ToolsHub from './components/ToolsHub';
import SmartMapReport from './components/SmartMapReport';
import ValuationCenter from './components/ValuationCenter';
import MarketTerminal from './components/MarketTerminal';
import ShoppingCenter from './components/ShoppingCenter';
import ProductDetails from './components/ProductDetails';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import LegalAgro from './components/LegalAgro';
import { translations } from './translations';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [lang, setLang] = useState<AppLanguage>(AppLanguage.PT);
  const [currency, setCurrency] = useState<AppCurrency>(AppCurrency.BRL);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const browserLang = navigator.language.split('-')[0].toLowerCase();
          if (browserLang === 'en') { setLang(AppLanguage.EN); setCurrency(AppCurrency.USD); }
          else if (browserLang === 'zh') { setLang(AppLanguage.ZH); setCurrency(AppCurrency.CNY); }
          else if (browserLang === 'ru') { setLang(AppLanguage.RU); setCurrency(AppCurrency.RUB); }
          else { setLang(AppLanguage.PT); setCurrency(AppCurrency.BRL); }
        },
        () => console.warn("Location denied")
      );
    }

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
        setIsInputFocused(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
        setIsInputFocused(false);
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const navigateTo = (newView: AppView) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setView(newView);
    setIsHubOpen(false);
  };

  const openProduct = (productId: string) => {
    setSelectedProductId(productId);
    navigateTo(AppView.PRODUCT_DETAILS);
  };

  const renderView = () => {
    const commonProps = { t, lang, currency };
    switch (view) {
      case AppView.LANDING:
        return <LandingPage 
          onSelectOwner={() => navigateTo(AppView.OWNER_WIZARD)} 
          onSelectBroker={() => navigateTo(AppView.BROKER_FLOW)} 
          onSelectTools={() => navigateTo(AppView.TOOLS_HUB)}
          onSelectValuation={() => navigateTo(AppView.VALUATION_CENTER)}
          onSelectMarket={() => navigateTo(AppView.MARKET_TERMINAL)}
          onSelectShopping={() => navigateTo(AppView.SHOPPING_CENTER)}
          onSelectLegal={() => navigateTo(AppView.LEGAL_AGRO)}
          {...commonProps}
        />;
      case AppView.OWNER_WIZARD:
        return <OwnerWizard 
          onComplete={() => navigateTo(AppView.SUCCESS)} 
          onBack={() => navigateTo(AppView.LANDING)} 
          onOpenMap={() => navigateTo(AppView.SMART_MAP)}
          {...commonProps}
        />;
      case AppView.BROKER_FLOW:
        return <BrokerFlow onComplete={() => navigateTo(AppView.SUCCESS)} onBack={() => navigateTo(AppView.LANDING)} {...commonProps} />;
      case AppView.TOOLS_HUB:
        return <ToolsHub onBack={() => navigateTo(AppView.LANDING)} {...commonProps} />;
      case AppView.VALUATION_CENTER:
        return <ValuationCenter onBack={() => navigateTo(AppView.LANDING)} {...commonProps} />;
      case AppView.MARKET_TERMINAL:
        return <MarketTerminal onBack={() => navigateTo(AppView.LANDING)} {...commonProps} />;
      case AppView.SHOPPING_CENTER:
        return <ShoppingCenter onBack={() => navigateTo(AppView.LANDING)} onSelectProduct={openProduct} {...commonProps} />;
      case AppView.PRODUCT_DETAILS:
        return <ProductDetails productId={selectedProductId} onSelectProduct={openProduct} onBack={() => navigateTo(AppView.SHOPPING_CENTER)} {...commonProps} />;
      case AppView.ADMIN_LOGIN:
        return <AdminLogin onLoginSuccess={() => navigateTo(AppView.ADMIN_DASHBOARD)} onBack={() => navigateTo(AppView.LANDING)} {...commonProps} />;
      case AppView.ADMIN_DASHBOARD:
        return <AdminDashboard onLogout={() => navigateTo(AppView.LANDING)} {...commonProps} />;
      case AppView.SMART_MAP:
        return <SmartMapReport onBack={() => navigateTo(AppView.OWNER_WIZARD)} {...commonProps} />;
      case AppView.LEGAL_AGRO:
        return <LegalAgro onBack={() => navigateTo(AppView.LANDING)} {...commonProps} />;
      case AppView.SUCCESS:
        return <SuccessScreen onRestart={() => navigateTo(AppView.LANDING)} {...commonProps} />;
      default:
        return <LandingPage {...commonProps} onSelectOwner={() => {}} onSelectBroker={() => {}} onSelectTools={() => {}} onSelectValuation={() => {}} onSelectMarket={() => {}} onSelectShopping={() => {}} onSelectLegal={() => {}} />;
    }
  };

  const isMapView = view === AppView.SMART_MAP;
  const isAdminView = view === AppView.ADMIN_DASHBOARD || view === AppView.ADMIN_LOGIN;
  const isLanding = view === AppView.LANDING;

  const flags = [
    { lang: AppLanguage.PT, currency: AppCurrency.BRL, img: "https://flagcdn.com/w80/br.png", name: "Português" },
    { lang: AppLanguage.EN, currency: AppCurrency.USD, img: "https://flagcdn.com/w80/us.png", name: "English" },
    { lang: AppLanguage.ZH, currency: AppCurrency.CNY, img: "https://flagcdn.com/w80/cn.png", name: "中文" },
    { lang: AppLanguage.RU, currency: AppCurrency.RUB, img: "https://flagcdn.com/w80/ru.png", name: "Русский" }
  ];

  const currenciesList = [
    { code: AppCurrency.BRL, symbol: 'R$' },
    { code: AppCurrency.USD, symbol: '$' },
    { code: AppCurrency.CNY, symbol: '¥' },
    { code: AppCurrency.RUB, symbol: '₽' }
  ];

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${isInputFocused ? 'pb-[40vh]' : 'pb-0'} bg-[#FDFCFB]`}>
      
      {/* Terminal Hub Drawer */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-500 ${isHubOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-prylom-dark/80 backdrop-blur-md" onClick={() => setIsHubOpen(false)}></div>
        <div className={`absolute right-0 top-0 bottom-0 w-[85%] md:w-[450px] bg-white shadow-3xl transition-transform duration-500 flex flex-col ${isHubOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <header className="p-8 pb-4 flex justify-between items-center border-b border-gray-50 shrink-0">
              <div>
                 <h3 className="text-2xl font-black text-[#000080] tracking-tighter uppercase">{t.hubTitle}</h3>
                 <p className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mt-2">{t.hubSub}</p>
              </div>
              <button onClick={() => setIsHubOpen(false)} className="text-gray-300 hover:text-prylom-dark p-3 transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
           </header>

           <nav className="flex-1 overflow-y-auto p-8 flex flex-col gap-4 no-scrollbar">
              <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 mb-4">
                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-4">{t.morningCall}</p>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {flags.map(f => (
                    <button 
                      key={f.lang}
                      onClick={() => { setLang(f.lang); setCurrency(f.currency); }} 
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${lang === f.lang ? 'border-prylom-gold scale-105 shadow-md' : 'border-transparent opacity-40'}`}
                    >
                      <img src={f.img} className="w-full h-full object-cover" alt={f.lang} />
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {currenciesList.map(c => (
                    <button 
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${currency === c.code ? 'bg-prylom-gold text-white border-prylom-gold' : 'bg-white text-prylom-dark border-gray-200'}`}
                    >
                      {c.code}
                    </button>
                  ))}
                </div>
              </div>

              {[
                { view: AppView.SHOPPING_CENTER, icon: "🛒", label: t.btnShopping, desc: t.shoppingSub },
                { view: AppView.MARKET_TERMINAL, icon: "📈", label: t.btnMarket, desc: t.livePulse },
                { view: AppView.LEGAL_AGRO, icon: "📑", label: t.btnLegal, desc: t.legalSub },
                { view: AppView.TOOLS_HUB, icon: "🛠️", label: t.btnTools, desc: t.economicDueDiligence },
                { view: AppView.VALUATION_CENTER, icon: "📋", label: t.btnValuation, desc: t.valuationTitle }
              ].map((item, idx) => (
                <button 
                  key={item.view}
                  onClick={() => navigateTo(item.view)} 
                  className="flex items-center gap-4 p-6 bg-gray-50 rounded-[2rem] hover:bg-prylom-dark group transition-all duration-300 text-left border border-gray-100 hover:border-prylom-dark"
                >
                   <div className="bg-white text-prylom-dark p-3 rounded-xl group-hover:bg-prylom-gold group-hover:text-white transition-all shadow-sm text-xl">{item.icon}</div>
                   <div>
                     <div className="font-black text-prylom-dark group-hover:text-white uppercase text-[10px] tracking-widest mb-1">{item.label}</div>
                     <div className="text-[9px] text-gray-400 font-bold group-hover:text-gray-500">{item.desc}</div>
                   </div>
                </button>
              ))}
           </nav>

           <footer className="p-8 pt-4 border-t border-gray-100 shrink-0">
              <button onClick={() => navigateTo(AppView.ADMIN_LOGIN)} className="w-full p-4 bg-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:bg-prylom-dark hover:text-white transition-all">
                 {t.adminTerminal}
              </button>
           </footer>
        </div>
      </div>

      {!isMapView && !isAdminView && (
        <header className={`py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-[60] transition-all duration-500 bg-white border-b border-gray-100 shadow-sm`}>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo(AppView.LANDING)}>
            <div className={`font-black text-2xl md:text-3xl flex items-center tracking-tighter transition-all duration-500 text-[#000080] group-hover:text-prylom-gold`}>
              <span className="text-prylom-gold mr-1">〈</span>
              <span>Prylom</span>
              <span className="text-prylom-gold ml-1">〉</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 p-1 rounded-full border border-gray-200 bg-white/60">
                {flags.map(f => (
                  <button 
                    key={f.lang}
                    onClick={() => { setLang(f.lang); setCurrency(f.currency); }} 
                    title={f.name}
                    className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${lang === f.lang ? 'border-prylom-gold scale-110 shadow-sm' : 'border-transparent opacity-40 hover:opacity-100'}`}
                  >
                    <img src={f.img} className="w-full h-full object-cover" alt={f.lang} />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl border border-gray-200 bg-white/60">
                {currenciesList.map(c => (
                  <button 
                    key={c.code}
                    onClick={() => setCurrency(c.code)}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${currency === c.code ? 'bg-prylom-dark text-white' : 'text-gray-400 hover:text-prylom-dark'}`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>

            <button 
               onClick={() => setIsHubOpen(true)}
               className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-xl bg-prylom-dark text-white hover:bg-prylom-gold`}
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" /></svg>
               <span className="hidden sm:inline">{t.hubTitle}</span>
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col relative">
        {renderView()}
      </main>

      {!isMapView && !isAdminView && !isInputFocused && (
        <footer className="py-20 px-8 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="md:col-span-1 space-y-4">
              <div className="text-[#000080] font-black text-3xl tracking-tighter">
                Prylom<span className="text-prylom-gold">.</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed font-medium">
                {t.footerEcossystem}
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <h4 className="font-black uppercase text-[9px] tracking-[0.4em] text-prylom-gold">{t.footerTerminal}</h4>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigateTo(AppView.SHOPPING_CENTER)} className="text-xs font-bold text-gray-600 hover:text-prylom-dark transition-colors w-fit">{t.btnShopping}</button>
                <button onClick={() => navigateTo(AppView.MARKET_TERMINAL)} className="text-xs font-bold text-gray-600 hover:text-prylom-dark transition-colors w-fit">{t.btnMarket}</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <h4 className="font-black uppercase text-[9px] tracking-[0.4em] text-prylom-gold">{t.footerCompany}</h4>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigateTo(AppView.LANDING)} className="text-xs font-bold text-gray-600 hover:text-prylom-dark transition-colors w-fit">{t.aboutUs}</button>
                <button onClick={() => navigateTo(AppView.ADMIN_LOGIN)} className="text-xs font-bold text-gray-600 hover:text-prylom-dark transition-colors w-fit">{t.adminTerminal}</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <h4 className="font-black uppercase text-[9px] tracking-[0.4em] text-prylom-gold">{t.footerContact}</h4>
              <p className="text-xs font-bold text-gray-600">{t.contactEmail}</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;