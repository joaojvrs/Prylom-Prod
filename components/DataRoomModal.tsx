import React, { useState, useEffect, useMemo } from 'react';
import ProductDetails from './ProductDetails';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import logoPrylom from "../assets/logo-prylom.png";
import { supabase } from '../supabaseClient';
import { useParams } from 'react-router-dom';
// Definindo uma Interface para as Props (Boa prática em TS)
interface InputLineProps {
  label: string;
  placeholder: string;
  value?: string;     // O '?' torna a propriedade opcional
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  type?: string;
  required?: boolean;
}

const InputLine = ({ 
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


interface SelectLineProps {
  label: string;
  options: string[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SelectLine = ({ label, options, value, onChange }: SelectLineProps) => (
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

const validarCPF = (cpf: string) => {
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


// Você pode adicionar a lógica de CNPJ similar aqui

const NationalProtocol = ({ 
  product, 
  onComplete, 
  onBack, 
  subStep,      // Recebe do pai
  setSubStep    // Recebe do pai
}: { 
  product: any, 
  onComplete: () => void, 
  onBack: () => void,
  subStep: number,
  setSubStep: (s: number) => void 
}) => {
  const [fields, setFields] = useState({
    nome: '',
    doc: '',
    endereco: '',
    email: '',
    telefone: '',
    perfil: '',
  capacidadeAporte: '',
  hectares: '',
  estadosAtuacao: '',
  pep: 'Não',
  creciOab: '',
  scope: null
  });

  const [docStatus, setDocStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [codeError, setCodeError] = useState(false);
const [ndaAccepted, setNdaAccepted] = useState(false);



  // Validação CPF/CNPJ
  useEffect(() => {
    const consultarDoc = async () => {
      const soNumeros = fields.doc.replace(/\D/g, "");
      if (soNumeros.length === 14) {
        setDocStatus('validating');
        try {
          const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${soNumeros}`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (data.razao_social) {
            setFields(prev => ({ ...prev, nome: data.razao_social }));
            setDocStatus('valid');
          }
        } catch (err) { setDocStatus('invalid'); }
      } else if (soNumeros.length === 11) {
        setDocStatus(validarCPF(soNumeros) ? 'valid' : 'invalid');
      }
    };
    consultarDoc();
  }, [fields.doc]);

  // VALIDAÇÃO DO CÓDIGO WHATSAPP
  useEffect(() => {
    const verificarCodigo = async () => {
      // Dispara apenas quando o usuário terminar de digitar os 6 dígitos
      if (smsCode.length === 6) {
        setIsVerifying(true);
        setCodeError(false);
        try {
          const response = await fetch("https://webhook.saveautomatik.shop/webhook/validaCodigo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telefone: fields.telefone.replace(/\D/g, ""), // Envia apenas números para o n8n
              codigo: smsCode
            }),
          });

          const data = await response.json();

          // Ajuste de Normalização: Aceita true booleano, string "true" ou "True"
          const isValid = String(data.valid).toLowerCase() === "true";

          if (isValid) {
            setIsCodeValid(true);
            setCodeError(false);
            console.log("Validação Prylom: Código Confirmado");
          } else {
            setIsCodeValid(false);
            setCodeError(true);
            alert("Código incorreto ou expirado.");
          }
        } catch (error) {
          console.error("Erro na validação:", error);
        } finally {
          setIsVerifying(false);
        }
      }
    };
    verificarCodigo();
  }, [smsCode, fields.telefone]);

  const isOpenMarket = useMemo(() => {
    const relevancia = product?.relevancia_anuncio || product?.fazenda_data?.relevancia_anuncio;
    const tipo = product?.tipo_anuncio || product?.fazenda_data?.tipo_anuncio;
    return relevancia === 'Open Market' || tipo === 'Open Market';
  }, [product]);

  // FUNÇÃO QUE CONTROLA O BOTÃO (Declarada por último para pegar todos os estados frescos)
const isStep1Valid = useMemo(() => {
  return (
    fields.doc?.length >= 11 &&         // CPF/CNPJ preenchido
    docStatus === 'valid' &&            // Documento validado pela sua função
    fields.nome?.trim().length > 5 &&   // Nome preenchido
    fields.email?.includes('@') &&      // Email básico válido
    isCodeValid &&                      // WHATSAPP VALIDADO VIA SMS/2FA (Obrigatório)
    fields.scope !== undefined &&       // ESCOPO DO NDA SELECIONADO (Obrigatório)
    fields.scope !== null               // Garante que não está nulo
  );
}, [fields, docStatus, isCodeValid]);


const handleNext = () => {
    if (isStep1Valid) {
      setSubStep(2);
    }
  };

  // Handlers de Máscara
  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    else value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    setFields({ ...fields, doc: value });
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length <= 13) {
      v = v.replace(/^(\d{2})(\d{2})(\d)/g, "$1 ($2) $3");
      v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    }
    setFields({ ...fields, telefone: v });
  };

  const handleSendCode = async () => {
    setIsVerifying(true);
    try {
      await fetch("https://webhook.saveautomatik.shop/webhook/validaWhatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone: fields.telefone.replace(/\D/g, ""),
          nome: fields.nome,
          projeto: "Prylom Data Room"
        }),
      });
      setSmsSent(true);
    } catch { setSmsSent(true); } 
    finally { setIsVerifying(false); }
  };
  return (
    <div className="animate-fadeIn space-y-8">
      {/* Indicador de Progresso Interno */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className={`h-1 flex-1 rounded-full transition-all duration-500 ${subStep >= num ? 'bg-[#bba219]' : 'bg-gray-100'}`} />
        ))}
      </div>

{subStep === 1 && (
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

<div className="relative">
  <InputLine 
    label="CPF / CNPJ" 
    placeholder="000.000.000-00" 
    value={fields.doc}
    onChange={handleDocChange}
  />
  
  {/* Feedback Visual de Validação */}
  <div className="absolute right-0 bottom-3">
    {docStatus === 'valid' && (
      <span className="text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        Autenticado
      </span>
    )}
    {docStatus === 'invalid' && (
      <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 animate-bounce">
        Documento Inválido
      </span>
    )}
  </div>
</div>
            <InputLine 
              label="Nome Completo / Razão Social" 
              placeholder="Identificação oficial" 
              value={fields.nome}
              onChange={(e) => setFields({...fields, nome: e.target.value})}
            />
            {/* CAMPO DE TELEFONE */}
<div className="space-y-4">
    <div className="relative">
      <InputLine 
        label="WhatsApp Celular" 
        placeholder="55 (00) 00000-0000"
        value={fields.telefone}
        onChange={handleTelefoneChange}
      />
      {!smsSent && fields.telefone.length >= 14 && (
        <button 
          onClick={handleSendCode}
          className="absolute right-0 bottom-2 text-[9px] font-black text-[#bba219] uppercase tracking-widest hover:underline"
        >
          {isVerifying ? "Enviando..." : "Validar via WhatsApp"}
        </button>
      )}
    </div>

    {/* INTERFACE DE CÓDIGO 2FA (Aparece logo abaixo do input de telefone) */}
   {smsSent && (

  <div className={`animate-fadeIn p-6 rounded-lg border transition-all duration-500 ${isCodeValid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'} space-y-4`}>

    <div className="flex justify-between items-center">

      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2c5363]">

        Código de Verificação

      </label>

      {isCodeValid ? (

        <span className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">

          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>

          WhatsApp Validado

        </span>

      ) : (

        <span className="text-[9px] font-bold text-[#bba219] uppercase">Confirme o código recebido</span>

      )}

    </div>

   

    <div className="relative">

      <input

        maxLength={6}

        disabled={isCodeValid || isVerifying}

        value={smsCode}

        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}

        placeholder={isVerifying ? "..." : "000000"}

        className={`w-full py-4 text-center text-xl font-black tracking-[0.5em] outline-none transition-all

          ${isCodeValid ? 'bg-transparent text-green-700' : 'bg-white border border-gray-200 focus:border-[#bba219] text-[#2c5363]'}

          ${codeError ? 'border-red-500 animate-shake' : ''}

        `}

      />

      {isVerifying && (

        <div className="absolute inset-0 flex items-center justify-center bg-white/50">

          <div className="w-5 h-5 border-2 border-[#bba219] border-t-transparent rounded-full animate-spin"></div>

        </div>

      )}

    </div>

   

    {!isCodeValid && (

      <p className="text-[9px] text-gray-400 font-medium uppercase text-center">

        Não recebeu? <button type="button" onClick={handleSendCode} className="text-[#bba219] font-bold hover:underline">Reenviar código</button>

      </p>

    )}

  </div>

    )}
  </div>

  {/* COLUNA EMAIL */}
  <div className="flex flex-col justify-start">
    <InputLine 
      label="E-mail Principal / Corporativo" 
      placeholder="contato@empresa.com" 
      type="email"
      value={fields.email}
      onChange={(e) => setFields({...fields, email: e.target.value})}
    />
  </div>
          </div>
{/* --- NOVA SEÇÃO: ESCOPO DO ACORDO --- */}

<div className="pt-8 border-t border-gray-100 space-y-6">
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2c5363]">
      Escopo do Acordo de Confidencialidade (NDA)
    </label>
    <p className="text-[9px] text-gray-400 uppercase font-medium">Selecione a abrangência deste documento</p>
  </div>

 <div className="grid grid-cols-1 gap-4">
  {/* OPÇÃO ÚNICA: PORTFÓLIO INTEGRAL (MASTER NDA) */}
  <label className={`group cursor-pointer p-5 border transition-all duration-300 flex gap-4 items-start ${fields.scope === 'FULL_PORTFOLIO' ? 'bg-[#2c5363] border-[#2c5363]' : 'bg-white border-gray-100 hover:border-[#bba219]'}`}>
    <div className="mt-1">
      <input 
        type="radio" 
        className="sr-only" 
        name="nda_scope"
        required
        checked={fields.scope === 'FULL_PORTFOLIO'}
        onChange={() => setFields({...fields, scope: 'FULL_PORTFOLIO'})}
      />
      <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${fields.scope === 'FULL_PORTFOLIO' ? 'border-[#bba219] bg-[#bba219]' : 'border-gray-200'}`}>
        {fields.scope === 'FULL_PORTFOLIO' && <div className="w-2 h-2 bg-[#2c5363]"></div>}
      </div>
    </div>
    <div className="space-y-2">
      <span className={`text-[10px] font-black uppercase tracking-widest ${fields.scope === 'FULL_PORTFOLIO' ? 'text-[#bba219]' : 'text-[#2c5363]'}`}>
        PORTFÓLIO INTEGRAL (SELECTED OFF-MARKET)
      </span>
      <p className={`text-[10px] leading-relaxed font-medium ${fields.scope === 'FULL_PORTFOLIO' ? 'text-white/90' : 'text-gray-500'}`}>
        Desejo firmar um Acordo de Confidencialidade Global (Master NDA) para ter acesso contínuo ao portfólio restrito de ativos reais e propriedades rurais Off-Market da Prylom. Estou ciente de que as cláusulas de sigilo e não-circunvenção (non-bypass) cobrirão automaticamente todas as teses e propriedades que me forem apresentadas de forma ativa e sigilosa pela diretoria.
      </p>
    </div>
  </label>
</div>
</div>
{/* --- FIM DA NOVA SEÇÃO --- */}   
          
<button 

      onClick={handleNext}
      disabled={!isStep1Valid } // Trava o botão sem o arquivo
      className={`w-full py-5 font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-lg
        ${(isStep1Valid) 
          ? 'bg-[#2c5363] text-white hover:bg-[#bba219] active:scale-95' 
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
      `}
    >
      "Próxima Etapa: Perfil" 
    </button>
          
        </div>
      )}

{subStep === 2 && (
  <div className="space-y-8 animate-fadeIn text-left text-[#2c5363]">
    <div className="mb-6 border-l-4 border-[#bba219] pl-4">
      <h3 className="text-xl font-black uppercase tracking-tighter">Qualificação do Investidor</h3>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ajuste o perfil para carregar as métricas de aporte</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
      {/* Perfil Principal */}
      <SelectLine 
        label="Qual seu perfil principal? *" 
        value={fields.perfil}
        onChange={(e) => setFields({...fields, perfil: e.target.value})}
        options={['Selecione...', 'Produtor Rural', 'Investidor Patrimonial', 'Representante Legal']} 
      />

      {/* Capacidade de Aporte */}
      <SelectLine 
        label="Capacidade de Aporte *" 
        value={fields.capacidadeAporte}
        onChange={(e) => setFields({...fields, capacidadeAporte: e.target.value})}
        options={['Selecione...', 'Recursos Próprios', 'Financiamento', 'Troca/Permuta']} 
      />
{fields.capacidadeAporte === 'Troca/Permuta' && (
        <div className="md:col-span-2">
          <InputLine 
            label="Natureza do ativo ofertado em permuta *" 
            placeholder="Descreva brevemente o ativo (Ex: Imóveis urbanos, frotas, outras áreas...)" 
            value={fields.descricaoPermuta}
            onChange={(e) => setFields({...fields, descricaoPermuta: e.target.value})}
          />
        </div>
      )}
      {/* CAMPOS CONDICIONAIS: SE PRODUTOR RURAL */}
      {fields.perfil === 'Produtor Rural' && (
        <>
          <InputLine 
            label="Quantos hectares planta atualmente? *" 
            placeholder="0.000 ha" 
            value={fields.hectares}
            onChange={(e) => setFields({...fields, hectares: e.target.value})}
          />
          <InputLine 
            label="Em quais estados atua? *" 
            placeholder="Ex: MT, GO, MG" 
            value={fields.estadosAtuacao}
            onChange={(e) => setFields({...fields, estadosAtuacao: e.target.value})}
          />
        </>
      )}

{fields.perfil === 'Representante Legal' && (
  <>
    {/* Registro do Profissional */}
    <InputLine 
      label="Número CRECI ou OAB *" 
      placeholder="Digite sua inscrição profissional" 
      value={fields.creciOab}
      onChange={(e) => setFields({...fields, creciOab: e.target.value})}
    />

    {/* Dados do Comprador Final (Separados) */}
    <InputLine 
      label="Nome do Cliente Representado *" 
      placeholder="Nome completo do comprador final" 
      value={fields.clienteRepresentadoNome}
      onChange={(e) => setFields({...fields, clienteRepresentadoNome: e.target.value})}
    />

    <InputLine 
      label="CPF / CNPJ do Cliente Representado *" 
      placeholder="000.000.000-00" 
      value={fields.clienteRepresentadoDoc}
      onChange={(e) => {
        // Aqui você pode aplicar a mesma lógica de máscara que usou no Step 1
        setFields({...fields, clienteRepresentadoDoc: e.target.value})
      }}
    />
  </>
)}

      {/* PEP */}
      <SelectLine 
        label="Você é uma Pessoa Exposta Politicamente (PEP)? *" 
        value={fields.pep}
        onChange={(e) => setFields({...fields, pep: e.target.value})}
        options={['Não', 'Sim']} 
      />
    </div>
{fields.capacidadeAporte === 'Recursos Próprios' && (
      <div className="mt-4 p-6 bg-gray-50 border border-gray-100 rounded-sm space-y-4">
        <label className="flex gap-4 cursor-pointer group">
          <div className="mt-1">
            <input 
              type="checkbox" 
              className="sr-only"
              checked={fields.declaracaoOrigem}
              onChange={(e) => setFields({...fields, declaracaoOrigem: e.target.checked})}
            />
            <div className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${fields.declaracaoOrigem ? 'bg-[#2c5363] border-[#2c5363]' : 'bg-white border-gray-300 group-hover:border-[#bba219]'}`}>
              {fields.declaracaoOrigem && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2c5363]">
              DECLARAÇÃO DE ORIGEM DE FUNDOS E COMPLIANCE COAF *
            </span>
            <p className="text-[10px] leading-relaxed font-medium text-gray-500 uppercase">
              Declaro ciência de que a Prylom opera sob rigorosas políticas de Prevenção à Lavagem de Dinheiro. 
              Compreendo que não são aceitos pagamentos em espécie e que a integralidade dos recursos utilizados 
              nas transações deve possuir origem lícita e rastreabilidade bancária comprovada, sujeita às 
              normativas do COAF e Banco Central.
            </p>
          </div>
        </label>
      </div>
    )}
    {fields.perfil === 'Investidor Patrimonial' && (
        <div className="md:col-span-2">
          <SelectLine 
            label="Tipo de Investidor Patrimonial *" 
            value={fields.tipoPatrimonial}
            onChange={(e) => setFields({...fields, tipoPatrimonial: e.target.value})}
            options={[
              'Selecione...', 
              'Family Office / Multi-Family Office', 
              'Holding Patrimonial / PJ', 
              'Fundo de Investimento (FII / FIP)', 
              'Pessoa Física (Diversificação de Portfólio)'
            ]} 
          />
        </div>
      )}
      {fields.capacidadeAporte === 'Financiamento' && (
        <>
          <SelectLine 
            label="Modalidade de Captação Prevista *" 
            value={fields.modalidadeCaptacao}
            onChange={(e) => setFields({...fields, modalidadeCaptacao: e.target.value})}
            options={[
              'Selecione...',
              'Mercado de Capitais (Emissão de CRI / CRA / Fiagro)',
              'Cédula de Produto Rural (CPR Financeira / Física)',
              'Crédito Rural Tradicional / Repasses (BNDES / FCO)'
            ]} 
          />
          <SelectLine 
            label="Status de Aprovação do Crédito *" 
            value={fields.statusCredito}
            onChange={(e) => setFields({...fields, statusCredito: e.target.value})}
            options={[
              'Selecione...',
              'Crédito Pré-Aprovado / Limite de Risco Liberado',
              'Em fase de estruturação / Análise de Comitê',
              'Necessito de assessoria para estruturação de capital'
            ]} 
          />
        </>
      )}

    {/* Lógica de Validação do Botão Step 2 */}
    <button 
      onClick={() => setSubStep(3)}
disabled={
        !fields.perfil || fields.perfil === 'Selecione...' || 
        !fields.capacidadeAporte || fields.capacidadeAporte === 'Selecione...' ||
        (fields.perfil === 'Produtor Rural' && (!fields.hectares || !fields.estadosAtuacao)) ||
        (fields.perfil === 'Investidor Patrimonial' && (!fields.tipoPatrimonial || fields.tipoPatrimonial === 'Selecione...')) ||
        (fields.perfil === 'Representante Legal' && (!fields.creciOab || !fields.clienteRepresentadoNome || !fields.clienteRepresentadoDoc)) ||
        (fields.capacidadeAporte === 'Financiamento' && (fields.modalidadeCaptacao === 'Selecione...' || !fields.modalidadeCaptacao || fields.statusCredito === 'Selecione...' || !fields.statusCredito)) ||
        (fields.capacidadeAporte === 'Troca/Permuta' && !fields.descricaoPermuta) ||
        (fields.capacidadeAporte === 'Recursos Próprios' && !fields.declaracaoOrigem)
      }
      className={`w-full py-5 font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-lg mt-8
        ${(!fields.perfil || fields.perfil === 'Selecione...') 
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
          : 'bg-[#2c5363] text-white hover:bg-[#bba219]'}
      `}
    >
      Próxima Etapa: Jurídico (NDA)
    </button>
  </div>
)}

{subStep === 3 && (
<div className="space-y-8 animate-fadeIn text-[#2c5363] text-left">
    {/* Cabeçalho do Documento */}
    <div className="flex justify-between items-start border-b-2 border-gray-100 pb-6">
      <div className="space-y-1">
        <h3 className="text-xl font-black uppercase tracking-tighter">Instrumento Particular de Confidencialidade</h3>
        <p className="text-[9px] font-bold text-[#bba219] uppercase tracking-[0.2em]">Acordo de Confidencialidade e Não Divulgação (NDA)</p>
      </div>
      <div className="hidden md:block text-right">
        <span className="text-[8px] font-black bg-green-50 text-green-600 px-3 py-1 rounded-sm uppercase tracking-widest border border-green-100 italic">
          Autenticação digital
        </span>
      </div>
    </div>

    {/* O "Papel Timbrado" com Injeção de Dados Dinâmicos */}
    <div className="bg-white p-8 md:p-12 border border-gray-200 shadow-inner rounded-sm relative overflow-hidden group">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
        <span className="text-[120px] font-black tracking-tighter uppercase italic">PRYLOM</span>
      </div>

      <div className="relative z-10 space-y-6 text-[11px] md:text-[12px] text-gray-600 leading-relaxed font-medium">
        
        {/* IDENTIFICAÇÃO DAS PARTES E DO OBJETO (QUALIFICAÇÃO COMPLETA) */}
        <div className="p-4 bg-gray-50 border-l-2 border-[#bba219] space-y-4 mb-6">
          <p className="text-[10px] leading-relaxed">
            <strong className="text-[#2c5363] block mb-1">PARTE REVELADORA / INTERMEDIADORA:</strong>
            PRYLOM AGRONEGÓCIOS, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 45.685.251/0001-95, com supervisão técnica sob o CRECI nº 16344 - MS, sediada na R. Centenário, 470 - Vila Rosa Pires - Campo Grande - MS, CEP 79004-510.
          </p>

          <p className="text-[10px] leading-relaxed">
            <strong className="text-[#2c5363] block mb-1">PARTE RECEPTORA / SIGNATÁRIA:</strong>
            Pelo presente instrumento, eu, <span className="font-black text-[#2c5363] underline">{fields.nome || "[NOME NÃO PREENCHIDO]"}</span>, 
            devidamente inscrito(a) no <span className="font-black text-[#2c5363] underline">{fields.doc || "[DOCUMENTO NÃO PREENCHIDO]"}</span>, 
            na qualidade de <span className="font-black text-[#2c5363] underline uppercase">{fields.perfil || "INVESTIDOR / REPRESENTANTE LEGAL"}</span>, 
            declaro aceite formal, irrevogável e irretratável aos termos de confidencialidade abaixo, estabelecendo este vínculo jurídico direto com a PRYLOM em relação à curadoria e apresentação do(s) ativo(s). 
             Este Acordo possui escopo a proteção de toda e qualquer Informação
Confidencial referente ao portfólio de ativos reais, teses de propriedades rurais Off-Market apresentadas pela
PRYLOM à PARTE RECEPTORA. Fica expressamente acordado que a ausência de um código ou identificação prévia de
um ativo específico neste instrumento não invalida o sigilo, sendo que todo e qualquer ativo, Teaser, Data Room ou
estudo de viabilidade compartilhado pela PRYLOM (seja via sistema, e-mail corporativo ou aplicativo de
mensagens) passará, no ato do recebimento, a ser regido e protegido automaticamente pelas cláusulas de sigilo e
penalidades deste contrato.

          </p>
        </div>

        {/* CLAUSULADO TÉCNICO ATUALIZADO */}
        <div className="space-y-6">
          <p>
            <strong className="text-[#2c5363] font-bold">1. SIGILO E NÃO-ALICIAMENTO (NON-CIRCUMVENTION):</strong> Comprometo-me formalmente a manter sigilo absoluto sobre mapas, matrículas e quaisquer dados sensíveis (que possam expor a risco estratégico, comercial, financeiro ou pessoal as partes envolvidas). Fica terminantemente proibido contatar direta ou indiretamente os proprietários, intervir, tentar adquirir ou estruturar negócios com os ativos listados (e suas áreas confrontantes) sem a intermediação expressa da PRYLOM. O descumprimento (aliciamento ou vazamento destas informações) acarretará multa contratual imediata equivalente ao valor integral da comissão de intermediação (e estruturação estipulada para a propriedade em questão), sem prejuízo da competente ação judicial cumulativa para a reparação de danos patrimoniais, lucros cessantes e danos morais e corporativos.
          </p>

          <p>
            <strong className="text-[#2c5363] font-bold">2. VIGÊNCIA E RESPONSABILIDADE SOLIDÁRIA:</strong> As obrigações deste instrumento possuem validade irrevogável de 36 (trinta e seis) meses a partir do aceite. Caso atue como Representante legal/Intermediário, assumo responsabilidade solidária e financeira integral por eventuais quebras de sigilo ou "by-pass" praticados por meu cliente final.
          </p>

          <p>
            <strong className="text-[#2c5363] font-bold">3. VERACIDADE (CÓDIGO PENAL):</strong> Declaro, sob as penas da Lei, especificamente sob o Artigo 299 do Código Penal Brasileiro (Falsidade Ideológica), que todas as informações e titularidades prestadas neste credenciamento são estritamente verdadeiras.
          </p>

          <p>
            <strong className="text-[#2c5363] font-bold">4. COMPLIANCE E LGPD:</strong> Autorizo expressamente a PRYLOM a realizar o cruzamento e a consulta dos dados inseridos nesta plataforma junto aos órgãos responsáveis (incluindo órgãos de proteção ao crédito, listas de sanções internacionais KYC/AML e tribunais de justiça), bem como o tratamento de meus dados em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/18) para fins exclusivos de auditoria prévia do negócio e aprovação de perfil.
          </p>
        </div>
        
        {/* Rodapé de Autenticação */}
        <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[9px] uppercase font-black text-gray-400">IP DE REGISTRO E AUTENTICAÇÃO:</p>
            <p className="text-[10px] font-mono text-gray-500">HASH_ID: {Math.random().toString(36).substring(7).toUpperCase()} (Auditado via SSL)</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-[9px] uppercase font-black text-gray-400">DATA DO ACEITE DIGITAL:</p>
            <p className="text-[10px] font-mono text-gray-500">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>


    {/* Checkbox de Aceite */}
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-4">
      <label className="flex items-start gap-4 cursor-pointer group">
        <div className="relative flex items-center pt-1">
          <input 
            type="checkbox" 
            className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-gray-300 rounded-md checked:bg-[#2c5363] checked:border-[#2c5363] transition-all"
            checked={ndaAccepted}
            onChange={(e) => setNdaAccepted(e.target.checked)}
          />
          <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none top-2 left-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-[#2c5363] transition-colors leading-relaxed">
          Li e estou de acordo com os termos de confidencialidade, assumindo responsabilidade jurídica civil e criminal pelas informações e uso dos dados.
        </span>
      </label>
    </div>

    {/* Botão de Envio */}
    <button 
      onClick={() => setSubStep(4)}
      disabled={!ndaAccepted}
      className={`w-full py-6 rounded-sm font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl
        ${ndaAccepted 
          ? 'bg-[#2c5363] text-white hover:bg-[#bba219] hover:-translate-y-1' 
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
      `}
    >
      Assinar Digitalmente e Enviar
    </button>
  </div>
)}

{subStep === 4 && (
  <div className="py-20 px-6 text-center space-y-10 animate-fadeIn flex flex-col items-center justify-center min-h-[500px] bg-[#2c5363] text-white rounded-2xl relative overflow-hidden">
    
    {/* Efeito de Loading Superior */}
    <div className="absolute top-0 left-0 w-full h-1 bg-[#bba219]/20">
      <div className="h-full bg-[#bba219] w-1/3 animate-pulse"></div>
    </div>
    
    <div className="relative">
      <div className="w-24 h-24 border border-white/10 rounded-full flex items-center justify-center">
        <svg className="w-12 h-12 text-[#bba219]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div className="absolute inset-0 w-24 h-24 border-t-2 border-[#bba219] rounded-full animate-spin"></div>
    </div>

    <div className="space-y-4">
      <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">
        Solicitação em Análise de <br/> 
        <span className="text-[#bba219]">Compliance</span>
      </h3>
      <p className="text-[10px] font-black text-[#bba219] uppercase tracking-[0.3em] opacity-60">STATUS: CRIPTOGRAFADO E AUTENTICADO</p>
    </div>

    <div className="space-y-6 text-sm font-light leading-relaxed max-w-lg opacity-90 uppercase tracking-wide">
      <p>
        Obrigado, <span className="font-black text-white">{fields.nome.split(' ')[0] || 'Investidor'}</span>. 
        Seus dados foram recebidos e protegidos por criptografia de ponta a ponta.
      </p>
      <div className="bg-black/20 p-6 rounded-lg space-y-2 border border-white/5">
         <p className="text-[10px] font-bold text-[#bba219] uppercase tracking-widest leading-none">SLA DE ANÁLISE DO COMITÊ :</p>
         <p className="text-xl font-black italic tracking-tighter text-white">ATÉ 24 HORAS ÚTEIS</p>
      </div>
      <p className="text-[10px] text-gray-400 font-medium max-w-xs mx-auto">
        O acesso ao Data Room será enviado via <span className="text-white">E-mail</span> e <span className="text-white">WhatsApp</span> após aprovação do comitê.
      </p>
    </div>

    <div className="pt-8 w-full max-w-xs">
      <button 
        onClick={onBack} // Agora o TypeScript encontrará esta função via props
        className="w-full bg-white text-[#2c5363] py-5 rounded-sm font-black text-[11px] uppercase tracking-[0.3em] hover:bg-[#bba219] hover:text-white transition-all shadow-xl active:scale-95"
      >
        Finalizar e Sair
      </button>
    </div>
  </div>
)}
    </div>
  );
};


const InternationalProtocol = ({ 
  product, 
  onComplete, 
  onBack, 
  subStep,      // Recebe do pai
  setSubStep    // Recebe do pai
}: { 
  product: any, 
  onComplete: () => void, 
  onBack: () => void,
  subStep: number,
  setSubStep: (s: number) => void 
}) => {

  const [isVerifying, setIsVerifying] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [codeError, setCodeError] = useState(false);
  
  const [fields, setFields] = useState({
    investorType: '',
    country: '',
    companyName: '',
    taxId: '',
    hasBrazilRep: 'No',
    repName: '',
    passport: '',
    passportFile: '',
    email: '',
    phone: '',
    ticketSize: '',
    sourceFunds: '',
    thesis: ''
  });

  const [countries, setCountries] = useState<string[]>(['United States', 'China', 'United Kingdom', 'United Arab Emirates', 'Saudi Arabia', 'Germany', 'Switzerland']);

useEffect(() => {
  const fetchCountries = async () => {
    // Lista de sanções e restrições FATF (Blacklist)
    const restrictedCountries = [
      'Iran', 
      'North Korea', 
      'Syria', 
      'Cuba', 
      'Russia', 
      'Myanmar'
    ];

    try {
      const res = await fetch('https://restcountries.com/v3.1/all?fields=name');
      const data = await res.json();
      
      const countryList = data
        .map((c: any) => c.name.common)
        // FILTRO DE SEGURANÇA: Remove países sancionados
        .filter((name: string) => !restrictedCountries.includes(name))
        .sort((a: string, b: string) => a.localeCompare(b));
      
      setCountries(countryList);
    } catch (err) {
      console.error("Erro ao carregar países, usando lista padrão segura.");
      // Caso a API falhe, garante que a lista padrão também esteja limpa
      setCountries(['United States', 'China', 'United Kingdom', 'United Arab Emirates', 'Saudi Arabia', 'Germany', 'Switzerland']);
    }
  };
  fetchCountries();
}, []);

  const [ndaAccepted, setNdaAccepted] = useState(false);

// VALIDAÇÃO AUTOMÁTICA DO CÓDIGO (Igual ao Nacional)
  useEffect(() => {
    const verificarCodigo = async () => {
      if (smsCode.length === 6) {
        setIsVerifying(true);
        setCodeError(false);
        try {
          const response = await fetch("https://webhook.saveautomatik.shop/webhook/validaCodigo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telefone: fields.phone.replace(/\D/g, ""),
              codigo: smsCode
            }),
          });

          const data = await response.json();
          const isValid = data.valid === true || String(data.valid).toLowerCase() === "true";

          if (isValid) {
            setIsCodeValid(true);
            console.log("Global Validation: Success");
          } else {
            setIsCodeValid(false);
            setCodeError(true);
            setSmsCode(""); 
            alert("Invalid or expired code.");
          }
        } catch (error) {
          console.error("Validation error:", error);
        } finally {
          setIsVerifying(false);
        }
      }
    };
    verificarCodigo();
  }, [smsCode, fields.phone]);

  const handleSendCode = async () => {
    if (!fields.phone) return;
    setIsVerifying(true);
    try {
      await fetch("https://webhook.saveautomatik.shop/webhook/validaWhatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefone: fields.phone.replace(/\D/g, ""),
          nome: fields.repName,
          projeto: "Prylom Global Desk"
        }),
      });
      setSmsSent(true);
    } catch { setSmsSent(true); } 
    finally { setIsVerifying(false); }
  };

  return (
    <div className="animate-fadeIn space-y-8 text-left">
      {/* Progress Indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className={`h-1 flex-1 rounded-full transition-all duration-500 ${subStep >= num ? 'bg-[#bba219]' : 'bg-gray-100'}`} />
        ))}
      </div>

      {/* STEP 1: WELCOME & PACK INFO */}
      {subStep === 1 && (
        <div className="space-y-8 animate-fadeIn">
          <header className="space-y-4">
            <h3 className="text-xl font-black uppercase text-[#2c5363]">Due Diligence Pack <span className="text-[#bba219]">(International)</span></h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed uppercase">
              THIS IS A SECURE AND CURATED DEAL FLOW ENVIRONMENT. ACCESS REQUIRES MANDATORY KYC/AML VERIFICATION.

            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { t: "1. Legal Structuring Note", d: "LEGAL FRAMEWORK OVERVIEW ON FOREIGN ACQUISITION (LAW 5.709/71)." },
              { t: "2. EUDR & ESG Compliance", d: "ENVIRONMENTAL COMPLIANCE OVERVIEW FOCUSED ON EUROPEAN REGULATION (ZERO DEFORESTATION)" },
              { t: "3. USD Financial Valuation", d: "ROI, EBITDA, and land appreciation indexed to Dollar/Commodity." },
              { t: "4. Operator & Leaseback", d: "Management Agreement and Lease options for non-operators." }
            ].map((item, i) => (
              <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-sm">
                <h4 className="text-[10px] font-black text-[#2c5363] uppercase mb-1">{item.t}</h4>
                <p className="text-[9px] text-gray-400 font-bold uppercase leading-tight">{item.d}</p>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setSubStep(2)}
            className="w-full bg-[#2c5363] text-white py-5 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[#bba219] transition-all"
          >
            Start Accreditation Process
          </button>
        </div>
      )}

{subStep === 2 && (
  <div className="space-y-10 animate-fadeIn text-left text-[#2c5363]">
    {/* ETAPA 1: ENTITY & JURISDICTION */}
    <section className="space-y-6">
      <div className="border-l-4 border-[#bba219] pl-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 1: Entity & Jurisdiction</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase">Primary Buyer Legal Identification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SelectLine 
          label="Investor Type *" 
          options={['Select...', 'Family Office', 'Private Equity / Hedge Fund', 'Sovereign Wealth Fund', 'Corporate / Agribusiness Group','Individual High-Net-Worth']} 
          value={fields.investorType}
          onChange={(e) => setFields({...fields, investorType: e.target.value})}
        />
<div className="space-y-1">
  <SelectLine 
    label="Country of Origin / Tax Residence *" 
    options={['Select Country...', ...countries]} 
    value={fields.country}
    onChange={(e) => setFields({...fields, country: e.target.value})}
  />
  <p className="text-[10px] text-gray-400 italic">
    * Countries under international sanctions or FATF blacklist are not eligible for registration.
  </p>
</div>
        <InputLine label="Company Name / Full Name *" placeholder="Legal Entity Name" value={fields.companyName} onChange={(e) => setFields({...fields, companyName: e.target.value})} />
        <InputLine label="Tax ID / Registration Number *" placeholder="EIN, VAT, or Registration No." value={fields.taxId} onChange={(e) => setFields({...fields, taxId: e.target.value})} />
<div className="space-y-6">
  <SelectLine 
    label="Do you have CNPJ or representation in Brazil? *" 
    options={['Select...', 'Yes (Ready structure)', 'No (Need structuring)']} 
    value={fields.hasBrazilRep}
    onChange={(e) => setFields({...fields, hasBrazilRep: e.target.value})}
  />

  {/* Campo Condicional para Capital Estrangeiro */}
  {fields.hasBrazilRep === 'Yes (Ready structure)' && (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-4 animate-fadeIn">
      <label className="flex items-start gap-4 cursor-pointer group">
        <div className="relative flex items-center pt-1">
          <input 
            type="checkbox" 
            className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-gray-300 rounded-md checked:bg-[#2c5363] checked:border-[#2c5363] transition-all"
            required
            checked={fields.isMajorityForeign}
            onChange={(e) => setFields({...fields, isMajorityForeign: e.target.checked})}
          />
          <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none top-2 left-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#2c5363] group-hover:text-[#bba219] transition-colors leading-relaxed">
            Is this Brazilian entity majority-owned by foreign capital? *
          </span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-1">
            (Esta entidade brasileira é controlada majoritariamente por capital estrangeiro?)
          </span>
        </div>
      </label>
    </div>
  )}
</div>
      </div>
    </section>
    

    <hr className="border-gray-100" />

    {/* ETAPA 2: CONTACT & REPRESENTATIVE */}
    <section className="space-y-6">
      <div className="border-l-4 border-[#2c5363] pl-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 2: Contact & Representative</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase">Liaison and Identity Verification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <div className="space-y-8 animate-fadeIn">
  {/* Campo Base: Nome do Representante */}
  <InputLine 
    label="Full Name of Representative *" 
    placeholder="Full Legal Name (As in Passport)" 
    value={fields.repName} 
    onChange={(e) => setFields({...fields, repName: e.target.value})} 
  />

  {/* Checkbox de Mandato de Representação */}
  <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
    <label className="flex items-start gap-4 cursor-pointer group">
      <div className="relative flex items-center pt-1">
        <input 
          type="checkbox" 
          className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-gray-300 rounded-md checked:bg-[#2c5363] checked:border-[#2c5363] transition-all"
          checked={fields.hasMandate}
          onChange={(e) => setFields({...fields, hasMandate: e.target.checked})}
        />
        <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none top-2 left-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
      <span className="text-[10px] font-black uppercase tracking-wider text-[#2c5363] leading-relaxed">
        REPRESENTATION MANDATE: I hereby legally declare, under penalty of perjury, that I am an authorized signatory, officer, or legally mandated broker holding a valid Power of Attorney (POA) to act and sign on behalf of the Primary Entity.
      </span>
    </label>
  </div>

  {/* Seleção de Capacidade (Só aparece se o Mandato for aceito) */}
  {fields.hasMandate && (
    <div className="space-y-6 pt-4 animate-slideDown">
      <SelectLine 
        label="Representative Capacity *" 
        options={[
          'Select...', 
          'Corporate Officer / Director', 
          'Authorized Signatory (Power of Attorney - POA)', 
          'External Broker / Advisor (Mandated)'
        ]} 
        value={fields.repCapacity}
        onChange={(e) => setFields({...fields, repCapacity: e.target.value})}
      />

      {/* CENÁRIO A: Funcionário Direto ou Procurador Oficial */}
      {(fields.repCapacity === 'Corporate Officer / Director' || 
        fields.repCapacity === 'Authorized Signatory (Power of Attorney - POA)') && (
        <div className="animate-fadeIn">
          <InputLine 
            label="Company / Fund You Directly Represent *" 
            placeholder="Ex: BlackRock Inc., Sovereign Wealth Fund" 
            value={fields.directCompany}
            onChange={(e) => setFields({...fields, directCompany: e.target.value})}
          />
        </div>
      )}

      {/* CENÁRIO B: Corretor Externo (A Grande Sacada) */}
      {fields.repCapacity === 'External Broker / Advisor (Mandated)' && (
        <div className="space-y-6 p-6 bg-[#2c5363]/5 border-l-4 border-[#2c5363] animate-fadeIn">
          <InputLine 
            label="1. Advisory Firm / Brokerage Name *" 
            placeholder="Ex: JLL, CBRE, Independent Advisor" 
            value={fields.advisoryFirm}
            onChange={(e) => setFields({...fields, advisoryFirm: e.target.value})}
          />
          <InputLine 
            label="2. End-Buyer / Fund Represented *" 
            placeholder="Ex: Name of the exact Fund or Buyer holding the capital" 
            value={fields.endBuyer}
            onChange={(e) => setFields({...fields, endBuyer: e.target.value})}
          />
          <p className="text-[9px] font-bold text-gray-400 uppercase">
            Note: The NDA will cover both the Advisory Firm and the End-Buyer.
          </p>
        </div>
      )}
    </div>
  )}
</div>


<div className="flex flex-col gap-2 relative"> 
  {/* Aviso de Segurança Flutuante - Agora fora do fluxo para não empurrar o label */}
  <div className="absolute -top-3 left-0 w-full pointer-events-none">
    <span className="text-[7px] font-black text-[#bba219] uppercase tracking-[0.2em] opacity-80 block whitespace-nowrap">
      Encrypted upload • GDPR & LGPD Compliant
    </span>
  </div>

  {/* O Label agora começa no exato topo da div, igual aos outros campos ao lado */}
  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
    Passport Number / ID (Photo Upload) <span className="text-red-500">*</span>
  </label>

  <div className="relative border-b border-gray-200 py-2 group">
    <input
      type="file"
      id="passport-upload"
      accept="image/*,.pdf"
      onChange={(e) => setFields({ ...fields, passportFile: e.target.files ? e.target.files[0] : null })}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
    />

    <div className="flex items-center gap-4">
      <div className="py-1 px-3 rounded-full bg-gray-100 text-[#2c5363] text-[9px] font-black uppercase tracking-widest group-hover:bg-[#2c5363] group-hover:text-white transition-all">
        Choose File
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate max-w-[120px]">
        {fields.passportFile ? fields.passportFile.name : "No file selected"}
      </span>
    </div>

    {fields.passportFile && (
      <span className="absolute right-0 bottom-3 text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        ID Attached
      </span>
    )}
  </div>
</div>
        <InputLine label="Official Corporate E-mail *" placeholder="name@company.com" type="email" value={fields.email} onChange={(e) => setFields({...fields, email: e.target.value})} />
        
        {/* WHATSAPP COM VALIDAÇÃO 2FA INTEGRADA */}
        <div className="space-y-4">
          <div className="relative">
            <InputLine label="VERIFY PHONE (WHATSAPP) TO PROCEED*" placeholder="+00 000 0000-0000" value={fields.phone} onChange={(e) => setFields({...fields, phone: e.target.value})} />
            {!smsSent && fields.phone.length > 8 && (
              <button onClick={handleSendCode} className="absolute right-0 bottom-2 text-[9px] font-black text-[#bba219] uppercase hover:underline">
                {isVerifying ? "Sending..." : "Validate WhatsApp"}
              </button>
            )}
          </div>
          {smsSent && !isCodeValid && (
            <div className="animate-fadeIn p-4 bg-gray-50 border border-gray-100 rounded-sm space-y-3">
              <label className="text-[9px] font-black uppercase text-gray-400">Enter Verification Code</label>
              <input 
                maxLength={6} value={smsCode} onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000" className="w-full text-center text-lg font-black tracking-widest outline-none bg-white border border-gray-200 py-2 focus:border-[#bba219]"
              />
            </div>
          )}
          {isCodeValid && <span className="text-[9px] font-black text-green-600 uppercase flex items-center gap-1">✓ WhatsApp Verified</span>}
        </div>
      </div>
    </section>

    <hr className="border-gray-100" />

    {/* ETAPA 3: INVESTMENT PROFILE */}
    <section className="space-y-6">
      <div className="border-l-4 border-[#bba219] pl-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 3: Investment Profile</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase">Capital Capacity and Strategic Thesis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SelectLine 
          label="Target Ticket Size (USD) *" 
          options={['Select range...', 'U$ 1M - U$ 5M', 'U$ 5M - U$ 20M', 'U$ 20M - U$ 50M', 'Above U$ 50M']} 
          value={fields.ticketSize}
          onChange={(e) => setFields({...fields, ticketSize: e.target.value})}
        />
<SelectLine 
  label="Source of Funds *" 
  options={[
    'Select...', 
    'Equity / Cash (Recursos Próprios à vista)', 
    'Bank Financing / Leverage (Financiamento Bancário)', 
    'Committed Capital', 
    'Sovereign Wealth (Fundo Soberano / State Funds)'
  ]} 
  value={fields.sourceFunds}
  onChange={(e) => setFields({...fields, sourceFunds: e.target.value})}
/>
<div className="space-y-8">
  {/* Campo: Investment Thesis */}
  <SelectLine 
    label="Investment Thesis *" 
    options={[
      'Select...', 
      'Land Appreciation (Asset Wealth)', 
      'Production / Commodity Trading', 
      'Yield / Leaseback Strategy', 
      'Carbon Credits / Preservation'
    ]} 
    value={fields.thesis}
    onChange={(e) => setFields({...fields, thesis: e.target.value})}
  />

  {/* Bloco: PEP Declaration */}
  <div className="pt-4 border-t border-gray-100">

    
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-4">
      Are you a Politically Exposed Person (PEP) or closely related to one? <span className="text-red-500">*</span>
    </label>
    
    <div className="flex gap-8">
      {['No', 'Yes'].map((option) => (
        <label key={option} className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center">
            <input 
              type="radio"
              name="pep-declaration"
              value={option}
              checked={fields.pep === option}
              onChange={(e) => setFields({...fields, pep: e.target.value})}
              className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-gray-300 rounded-full checked:border-[#2c5363] transition-all"
            />
            <div className="absolute w-2.5 h-2.5 bg-[#2c5363] rounded-full scale-0 peer-checked:scale-100 left-1.25 top-1.25 transition-transform mx-auto inset-0 my-auto"></div>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${fields.pep === option ? 'text-[#2c5363]' : 'text-gray-400 group-hover:text-[#bba219]'}`}>
            {option}
          </span>
        </label>
      ))}
    </div>

    {/* Alerta Visual de Compliance se selecionar Yes */}
    {fields.pep === 'Yes' && (
      <div className="mt-4 p-4 bg-red-50 border-l-2 border-red-500 animate-slideDown">
        <p className="text-[10px] font-bold text-red-700 uppercase tracking-tight leading-relaxed">
          <strong className="block mb-1">Enhanced Due Diligence Required:</strong>
          As a PEP, your application will undergo a specialized compliance review by our legal committee in accordance with international AML standards.
        </p>
      </div>
    )}

    
  </div>

<hr className="border-gray-200" />

{/* NDA SCOPE SELECTION (Final Step before Agreement) */}
<section className="space-y-6 bg-gray-50/50 p-6 rounded-xl border border-dashed border-gray-200">
  <div className="border-l-4 border-[#bba219] pl-4">
    <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">NDA Scope & Coverage</h3>
    <p className="text-[10px] font-bold text-gray-400 uppercase">Define the legal reach of this confidentiality protocol</p>
  </div>

<div className="grid grid-cols-1 gap-4">
  {/* SINGLE OPTION: FULL PORTFOLIO (MASTER NDA) */}
  <label className={`group cursor-pointer p-5 border transition-all duration-300 flex gap-4 items-start ${fields.scope === 'FULL_PORTFOLIO' ? 'bg-[#2c5363] border-[#2c5363]' : 'bg-white border-gray-100 hover:border-[#bba219]'}`}>
    <div className="mt-1">
      <input 
        type="radio" 
        className="sr-only" 
        name="nda_scope"
        checked={fields.scope === 'FULL_PORTFOLIO'}
        onChange={() => setFields({...fields, scope: 'FULL_PORTFOLIO'})}
      />
      <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${fields.scope === 'FULL_PORTFOLIO' ? 'border-[#bba219] bg-[#bba219]' : 'border-gray-200'}`}>
        {fields.scope === 'FULL_PORTFOLIO' && <div className="w-2 h-2 bg-[#2c5363]"></div>}
      </div>
    </div>
    <div className="space-y-2">
      <span className={`text-[10px] font-black uppercase tracking-widest ${fields.scope === 'FULL_PORTFOLIO' ? 'text-[#bba219]' : 'text-[#2c5363]'}`}>
        FULL PORTFOLIO (SELECTED OFF-MARKET)
      </span>
      <p className={`text-[10px] leading-relaxed font-medium ${fields.scope === 'FULL_PORTFOLIO' ? 'text-white/90' : 'text-gray-500'}`}>
        I wish to enter into a Global Confidentiality Agreement (Master NDA) to have continuous access to Prylom's restricted portfolio of off-market real assets and rural properties. I am aware that the confidentiality and non-circumvention (non-bypass) clauses will automatically cover all investment theses and properties presented to me actively and confidentially by the board.
      </p>
    </div>
  </label>
</div>
</section>
</div>


      </div>
    </section>

<button 
  onClick={() => setSubStep(3)}
  disabled={
    !fields.investorType || 
    !fields.country || 
    !fields.companyName || 
    !fields.taxId ||
    !fields.repName ||
    !fields.passportFile || // Garante que o upload foi feito
    !isCodeValid || 
    !fields.ticketSize ||
    !fields.sourceFunds ||
    !fields.thesis ||
    !fields.scope // Garante que escolheu o escopo do NDA
  }
  className={`w-full py-6 font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl
    ${(!fields.investorType || !fields.country || !fields.companyName || !fields.taxId || !fields.repName || !fields.passportFile || !isCodeValid || !fields.ticketSize || !fields.sourceFunds || !fields.thesis || !fields.scope) 
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
      : 'bg-[#2c5363] text-white hover:bg-[#bba219] active:scale-95'}
  `}
>
  {!isCodeValid ? "Verify WhatsApp to Proceed" : "Generate NCND Agreement"}
</button>
  </div>
)}

{subStep === 3 && (
  <div className="space-y-8 animate-fadeIn text-left">
    {/* Cabeçalho de Autoridade Internacional */}
    <div className="flex justify-between items-end border-b border-gray-100 pb-4">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bba219]">NCND & Compliance Protocol</h4>
      <span className="text-[9px] font-bold text-gray-400">ID: {fields.passport || 'AUTHENTICATED'}</span>
    </div>

    <div className="bg-white p-8 md:p-12 border border-gray-200 shadow-inner rounded-sm relative overflow-hidden group">
      {/* Marca d'água */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
        <span className="text-[120px] font-black tracking-tighter uppercase italic">PRYLOM</span>
      </div>

      <div className="relative z-10 space-y-6 text-[11px] md:text-[12px] text-gray-600 leading-relaxed font-medium uppercase">
        
        {/* IDENTIFICATION OF THE PARTIES */}
<div className="p-4 bg-gray-50 border-l-2 border-[#bba219] space-y-4 mb-6">
    <p className="text-[11px] leading-relaxed">
      <strong className="text-[#2c5363] block mb-1 uppercase">Disclosing Party / Intermediary:</strong>
      PRYLOM AGRONEGÓCIOS, a private legal entity, registered under CNPJ No. 45.685.251/0001-95, 
      under technical supervision CRECI No. 16344 - MS, headquartered at R. Centenário, 470 - Vila Rosa Pires 
      - Campo Grande - MS, Zip Code 79004-510, Brazil.
    </p>

    <p className="text-[11px] leading-relaxed">
      <strong className="text-[#2c5363] block mb-1 uppercase">Receiving Party / Signatory:</strong>
      By this instrument, I, <span className="font-black underline">{fields.companyName || fields.repName || "[INSERT FULL NAME OR CORPORATE NAME OF CLIENT]"}</span>, 
      duly registered under <span className="font-black underline">{fields.taxId || fields.passport || "[INSERT PASSPORT, TAX ID OR REGISTRATION NO.]"}</span>, 
      acting in the capacity of <span className="font-black underline">{fields.repCapacity || fields.investorType || "[INSERT PROFILE TYPE: DIRECT INVESTOR / LEGAL REPRESENTATIVE]"}</span>
      {fields.advisoryFirm ? ` (MANDATED BY ${fields.advisoryFirm})` : ""}, 
      declare my formal, irrevocable, and unalterable acceptance of the confidentiality terms below, 
      establishing this direct legal bond with PRYLOM regarding the curation and presentation of the asset(s). 
      This Agreement is scoped to protect any and all Confidential Information regarding the portfolio of real assets and Off-Market rural property investment theses presented by PRYLOM to the RECEIVING PARTY. It is expressly agreed that the absence of a specific asset code or prior identification in this instrument does not invalidate its confidentiality; any and all assets, Teasers, Data Rooms, or feasibility studies shared by PRYLOM (whether via system, corporate email, or messaging applications) shall, upon receipt, be automatically governed and protected by the confidentiality clauses and penalties of this contract.

    </p>
  </div>

  {/* Clauses Section */}
  <div className="space-y-6 text-[12px] leading-relaxed text-justify">
    <p>
      <strong className="text-[#2c5363] font-bold">1. NON-DISCLOSURE AND NON-CIRCUMVENTION (NCND):</strong> 
      I formally commit to maintaining absolute secrecy regarding maps, registry documents, and any sensitive data 
      that may expose the involved parties to strategic, commercial, financial, or personal risks. It is strictly 
      forbidden to contact the property owners directly or indirectly, intervene, attempt to acquire, or structure 
      deals involving the listed assets (and their bordering areas) without the express intermediation of PRYLOM. 
      The breach, circumvention, or leakage of this information will result in an immediate contractual penalty 
      equivalent to the full value of the intermediation and structuring commission stipulated for the property 
      in question, without prejudice to the competent cumulative legal action for the reparation of property 
      damages, loss of profits, and corporate moral damages.
    </p>

    <p>
      <strong className="text-[#2c5363] font-bold">2. TERM AND JOINT LIABILITY:</strong> 
      The obligations of this instrument are irrevocably valid for 36 (thirty-six) months from the date of acceptance. 
      If acting as a Representative, Intermediary, or Broker, I assume full joint, several, and financial liability 
      for any breaches of confidentiality or "by-pass" practices committed by my end-client.
    </p>

    <p>
      <strong className="text-[#2c5363] font-bold">3. TRUTHFULNESS AND ANTI-FRAUD DECLARATION:</strong> 
      I declare, under penalty of perjury and applicable laws, specifically under Article 299 of the Brazilian 
      Penal Code (Ideological Falsehood / Misrepresentation), that all information, titles, and capacities 
      provided in this accreditation are strictly true.
    </p>

    <p>
      <strong className="text-[#2c5363] font-bold">4. COMPLIANCE, AML, AND DATA PROTECTION:</strong> 
      I expressly authorize PRYLOM to cross-reference and consult the data entered in this platform with the 
      responsible authorities and agencies (including credit protection agencies, international KYC/AML sanction 
      lists, OFAC, UN, and courts of justice), as well as the processing of my data in strict compliance with 
      the Brazilian General Data Protection Law (LGPD - Law 13.709/18) and the European General Data Protection 
      Regulation (GDPR), for the exclusive purposes of prior business auditing and profile approval.
    </p>
  </div>

  {/* Footer Traceability */}
  <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between gap-4">
    <div className="space-y-1">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Authentication Hash</p>
      <p className="text-[10px] font-mono text-gray-500 uppercase">
        GLOBAL_ID_{Math.random().toString(36).substring(4).toUpperCase()} / {fields.country || 'INTL'}
      </p>
    </div>
    <div className="text-right space-y-1">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Digital Acceptance Date</p>
      <p className="text-[10px] font-mono text-gray-500">
        {new Date().toUTCString()}
      </p>
    </div>
  </div>
</div>
    </div>
    
    {/* Checkbox de Aceite */}
    <div className="bg-gray-50 p-6 rounded-sm border border-gray-100">
      <label className="flex items-start gap-4 cursor-pointer group">
        <input 
          type="checkbox" 
          checked={ndaAccepted} 
          onChange={(e) => setNdaAccepted(e.target.checked)} 
          className="h-5 w-5 mt-0.5 accent-[#2c5363] cursor-pointer" 
        />
        <span className="text-[10px] font-black uppercase leading-tight text-gray-500 group-hover:text-[#2c5363] transition-colors">
          I Agree to the Confidentiality and Compliance Terms / Li e concordo com os termos de confidencialidade e compliance.
        </span>
      </label>
    </div>

    <button 
      onClick={() => setSubStep(4)}
      disabled={!ndaAccepted}
      className={`w-full py-6 font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-2xl
        ${ndaAccepted 
          ? 'bg-[#2c5363] text-white hover:bg-black active:scale-[0.98]' 
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
      `}
    >
      Digital Signature & Submit
    </button>
  </div>
)}

      {/* STEP 4: GLOBAL HOLD */}
      {subStep === 4 && (
        <div className="py-16 px-6 text-center space-y-8 bg-[#2c5363] text-white rounded-xl animate-fadeIn">
          <div className="w-20 h-20 border-2 border-[#bba219]/30 rounded-full flex items-center justify-center mx-auto relative">
             <div className="absolute inset-0 border-t-2 border-[#bba219] rounded-full animate-spin"></div>
             <span className="text-xs">KYC/AM</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black uppercase tracking-tighter">Under Compliance Review</h3>
            <p className="text-[9px] text-[#bba219] font-black uppercase tracking-[0.3em]">EXECUTING KYC & COMPLIANCE CLEARANCE...
</p>
          </div>
          <p className="text-xs font-light leading-relaxed max-w-sm mx-auto opacity-70 uppercase tracking-widest">
            Thank you. Our international desk is validating your accreditation. ESTIMATED CLEARANCE TIME: 24 TO 48 HOURS.
          </p>
          <button onClick={onBack} className="bg-white text-[#2c5363] px-8 py-3 font-black text-[10px] uppercase tracking-widest hover:bg-[#bba219] hover:text-white transition-all">
            RETURN TO PORTFOLIO
          </button>
        </div>
      )}
    </div>
  );
};

const PrivateProtocol = ({ 
  product, 
  onComplete, 
  onBack, 
  subStep,      // Recebe do pai
  setSubStep    // Recebe do pai
}: { 
  product: any, 
  onComplete: () => void, 
  onBack: () => void,
  subStep: number,
  setSubStep: (s: number) => void 
}) => {

  const [acceptedConditions, setAcceptedConditions] = useState(false);
  const [privateOrigin, setPrivateOrigin] = useState<'BR' | 'INT' | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
const [smsSent, setSmsSent] = useState(false);
const [smsCode, setSmsCode] = useState("");
const [isCodeValid, setIsCodeValid] = useState(false);
const [codeError, setCodeError] = useState(false);


const handleSubmitProtocol = async () => {
  setIsVerifying(true); // Reutilizando o estado de loading

  // Estruturação do Payload unificado
  const payload = {
    ...fields,
    protocolType: privateOrigin, // 'BR' ou 'INT'
    productName: product?.title || "Prylom Private",
    timestamp: new Date().toISOString(),
    status: "PENDING_COMPLIANCE",
    // Os campos específicos já estão dentro do objeto 'fields'
  };

  try {
    const response = await fetch("https://webhook.saveautomatik.shop/webhook/finalizaOnboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      onComplete(); // Chama a função de sucesso do pai
    } else {
      alert("Error saving data. Please contact support.");
    }
  } catch (error) {
    console.error("Submission error:", error);
    alert("Connection failed.");
  } finally {
    setIsVerifying(false);
  }
};
const handleSendCode = async () => {
  if (!fields.phone || fields.phone.length < 8) return;
  setIsVerifying(true);
  try {
    await fetch("https://webhook.saveautomatik.shop/webhook/validaWhatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefone: fields.phone.replace(/\D/g, ""),
        nome: fields.nome, // Usando fields.nome que já existe
        projeto: "Prylom Global Desk"
      }),
    });
    setSmsSent(true);
  } catch (e) { 
    setSmsSent(true); // Fallback para testes
  } finally { 
    setIsVerifying(false); 
  }
};
  

 const [fields, setFields] = useState({
  nome: '',
  email: '',
  phone: '', // Unificado para 'phone'
  pofFile: null as File | null,
  pofDuringScreening: false, // Adicionado
  meetingTime: '',
  meetingDate: '',
  company: '',
  scope: 'STANDARD', // Valor inicial para não travar o botão
  countryCode: 'us'
});

useEffect(() => {
  const verificarCodigo = async () => {
    // 1. Verifica se tem 6 dígitos
    if (smsCode.length === 6) {
      setIsVerifying(true);
      setCodeError(false);
      
      try {
        const response = await fetch("https://webhook.saveautomatik.shop/webhook/validaCodigo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // 2. IMPORTANTE: Usar fields.phone (o mesmo do PhoneInput)
            telefone: fields.phone.replace(/\D/g, ""), 
            codigo: smsCode
          }),
        });

        const data = await response.json();
        // 3. Normalização da resposta do n8n
        const isValid = String(data.valid).toLowerCase() === "true";

        if (isValid) {
          setIsCodeValid(true);
          setCodeError(false);
        } else {
          setIsCodeValid(false);
          setCodeError(true);
          setSmsCode(""); // Limpa o código para nova tentativa
          alert("Invalid code. Please check your WhatsApp.");
        }
      } catch (error) {
        console.error("Validation error:", error);
      } finally {
        setIsVerifying(false);
      }
    }
  };
  verificarCodigo();
}, [smsCode, fields.phone]); // Dependência corrigida para phone

 const [countries, setCountries] = useState<string[]>(['United States', 'China', 'United Kingdom', 'United Arab Emirates', 'Saudi Arabia', 'Germany', 'Switzerland']);
