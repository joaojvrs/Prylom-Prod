import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { InputLine, SelectLine, validarCPF, useWhatsAppValidation, API_CNPJ, API_IP } from './shared';

const NationalProtocol = ({
  product,
  onComplete,
  onBack,
  subStep,
  setSubStep
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
    email: '',
    telefone: '',
    perfil: '',
    capacidadeAporte: '',
    hectares: '',
    estadosAtuacao: '',
    pep: 'Não',
    creciOab: '',
    scope: null as string | null,
    descricaoPermuta: '',
    tipoPatrimonial: '',
    modalidadeCaptacao: '',
    statusCredito: '',
    clienteRepresentadoNome: '',
    clienteRepresentadoDoc: '',
    declaracaoOrigem: false
  });

  const [docStatus, setDocStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaHash] = useState(() => `AUTH_${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`);

  const { smsSent, smsCode, setSmsCode, isVerifying, setIsVerifying, isCodeValid, codeError, handleSendCode } = useWhatsAppValidation({
    phone: fields.telefone,
    nome: fields.nome,
    projeto: "Prylom Data Room",
    errorMessage: "Código incorreto ou expirado.",
  });

  // Validação CPF/CNPJ com debounce — evita fetch a cada keystroke
  useEffect(() => {
    const soNumeros = fields.doc.replace(/\D/g, "");

    if (soNumeros.length === 11) {
      setDocStatus(validarCPF(soNumeros) ? 'valid' : 'invalid');
      return;
    }

    if (soNumeros.length !== 14) {
      setDocStatus('idle');
      return;
    }

    setDocStatus('validating');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(API_CNPJ(soNumeros));
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.razao_social) {
          setFields(prev => ({ ...prev, nome: data.razao_social }));
          setDocStatus('valid');
        } else {
          setDocStatus('invalid');
        }
      } catch {
        setDocStatus('invalid');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [fields.doc]);

  const isOpenMarket = useMemo(() => {
    const relevancia = product?.relevancia_anuncio || product?.fazenda_data?.relevancia_anuncio;
    const tipo = product?.tipo_anuncio || product?.fazenda_data?.tipo_anuncio;
    return relevancia === 'Open Market' || tipo === 'Open Market';
  }, [product]);

  const isStep1Valid = useMemo(() => {
    return (
      fields.doc?.length >= 11 &&
      docStatus === 'valid' &&
      fields.nome?.trim().length > 5 &&
      fields.email?.includes('@') &&
      isCodeValid &&
      fields.scope !== undefined &&
      fields.scope !== null
    );
  }, [fields, docStatus, isCodeValid]);

  const handleNext = () => {
    if (isStep1Valid) {
      setSubStep(2);
    }
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    else value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    setFields({ ...fields, doc: value });
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (!v.startsWith("55")) v = "55" + v;
    v = v.slice(0, 13);
    v = v.replace(/^(\d{2})(\d{2})(\d)/g, "$1 ($2) $3");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    setFields({ ...fields, telefone: v });
  };

  const handleSubmit = async () => {
    setIsVerifying(true);
    try {
      let ipAddress = '';
      try {
        const ipRes = await fetch(API_IP);
        const ipData = await ipRes.json();
        ipAddress = ipData.ip || '';
      } catch { /* ignora falha de IP */ }

      const detalhesFinanceiros = {
        modalidadeCaptacao: fields.modalidadeCaptacao || null,
        statusCredito: fields.statusCredito || null,
        descricaoPermuta: fields.descricaoPermuta || null,
        tipoPatrimonial: fields.tipoPatrimonial || null,
      };

      const { error } = await supabase
        .from('protocols_national')
        .insert([{
          nome: fields.nome,
          documento: fields.doc.replace(/\D/g, ""),
          email: fields.email,
          telefone: fields.telefone.replace(/\D/g, ""),
          is_whatsapp_validated: isCodeValid,
          is_private: fields.scope === 'FULL_PORTFOLIO',
          perfil: fields.perfil,
          capacidade_aporte: fields.capacidadeAporte,
          hectares_atuais: fields.hectares,
          estados_atuacao: fields.estadosAtuacao,
          creci_oab: fields.creciOab,
          cliente_representado_nome: fields.clienteRepresentadoNome,
          cliente_representado_doc: fields.clienteRepresentadoDoc?.replace(/\D/g, ""),
          is_pep: fields.pep === 'Sim',
          detalhes_financeiros: detalhesFinanceiros,
          nda_scope: fields.scope,
          nda_accepted: ndaAccepted,
          declaracao_origem_aceite: fields.declaracaoOrigem || false,
          ip_address: ipAddress,
          hash_autenticacao: ndaHash,
          produto_origem_id: product?.id?.toString() || 'PORTFOLIO_GERAL'
        }]);

      if (error) throw error;

      setSubStep(4);

    } catch (error) {
      console.error("Erro ao salvar protocolo:", error);
      alert("Erro ao enviar dados. Por favor, tente novamente.");
    } finally {
      setIsVerifying(false);
    }
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

            <div className="space-y-4">
              <div className="relative">
                <InputLine
                  label="WhatsApp Celular"
                  placeholder="55 (00) 00000-0000"
                  value={fields.telefone}
                  onChange={handleTelefoneChange}
                />
                {!smsSent && fields.telefone.length >= 17 && (
                  <button
                    onClick={handleSendCode}
                    className="absolute right-0 bottom-2 text-[9px] font-black text-[#bba219] uppercase tracking-widest hover:underline"
                  >
                    {isVerifying ? "Enviando..." : "Validar via WhatsApp"}
                  </button>
                )}
              </div>

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

          <div className="pt-8 border-t border-gray-100 space-y-6">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2c5363]">
                Escopo do Acordo de Confidencialidade (NDA)
              </label>
              <p className="text-[9px] text-gray-400 uppercase font-medium">Selecione a abrangência deste documento</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
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

          <button
            onClick={handleNext}
            disabled={!isStep1Valid}
            className={`w-full py-5 font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-lg
              ${isStep1Valid
                ? 'bg-[#2c5363] text-white hover:bg-[#bba219] active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            Próxima Etapa: Perfil
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
            <SelectLine
              label="Qual seu perfil principal? *"
              value={fields.perfil}
              onChange={(e) => setFields({...fields, perfil: e.target.value})}
              options={['Selecione...', 'Produtor Rural', 'Investidor Patrimonial', 'Representante Legal']}
            />

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
                <InputLine
                  label="Número CRECI ou OAB *"
                  placeholder="Digite sua inscrição profissional"
                  value={fields.creciOab}
                  onChange={(e) => setFields({...fields, creciOab: e.target.value})}
                />
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
                  onChange={(e) => setFields({...fields, clienteRepresentadoDoc: e.target.value})}
                />
              </>
            )}

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

          <div className="bg-white p-8 md:p-12 border border-gray-200 shadow-inner rounded-sm relative overflow-hidden group">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
              <span className="text-[120px] font-black tracking-tighter uppercase italic">PRYLOM</span>
            </div>

            <div className="relative z-10 space-y-6 text-[11px] md:text-[12px] text-gray-600 leading-relaxed font-medium">
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
                  Este Acordo possui escopo a proteção de toda e qualquer Informação Confidencial referente ao portfólio de ativos reais, teses de propriedades rurais Off-Market apresentadas pela PRYLOM à PARTE RECEPTORA. Fica expressamente acordado que a ausência de um código ou identificação prévia de um ativo específico neste instrumento não invalida o sigilo, sendo que todo e qualquer ativo, Teaser, Data Room ou estudo de viabilidade compartilhado pela PRYLOM (seja via sistema, e-mail corporativo ou aplicativo de mensagens) passará, no ato do recebimento, a ser regido e protegido automaticamente pelas cláusulas de sigilo e penalidades deste contrato.
                </p>
              </div>

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

              <div className="pt-8 border-t border-gray-50 flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] uppercase font-black text-gray-400">IP DE REGISTRO E AUTENTICAÇÃO:</p>
                  <p className="text-[10px] font-mono text-gray-500">HASH_ID: {ndaHash} (Auditado via SSL)</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] uppercase font-black text-gray-400">DATA DO ACEITE DIGITAL:</p>
                  <p className="text-[10px] font-mono text-gray-500">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                </div>
              </div>
            </div>
          </div>

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

          <button
            onClick={handleSubmit}
            disabled={!ndaAccepted || isVerifying}
            className={`w-full py-6 rounded-sm font-black text-[12px] uppercase tracking-[0.4em] transition-all shadow-2xl flex items-center justify-center gap-3
              ${(ndaAccepted && !isVerifying)
                ? 'bg-[#2c5363] text-white hover:bg-[#bba219] hover:-translate-y-1'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            {isVerifying ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Processando...
              </>
            ) : "Assinar Digitalmente e Enviar"}
          </button>
        </div>
      )}

      {subStep === 4 && (
        <div className="py-20 px-6 text-center space-y-10 animate-fadeIn flex flex-col items-center justify-center min-h-[500px] bg-[#2c5363] text-white rounded-2xl relative overflow-hidden">
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
              onClick={onBack}
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

export default NationalProtocol;
