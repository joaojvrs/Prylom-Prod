import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom'; // Adicione isso
import { AppLanguage, AppCurrency } from './types';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import LandingPage from './components/LandingPage';
import OwnerWizard from './components/OwnerWizard';
import BrokerFlow from './components/BrokerFlow';
import SuccessScreen from './components/SuccessScreen';
import Auth from './components/Auth';
import Favorites from './components/Favorites';
import ResetPassword from './components/ResetPassword';
import ToolsHub from './components/ToolsHub';
import SmartMapReport from './components/SmartMapReport';
import ValuationCenter from './components/ValuationCenter';
import MarketTerminal from './components/MarketTerminal';
import ShoppingCenter from './components/ShoppingCenter';
import ProductDetails from './components/ProductDetails';
import LegalAgro from './components/LegalAgro';
import { translations } from './translations';
import DataRoomModal from './components/DataRoomModal';
import SharePage from './components/SharePage';
import UserProfile from './components/UserProfile';

// AdminDashboard carregado apenas quando a rota /admin é acessada,
// mantendo o código admin fora do bundle público.
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const AdminFallback = () => (
  <div className="flex-1 flex items-center justify-center p-20 bg-prylom-dark min-h-screen">
    <div className="text-prylom-gold font-black animate-pulse tracking-[0.5em] uppercase text-xs">Carregando Terminal Admin...</div>
  </div>
);


const App: React.FC = () => {
const navigate = useNavigate(); // Hook para mudar de página
  const location = useLocation(); // Hook para saber onde estamos
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
  
  // Se o input estiver dentro de um Modal, não mude o estado do App!
  // Isso evita que o App re-renderize e "mate" o foco do modal.
  if (target.closest('.fixed') || target.closest('.absolute')) return;

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

    //window.addEventListener('focusin', handleFocusIn);
  //  window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

const navigateTo = (path: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(path); // Agora usa o router
    setIsHubOpen(false);
  };

const openProduct = (productId: string) => {
    navigateTo(`/product/${productId}`); // URL dinâmica
  };

  const isMapView = location.pathname === '/map';
  const isAdminView = location.pathname.startsWith('/admin');
  const isLanding = location.pathname === '/';



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

const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  // 1. Checa sessão atual
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    setLoading(false);
  });

  // 2. Escuta mudanças (login/logout)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, []);