const [docStatus, setDocStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

useEffect(() => {
  const fetchCountries = async () => {
    // Lista de sanções e restrições FATF (Blacklist)
    const restrictedCountries = [
      'Iran', 
      'North Korea', 
      'Syria', 
      'Cuba', 
      'Russia', 
      'Myanmar'
    ];

    try {
      const res = await fetch('https://restcountries.com/v3.1/all?fields=name');
      const data = await res.json();
      
      const countryList = data
        .map((c: any) => c.name.common)
        // FILTRO DE SEGURANÇA: Remove países sancionados
        .filter((name: string) => !restrictedCountries.includes(name))
        .sort((a: string, b: string) => a.localeCompare(b));
      
      setCountries(countryList);
    } catch (err) {
      console.error("Erro ao carregar países, usando lista padrão segura.");
      // Caso a API falhe, garante que a lista padrão também esteja limpa
      setCountries(['United States', 'China', 'United Kingdom', 'United Arab Emirates', 'Saudi Arabia', 'Germany', 'Switzerland']);
    }
  };
  fetchCountries();
}, []);

  const isOpenMarket = useMemo(() => {
    const relevancia = product?.relevancia_anuncio || product?.fazenda_data?.relevancia_anuncio;
    const tipo = product?.tipo_anuncio || product?.fazenda_data?.tipo_anuncio;
    return relevancia === 'Open Market' || tipo === 'Open Market';
  }, [product]);

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    else value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    setFields({ ...fields, doc: value });
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length <= 13) {
      v = v.replace(/^(\d{2})(\d{2})(\d)/g, "$1 ($2) $3");
      v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    }
    setFields({ ...fields, telefone: v });
  };
  return (
    <div className="animate-fadeIn space-y-12 text-left text-[#2c5363] max-w-4xl mx-auto">
      
{subStep === 1 && (
  <div className="space-y-10 animate-fadeIn w-full">
    {/* HEADER */}
    <div className="text-center space-y-4">
      <h2 className="text-3xl font-black uppercase tracking-tighter">PRYLOM PRIVATE: MANDATO DE AQUISIÇÃO & ADVISORY</h2>
      <p className="text-[#bba219] font-bold tracking-[0.3em] text-[11px] uppercase italic">"Acesso ao Off-Market. Inteligência Técnica. Logística Executiva."</p>
    </div>

    {/* CONTEÚDO PRINCIPAL */}
    <div className="space-y-8">
      
      {/* GRID DE 3 CARDS - LARGURA TOTAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD 1: ADVISORY */}
        <section className="flex flex-col h-full space-y-4 p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-black uppercase text-[11px] text-[#2c5363] flex items-center gap-2 tracking-widest">
            <span className="w-2 h-2 bg-[#bba219] rounded-full"></span> 01. Full-Stack Advisory
          </h4>
          <div className="flex-1 space-y-4">
            <p className="text-gray-400 text-[10px] font-bold uppercase leading-relaxed">
              Não vendemos apenas terra; entregamos inteligência estratégica para validação do ativo:
            </p>
            <div className="space-y-2 text-[10px] font-black uppercase text-[#2c5363]">
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> COORDENAÇÃO ESTRATÉGICA DE DUE DILIGENCE LEGAL & TRIBUTÁRIA</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Engenharia Agronômica: Solo & Produtividade</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Zootecnia Estratégica: Suporte & Infra</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Relatórios: Mapas de Argila & Pluviometria</p>
            </div>
          </div>
        </section>

        {/* CARD 2: LOGÍSTICA */}
        <section className="flex flex-col h-full space-y-4 p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-black uppercase text-[11px] text-[#2c5363] flex items-center gap-2 tracking-widest">
            <span className="w-2 h-2 bg-[#bba219] rounded-full"></span> 02. Logística Executiva
          </h4>
          <div className="flex-1 space-y-4">
            <p className="text-gray-400 text-[10px] font-bold uppercase leading-relaxed">
              Sua única preocupação deve ser a decisão. A Prylom estrutura e financia 100% da sua jornada de vistoria técnica:

            </p>
            <div className="space-y-2 text-[10px] font-black uppercase text-[#2c5363]">
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Nacional: Transfer de base ou aeroporto</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Internacional: Receptivo blindado & aéreo (Deslocamento de aeronave executiva se for necessário)</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Visita técnica "Door-to-Farm" sem custos</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Nacional & Internacional: Receptivo aeroportuário, veículos blindados e deslocamento via aeronave executiva (sob demanda).
</p>
              <p className="flex items-start gap-2"><span className="text-[#bba219]">•</span> Alinhamento de Risco: A PRYLOM arca integralmente com os custos operacionais e logísticos
durante o período de busca. Este investimento será abatido exclusivamente do Success Fee
(comissão) apenas após o fechamento do negócio.</p>
            </div>
          </div>
        </section>

        {/* CARD 3: THE VAULT */}
        <section className="flex flex-col h-full space-y-4 p-6 bg-[#2c5363] text-white shadow-xl transform hover:-translate-y-1 transition-all">
          <h4 className="font-black uppercase text-[11px] text-[#bba219] flex items-center gap-2 tracking-widest">
            <span className="w-2 h-2 bg-[#bba219] rounded-full shadow-[0_0_8px_#bba219]"></span> 03. The Vault
          </h4>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[11px] font-medium leading-relaxed uppercase tracking-wider opacity-90">
              Desbloqueie o acesso ao portfólio <span className="text-[#bba219] font-black">Off-Market</span>. Ativos estressados e fazendas de alta performance protegidas por sigilo absoluto.
            </p>
          </div>
          <div className="pt-4 border-t border-white/10">
              <span className="text-[8px] font-black tracking-[0.3em] text-[#bba219] uppercase">Acesso Prioritário</span>
          </div>
        </section>
      </div>

{/* COMMAND CENTER - OCUPA A LARGURA TODA ABAIXO DOS CARDS */}
<section className="w-full space-y-4 p-8 bg-gray-50 border-l-4 border-[#bba219] shadow-inner">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <h4 className="font-black uppercase text-[13px] text-[#2c5363] flex items-center gap-2 tracking-tighter">
      <span className="relative flex h-3 w-3">
        {/* Alterado de red-400 para green-400 */}
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        {/* Alterado de red-500 para green-500 */}
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
      </span>
      4. "Command Center": Inspeção Remota High-Tech
    </h4>
    <span className="text-[9px] font-black bg-[#2c5363] text-white px-3 py-1 rounded-full uppercase tracking-widest">
      Conexão Satelital Starlink
    </span>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
    <div className="space-y-3">
      <p className="text-gray-600 text-[11px] font-semibold leading-relaxed uppercase">
        Tecnologia a serviço da sua Due Diligence. Vistoria via Drone em tempo real com narração técnica.
      </p>
      <ul className="space-y-2 text-[10px] text-gray-500 font-bold uppercase tracking-tight">
        <li className="flex gap-2"><span className="text-[#bba219] font-black">›</span> <span>Vistoria Técnica Narrada por Engenheiro Agrônomo.</span></li>
        <li className="flex gap-2"><span className="text-[#bba219] font-black">›</span> <span>Interatividade Total: Você direciona o voo remotamente.</span></li>
        {/* Alterado de text-red-700 para text-green-700 */}
        <li className="flex gap-2 text-green-700 font-black"><span className="text-[#bba219]">›</span> <span>Zero Filtro: Realidade nua e crua do ativo.</span></li>
      </ul>
    </div>
    <div className="space-y-3 bg-white/50 p-4 rounded border border-gray-200">
      <p className="text-[10px] text-gray-400 font-bold uppercase leading-tight">
        Eliminamos a "visita exploratória". A visita presencial torna-se apenas uma etapa de <span className="text-[#2c5363]">Confirmação e Fechamento</span>.
      </p>
      <p className="text-[9px] font-black text-[#bba219] uppercase italic pt-2">
        Resultado: Certeza de negócio antes da alocação aérea/terrestre.
      </p>
    </div>
  </div>
</section>

      {/* CONDIÇÕES DO MANDATO */}
{/* CONDIÇÕES DO MANDATO - DESIGN REFINADO */}
<div className="bg-gray-100/80 p-10 rounded-sm space-y-8 border border-gray-200">
  <div className="text-center space-y-2">
    <h5 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#2c5363]">
      As Condições do Mandato (Leia com Atenção)
    </h5>
    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
      Operamos sob o modelo internacional de Buyer's Agent (Representante do Comprador)
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2c5363] text-[#bba219] text-[10px] font-black">01</span>
        <h6 className="text-[10px] font-black uppercase text-[#2c5363]">Exclusividade</h6>
      </div>
      <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">
        A Prylom atuará como sua <span className="text-[#2c5363]">única mandatária</span> PARA BUSCA E ESTRUTURAÇÃO DE ATIVOS DENTRO
DO ESCOPO GEOGRÁFICO E FINANCEIRO ACORDADO, PELO PERÍODO DE 90 DIAS.
      </p>
    </div>

    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2c5363] text-[#bba219] text-[10px] font-black">02</span>
        <h6 className="text-[10px] font-black uppercase text-[#2c5363]">Proof of Funds</h6>
      </div>
      <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">
        Ativação condicionada à aprovação de <span className="text-[#2c5363]">Compliance Financeiro</span>, com liquidez compatível ao ticket (R$ 30MM+).
      </p>
    </div>

    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2c5363] text-[#bba219] text-[10px] font-black">03</span>
        <h6 className="text-[10px] font-black uppercase text-[#2c5363]">Mandato de Compra</h6>
      </div>
      <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">
        Assinatura digital do contrato de representação e <span className="text-[#2c5363]">NDA</span> antes da abertura do Data Room Off-Market.
      </p>
    </div>
  </div>
</div>
    </div>

{/* O HARD GATE / BOTÕES DESBLOQUEÁVEIS */}
<div className="pt-12 space-y-10 text-center">
  <div className="inline-block p-6 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm transition-all hover:border-[#bba219]">
    <label className="flex items-center gap-4 cursor-pointer group">
      <div className="relative">
        <input 
          type="checkbox" 
          checked={acceptedConditions}
          onChange={(e) => setAcceptedConditions(e.target.checked)}
          className="peer w-8 h-8 opacity-0 absolute cursor-pointer"
        />
        <div className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center peer-checked:bg-[#bba219] peer-checked:border-[#bba219] transition-all">
          <svg className="w-5 h-5 text-white opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <span className="text-[12px] font-black uppercase tracking-tighter text-gray-400 group-hover:text-[#2c5363] transition-colors text-left max-w-sm">
        Declaro que li e aceito as condições de Exclusividade e Comprovação de Fundos para acessar o serviço Prylom Private.
      </span>
    </label>
  </div>

  <div className="space-y-6">
    <p className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 ${acceptedConditions ? 'text-[#bba219] opacity-100' : 'text-gray-300 opacity-50'}`}>
      Selecione sua origem para iniciar o onboarding:
    </p>
    
    <div className={`flex flex-col md:flex-row gap-6 max-w-2xl mx-auto transition-all duration-700 ${acceptedConditions ? 'opacity-100 translate-y-0' : 'opacity-10 pointer-events-none translate-y-4 grayscale'}`}>
      <button 
        onClick={() => { setPrivateOrigin('BR'); setSubStep(2); }} 
        className="group flex-1 flex items-center justify-center gap-4 py-6 bg-[#2c5363] text-white font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#bba219] transition-all shadow-xl hover:-translate-y-1 active:scale-95"
      >
        <span className="text-xl group-hover:scale-125 transition-transform">🇧🇷</span>
        Investidor Nacional
      </button>
      
      <button 
        onClick={() => { setPrivateOrigin('INT'); setSubStep(2); }} 
        className="group flex-1 flex items-center justify-center gap-4 py-6 border-2 border-[#2c5363] text-[#2c5363] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-gray-50 transition-all shadow-lg hover:-translate-y-1 active:scale-95"
      >
        <span className="text-xl group-hover:scale-125 transition-transform">🌎</span>
        International Investor
      </button>
    </div>
  </div>
</div>
  </div>
)}

{subStep === 2 && (
  <div className="space-y-10 animate-fadeIn w-full">
    <div className="border-b border-gray-100 pb-6 flex justify-between items-center">
      <div>
        <h3 className="text-2xl font-black uppercase tracking-tighter">Private Onboarding</h3>
        <p className="text-[#bba219] text-[10px] font-bold uppercase tracking-[0.3em]">
          {privateOrigin === 'BR' ? 'Mandato Nacional' : 'International Mandate'} & Alocação Técnica
        </p>
      </div>
      <span className="text-[9px] bg-[#bba219] text-white px-4 py-1.5 font-black rounded-full uppercase tracking-[0.2em]">Priority Pass</span>
    </div>

{privateOrigin === 'INT' && (
  
  <div className="space-y-10 animate-fadeIn text-left text-[#2c5363]">
    {/* ETAPA 1: ENTITY & JURISDICTION */}
    <section className="space-y-6">
      <div className="border-l-4 border-[#bba219] pl-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 1: Entity & Jurisdiction</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase">Primary Buyer Legal Identification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SelectLine 
          label="Investor Type *" 
          options={['Select...', 'Family Office', 'Private Equity / Hedge Fund', 'Sovereign Wealth Fund', 'Corporate / Agribusiness Group','Individual High-Net-Worth']} 
          value={fields.investorType}
          onChange={(e) => setFields({...fields, investorType: e.target.value})}
        />
<div className="space-y-1">
  <SelectLine 
    label="Country of Origin / Tax Residence *" 
    options={['Select Country...', ...countries]} 
    value={fields.country}
    onChange={(e) => setFields({...fields, country: e.target.value})}
  />
  <p className="text-[10px] text-gray-400 italic">
    * Countries under international sanctions or FATF blacklist are not eligible for registration.
  </p>
</div>
        <InputLine label="Company Name / Full Name *" placeholder="Legal Entity Name" value={fields.companyName} onChange={(e) => setFields({...fields, companyName: e.target.value})} />
        <InputLine label="Tax ID / Registration Number *" placeholder="EIN, VAT, or Registration No." value={fields.taxId} onChange={(e) => setFields({...fields, taxId: e.target.value})} />
<div className="space-y-6">
  <SelectLine 
    label="Do you have CNPJ or representation in Brazil? *" 
    options={['Select...', 'Yes (Ready structure)', 'No (Need structuring)']} 
    value={fields.hasBrazilRep}
    onChange={(e) => setFields({...fields, hasBrazilRep: e.target.value})}
  />

  {/* Campo Condicional para Capital Estrangeiro */}
  {fields.hasBrazilRep === 'Yes (Ready structure)' && (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-100 space-y-4 animate-fadeIn">
      <label className="flex items-start gap-4 cursor-pointer group">
        <div className="relative flex items-center pt-1">
          <input 
            type="checkbox" 
            className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-gray-300 rounded-md checked:bg-[#2c5363] checked:border-[#2c5363] transition-all"
            required
            checked={fields.isMajorityForeign}
            onChange={(e) => setFields({...fields, isMajorityForeign: e.target.checked})}
          />
          <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none top-2 left-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#2c5363] group-hover:text-[#bba219] transition-colors leading-relaxed">
            Is this Brazilian entity majority-owned by foreign capital? *
          </span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-1">
            (Esta entidade brasileira é controlada majoritariamente por capital estrangeiro?)
          </span>
        </div>
      </label>
    </div>
  )}
</div>
      </div>
    </section>
    

    <hr className="border-gray-100" />

    {/* ETAPA 2: CONTACT & REPRESENTATIVE */}
    <section className="space-y-6">
      <div className="border-l-4 border-[#2c5363] pl-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 2: Contact & Representative</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase">Liaison and Identity Verification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
       <div className="space-y-8 animate-fadeIn">
  {/* Campo Base: Nome do Representante */}
  <InputLine 
    label="Full Name of Representative *" 
    placeholder="Full Legal Name (As in Passport)" 
    value={fields.repName} 
    onChange={(e) => setFields({...fields, repName: e.target.value})} 
  />

  {/* Checkbox de Mandato de Representação */}
  <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
    <label className="flex items-start gap-4 cursor-pointer group">
      <div className="relative flex items-center pt-1">
        <input 
          type="checkbox" 
          className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-gray-300 rounded-md checked:bg-[#2c5363] checked:border-[#2c5363] transition-all"
          checked={fields.hasMandate}
          onChange={(e) => setFields({...fields, hasMandate: e.target.checked})}
        />
        <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none top-2 left-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
      <span className="text-[10px] font-black uppercase tracking-wider text-[#2c5363] leading-relaxed">
        REPRESENTATION MANDATE: I hereby legally declare, under penalty of perjury, that I am an authorized signatory, officer, or legally mandated broker holding a valid Power of Attorney (POA) to act and sign on behalf of the Primary Entity.
      </span>
    </label>
  </div>

  {/* Seleção de Capacidade (Só aparece se o Mandato for aceito) */}
  {fields.hasMandate && (
    <div className="space-y-6 pt-4 animate-slideDown">
      <SelectLine 
        label="Representative Capacity *" 
        options={[
          'Select...', 
          'Corporate Officer / Director', 
          'Authorized Signatory (Power of Attorney - POA)', 
          'External Broker / Advisor (Mandated)'
        ]} 
        value={fields.repCapacity}
        onChange={(e) => setFields({...fields, repCapacity: e.target.value})}
      />

      {/* CENÁRIO A: Funcionário Direto ou Procurador Oficial */}
      {(fields.repCapacity === 'Corporate Officer / Director' || 
        fields.repCapacity === 'Authorized Signatory (Power of Attorney - POA)') && (
        <div className="animate-fadeIn">
          <InputLine 
            label="Company / Fund You Directly Represent *" 
            placeholder="Ex: BlackRock Inc., Sovereign Wealth Fund" 
            value={fields.directCompany}
            onChange={(e) => setFields({...fields, directCompany: e.target.value})}
          />
        </div>
      )}

      {/* CENÁRIO B: Corretor Externo (A Grande Sacada) */}
      {fields.repCapacity === 'External Broker / Advisor (Mandated)' && (
        <div className="space-y-6 p-6 bg-[#2c5363]/5 border-l-4 border-[#2c5363] animate-fadeIn">
          <InputLine 
            label="1. Advisory Firm / Brokerage Name *" 
            placeholder="Ex: JLL, CBRE, Independent Advisor" 
            value={fields.advisoryFirm}
            onChange={(e) => setFields({...fields, advisoryFirm: e.target.value})}
          />
          <InputLine 
            label="2. End-Buyer / Fund Represented *" 
            placeholder="Ex: Name of the exact Fund or Buyer holding the capital" 
            value={fields.endBuyer}
            onChange={(e) => setFields({...fields, endBuyer: e.target.value})}
          />
          <p className="text-[9px] font-bold text-gray-400 uppercase">
            Note: The NDA will cover both the Advisory Firm and the End-Buyer.
          </p>
        </div>
      )}
    </div>
  )}
</div>


<div className="flex flex-col gap-2 relative"> 
  {/* Aviso de Segurança Flutuante - Agora fora do fluxo para não empurrar o label */}
  <div className="absolute -top-3 left-0 w-full pointer-events-none">
    <span className="text-[7px] font-black text-[#bba219] uppercase tracking-[0.2em] opacity-80 block whitespace-nowrap">
      Encrypted upload • GDPR & LGPD Compliant
    </span>
  </div>

  {/* O Label agora começa no exato topo da div, igual aos outros campos ao lado */}
  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
    Passport Number / ID (Photo Upload) <span className="text-red-500">*</span>
  </label>

  <div className="relative border-b border-gray-200 py-2 group">
    <input
      type="file"
      id="passport-upload"
      accept="image/*,.pdf"
      onChange={(e) => setFields({ ...fields, passportFile: e.target.files ? e.target.files[0] : null })}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
    />

    <div className="flex items-center gap-4">
      <div className="py-1 px-3 rounded-full bg-gray-100 text-[#2c5363] text-[9px] font-black uppercase tracking-widest group-hover:bg-[#2c5363] group-hover:text-white transition-all">
        Choose File
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate max-w-[120px]">
        {fields.passportFile ? fields.passportFile.name : "No file selected"}
      </span>
    </div>

    {fields.passportFile && (
      <span className="absolute right-0 bottom-3 text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        ID Attached
      </span>
    )}
  </div>
</div>
        <InputLine label="Official Corporate E-mail *" placeholder="name@company.com" type="email" value={fields.email} onChange={(e) => setFields({...fields, email: e.target.value})} />
        
        {/* WHATSAPP COM VALIDAÇÃO 2FA INTEGRADA */}
  <div className="space-y-2 group animate-fadeIn">
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-focus-within:text-[#bba219] transition-colors">
      Direct WhatsApp (Verified) *
    </label>
    
    <div className="relative border-b border-gray-200 focus-within:border-[#bba219] transition-all pb-1 flex items-center">
      <PhoneInput
        country={fields.countryCode?.toLowerCase() || 'us'} 
        value={fields.phone}
        onChange={(phone) => setFields({...fields, phone: '+' + phone})}
        enableSearch={true}
        placeholder="Enter phone number"
        containerClass="prylom-phone-container"
        inputClass="prylom-phone-input"
        buttonClass="prylom-phone-button"
        dropdownClass="prylom-phone-dropdown"
        specialLabel=""
      />

      {/* Botão de Validação 2FA */}
      {!smsSent && fields.phone?.length > 8 && (
        <button 
          onClick={handleSendCode} 
          className="absolute right-0 bottom-2 text-[9px] font-black text-[#bba219] uppercase hover:underline z-10 bg-white pl-2"
        >
          {isVerifying ? "Sending..." : "Validate WhatsApp"}
        </button>
      )}
    </div>
  </div>

  {/* INTERFACE DE CÓDIGO 2FA (Aparece logo abaixo do seletor) */}
  {smsSent && (
    <div className={`animate-fadeIn p-6 rounded-lg border transition-all duration-500 ${isCodeValid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'} space-y-4`}>
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2c5363]">
          Verification Code
        </label>

        {isCodeValid ? (
          <span className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            WhatsApp Verified
          </span>
        ) : (
          <span className="text-[9px] font-bold text-[#bba219] uppercase">Check your WhatsApp for the code</span>
        )}
      </div>

      <div className="relative">
        <input
          maxLength={6}
          disabled={isCodeValid || isVerifying}
          value={smsCode}
          onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}
          placeholder={isVerifying ? "..." : "000000"}
          className={`w-full py-4 text-center text-xl font-black tracking-[0.5em] outline-none transition-all
            ${isCodeValid ? 'bg-transparent text-green-700' : 'bg-white border border-gray-200 focus:border-[#bba219] text-[#2c5363]'}
            ${codeError ? 'border-red-500 animate-shake' : ''}
          `}
        />

        {isVerifying && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <div className="w-5 h-5 border-2 border-[#bba219] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {!isCodeValid && (
        <p className="text-[9px] text-gray-400 font-medium uppercase text-center">
          Didn't receive it? <button type="button" onClick={handleSendCode} className="text-[#bba219] font-bold hover:underline">Resend Code</button>
        </p>
      )}
    </div>
  )}

  {/* Estilização Global para o PhoneInput */}
  <style jsx global>{`
    .prylom-phone-container { width: 100% !important; border: none !important; }
    .prylom-phone-input {
      width: 100% !important; border: none !important; background: transparent !important;
      font-size: 13px !important; font-weight: 700 !important; color: #2c5363 !important;
      padding-left: 45px !important;
    }
    .prylom-phone-button { border: none !important; background: transparent !important; }
    .prylom-phone-dropdown {
      font-size: 11px !important; text-transform: uppercase !important;
      font-weight: 700 !important; color: #2c5363 !important;
    }
  `}</style>
</div>
    </section>

    <hr className="border-gray-100" />

    {/* ETAPA 3: INVESTMENT PROFILE */}
    <section className="space-y-6">
      <div className="border-l-4 border-[#bba219] pl-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 3: Investment Profile</h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase">Capital Capacity and Strategic Thesis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SelectLine 
          label="Target Ticket Size (USD) *" 
          options={['Select range...', 'U$ 1M - U$ 5M', 'U$ 5M - U$ 20M', 'U$ 20M - U$ 50M', 'Above U$ 50M']} 
          value={fields.ticketSize}
          onChange={(e) => setFields({...fields, ticketSize: e.target.value})}
        />
<SelectLine 
  label="Source of Funds *" 
  options={[
    'Select...', 
    'Equity / Cash (Recursos Próprios à vista)', 
    'Bank Financing / Leverage (Financiamento Bancário)', 
    'Committed Capital', 
    'Sovereign Wealth (Fundo Soberano / State Funds)'
  ]} 
  value={fields.sourceFunds}
  onChange={(e) => setFields({...fields, sourceFunds: e.target.value})}
/>
<div className="space-y-8">
  {/* Campo: Investment Thesis */}
  <SelectLine 
    label="Investment Thesis *" 
    options={[
      'Select...', 
      'Land Appreciation (Asset Wealth)', 
      'Production / Commodity Trading', 
      'Yield / Leaseback Strategy', 
      'Carbon Credits / Preservation'
    ]} 
    value={fields.thesis}
    onChange={(e) => setFields({...fields, thesis: e.target.value})}
  />

  {/* Bloco: PEP Declaration */}
  <div className="pt-4 border-t border-gray-100">

    
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-4">
      Are you a Politically Exposed Person (PEP) or closely related to one? <span className="text-red-500">*</span>
    </label>
    
    <div className="flex gap-8">
      {['No', 'Yes'].map((option) => (
        <label key={option} className="flex items-center gap-3 cursor-pointer group">
          <div className="relative flex items-center">
            <input 
              type="radio"
              name="pep-declaration"
              value={option}
              checked={fields.pep === option}
              onChange={(e) => setFields({...fields, pep: e.target.value})}
              className="peer h-5 w-5 cursor-pointer appearance-none border-2 border-gray-300 rounded-full checked:border-[#2c5363] transition-all"
            />
            <div className="absolute w-2.5 h-2.5 bg-[#2c5363] rounded-full scale-0 peer-checked:scale-100 left-1.25 top-1.25 transition-transform mx-auto inset-0 my-auto"></div>
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${fields.pep === option ? 'text-[#2c5363]' : 'text-gray-400 group-hover:text-[#bba219]'}`}>
            {option}
          </span>
        </label>
      ))}
    </div>

    {/* Alerta Visual de Compliance se selecionar Yes */}
    {fields.pep === 'Yes' && (
      <div className="mt-4 p-4 bg-red-50 border-l-2 border-red-500 animate-slideDown">
        <p className="text-[10px] font-bold text-red-700 uppercase tracking-tight leading-relaxed">
          <strong className="block mb-1">Enhanced Due Diligence Required:</strong>
          As a PEP, your application will undergo a specialized compliance review by our legal committee in accordance with international AML standards.
        </p>
      </div>
    )}

    
  </div>

<hr className="border-gray-200" />

{/* NDA SCOPE SELECTION (Final Step before Agreement) */}

</div>


      </div>
    </section>


  </div>
)}

{privateOrigin === 'BR' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

<div className="relative">
  <InputLine 
    label="CPF / CNPJ" 
    placeholder="000.000.000-00" 
    value={fields.doc}
    onChange={handleDocChange}
  />
  
  {/* Feedback Visual de Validação */}
  <div className="absolute right-0 bottom-3">
    {docStatus === 'valid' && (
      <span className="text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        Autenticado
      </span>
    )}
    {docStatus === 'invalid' && (
      <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 animate-bounce">
        Documento Inválido
      </span>
    )}
  </div>
</div>
            <InputLine 
              label="Nome Completo / Razão Social" 
              placeholder="Identificação oficial" 
              value={fields.nome}
              onChange={(e) => setFields({...fields, nome: e.target.value})}
            />
            {/* CAMPO DE TELEFONE */}
<div className="space-y-4">
    <div className="relative border-b border-gray-200 focus-within:border-[#bba219] transition-all pb-1 flex items-center">
      <PhoneInput
        country={fields.countryCode?.toLowerCase() || 'us'} 
        value={fields.phone}
        onChange={(phone) => setFields({...fields, phone: '+' + phone})}
        enableSearch={true}
        placeholder="Enter phone number"
        containerClass="prylom-phone-container"
        inputClass="prylom-phone-input"
        buttonClass="prylom-phone-button"
        dropdownClass="prylom-phone-dropdown"
        specialLabel=""
      />
      {!smsSent && fields.phone.length >= 14 && (
        <button 
          onClick={handleSendCode}
          className="absolute right-0 bottom-2 text-[9px] font-black text-[#bba219] uppercase tracking-widest hover:underline"
        >
          {isVerifying ? "Enviando..." : "Validar via WhatsApp"}
        </button>
      )}
    </div>

    {/* INTERFACE DE CÓDIGO 2FA (Aparece logo abaixo do input de telefone) */}
   {smsSent && (

  <div className={`animate-fadeIn p-6 rounded-lg border transition-all duration-500 ${isCodeValid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'} space-y-4`}>

    <div className="flex justify-between items-center">

      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2c5363]">

        Código de Verificação

      </label>

      {isCodeValid ? (

        <span className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">

          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>

          WhatsApp Validado

        </span>

      ) : (

        <span className="text-[9px] font-bold text-[#bba219] uppercase">Confirme o código recebido</span>

      )}

    </div>

   

    <div className="relative">

      <input

        maxLength={6}

        disabled={isCodeValid || isVerifying}

        value={smsCode}

        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ""))}

        placeholder={isVerifying ? "..." : "000000"}

        className={`w-full py-4 text-center text-xl font-black tracking-[0.5em] outline-none transition-all

          ${isCodeValid ? 'bg-transparent text-green-700' : 'bg-white border border-gray-200 focus:border-[#bba219] text-[#2c5363]'}

          ${codeError ? 'border-red-500 animate-shake' : ''}

        `}

      />

      {isVerifying && (

        <div className="absolute inset-0 flex items-center justify-center bg-white/50">

          <div className="w-5 h-5 border-2 border-[#bba219] border-t-transparent rounded-full animate-spin"></div>

        </div>

      )}

    </div>

   

    {!isCodeValid && (

      <p className="text-[9px] text-gray-400 font-medium uppercase text-center">

        Não recebeu? <button type="button" onClick={handleSendCode} className="text-[#bba219] font-bold hover:underline">Reenviar código</button>

      </p>

    )}

  </div>

    )}
  </div>

  {/* COLUNA EMAIL */}
  <div className="flex flex-col justify-start">
    <InputLine 
      label="E-mail Principal / Corporativo" 
      placeholder="contato@empresa.com" 
      type="email"
      value={fields.email}
      onChange={(e) => setFields({...fields, email: e.target.value})}
    />
  </div>
          </div>
 
          
         
        </div>
      )}
  
