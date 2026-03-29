import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

type AuthMode = 'LOGIN' | 'SIGNUP' | 'RECOVERY';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Novos campos
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isPasswordValid = (pass: string) => {
    return pass.length >= 8 && /[A-Za-z]/.test(pass) && /[0-9]/.test(pass);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'SIGNUP') {
        if (!isPasswordValid(password)) {
          throw new Error("A senha deve ter pelo menos 8 caracteres, incluindo letras e números.");
        }
        if (password !== confirmPassword) {
          throw new Error("As senhas não coincidem.");
        }

        // Enviando metadados adicionais no signUp
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone,
              cpf_cnpj: cpfCnpj,
            }
          }
        });
        
        if (error) throw error;
        setMessage({ type: 'success', text: "Cadastro realizado! Verifique seu e-mail para confirmar." });
      } 
      else if (mode === 'LOGIN') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("E-mail ou senha incorretos.");
          }
          throw error;
        }
        window.location.href = '/';
      } 
      else if (mode === 'RECOVERY') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: "Link de recuperação enviado para o seu e-mail." });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-prylom-dark min-h-screen p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-prylom-gold/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-prylom-gold/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-white rounded-[3.5rem] p-10 md:p-14 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 relative z-10 border border-white/10">
        
        <div className="text-center mb-10">
          <div className="text-prylom-dark font-black text-4xl mb-3 tracking-tighter flex items-center justify-center gap-1">
            <span className="text-prylom-gold">〈</span>
            Prylom
            <span className="text-prylom-gold">〉</span>
          </div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] opacity-80">
            {mode === 'LOGIN' ? 'Acesso ao Ecossistema Prylom' : mode === 'SIGNUP' ? 'Criação de Conta' : 'Recuperar Acesso'}
          </p>
        </div>

        {message && (
          <div className={`p-5 rounded-3xl mb-8 text-[10px] font-black uppercase text-center animate-shake border-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-100 text-green-600' 
              : 'bg-red-50 border-red-100 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          {/* CAMPOS ADICIONAIS PARA SIGNUP */}
          {mode === 'SIGNUP' && (
            <>
              <div className="space-y-2 group animate-fadeIn">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 group-focus-within:text-prylom-gold transition-colors">Nome Completo</label>
                <input 
                  type="text" required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nome do Operador"
                  className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-3xl outline-none font-bold text-prylom-dark transition-all placeholder:text-gray-200"
                />
              </div>

              <div className="space-y-2 group animate-fadeIn">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 group-focus-within:text-prylom-gold transition-colors">Telefone</label>
                <input
                  type="tel" required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-3xl outline-none font-bold text-prylom-dark transition-all placeholder:text-gray-200"
                />
              </div>

              <div className="space-y-2 group animate-fadeIn">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 group-focus-within:text-prylom-gold transition-colors">CPF / CNPJ</label>
                <input
                  type="text" required
                  value={cpfCnpj}
                  onChange={e => setCpfCnpj(e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-3xl outline-none font-bold text-prylom-dark transition-all placeholder:text-gray-200"
                />
              </div>
            </>
          )}

          <div className="space-y-2 group">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 group-focus-within:text-prylom-gold transition-colors">E-mail</label>
            <input 
              type="email" required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="terminal@prylom.com"
              className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-3xl outline-none font-bold text-prylom-dark transition-all placeholder:text-gray-200"
            />
          </div>

          {mode !== 'RECOVERY' && (
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 group-focus-within:text-prylom-gold transition-colors">Senha</label>
              <input 
                type="password" required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-3xl outline-none font-bold text-prylom-dark transition-all placeholder:text-gray-200"
              />
              {mode === 'SIGNUP' && (
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-2 px-2 tracking-tight">
                  Mínimo 8 caracteres, <span className="text-prylom-dark">letras e números</span>.
                </p>
              )}
            </div>
          )}

          {mode === 'SIGNUP' && (
            <div className="space-y-2 animate-fadeIn group">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 group-focus-within:text-prylom-gold transition-colors">Confirmar Senha</label>
              <input 
                type="password" required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-3xl outline-none font-bold text-prylom-dark transition-all placeholder:text-gray-200"
              />
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full bg-prylom-dark text-white font-black py-6 rounded-full text-[11px] uppercase tracking-[0.2em] hover:bg-prylom-gold transition-all shadow-2xl active:scale-[0.98] disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              mode === 'LOGIN' ? 'Entrar no Ecossistema' : mode === 'SIGNUP' ? 'Finalizar Cadastro' : 'Solicitar Link'
            )}
          </button>
        </form>

        <div className="mt-10 flex flex-col gap-4 text-center">
          {mode === 'LOGIN' ? (
            <>
              <button onClick={() => setMode('RECOVERY')} className="text-[9px] font-black text-prylom-gold uppercase tracking-[0.15em] hover:opacity-70 transition-opacity">Esqueci minha senha</button>
              <div className="h-px w-8 bg-gray-100 mx-auto"></div>
              <button onClick={() => setMode('SIGNUP')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-prylom-dark transition-colors">Se cadastre e faça parte da Prylom!</button>
            </>
          ) : (
            <button onClick={() => setMode('LOGIN')} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-prylom-dark transition-colors">Voltar para o Login</button>
          )}
        </div>
      </div>

      <button 
        onClick={() => navigate('/')}
        className="mt-12 group flex items-center gap-4 text-white/40 hover:text-prylom-gold transition-all duration-300"
      >
        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-prylom-gold transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Retornar ao Início</span>
      </button>
    </div>
  );
};

export default Auth;