const ProtectedRoute = ({ children, isAdmin = false }: { children: React.ReactNode, isAdmin?: boolean }) => {
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-20 bg-prylom-dark min-h-screen">
        <div className="text-prylom-gold font-black animate-pulse tracking-[0.5em] uppercase text-xs">Acessando Terminal...</div>
      </div>
    );
  }

  // Se não estiver logado, vai para o login geral
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se for rota de admin, mas o app_metadata não tiver role: "admin"
  if (isAdmin && user.app_metadata?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const [favCount, setFavCount] = useState(0);

useEffect(() => {
  if (!user) {
    setFavCount(0);
    return;
  }

  // Função para buscar a contagem
  const fetchFavCount = async () => {
    const { count, error } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (!error) {
      setFavCount(count || 0);
      console.log("Contador Prylom atualizado:", count);
    }
  };

  fetchFavCount();

const channel = supabase
    .channel('prylom_realtime_status')
    .on(
      'postgres_changes' as any,
      {
        event: '*', 
        schema: 'public',
        table: 'favorites',
        filter: `user_id=eq.${user.id}` // O filtro aqui ja garante que so ouviremos o que é nosso
      },
      () => {
        // Se o filtro acima estiver funcionando (com Realtime FULL), 
        // qualquer evento aqui disparará a atualização.
        console.log("Mudança (Insert/Delete) detectada nos favoritos.");
        fetchFavCount();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
  return (
    <div className={`min-h-screen flex flex-col transition-all duration-300 ${isInputFocused ? 'pb-[40vh]' : 'pb-0'} bg-[#FDFCFB]`}>
      
      {/* Terminal Hub Drawer */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-500 ${isHubOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-prylom-dark/80 backdrop-blur-md" onClick={() => setIsHubOpen(false)}></div>
        <div className={`absolute right-0 top-0 bottom-0 w-[85%] md:w-[450px] bg-white shadow-3xl transition-transform duration-500 flex flex-col ${isHubOpen ? 'translate-x-0' : 'translate-x-full'}`}>
           <header className="p-8 pb-4 flex justify-between items-center border-b border-gray-50 shrink-0">
              <div>
                 <h3 className="text-2xl font-black text-[#2c5363] tracking-tighter uppercase">{t.hubTitle}</h3>
                 <p className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mt-2">{t.hubSub}</p>
              </div>
{user ? (
    <div className="flex items-center gap-4">
       <span className="text-[9px] font-black uppercase text-prylom-dark opacity-50 hidden md:block">
         Olá, {user.email?.split('@')[0]}
       </span>
       <button 
          onClick={() => setIsHubOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-xl bg-prylom-dark text-white hover:bg-prylom-gold"
       >
          <span className="hidden sm:inline">{t.hubTitle}</span>
       </button>
    </div>
  ) : (
    <button 
       onClick={() => navigateTo('/login')}
       className="px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] bg-prylom-gold text-white shadow-lg"
    >
       Login
    </button>
  )}
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
  { path: "/shopping", icon: "🛒", label: t.btnShopping, desc: t.shoppingSub },
  { path: "/favorites", icon: "❤️", label: "Favoritos", desc: "Seus ativos salvos" },
  { path: "/market", icon: "📈", label: t.btnMarket, desc: t.livePulse },
  { path: "/legal", icon: "📑", label: t.btnLegal, desc: t.legalSub },
  { path: "/tools", icon: "🛠️", label: t.btnTools, desc: t.economicDueDiligence },
  { path: "/valuation", icon: "📋", label: t.btnValuation, desc: t.valuationTitle },
  ...(user ? [{ path: "/perfil", icon: "👤", label: "Meu Perfil", desc: "Dados cadastrais e preferências" }] : []),
].map((item, idx) => (
                <button 
                  key={item.path}
                  onClick={() => navigateTo(item.path)}
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

<footer className="p-8 pt-4 border-t border-gray-100 shrink-0 flex flex-col gap-3">
  {/* A MÁGICA: Agora só aparece se existir um usuário E esse usuário for o seu e-mail */}
  {user && user.app_metadata?.role === 'admin' && (
    <button 
      onClick={() => navigateTo('/admin/dashboard')} 
      className="w-full p-4 bg-gray-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-400 hover:bg-prylom-dark hover:text-white transition-all"
    >
      {t.adminTerminal}
    </button>
  )}
  
  {/* Botão de Logout aparece para qualquer um que estiver logado */}
  {user && (
    <button 
      onClick={() => supabase.auth.signOut()} 
      className="w-full p-4 bg-red-50 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all"
    >
      Sair da Conta
    </button>
  )}
</footer>
        </div>
      </div>

      {!isMapView && !isAdminView && (
        <header className={`py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-[60] transition-all duration-500 bg-white border-b border-gray-100 shadow-sm`}>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo('/')}>
            <div className={`font-black text-2xl md:text-3xl flex items-center tracking-tighter transition-all duration-500 text-[#2c5363] group-hover:text-prylom-gold`}>
              <span className="text-prylom-gold mr-1">〈</span>
              <span>Prylom</span>
              <span className="text-prylom-gold ml-1">〉</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
{user && (
  <div className="flex items-center gap-4 py-2 px-4 bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] transition-all hover:border-prylom-gold/30">
    
    {/* Identidade do Operador */}
    <div className="flex flex-col items-end pr-4 border-r border-gray-100">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Õlá,</span>
      </div>
      <span className="text-[13px] font-black text-prylom-dark uppercase tracking-tight">
        {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
      </span>
    </div>

    {/* Widget de Favoritos */}
    <button
      onClick={() => navigateTo('/favorites')}
      className="group relative flex items-center gap-2.5 pl-1"
    >
      <div className="relative flex items-center justify-center w-9 h-9 bg-[#2c5363]/10 rounded-2xl group-hover:bg-[#2c5363]/20 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="#2c5363">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        {favCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[#2c5363] text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white leading-none">
            {favCount}
          </span>
        )}
      </div>

      <div className="flex flex-col items-start">
        <span className="text-[13px] font-black text-prylom-dark leading-none tabular-nums">
          {favCount.toString().padStart(2, '0')}
        </span>
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5 group-hover:text-[#2c5363] transition-colors">
          Favoritos
        </span>
      </div>
    </button>
  </div>
)}
  
            <div className="hidden lg:flex items-center gap-4">

<div className="hidden lg:flex items-center gap-4">
  
  {/* Container em Coluna para Texto + Bandeiras */}
<div className="flex flex-col items-start">
    <p className="text-[9px] font-black uppercase text-prylom-dark tracking-[0.2em] mb-1 ml-1 opacity-70">
      {t.selectLanguage || "Selecione o Idioma"}
    </p>
    <div className="flex items-center gap-2 p-1.5 rounded-full border border-gray-200 bg-white/60 shadow-sm">
      {flags.map(f => (
        <button 
          key={f.lang}
          onClick={() => { setLang(f.lang); setCurrency(f.currency); }} 
          title={f.name}
          className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${lang === f.lang ? 'border-prylom-gold scale-110 shadow-sm' : 'border-transparent opacity-40 hover:opacity-100'}`}
        >
          <img src={f.img} className="w-full h-full object-cover" alt={f.lang} />
        </button>
      ))}
    </div>
  </div>

<div className="flex flex-col items-start">
    <p className="text-[9px] font-black uppercase text-prylom-dark tracking-[0.2em] mb-1 ml-1 opacity-70">
      {t.selectMoeda || "Selecione a Moeda"}
    </p>
    <div className="flex items-center gap-1 p-1 rounded-xl border border-gray-200 bg-white/60 shadow-sm">
      {currenciesList.map(c => (
        <button 
          key={c.code}
          onClick={() => setCurrency(c.code)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${currency === c.code ? 'bg-prylom-dark text-white' : 'text-gray-400 hover:text-prylom-dark'}`}
        >
          {c.code}
        </button>
      ))}
    </div>
  </div>
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
  <Routes>
    <Route path="/" element={<LandingPage 
      onSelectOwner={() => navigateTo('/owner')} 
      onSelectBroker={() => navigateTo('/broker')} 
      onSelectTools={() => navigateTo('/tools')}
      onSelectValuation={() => navigateTo('/valuation')}
      onSelectMarket={() => navigateTo('/market')}
      onSelectShopping={() => navigateTo('/shopping')}
      onSelectLegal={() => navigateTo('/legal')}
      t={t} lang={lang} currency={currency} 
    />} />
{/* O '?' faz com que tanto /dataroom quanto /dataroom/123 funcionem */}
<Route 
  path="/dataroom/:id?" 
  element={
    <DataRoomModal 
      onBack={() => navigate(-1)} 
      t={t} 
      lang={lang} 
      currency={currency} 
    />
  } 
/>
    <Route path="/owner" element={<OwnerWizard onComplete={() => navigateTo('/success')} onBack={() => navigateTo('/')} onOpenMap={() => navigateTo('/map')} t={t} lang={lang} currency={currency} />} />
    <Route path="/broker" element={<BrokerFlow onComplete={() => navigateTo('/success')} onBack={() => navigateTo('/')} t={t} lang={lang} currency={currency} />} />
    <Route path="/tools" element={<ToolsHub onBack={() => navigateTo('/')} t={t} lang={lang} currency={currency} />} />
    <Route path="/valuation" element={<ValuationCenter onBack={() => navigateTo('/')} t={t} lang={lang} currency={currency} />} />
    <Route path="/market" element={<MarketTerminal onBack={() => navigateTo('/')} t={t} lang={lang} currency={currency} />} />
    <Route path="/shopping" element={<ShoppingCenter onBack={() => navigateTo('/')} onSelectProduct={(id) => navigateTo(`/product/${id}`)} t={t} lang={lang} currency={currency} />} />
    <Route path="/product/:id" element={<ProductWrapper t={t} lang={lang} currency={currency} navigateTo={navigateTo} />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/favorites" element={<Favorites onSelectProduct={openProduct} onBack={() => navigateTo('/shopping')} t={t} currency={currency} />} />
<Route
  path="/admin/dashboard"
  element={
    <ProtectedRoute isAdmin={true}>
      <Suspense fallback={<AdminFallback />}>
        <AdminDashboard
          onLogout={async () => {
            await supabase.auth.signOut();
            navigateTo('/');
          }}
          t={t} lang={lang} currency={currency}
        />
      </Suspense>
    </ProtectedRoute>
  }
/>
    
    <Route path="/map" element={<SmartMapReport onBack={() => navigateTo('/owner')} t={t} lang={lang} currency={currency} />} />
    <Route path="/legal" element={<LegalAgro onBack={() => navigateTo('/')} t={t} lang={lang} currency={currency} />} />
    <Route path="/success" element={<SuccessScreen onRestart={() => navigateTo('/')} t={t} lang={lang} currency={currency} />} />
 <Route path="/perfil" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
 <Route path="*" element={<NotFound t={t} navigateTo={navigateTo} />} />
 <Route path="/login" element={<Auth />} />
 <Route path="/share/:token" element={<SharePage />} />
  </Routes>
</main>

      {!isMapView && !isAdminView && !isInputFocused && (
        <footer className="py-20 px-8 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="md:col-span-1 space-y-4">
              <div className="text-[#2c5363] font-black text-3xl tracking-tighter">
                Prylom<span className="text-prylom-gold">.</span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed font-medium">
               CNPJ: 45.685.251/0001-95 | 16344 – MS
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <h4 className="font-black uppercase text-[9px] tracking-[0.4em] text-prylom-gold">{t.footerTerminal}</h4>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigateTo('/shopping')} className="text-xs font-bold text-gray-600 hover:text-prylom-dark transition-colors w-fit">{t.btnShopping}</button>
                <button onClick={() => navigateTo('/market')} className="text-xs font-bold text-gray-600 hover:text-prylom-dark transition-colors w-fit">{t.btnMarket}</button>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <h4 className="font-black uppercase text-[9px] tracking-[0.4em] text-prylom-gold">{t.footerCompany}</h4>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigateTo('/')} className="text-xs font-bold text-gray-600 hover:text-prylom-dark transition-colors w-fit">{t.aboutUs}</button>
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



const NotFound = ({ t, navigateTo }: any) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 bg-[#FDFCFB] min-h-[60vh] text-center">
      <div className="text-prylom-gold font-black text-8xl mb-4 opacity-20 tracking-tighter">404</div>
      <h2 className="text-2xl font-black text-prylom-dark uppercase tracking-widest mb-4">
        {t.pageNotFound || "Página Não Encontrada"}
      </h2>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-8 max-w-xs leading-relaxed">
        O terminal que você está tentando acessar não existe ou foi movido.
      </p>
      <button 
        onClick={() => navigateTo('/')}
        className="px-10 py-4 bg-prylom-dark text-white font-black rounded-full text-[10px] uppercase tracking-[0.2em] hover:bg-prylom-gold transition-all shadow-xl"
      >
        {t.btnBack || "Voltar ao Início"}
      </button>
    </div>
  );
};

const ProductWrapper = ({ t, lang, currency, navigateTo }: any) => {
  const { id } = useParams();
  const location = useLocation();
  const fromFavorites = !!(location.state as any)?.fromFavorites;
  return <ProductDetails
    productId={id || null}
    onSelectProduct={(productId: string) => navigateTo(`/product/${productId}`)}
    onBack={() => navigateTo(fromFavorites ? '/favorites' : '/shopping')}
    fromFavorites={fromFavorites}
    t={t} lang={lang} currency={currency}
  />;
};