<div className="space-y-4">


<div className="md:col-span-2 space-y-4 bg-gray-50 p-8 rounded-sm border border-dashed border-gray-200 relative pt-10">
  
  {/* Absolute Security Badge */}
  <div className="absolute top-4 left-0 w-full flex justify-center pointer-events-none">
    <span className="text-[7px] font-black text-[#bba219] uppercase tracking-[0.2em] opacity-80">
      Encrypted upload • Tier 1 Financial Privacy
    </span>
  </div>

  <label className="text-[10px] font-black uppercase text-[#2c5363] flex items-center justify-center gap-2">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    Proof of Funds (POF) *
  </label>
  
  <p className="text-[9px] text-gray-400 uppercase font-bold text-center italic leading-relaxed">
    ATTACH PROOF OF INVESTMENT CAPACITY (STATEMENT, BANK LETTER, OR CUSTODY REPORT).
  </p>

  {/* CUSTOM FILE UPLOAD UI */}
  <div className={`flex justify-center transition-all duration-500 ${fields.pofDuringScreening ? 'opacity-20 grayscale pointer-events-none' : 'opacity-100'}`}>
    <div className="relative group">
      <input 
        type="file" 
        id="pof-upload"
        accept=".pdf,image/*"
        required={!fields.pofDuringScreening}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        onChange={(e) => setFields({...fields, pofFile: e.target.files ? e.target.files[0] : null})}
      />
      
      <div className="flex items-center gap-4 bg-white border border-gray-200 py-2 px-6 rounded-full shadow-sm group-hover:border-[#bba219] transition-all">
        <div className="bg-[#2c5363] text-white text-[9px] font-black uppercase px-3 py-1 rounded-full group-hover:bg-[#bba219]">
          Choose File
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate max-w-[150px]">
          {fields.pofFile ? fields.pofFile.name : "No file selected"}
        </span>
      </div>

      {fields.pofFile && (
        <span className="absolute -right-24 top-2 text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          Attached
        </span>
      )}
    </div>
  </div>

  {/* SCREENING OPTION */}
  <div className="pt-4 border-t border-gray-200 mt-4">
    <label className="flex items-center justify-center gap-3 cursor-pointer group">
      <div className="relative flex items-center">
        <input 
          type="checkbox" 
          className="peer h-4 w-4 cursor-pointer appearance-none border-2 border-gray-300 rounded-sm checked:bg-[#bba219] checked:border-[#bba219] transition-all"
          checked={fields.pofDuringScreening}
          onChange={(e) => setFields({...fields, pofDuringScreening: e.target.checked})}
        />
        <svg className="absolute h-3 w-3 text-[#2c5363] opacity-0 peer-checked:opacity-100 pointer-events-none left-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-[9px] font-black uppercase tracking-tight text-[#2c5363] group-hover:text-[#bba219] transition-colors text-center">
        I opt to present my proof of funds confidentially to the Board <br className="hidden md:block"/> during the Screening Meeting.
      </span>
    </label>
  </div>
