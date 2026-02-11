
import React, { useMemo } from 'react';
import { AppCurrency } from '../types';

interface Product {
  id: string;
  valor: number | null;
  status: string;
  estado: string;
  tipo_transacao: 'venda' | 'arrendamento';
  categoria: string;
  fazendas?: {
    area_total_ha: number | string;
  }[];
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

  const stats = useMemo(() => {
    const total = assets.length;
    if (total === 0) return null;

    const available = assets.filter(a => a.status === 'ativo');
    const sold = assets.filter(a => a.status === 'vendido');
    
    const totalAUM = available.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
    const commPotential = totalAUM * 0.0225;
    const avgAsset = available.length > 0 ? totalAUM / available.length : 0;
    
    const saleCount = assets.filter(a => a.tipo_transacao === 'venda').length;
    const leaseCount = assets.filter(a => a.tipo_transacao === 'arrendamento').length;

    // Gestão de Hectares (Vindo da tabela fazendas)
 const totalHa = assets
  .filter(a => a.categoria === 'fazendas' && a.status === 'ativo')
  .reduce((acc, curr) => {
    if (!Array.isArray(curr.fazendas)) return acc;
    return acc + curr.fazendas.reduce(
      (sum, f) => sum + Number(f.area_total_ha || 0),
      0
    );
  }, 0);


    const farmValue = assets.filter(a => a.categoria === 'fazendas' && a.status === 'ativo')
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

console.log(
  assets.map(a => ({
    id: a.id,
    fazendas: a.fazendas
  }))
);



  if (!stats) return <div className="p-20 text-center text-gray-400 font-black uppercase tracking-widest">Aguardando sincronização de dados...</div>;

  return (
    <div className="animate-fadeIn space-y-12 pb-20">
      <header>
        <span className="text-prylom-gold text-[10px] font-black uppercase tracking-[0.4em] mb-2 block">Módulo Estratégico</span>
        <h2 className="text-5xl font-black text-[#000080] tracking-tighter uppercase mb-2">Administração de Ativos</h2>
        <p className="text-gray-400 text-sm font-medium">Terminal de Inteligência de Capital e Performance de Portfólio</p>
      </header>

      {/* KPI GRID FINANCEIRO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Capital Gerido (AUM)</p>
          <p className="text-2xl font-black text-[#000080] leading-none mb-2">{formatPrice(stats.totalAUM)}</p>
          <span className="text-[8px] font-bold text-green-500 uppercase">Patrimônio Ativo</span>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-prylom-gold/30 shadow-xl bg-gradient-to-br from-white to-prylom-gold/5">
          <p className="text-[9px] font-black text-prylom-gold uppercase tracking-widest mb-1">Potencial Comissão (2,25%)</p>
          <p className="text-2xl font-black text-prylom-gold leading-none mb-2">{formatPrice(stats.commPotential)}</p>
          <span className="text-[8px] font-bold text-prylom-gold/60 uppercase">Receita Bruta Projetada</span>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ticket Médio / Ativo</p>
          <p className="text-2xl font-black text-[#000080] leading-none mb-2">{formatPrice(stats.avgAsset)}</p>
          <span className="text-[8px] font-bold text-gray-400 uppercase">Avaliação Média</span>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Comissão Média / Un</p>
          <p className="text-2xl font-black text-prylom-dark leading-none mb-2">{formatPrice(stats.avgComm)}</p>
          <span className="text-[8px] font-bold text-gray-400 uppercase">Por Fechamento</span>
        </div>
      </div>

      {/* INVENTÁRIO E SOLO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-gray-50 flex flex-col justify-between">
          <h4 className="text-[11px] font-black text-[#000080] uppercase tracking-widest mb-8">Saúde do Inventário</h4>
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-green-600 uppercase">Disponíveis: {stats.countAvailable}</span>
                <span className="text-xl font-black text-prylom-dark">{stats.percAvailable.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${stats.percAvailable}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase">Vendidos: {stats.countSold}</span>
                <span className="text-xl font-black text-gray-400">{stats.percSold.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-300" style={{ width: `${stats.percSold}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#000080] text-white p-10 rounded-[4rem] shadow-2xl flex flex-col justify-between overflow-hidden relative">
          <h4 className="text-[11px] font-black text-prylom-gold uppercase tracking-widest mb-6 relative z-10">Diligência de Solo</h4>
          <div className="relative z-10">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Hectares Totais sob Gestão</p>
            <p className="text-5xl font-black text-prylom-gold tracking-tighter mb-8">{stats.totalHa.toLocaleString()} <span className="text-sm opacity-50 uppercase">ha</span></p>
            <div className="pt-8 border-t border-white/10">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Preço Médio por Hectare</p>
              <p className="text-2xl font-black text-white">{formatPrice(stats.avgPriceHa)}</p>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-prylom-gold/10 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-gray-50">
          <h4 className="text-[11px] font-black text-[#000080] uppercase tracking-widest mb-8">Market Share Regional</h4>
          <div className="space-y-6">
            {stats.topStates.map((st) => (
              <div key={st.region} className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                  <span className="text-prylom-dark">{st.region}</span>
                  <span className="text-prylom-gold">{st.percent.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-prylom-gold transition-all duration-1000" style={{ width: `${st.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODALIDADES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[4rem] border border-gray-100 flex items-center gap-10 shadow-sm">
          <div className="w-24 h-24 rounded-full border-[10px] border-prylom-dark flex items-center justify-center text-xl font-black text-prylom-dark">
            {Math.round((stats.saleCount / stats.total) * 100)}%
          </div>
          <div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Modalidade Venda</h4>
            <p className="text-3xl font-black text-[#000080]">{stats.saleCount} <span className="text-sm opacity-40 uppercase">Ativos</span></p>
          </div>
        </div>
        <div className="bg-white p-10 rounded-[4rem] border border-gray-100 flex items-center gap-10 shadow-sm">
          <div className="w-24 h-24 rounded-full border-[10px] border-prylom-gold flex items-center justify-center text-xl font-black text-prylom-gold">
            {Math.round((stats.leaseCount / stats.total) * 100)}%
          </div>
          <div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Modalidade Arrendamento</h4>
            <p className="text-3xl font-black text-[#000080]">{stats.leaseCount} <span className="text-sm opacity-40 uppercase">Ativos</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetCRM;
