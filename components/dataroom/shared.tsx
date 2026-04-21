import { useState, useEffect } from 'react';

export const WEBHOOK_VALIDATE_CODE = "https://webhook.saveautomatik.shop/webhook/validaCodigo";
export const WEBHOOK_SEND_WHATSAPP = "https://webhook.saveautomatik.shop/webhook/validaWhatsapp";
export const API_CNPJ = (cnpj: string) => `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`;
export const API_COUNTRIES = "https://restcountries.com/v3.1/all?fields=name";
export const API_IP = "https://api.ipify.org?format=json";

export function useWhatsAppValidation({ phone, nome, projeto, errorMessage = "Código incorreto ou expirado." }: {
  phone: string;
  nome: string;
  projeto: string;
  errorMessage?: string;
}) {
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [codeError, setCodeError] = useState(false);

  useEffect(() => {
    if (smsCode.length !== 6) return;
    setIsVerifying(true);
    setCodeError(false);
    (async () => {
      try {
        const res = await fetch(WEBHOOK_VALIDATE_CODE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telefone: phone.replace(/\D/g, ""), codigo: smsCode }),
        });
        const data = await res.json();
        const valid = String(data.valid).toLowerCase() === "true";
        if (valid) {
          setIsCodeValid(true);
          setCodeError(false);
        } else {
          setIsCodeValid(false);
          setCodeError(true);
          setSmsCode("");
          alert(errorMessage);
        }
      } catch {
        console.error("WhatsApp validation error");
      } finally {
        setIsVerifying(false);
      }
    })();
  }, [smsCode, phone, errorMessage]);

  const handleSendCode = async () => {
    if (!phone || phone.replace(/\D/g, "").length < 8) return;
    setIsVerifying(true);
    try {
      await fetch(WEBHOOK_SEND_WHATSAPP, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: phone.replace(/\D/g, ""), nome, projeto }),
      });
      setSmsSent(true);
    } catch {
      setSmsSent(true);
    } finally {
      setIsVerifying(false);
    }
  };

  return { smsSent, setSmsSent, smsCode, setSmsCode, isVerifying, setIsVerifying, isCodeValid, codeError, handleSendCode };
}

export interface InputLineProps {
  label: string;
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}

export const InputLine = ({
  label,
  placeholder,
  value = "",
  onChange,
  type = "text",
  required = true
}: InputLineProps) => (
  <div className="flex flex-col gap-2 group">
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-focus-within:text-[#bba219] transition-colors">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className="w-full border-b border-gray-200 py-3 text-xs font-bold focus:border-[#bba219] outline-none transition-all bg-transparent text-[#2c5363] placeholder:text-gray-300"
    />
  </div>
);

export interface SelectLineProps {
  label: string;
  options: string[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const SelectLine = ({ label, options, value, onChange }: SelectLineProps) => (
  <div className="flex flex-col gap-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full border-b border-gray-200 py-3 text-xs font-bold focus:border-[#bba219] outline-none bg-transparent text-[#2c5363] appearance-none cursor-pointer"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export const validarCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  let add = 0;
  for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
  let rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  add = 0;
  for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
  rev = 11 - (add % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;
  return true;
};