</div>

      {/* AGENDAMENTO ROBUSTO COM DATA LIVRE */}
      <div className="md:col-span-2 space-y-6">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#2c5363]">
          AGENDAMENTO DE ALINHAMENTO ESTRATÉGICO (COM A DIRETORIA) *
        </label>
        
        <div className="bg-white border border-gray-200 p-8 rounded-sm shadow-sm grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* LADO ESQUERDO: CALENDÁRIO LIVRE */}
          <div className="space-y-3">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">1. Selecione a Data:</p>
            <input 
              type="date"
              min={new Date().toISOString().split('T')[0]} // Impede datas passadas
              value={fields.meetingDate}
              onChange={(e) => setFields({...fields, meetingDate: e.target.value})}
              className="w-full bg-transparent border-b-2 border-gray-100 py-3 text-sm font-black text-[#2c5363] outline-none focus:border-[#bba219] transition-all cursor-pointer"
            />
          </div>

          {/* LADO DIREITO: HORÁRIOS */}
          <div className="space-y-4">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">2. Janela de Horário (Brasília):</p>
            <div className="grid grid-cols-3 gap-2">
              {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setFields({...fields, meetingTime: time})}
                  className={`py-2 text-[10px] font-black border rounded-sm transition-all
                    ${fields.meetingTime === time ? 'bg-[#2c5363] border-[#2c5363] text-white' : 'bg-transparent border-gray-100 text-gray-400 hover:border-[#2c5363] hover:text-[#2c5363]'}
                  `}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
          
          <div className="md:col-span-2 pt-4 border-t border-gray-50">
             <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest italic text-center">
               * Agendamento sujeito a confirmação técnica via WhatsApp ou E-mail.
             </p>
          </div>
        </div>
      </div>
    </div>

