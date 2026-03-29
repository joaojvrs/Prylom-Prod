import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';

// ─── Field deve ficar FORA do componente para não ser recriado a cada render ───
interface FieldProps {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}
const Field: React.FC<FieldProps> = ({ label, value, onChange, type = 'text', placeholder = '', disabled = false, hint }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em]">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-5 py-4 rounded-2xl text-sm font-bold text-prylom-dark outline-none transition-all border-2
        ${disabled
          ? 'bg-gray-100 border-transparent text-gray-400 cursor-not-allowed'
          : 'bg-gray-50 border-transparent focus:border-prylom-gold focus:bg-white'
        }`}
    />
    {hint && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide px-1">{hint}</p>}
  </div>
);

// ─── Section wrapper ───────────────────────────────────────────────────────────
const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="rounded-3xl border border-gray-100 overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-100">
      <span className="text-base">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">{title}</span>
    </div>
    <div className="p-6 flex flex-col gap-5">{children}</div>
  </div>
);

// ─── Componente principal ──────────────────────────────────────────────────────
const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Dados editáveis
  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [cpfCnpj, setCpfCnpj]   = useState('');

  // Estado de edição / salvamento
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Troca de e-mail
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail]               = useState('');
  const [emailSaving, setEmailSaving]         = useState(false);
  const [emailMsg, setEmailMsg]               = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Snapshot para cancelamento
  const [snapshot, setSnapshot] = useState({ fullName: '', phone: '', cpfCnpj: '' });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        let name  = u.user_metadata?.full_name || '';
        let tel   = u.user_metadata?.phone     || '';
        let cpf   = u.user_metadata?.cpf_cnpj  || '';

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, cpf_cnpj')
          .eq('id', u.id)
          .single();

        if (profile) {
          if (profile.full_name) name = profile.full_name;
          if (profile.phone)     tel  = profile.phone;
          if (profile.cpf_cnpj)  cpf  = profile.cpf_cnpj;
        }

        setFullName(name);
        setPhone(tel);
        setCpfCnpj(cpf);
        setSnapshot({ fullName: name, phone: tel, cpfCnpj: cpf });
      }
      setLoadingData(false);
    });
  }, []);

  const startEdit = () => {
    setSnapshot({ fullName, phone, cpfCnpj });
    setMsg(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setFullName(snapshot.fullName);
    setPhone(snapshot.phone);
    setCpfCnpj(snapshot.cpfCnpj);
    setEditing(false);
    setMsg(null);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMsg(null);
    try {
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: fullName, phone, cpf_cnpj: cpfCnpj },
      });
      if (authErr) throw authErr;

      const { error: dbErr } = await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: fullName, phone, cpf_cnpj: cpfCnpj });
      if (dbErr) throw dbErr;

      setSnapshot({ fullName, phone, cpfCnpj });
      setEditing(false);
      setMsg({ type: 'success', text: 'Dados atualizados com sucesso.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      // O Supabase envia um link de confirmação para o novo e-mail antes de alterar
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setEmailMsg({
        type: 'success',
        text: `Link de confirmação enviado para ${newEmail}. Clique no link recebido para confirmar a troca.`,
      });
      setNewEmail('');
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message });
    } finally {
      setEmailSaving(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-prylom-dark min-h-screen">
        <div className="text-prylom-gold font-black animate-pulse tracking-[0.5em] uppercase text-xs">
          Carregando Perfil...
        </div>
      </div>
    );
  }

  if (!user) { navigate('/login'); return null; }

  const initials = fullName
    ? fullName.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : (user.email?.[0] ?? '?').toUpperCase();

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 bg-[#F7F6F4] min-h-screen">

      {/* Hero banner */}
      <div className="bg-prylom-dark relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-30%] left-[-10%] w-[50%] h-[200%] bg-prylom-gold/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-[-5%] w-[35%] h-[150%] bg-prylom-gold/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-2xl mx-auto px-6 pt-12 pb-12 flex flex-col items-center text-center gap-4">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-prylom-gold/30 to-prylom-gold/5 border-2 border-prylom-gold/40 flex items-center justify-center shadow-2xl mb-2">
            <span className="text-prylom-gold font-black text-3xl tracking-tight">{initials}</span>
          </div>

          <div>
            <h1 className="text-white font-black text-2xl uppercase tracking-tight">
              {fullName || user.email?.split('@')[0]}
            </h1>
            <p className="text-prylom-gold/60 text-[10px] font-black uppercase tracking-[0.4em] mt-1">
              Operador Prylom
            </p>
          </div>

          {/* Badge e-mail */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/60 text-[10px] font-bold tracking-wide">{user.email}</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">

        {/* Feedback global */}
        {msg && (
          <div className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-wide border-2 text-center
            ${msg.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
            {msg.text}
          </div>
        )}

        {/* ── Informações Pessoais ─────────────────────────────────────── */}
        <Section title="Informações Pessoais" icon="👤">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Nome Completo"
              value={fullName}
              onChange={setFullName}
              placeholder="Seu nome completo"
              disabled={!editing}
            />
            <Field
              label="CPF / CNPJ"
              value={cpfCnpj}
              onChange={setCpfCnpj}
              placeholder="000.000.000-00"
              disabled={!editing}
            />
          </div>
        </Section>

        {/* ── Contato ─────────────────────────────────────────────────── */}
        <Section title="Contato" icon="📞">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Telefone"
              value={phone}
              onChange={setPhone}
              type="tel"
              placeholder="(00) 00000-0000"
              disabled={!editing}
            />
            <Field
              label="E-mail atual"
              value={user.email || ''}
              disabled
              hint="Para alterar, use a opção abaixo."
            />
          </div>
        </Section>

        {/* ── Botões de edição ─────────────────────────────────────────── */}
        <div className="flex gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-prylom-dark text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] hover:bg-prylom-gold transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  : 'Salvar Alterações'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 border-2 border-gray-100 hover:border-gray-300 hover:text-prylom-dark transition-all"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              className="flex-1 bg-prylom-dark text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] hover:bg-prylom-gold transition-all shadow-lg active:scale-[0.98]"
            >
              Editar Dados
            </button>
          )}
        </div>

        {/* ── Alterar E-mail ───────────────────────────────────────────── */}
        <Section title="Segurança · Alterar E-mail" icon="🔒">
          {!showEmailChange ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                A troca de e-mail passa por verificação: você receberá um link de confirmação
                no <strong>novo endereço</strong> antes de qualquer alteração ser aplicada.
              </p>
              <button
                onClick={() => { setShowEmailChange(true); setEmailMsg(null); }}
                className="self-start px-6 py-3 bg-gray-100 hover:bg-prylom-dark hover:text-white text-prylom-dark font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
              >
                Solicitar Troca de E-mail
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {emailMsg && (
                <div className={`px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-wide border-2 text-center
                  ${emailMsg.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                  {emailMsg.text}
                </div>
              )}
              <Field
                label="Novo E-mail"
                value={newEmail}
                onChange={setNewEmail}
                type="email"
                placeholder="novo@email.com"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleEmailChange}
                  disabled={emailSaving || !newEmail.trim()}
                  className="flex-1 bg-prylom-dark text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] hover:bg-prylom-gold transition-all shadow-lg active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {emailSaving
                    ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    : 'Enviar Link de Confirmação'}
                </button>
                <button
                  onClick={() => { setShowEmailChange(false); setEmailMsg(null); setNewEmail(''); }}
                  className="px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 border-2 border-gray-100 hover:border-gray-300 hover:text-prylom-dark transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ── Voltar ───────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate(-1)}
          className="self-center mt-2 group flex items-center gap-3 text-gray-400 hover:text-prylom-dark transition-all"
        >
          <div className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-prylom-dark transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Voltar</span>
        </button>

      </div>
    </div>
  );
};

export default UserProfile;
