import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { InputLine, SelectLine, useWhatsAppValidation, API_COUNTRIES } from './shared';

const InternationalProtocol = ({
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
    investorType: '',
    country: '',
    companyName: '',
    taxId: '',
    hasBrazilRep: 'No',
    isMajorityForeign: false,
    repName: '',
    hasMandate: false,
    repCapacity: '',
    directCompany: '',
    advisoryFirm: '',
    endBuyer: '',
    passport: '',
    passportFile: null as File | null,
    email: '',
    phone: '',
    ticketSize: '',
    sourceFunds: '',
    thesis: '',
    pep: 'No',
    scope: ''
  });

  const [countries, setCountries] = useState<string[]>(['United States', 'China', 'United Kingdom', 'United Arab Emirates', 'Saudi Arabia', 'Germany', 'Switzerland']);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaHash] = useState(() => `GLOBAL_ID_${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`);

  const { smsSent, smsCode, setSmsCode, isVerifying, setIsVerifying, isCodeValid, codeError, handleSendCode } = useWhatsAppValidation({
    phone: fields.phone,
    nome: fields.repName,
    projeto: "Prylom Global Desk",
    errorMessage: "Invalid or expired code.",
  });

  useEffect(() => {
    const restrictedCountries = ['Iran', 'North Korea', 'Syria', 'Cuba', 'Russia', 'Myanmar'];
    const fetchCountries = async () => {
      try {
        const res = await fetch(API_COUNTRIES);
        const data = await res.json();
        const countryList = data
          .map((c: any) => c.name.common)
          .filter((name: string) => !restrictedCountries.includes(name))
          .sort((a: string, b: string) => a.localeCompare(b));
        setCountries(countryList);
      } catch {
        console.error("Erro ao carregar países, usando lista padrão segura.");
      }
    };
    fetchCountries();
  }, []);

  const uploadPassport = async (file: File, fileName: string): Promise<string | null> => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const cleanFileName = fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, '_')
      .replace(/[^\w.-]/g, '');
    const filePath = `passports/${Date.now()}-${cleanFileName}.${fileExt}`;
    const { error } = await supabase.storage.from('kyc-documents').upload(filePath, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('kyc-documents').getPublicUrl(filePath);
    return publicUrl;
  };

  const handleSubmit = async () => {
    try {
      setIsVerifying(true);
      let passportUrl = "";
      if (fields.passportFile) {
        passportUrl = await uploadPassport(fields.passportFile, fields.repName) ?? '';
      }
      const submissionData = {
        investor_type: fields.investorType,
        country: fields.country,
        company_name: fields.companyName,
        tax_id: fields.taxId,
        has_brazil_rep: fields.hasBrazilRep,
        is_majority_foreign: fields.isMajorityForeign,
        rep_name: fields.repName,
        rep_email: fields.email,
        rep_phone: fields.phone,
        passport_url: passportUrl,
        is_whatsapp_valid: isCodeValid,
        ticket_size: fields.ticketSize,
        source_funds: fields.sourceFunds,
        investment_thesis: fields.thesis,
        is_pep: fields.pep,
        nda_scope: fields.scope,
        product_id: product?.id || 'GLOBAL_DESK',
        rep_details: {
          hasMandate: fields.hasMandate,
          repCapacity: fields.repCapacity,
          directCompany: fields.directCompany,
          advisoryFirm: fields.advisoryFirm,
          endBuyer: fields.endBuyer,
          acceptedAt: new Date().toISOString()
        }
      };
      const { error } = await supabase.from('protocols_international').insert([submissionData]);
      if (error) throw error;
      setSubStep(4);
      if (onComplete) onComplete();
    } catch (error) {
      console.error("Submission error:", error);
      alert("Error saving your accreditation. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-8 text-left">
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className={`h-1 flex-1 rounded-full transition-all duration-500 ${subStep >= num ? 'bg-[#bba219]' : 'bg-gray-100'}`} />
        ))}
      </div>

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
          <section className="space-y-6">
            <div className="border-l-4 border-[#bba219] pl-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 1: Entity & Jurisdiction</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Primary Buyer Legal Identification</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <SelectLine
                label="Investor Type *"
                options={['Select...', 'Family Office', 'Private Equity / Hedge Fund', 'Sovereign Wealth Fund', 'Corporate / Agribusiness Group', 'Individual High-Net-Worth']}
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

          <section className="space-y-6">
            <div className="border-l-4 border-[#2c5363] pl-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">Etapa 2: Contact & Representative</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Liaison and Identity Verification</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8 animate-fadeIn">
                <InputLine
                  label="Full Name of Representative *"
                  placeholder="Full Legal Name (As in Passport)"
                  value={fields.repName}
                  onChange={(e) => setFields({...fields, repName: e.target.value})}
                />
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
                {fields.hasMandate && (
                  <div className="space-y-6 pt-4 animate-slideDown">
                    <SelectLine
                      label="Representative Capacity *"
                      options={['Select...', 'Corporate Officer / Director', 'Authorized Signatory (Power of Attorney - POA)', 'External Broker / Advisor (Mandated)']}
                      value={fields.repCapacity}
                      onChange={(e) => setFields({...fields, repCapacity: e.target.value})}
                    />
                    {(fields.repCapacity === 'Corporate Officer / Director' || fields.repCapacity === 'Authorized Signatory (Power of Attorney - POA)') && (
                      <div className="animate-fadeIn">
                        <InputLine
                          label="Company / Fund You Directly Represent *"
                          placeholder="Ex: BlackRock Inc., Sovereign Wealth Fund"
                          value={fields.directCompany}
                          onChange={(e) => setFields({...fields, directCompany: e.target.value})}
                        />
                      </div>
                    )}
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
                <div className="absolute -top-3 left-0 w-full pointer-events-none">
                  <span className="text-[7px] font-black text-[#bba219] uppercase tracking-[0.2em] opacity-80 block whitespace-nowrap">
                    Encrypted upload • GDPR & LGPD Compliant
                  </span>
                </div>
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
                options={['Select...', 'Equity / Cash (Recursos Próprios à vista)', 'Bank Financing / Leverage (Financiamento Bancário)', 'Committed Capital', 'Sovereign Wealth (Fundo Soberano / State Funds)']}
                value={fields.sourceFunds}
                onChange={(e) => setFields({...fields, sourceFunds: e.target.value})}
              />
              <div className="space-y-8">
                <SelectLine
                  label="Investment Thesis *"
                  options={['Select...', 'Land Appreciation (Asset Wealth)', 'Production / Commodity Trading', 'Yield / Leaseback Strategy', 'Carbon Credits / Preservation']}
                  value={fields.thesis}
                  onChange={(e) => setFields({...fields, thesis: e.target.value})}
                />
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
                          <div className="absolute w-2.5 h-2.5 bg-[#2c5363] rounded-full scale-0 peer-checked:scale-100 transition-transform mx-auto inset-0 my-auto"></div>
                        </div>
                        <span className={`text-[11px] font-bold uppercase tracking-widest transition-colors ${fields.pep === option ? 'text-[#2c5363]' : 'text-gray-400 group-hover:text-[#bba219]'}`}>
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
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

                <section className="space-y-6 bg-gray-50/50 p-6 rounded-xl border border-dashed border-gray-200">
                  <div className="border-l-4 border-[#bba219] pl-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#2c5363]">NDA Scope & Coverage</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Define the legal reach of this confidentiality protocol</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
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
            disabled={!fields.investorType || !fields.country || !fields.companyName || !fields.taxId || !fields.repName || !fields.passportFile || !isCodeValid || !fields.ticketSize || !fields.sourceFunds || !fields.thesis || !fields.scope}
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
          <div className="flex justify-between items-end border-b border-gray-100 pb-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bba219]">NCND & Compliance Protocol</h4>
            <span className="text-[9px] font-bold text-gray-400">ID: {fields.passport || 'AUTHENTICATED'}</span>
          </div>

          <div className="bg-white p-8 md:p-12 border border-gray-200 shadow-inner rounded-sm relative overflow-hidden group">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
              <span className="text-[120px] font-black tracking-tighter uppercase italic">PRYLOM</span>
            </div>
            <div className="relative z-10 space-y-6 text-[11px] md:text-[12px] text-gray-600 leading-relaxed font-medium uppercase">
              <div className="p-4 bg-gray-50 border-l-2 border-[#bba219] space-y-4 mb-6">
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-[#2c5363] block mb-1 uppercase">Disclosing Party / Intermediary:</strong>
                  PRYLOM AGRONEGÓCIOS, a private legal entity, registered under CNPJ No. 45.685.251/0001-95, under technical supervision CRECI No. 16344 - MS, headquartered at R. Centenário, 470 - Vila Rosa Pires - Campo Grande - MS, Zip Code 79004-510, Brazil.
                </p>
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-[#2c5363] block mb-1 uppercase">Receiving Party / Signatory:</strong>
                  By this instrument, I, <span className="font-black underline">{fields.companyName || fields.repName || "[INSERT FULL NAME OR CORPORATE NAME OF CLIENT]"}</span>,
                  duly registered under <span className="font-black underline">{fields.taxId || fields.passport || "[INSERT PASSPORT, TAX ID OR REGISTRATION NO.]"}</span>,
                  acting in the capacity of <span className="font-black underline">{fields.repCapacity || fields.investorType || "[INSERT PROFILE TYPE: DIRECT INVESTOR / LEGAL REPRESENTATIVE]"}</span>
                  {fields.advisoryFirm ? ` (MANDATED BY ${fields.advisoryFirm})` : ""},
                  declare my formal, irrevocable, and unalterable acceptance of the confidentiality terms below, establishing this direct legal bond with PRYLOM regarding the curation and presentation of the asset(s). This Agreement is scoped to protect any and all Confidential Information regarding the portfolio of real assets and Off-Market rural property investment theses presented by PRYLOM to the RECEIVING PARTY.
                </p>
              </div>
              <div className="space-y-6 text-[12px] leading-relaxed text-justify">
                <p><strong className="text-[#2c5363] font-bold">1. NON-DISCLOSURE AND NON-CIRCUMVENTION (NCND):</strong> I formally commit to maintaining absolute secrecy regarding maps, registry documents, and any sensitive data that may expose the involved parties to strategic, commercial, financial, or personal risks. It is strictly forbidden to contact the property owners directly or indirectly, intervene, attempt to acquire, or structure deals involving the listed assets (and their bordering areas) without the express intermediation of PRYLOM. The breach, circumvention, or leakage of this information will result in an immediate contractual penalty equivalent to the full value of the intermediation and structuring commission stipulated for the property in question, without prejudice to the competent cumulative legal action for the reparation of property damages, loss of profits, and corporate moral damages.</p>
                <p><strong className="text-[#2c5363] font-bold">2. TERM AND JOINT LIABILITY:</strong> The obligations of this instrument are irrevocably valid for 36 (thirty-six) months from the date of acceptance. If acting as a Representative, Intermediary, or Broker, I assume full joint, several, and financial liability for any breaches of confidentiality or "by-pass" practices committed by my end-client.</p>
                <p><strong className="text-[#2c5363] font-bold">3. TRUTHFULNESS AND ANTI-FRAUD DECLARATION:</strong> I declare, under penalty of perjury and applicable laws, specifically under Article 299 of the Brazilian Penal Code (Ideological Falsehood / Misrepresentation), that all information, titles, and capacities provided in this accreditation are strictly true.</p>
                <p><strong className="text-[#2c5363] font-bold">4. COMPLIANCE, AML, AND DATA PROTECTION:</strong> I expressly authorize PRYLOM to cross-reference and consult the data entered in this platform with the responsible authorities and agencies (including credit protection agencies, international KYC/AML sanction lists, OFAC, UN, and courts of justice), as well as the processing of my data in strict compliance with the Brazilian General Data Protection Law (LGPD - Law 13.709/18) and the European General Data Protection Regulation (GDPR), for the exclusive purposes of prior business auditing and profile approval.</p>
              </div>
              <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Authentication Hash</p>
                  <p className="text-[10px] font-mono text-gray-500 uppercase">{ndaHash} / {fields.country || 'INTL'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Digital Acceptance Date</p>
                  <p className="text-[10px] font-mono text-gray-500">{new Date().toUTCString()}</p>
                </div>
              </div>
            </div>
          </div>

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
            onClick={handleSubmit}
            disabled={!ndaAccepted || isVerifying}
            className={`w-full py-6 font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-2xl flex items-center justify-center gap-3
              ${(ndaAccepted && !isVerifying)
                ? 'bg-[#2c5363] text-white hover:bg-black active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            {isVerifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing Signature...
              </>
            ) : "Digital Signature & Submit"}
          </button>
        </div>
      )}

      {subStep === 4 && (
        <div className="py-16 px-6 text-center space-y-8 bg-[#2c5363] text-white rounded-xl animate-fadeIn">
          <div className="w-20 h-20 border-2 border-[#bba219]/30 rounded-full flex items-center justify-center mx-auto relative">
            <div className="absolute inset-0 border-t-2 border-[#bba219] rounded-full animate-spin"></div>
            <span className="text-xs">KYC/AM</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black uppercase tracking-tighter">Under Compliance Review</h3>
            <p className="text-[9px] text-[#bba219] font-black uppercase tracking-[0.3em]">EXECUTING KYC & COMPLIANCE CLEARANCE...</p>
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

export default InternationalProtocol;