{privateOrigin==='INT' &&(<button 
  onClick={() => setSubStep(3)}
  disabled={
    // Validações do Botão 1 original
    (!fields.companyName && !fields.nome) || 
    (!fields.pofFile && !fields.pofDuringScreening) || 
    !isCodeValid || 
    !fields.scope ||
    // Novas validações vindas do Botão 2
    !fields.investorType || 
    !fields.country || 
    !fields.taxId ||
    !fields.repName ||
    !fields.passportFile || 
    !fields.ticketSize ||
    !fields.sourceFunds ||
    !fields.thesis
  }
  className={`w-full py-6 font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl
    ${(
      (!fields.companyName && !fields.nome) || 
      (!fields.pofFile && !fields.pofDuringScreening) || 
      !isCodeValid || 
      !fields.scope ||
      !fields.investorType || 
      !fields.country || 
      !fields.taxId ||
      !fields.repName ||
      !fields.passportFile || 
      !fields.ticketSize ||
      !fields.sourceFunds ||
      !fields.thesis
    ) 
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
      : 'bg-[#2c5363] text-white hover:bg-[#bba219] active:scale-95'}
  `}
>
  {/* Feedback de erro priorizado */}
  {(!fields.companyName && !fields.nome) ? "Enter Company Name" : 
   (!fields.pofFile && !fields.pofDuringScreening) ? "Attach POF or Select Screening" :
   !isCodeValid ? "Verify WhatsApp to Proceed" :
   !fields.scope ? "Select NDA Scope" : 
   !fields.investorType ? "Select Investor Type" :
   !fields.country ? "Select Country" :
   !fields.taxId ? "Enter Tax ID" :
   !fields.repName ? "Enter Representative Name" :
   !fields.passportFile ? "Upload Passport/ID" :
   !fields.ticketSize ? "Select Ticket Size" :
   !fields.sourceFunds ? "Enter Source of Funds" :
   !fields.thesis ? "Enter Investment Thesis" :
   "Generate NCND Agreement"}
</button>) }

