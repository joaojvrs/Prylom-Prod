import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setMessage({ type: 'error', text: "As senhas não coincidem." });
    }
    if (password.length < 8) {
      return setMessage({ type: 'error', text: "A senha deve ter no mínimo 8 caracteres." });
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: "Senha atualizada com sucesso! Redirecionando..." });
      setTimeout(() => navigate('/login'), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-prylom-dark min-h-screen p-6">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-prylom-gold font-black text-3xl mb-2 tracking-tighter">PRYLOM</div>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">Nova Senha</p>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl mb-6 text-[10px] font-black uppercase text-center ${
            message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Digite a nova senha</label>
            <input 
              type="password" required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-2xl outline-none font-bold text-prylom-dark transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Confirme a nova senha</label>
            <input 
              type="password" required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-prylom-gold rounded-2xl outline-none font-bold text-prylom-dark transition-all"
            />
          </div>
          <button 
            type="submit" disabled={loading}
            className="w-full bg-prylom-dark text-white font-black py-5 rounded-full text-xs uppercase tracking-widest hover:bg-prylom-gold transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? 'Atualizando...' : 'Redefinir Senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;