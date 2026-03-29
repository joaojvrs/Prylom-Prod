
import React, { useMemo } from 'react';
import { AppCurrency } from '../types';

interface Product {
  id: string;
  valor: number | null;
  status: string;
  estado: string;
  tipo_transacao: 'venda' | 'arrendamento';
  categoria: string;
  fazendas?: any;
}


interface Props {
  assets: Product[];
  currency: AppCurrency;
}

const AssetCRM: React.FC<Props> = ({ assets, currency }) => {
  const rates = { BRL: 1, USD: 0.19, CNY: 1.42, RUB: 18.5 };

  const formatPrice = (val: number) => {
    const symbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '¥';
    const converted = val * (rates[currency as keyof typeof rates] || 1);
    return `${symbol} ${converted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getHa = (fazendas: any): number => {
    if (!fazendas) return 0;
    if (Array.isArray(fazendas)) {
      return fazendas.reduce((sum: number, f: any) => sum + (Number(f?.area_total_ha) || 0), 0);
    }
    return Number(fazendas.area_total_ha) || 0;
  };

  const stats = useMemo(() => {
    const total = assets.length;
    if (total === 0) return null;

    // DEBUG — remover após confirmar
    assets.filter(a => a.categoria === 'fazendas').forEach(a => {
      console.log('[AssetCRM] fazendas raw:', a.id, JSON.stringify(a.fazendas));
    });

    const available = assets.filter(a => a.status === 'ativo');
    const sold = assets.filter(a => a.status === 'vendido');

    const totalAUM = available.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
    const commPotential = totalAUM * 0.0225;
    const avgAsset = available.length > 0 ? totalAUM / available.length : 0;

    const saleCount = assets.filter(a => a.tipo_transacao === 'venda').length;
    const leaseCount = assets.filter(a => a.tipo_transacao === 'arrendamento').length;

    // Gestão de Hectares — suporta fazendas como objeto ou array
    const totalHa = assets
      .filter(a => a.categoria === 'fazendas' && a.status === 'ativo')
      .reduce((acc, curr) => acc + getHa(curr.fazendas), 0);

    const farmValue = assets
      .filter(a => a.categoria === 'fazendas' && a.status === 'ativo')
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

    const avgPriceHa = totalHa > 0 ? farmValue / totalHa : 0;

    // Market Share Regional
    const stateCounts: Record<string, number> = {};
    assets.forEach(a => { if (a.estado) stateCounts[a.estado] = (stateCounts[a.estado] || 0) + 1; });
    const topStates = Object.entries(stateCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([region, count]) => ({
        region,
        percent: (count / total) * 100,
        count
      })).slice(0, 5);

    return {
      totalAUM, commPotential, avgAsset, avgComm: avgAsset * 0.0225,
      countAvailable: available.length, countSold: sold.length,
      percAvailable: (available.length / total) * 100,
      percSold: (sold.length / total) * 100,
      saleCount, leaseCount, totalHa, avgPriceHa, topStates, total
    };
  }, [assets]);

  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#bba219] border-t-transparent animate-spin mx-auto mb-4"></div>
        <p className="text-[#2c5363]/50 font-black uppercase tracking-widest text-[10px]">Aguardando dados...</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-8 pb-20" style={{ fontFamily: "'Montserrat', sans-serif" }}>

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="text-[#bba219] text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">Módulo Estratégico</span>
          <h2 className="text-4xl font-black text-[#2c5363] tracking-tighter uppercase leading-none">Administração de Ativos</h2>
          <p className="text-[#2c5363]/50 text-xs font-semibold mt-1">Terminal de Inteligência de Capital e Performance de Portfólio</p>
        </div>
        <div className="bg-[#2c5363] rounded-2xl px-6 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#bba219] animate-pulse"></div>
          <span className="text-white text-[10px] font-black uppercase tracking-widest">{stats.total} ativos no portfólio</span>
        </div>
      </header>

      {/* KPI GRID FINANCEIRO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* AUM */}
        <div className="bg-[#2c5363] p-7 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/5 rounded-full"></div>
          <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Capital Gerido (AUM)</p>
          <p className="text-xl font-black text-white leading-none mb-2">{formatPrice(stats.totalAUM)}</p>
          <span className="text-[8px] font-bold text-[#bba219] uppercase">Patrimônio Ativo</span>
        </div>

        {/* COMISSÃO */}
        <div className="bg-[#bba219] p-7 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
          <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-1">Potencial Comissão (2,25%)</p>
          <p className="text-xl font-black text-white leading-none mb-2">{formatPrice(stats.commPotential)}</p>
          <span className="text-[8px] font-bold text-white/70 uppercase">Receita Bruta Projetada</span>
        </div>

        {/* TICKET MÉDIO */}
        <div className="bg-white p-7 rounded-3xl border border-[#2c5363]/10 shadow-sm">
          <p className="text-[9px] font-black text-[#2c5363]/40 uppercase tracking-widest mb-1">Ticket Médio / Ativo</p>
          <p className="text-xl font-black text-[#2c5363] leading-none mb-2">{formatPrice(stats.avgAsset)}</p>
          <span className="text-[8px] font-bold text-[#2c5363]/40 uppercase">Avaliação Média</span>
        </div>

        {/* COMISSÃO MÉDIA */}
        <div className="bg-white p-7 rounded-3xl border border-[#bba219]/20 shadow-sm">
          <p className="text-[9px] font-black text-[#2c5363]/40 uppercase tracking-widest mb-1">Comissão Média / Un</p>
          <p className="text-xl font-black text-[#bba219] leading-none mb-2">{formatPrice(stats.avgComm)}</p>
          <span className="text-[8px] font-bold text-[#2c5363]/40 uppercase">Por Fechamento</span>
        </div>
      </div>

      {/* INVENTÁRIO, DILIGÊNCIA DE SOLO E MARKET SHARE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* SAÚDE DO INVENTÁRIO */}
        <div className="bg-white p-8 rounded-3xl border border-[#2c5363]/10 shadow-sm flex flex-col justify-between">
          <h4 className="text-[11px] font-black text-[#2c5363] uppercase tracking-widest mb-6">Saúde do Inventário</h4>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-emerald-600 uppercase">Disponíveis: {stats.countAvailable}</span>
                <span className="text-lg font-black text-[#2c5363]">{stats.percAvailable.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-[#2c5363]/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${stats.percAvailable}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-[#2c5363]/40 uppercase">Vendidos: {stats.countSold}</span>
                <span className="text-lg font-black text-[#2c5363]/40">{stats.percSold.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-[#2c5363]/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#2c5363]/30 rounded-full" style={{ width: `${stats.percSold}%` }}></div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-[#2c5363]/10 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-[#2c5363]">{stats.saleCount}</p>
              <p className="text-[9px] font-black text-[#2c5363]/40 uppercase tracking-wide">Venda</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-[#bba219]">{stats.leaseCount}</p>
              <p className="text-[9px] font-black text-[#2c5363]/40 uppercase tracking-wide">Arrendamento</p>
            </div>
          </div>
        </div>

        {/* DILIGÊNCIA DE SOLO */}
        <div className="bg-[#2c5363] text-white p-8 rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -bottom-8 -right-8 w-36 h-36 bg-[#bba219]/15 rounded-full blur-2xl"></div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <h4 className="text-[11px] font-black text-[#bba219] uppercase tracking-widest mb-4 relative z-10">Diligência de Solo</h4>
          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Hectares Totais sob Gestão</p>
            <p className="text-5xl font-black text-[#bba219] tracking-tighter mb-1">
              {stats.totalHa.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-6">hectares</p>
            <div className="pt-6 border-t border-white/10">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Preço Médio por Hectare</p>
              <p className="text-2xl font-black text-white">{stats.avgPriceHa > 0 ? formatPrice(stats.avgPriceHa) : '---'}</p>
            </div>
          </div>
        </div>

        {/* MARKET SHARE REGIONAL */}
        <div className="bg-white p-8 rounded-3xl border border-[#2c5363]/10 shadow-sm">
          <h4 className="text-[11px] font-black text-[#2c5363] uppercase tracking-widest mb-6">Market Share Regional</h4>
          <div className="space-y-5">
            {stats.topStates.map((st, i) => (
              <div key={st.region} className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#2c5363]/10 flex items-center justify-center text-[8px] font-black text-[#2c5363]">{i + 1}</span>
                    <span className="text-[#2c5363]">{st.region}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#2c5363]/40">{st.count}</span>
                    <span className="text-[#bba219] font-black">{st.percent.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[#2c5363]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${st.percent}%`, background: i === 0 ? '#bba219' : '#2c5363' }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODALIDADES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-[#2c5363]/10 flex items-center gap-8 shadow-sm">
          <div className="w-20 h-20 rounded-full border-[6px] border-[#2c5363] flex items-center justify-center text-lg font-black text-[#2c5363] shrink-0">
            {stats.total > 0 ? Math.round((stats.saleCount / stats.total) * 100) : 0}%
          </div>
          <div>
            <p className="text-[10px] font-black text-[#2c5363]/40 uppercase tracking-widest mb-1">Modalidade Venda</p>
            <p className="text-3xl font-black text-[#2c5363]">{stats.saleCount} <span className="text-sm opacity-40 uppercase font-bold">Ativos</span></p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-[#bba219]/20 flex items-center gap-8 shadow-sm">
          <div className="w-20 h-20 rounded-full border-[6px] border-[#bba219] flex items-center justify-center text-lg font-black text-[#bba219] shrink-0">
            {stats.total > 0 ? Math.round((stats.leaseCount / stats.total) * 100) : 0}%
          </div>
          <div>
            <p className="text-[10px] font-black text-[#2c5363]/40 uppercase tracking-widest mb-1">Modalidade Arrendamento</p>
            <p className="text-3xl font-black text-[#2c5363]">{stats.leaseCount} <span className="text-sm opacity-40 uppercase font-bold">Ativos</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetCRM;