{privateOrigin==='BR' &&(<button 
  onClick={() => setSubStep(3)}
  disabled={
    // Verifica se o nome existe (em qualquer uma das variáveis possíveis)
    (!fields.companyName && !fields.nome) || 
    // Verifica se tem POF ou se optou pelo Screening
    (!fields.pofFile && !fields.pofDuringScreening) || 
    // Verifica se o Zap foi validado
    !isCodeValid || 
    // Verifica se o escopo foi escolhido
    !fields.scope
  }
  className={`w-full py-6 font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl
    ${((!fields.companyName && !fields.nome) || (!fields.pofFile && !fields.pofDuringScreening) || !isCodeValid || !fields.scope) 
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
      : 'bg-[#2c5363] text-white hover:bg-[#bba219] active:scale-95'}
  `}
>
  {/* O texto do botão agora serve como um guia de erros em tempo real */}
  {(!fields.companyName && !fields.nome) ? "Enter Company Name" : 
   (!fields.pofFile && !fields.pofDuringScreening) ? "Attach POF or Select Screening" :
   !isCodeValid ? "Verify WhatsApp to Proceed" :
   !fields.scope ? "Select NDA Scope" : 
   "Generate NCND Agreement"}
</button>)}

  </div>
)}

{subStep === 3 && (
  <>
    {/* --- FLUXO NACIONAL (BR) --- */}
    {privateOrigin === 'BR' && (
  <div className="space-y-8 animate-fadeIn text-left text-[#2c5363]">
    <div className="mb-6 border-l-4 border-[#bba219] pl-4">
      <h3 className="text-xl font-black uppercase tracking-tighter">Qualificação do Investidor</h3>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ajuste o perfil para carregar as métricas de aporte</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
      {/* Perfil Principal */}
      <SelectLine 
        label="Qual seu perfil principal? *" 
        value={fields.perfil}
        onChange={(e) => setFields({...fields, perfil: e.target.value})}
        options={['Selecione...', 'Produtor Rural', 'Investidor Patrimonial', 'Representante Legal']} 
      />

      {/* Capacidade de Aporte */}
      <SelectLine 
        label="Capacidade de Aporte *" 
        value={fields.capacidadeAporte}
        onChange={(e) => setFields({...fields, capacidadeAporte: e.target.value})}
        options={['Selecione...', 'Recursos Próprios', 'Financiamento', 'Troca/Permuta']} 
      />
{fields.capacidadeAporte === 'Troca/Permuta' && (
        <div className="md:col-span-2">
          <InputLine 
            label="Natureza do ativo ofertado em permuta *" 
            placeholder="Descreva brevemente o ativo (Ex: Imóveis urbanos, frotas, outras áreas...)" 
            value={fields.descricaoPermuta}
            onChange={(e) => setFields({...fields, descricaoPermuta: e.target.value})}
          />
        </div>
      )}
      {/* CAMPOS CONDICIONAIS: SE PRODUTOR RURAL */}
      {fields.perfil === 'Produtor Rural' && (
        <>
          <InputLine 
            label="Quantos hectares planta atualmente? *" 
            placeholder="0.000 ha" 
            value={fields.hectares}
            onChange={(e) => setFields({...fields, hectares: e.target.value})}
          />
          <InputLine 
            label="Em quais estados atua? *" 
            placeholder="Ex: MT, GO, MG" 
            value={fields.estadosAtuacao}
            onChange={(e) => setFields({...fields, estadosAtuacao: e.target.value})}
          />
        </>
      )}

{fields.perfil === 'Representante Legal' && (
  <>
    {/* Registro do Profissional */}
    <InputLine 
      label="Número CRECI ou OAB *" 
      placeholder="Digite sua inscrição profissional" 
      value={fields.creciOab}
      onChange={(e) => setFields({...fields, creciOab: e.target.value})}
    />

    {/* Dados do Comprador Final (Separados) */}
    <InputLine 
      label="Nome do Cliente Representado *" 
      placeholder="Nome completo do comprador final" 
      value={fields.clienteRepresentadoNome}
      onChange={(e) => setFields({...fields, clienteRepresentadoNome: e.target.value})}
    />

    <InputLine 
      label="CPF / CNPJ do Cliente Representado *" 
      placeholder="000.000.000-00" 
      value={fields.clienteRepresentadoDoc}
      onChange={(e) => {
        // Aqui você pode aplicar a mesma lógica de máscara que usou no Step 1
        setFields({...fields, clienteRepresentadoDoc: e.target.value})
      }}
    />
  </>
)}

      {/* PEP */}
      <SelectLine 
        label="Você é uma Pessoa Exposta Politicamente (PEP)? *" 
        value={fields.pep}
        onChange={(e) => setFields({...fields, pep: e.target.value})}
        options={['Não', 'Sim']} 
      />
    </div>
{fields.capacidadeAporte === 'Recursos Próprios' && (
      <div className="mt-4 p-6 bg-gray-50 border border-gray-100 rounded-sm space-y-4">
        <label className="flex gap-4 cursor-pointer group">
          <div className="mt-1">
            <input 
              type="checkbox" 
              className="sr-only"
              checked={fields.declaracaoOrigem}
              onChange={(e) => setFields({...fields, declaracaoOrigem: e.target.checked})}
            />
            <div className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${fields.declaracaoOrigem ? 'bg-[#2c5363] border-[#2c5363]' : 'bg-white border-gray-300 group-hover:border-[#bba219]'}`}>
              {fields.declaracaoOrigem && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2c5363]">
              DECLARAÇÃO DE ORIGEM DE FUNDOS E COMPLIANCE COAF *
            </span>
            <p className="text-[10px] leading-relaxed font-medium text-gray-500 uppercase">
              Declaro ciência de que a Prylom opera sob rigorosas políticas de Prevenção à Lavagem de Dinheiro. 
              Compreendo que não são aceitos pagamentos em espécie e que a integralidade dos recursos utilizados 
              nas transações deve possuir origem lícita e rastreabilidade bancária comprovada, sujeita às 
              normativas do COAF e Banco Central.
            </p>
          </div>
        </label>
      </div>
    )}
    {fields.perfil === 'Investidor Patrimonial' && (
        <div className="md:col-span-2">
          <SelectLine 
            label="Tipo de Investidor Patrimonial *" 
            value={fields.tipoPatrimonial}
            onChange={(e) => setFields({...fields, tipoPatrimonial: e.target.value})}
            options={[
              'Selecione...', 
              'Family Office / Multi-Family Office', 
              'Holding Patrimonial / PJ', 
              'Fundo de Investimento (FII / FIP)', 
              'Pessoa Física (Diversificação de Portfólio)'
            ]} 
          />
        </div>
      )}
      {fields.capacidadeAporte === 'Financiamento' && (
        <>
          <SelectLine 
            label="Modalidade de Captação Prevista *" 
            value={fields.modalidadeCaptacao}
            onChange={(e) => setFields({...fields, modalidadeCaptacao: e.target.value})}
            options={[
              'Selecione...',
              'Mercado de Capitais (Emissão de CRI / CRA / Fiagro)',
              'Cédula de Produto Rural (CPR Financeira / Física)',
              'Crédito Rural Tradicional / Repasses (BNDES / FCO)'
            ]} 
          />
          <SelectLine 
            label="Status de Aprovação do Crédito *" 
            value={fields.statusCredito}
            onChange={(e) => setFields({...fields, statusCredito: e.target.value})}
            options={[
              'Selecione...',
              'Crédito Pré-Aprovado / Limite de Risco Liberado',
              'Em fase de estruturação / Análise de Comitê',
              'Necessito de assessoria para estruturação de capital'
            ]} 
          />
        </>
      )}

    {/* Lógica de Validação do Botão Step 2 */}
    <button 
      onClick={() => setSubStep(4)}
disabled={
        !fields.perfil || fields.perfil === 'Selecione...' || 
        !fields.capacidadeAporte || fields.capacidadeAporte === 'Selecione...' ||
        (fields.perfil === 'Produtor Rural' && (!fields.hectares || !fields.estadosAtuacao)) ||
        (fields.perfil === 'Investidor Patrimonial' && (!fields.tipoPatrimonial || fields.tipoPatrimonial === 'Selecione...')) ||
        (fields.perfil === 'Representante Legal' && (!fields.creciOab || !fields.clienteRepresentadoNome || !fields.clienteRepresentadoDoc)) ||
        (fields.capacidadeAporte === 'Financiamento' && (fields.modalidadeCaptacao === 'Selecione...' || !fields.modalidadeCaptacao || fields.statusCredito === 'Selecione...' || !fields.statusCredito)) ||
        (fields.capacidadeAporte === 'Troca/Permuta' && !fields.descricaoPermuta) ||
        (fields.capacidadeAporte === 'Recursos Próprios' && !fields.declaracaoOrigem)
      }
      className={`w-full py-5 font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-lg mt-8
        ${(!fields.perfil || fields.perfil === 'Selecione...') 
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
          : 'bg-[#2c5363] text-white hover:bg-[#bba219]'}
      `}
    >
      Próxima Etapa
    </button>
  </div>
)}

    {/* --- FLUXO INTERNACIONAL (INT) --- */}
    {privateOrigin === 'INT' && (<div> Finalizar</div>)}
  </>
)}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const DataRoomModal = ({ product, onBack }: any) => {
  const [step, setStep] = useState(1);
  const [origin, setOrigin] = useState<'BR' | 'INT' | 'PRIVATE' | null>(null);
  const [openMarketAccepted, setOpenMarketAccepted] = useState(false);
  const { id } = useParams<{ id: string }>();
  const [loadedProduct, setLoadedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  console.log(product)
  // Lógica de Ativo
const isOpenMarket = useMemo(() => {
  // Busca o valor na raiz ou dentro do objeto fazenda_data que injetamos acima
  const relevancia = product?.relevancia_anuncio || product?.fazenda_data?.relevancia_anuncio;
  const tipo = product?.tipo_anuncio || product?.fazenda_data?.tipo_anuncio;

  return relevancia === 'Open Market' || tipo === 'Open Market';
}, [product]);

  const getStepTitle = () => {
    if (origin === 'INT') return "Protocol for International Investors";
    if (origin === 'PRIVATE') return "Prylom Private Executive Protocol";
    return "Protocolo de Identificação do Investidor Nacional";
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // --- OPÇÃO A: Se estiver usando API Fetch padrão ---
        const response = await fetch(`https://sua-api.com/produtos/${id}`);
        if (!response.ok) throw new Error("Produto não encontrado");
        const data = await response.json();
        
        // --- OPÇÃO B: Se estiver usando Supabase ---
        /*
        const { data, error: sbError } = await supabase
          .from('fazendas')
          .select('*, fazenda_data(*)')
          .eq('id', id)
          .single();
        if (sbError) throw sbError;
        */

        setLoadedProduct(data);
      } catch (err: any) {
        console.error("Erro ao carregar produto:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

const [subStep, setSubStep] = useState(1); // Novo estado no pai

const handleBack = () => {
  if (step === 3 && subStep > 1) {
    // Se estiver no formulário e não for a primeira sub-etapa, volta o sub-passo
    setSubStep(subStep - 1);
  } else if (step > 1) {
    // Se for sub-passo 1 ou estiver na tela de escolha, volta o step principal
    setStep(step - 1);
    setSubStep(1); // Reseta para garantir
  } else {
    // Se estiver na tela 1, sai de tudo
    onBack();
  }
};

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col animate-fadeIn overflow-y-auto font-['Montserrat'] text-[#2c5363]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;900&display=swap');`}</style>
      
      {/* HEADER */}
      <nav className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <button onClick={handleBack} className="group flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#2c5363] hover:text-[#bba219] transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          {step === 1 ? "Voltar ao Ativo" : "Anterior"}
        </button>
        <div className="text-right">
          <span className="block text-[10px] font-medium text-gray-400 uppercase tracking-widest">Data Room Seguro</span>
          <span className="text-sm font-black tracking-tighter">{product?.codigo || "PRY-OFF MARKET"}</span>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-4 lg:p-16">
        <div className="bg-white w-full max-w-5xl rounded-xl shadow-[0_20px_50px_rgba(44,83,99,0.1)] border border-gray-100 overflow-hidden">
          
      {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 animate-fadeIn">
              {/* Coluna Principal: Conteúdo e Ação */}
              <div className="lg:col-span-8 p-10 lg:p-16 space-y-10 bg-white">
                <div className="space-y-6">
                  <div className="h-1.5 w-24 bg-[#bba219]"></div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none text-slate-900">
                    PROTOCOLO DE ACESSO AO <br/>
                    <span className="text-[#bba219]">DATA ROOM TÉCNICO</span>
                  </h2>
                  
                  <div className="space-y-4">
                    <p className="text-lg font-semibold text-slate-700">
                      Este é um ambiente sigiloso de dados parametrizados. Para acessar os relatórios preliminares, é necessária identificação completa.
                    </p>
                    
                    <div className="bg-gray-50 p-6 rounded-sm border-l-4 border-[#2c5363]">
                       <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <li className="flex gap-2"><strong>1.</strong> Compliance Ambiental</li>
                        <li className="flex gap-2"><strong>2.</strong> Raio-X do Solo</li>
                        <li className="flex gap-2"><strong>3.</strong> Hidrografia e Clima</li>
                        <li className="flex gap-2"><strong>4.</strong> Histórico PRODES</li>
                      </ul>
                    </div>
                  </div>

{isOpenMarket && (
  <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl space-y-4 animate-slideDown">
    <div className="flex items-center gap-2 text-amber-700">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span className="text-[11px] font-black uppercase tracking-widest">
        Atenção: Ativo Open Market
      </span>
    </div>
    
    <label className="flex items-start gap-4 cursor-pointer group">
      <input 
        type="checkbox" 
        checked={openMarketAccepted}
        onChange={(e) => setOpenMarketAccepted(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-amber-700 cursor-pointer"
      />
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-black text-amber-900 uppercase tracking-tighter">
          CIÊNCIA DE ATIVO OPEN MARKET
        </span>
        <span className="text-[10px] font-bold text-amber-900/80 leading-relaxed uppercase">
          Estou ciente de que este imóvel se encontra na modalidade de Mercado Aberto (Open Market) 
          e os dados iniciais possuem natureza declaratória. Compreendo que a consolidação do 
          Data Room Técnico e a liberação dos relatórios preliminares dependem da colaboração 
          e do envio de documentos por parte do proprietário ou originador parceiro, podendo 
          o prazo de entrega ser estendido.
        </span>
      </div>
    </label>
  </div>
)}
                </div>

                <button 
                  disabled={isOpenMarket && !openMarketAccepted}
                  onClick={() => setStep(2)} 
                  className={`w-full lg:w-max px-10 py-6 rounded-sm font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-xl 
                    ${(isOpenMarket && !openMarketAccepted) 
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                      : 'bg-[#2c5363] text-white hover:bg-[#bba219] hover:-translate-y-1'}`}
                >
                  {isOpenMarket && !openMarketAccepted ? "Aceite o termo para continuar" : "Entendi e quero iniciar credenciamento"}
                </button>
              </div>

              {/* Coluna Lateral */}
              <div className="lg:col-span-4 bg-[#2c5363] p-12 flex flex-col justify-center items-center text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rotate-45"></div>
                <p className="italic text-lg font-light opacity-90 leading-relaxed z-10 uppercase tracking-tighter">
                  "Segurança de dados e conformidade jurídica Prylom."
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-10 lg:p-20 space-y-12 animate-fadeIn">
              <div className="text-center space-y-4">
                <h3 className="text-3xl font-black uppercase tracking-tighter">Tipo de Investidor</h3>
                <p className="text-gray-400 text-[11px] font-bold uppercase tracking-[0.2em]">Selecione o seu perfil de investidor e a modalidade de Atendimento</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{/* Botão Nacional */}
<button 
  onClick={() => { setOrigin('BR'); setStep(3); }} 
  className="group p-8 border border-gray-200 hover:border-[#bba219] transition-all flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-gray-50 shadow-sm rounded-lg hover:shadow-xl min-w-[200px] min-h-[220px]"
>
  <div className="relative group-hover:scale-110 transition-transform duration-300">
    <img 
      src="https://flagcdn.com/w80/br.png" 
      alt="BR" 
      className="w-14 h-auto object-contain drop-shadow-md" 
    />
  </div>
  <span className="font-black text-[11px] uppercase tracking-[0.15em] text-gray-700 text-center">
    Nacional
  </span>
</button>

{/* Botão Internacional */}
<button 
  onClick={() => { setOrigin('INT'); setStep(3); }} 
  className="group p-8 border border-gray-200 hover:border-[#bba219] transition-all flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-white to-gray-50 shadow-sm rounded-lg hover:shadow-xl min-w-[200px] min-h-[220px]"
>
  <div className="text-gray-400 group-hover:text-[#bba219] group-hover:scale-110 transition-all duration-300">
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="36" 
      height="36" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  </div>
  <span className="font-black text-[11px] uppercase tracking-[0.15em] text-gray-700 text-center">
    International
  </span>
</button>


<button 
  onClick={() => { setOrigin('PRIVATE'); setStep(3); }} 
  className="group p-8 bg-black border border-black hover:border-[#bba219] transition-all flex flex-col items-center gap-4 shadow-2xl rounded-lg min-w-[240px]"
>
  {/* Área de Logos Superiores */}
  <div className="flex flex-col items-center gap-3">
    
    {/* Ícones Superiores (Bandeira BR e Globo SVG) */}
    <div className="flex items-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
      {/* Bandeira do Brasil via FlagCDN (Consistência com seu outro botão) */}
      <img 
        src="https://flagcdn.com/w80/br.png" 
        alt="Brasil" 
        className="w-5 h-auto object-contain rounded-[1px]" 
      />
      
      {/* Globo Mundi em SVG (Substituindo o Lucide para evitar erro) */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="18" 
        height="18" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#bba219" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    </div>

    {/* Logo Principal Prylom (Aumentada) */}
    <div className="relative group-hover:scale-105 transition-transform duration-300">
<img 
  src={logoPrylom} // Sem aspas, usando a variável importada
  alt="Prylom Logo" 
  className="h-16 w-auto object-contain..."
/>
    </div>
  </div>

  <div className="flex flex-col items-center gap-1">
    {/* Texto Selected */}
    <span className="font-black text-[12px] uppercase tracking-[0.2em] text-[#bba219]">
      Selected
    </span>
    
    {/* Subtexto Informativo */}
<span className="text-[10px] font-bold text-[#bba219] uppercase tracking-wider text-center max-w-[150px] leading-tight mt-1 animate-bounce duration-1000" 
      style={{ textShadow: '0 0 8px rgba(186, 162, 25, 0.5)' }}>
  Mandato Exclusivo de <br /> Aquisição (Buy-Side)
</span>
  </div>
</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 lg:p-16 space-y-10 animate-fadeIn">
              {/* O conteúdo dinâmico dos protocolos aqui */}
              <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tighter">{getStepTitle()}</h3>
                <span className="text-[9px] font-black uppercase text-gray-300 tracking-widest">v2.6 SECURE</span>
              </div>
              {origin === 'BR' && (
      <NationalProtocol 
        product={loadedProduct} 
        onComplete={() => {}} 
        onBack={onBack}
        subStep={subStep}        // Passa o valor
        setSubStep={setSubStep}  // Passa a função de controle
      />
    )}
              {origin === 'INT' && <InternationalProtocol         product={loadedProduct} 
        onComplete={() => {}} 
        onBack={onBack}
        subStep={subStep}        // Passa o valor
        setSubStep={setSubStep}  // Passa a função de controle
      />}
              {origin === 'PRIVATE' && <PrivateProtocol          product={loadedProduct} 
        onComplete={() => {}} 
        onBack={onBack}
        subStep={subStep}        // Passa o valor
        setSubStep={setSubStep}  // Passa a função de controle
      />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DataRoomModal;