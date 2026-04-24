import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractIbgeCode,
  parseNum,
  calcScore,
  gerarNumeroPDF,
  fetchMunicipio,
  fetchReservaLegal,
  fetchDesmatamentos,
  fetchVegetacaoNativa,
  gerarDadosRelatorio,
} from './smartFazendaReport';

// Funções de meio físico testadas via mocks de fetch — importadas indiretamente
// através dos testes de gerarDadosRelatorio

// ─── extractIbgeCode ─────────────────────────────────────────────────────────

describe('extractIbgeCode', () => {
  it('extrai o código de 7 dígitos de um CAR válido (formato compacto)', () => {
    expect(extractIbgeCode('GO-5217302-4F71D6BC240A40B2AC50DF516F5FDE79')).toBe('5217302');
  });

  it('extrai o código de diferentes estados', () => {
    expect(extractIbgeCode('SP-3550308-ABCDEF1234567890ABCDEF1234567890AB')).toBe('3550308');
    expect(extractIbgeCode('MT-5100250-ABCDEF1234567890ABCDEF1234567890AB')).toBe('5100250');
    expect(extractIbgeCode('PA-1501402-ABCDEF1234567890ABCDEF1234567890AB')).toBe('1501402');
  });

  it('retorna null para string sem hífen', () => {
    expect(extractIbgeCode('invalid')).toBeNull();
  });

  it('retorna null quando o código tem menos de 7 dígitos', () => {
    expect(extractIbgeCode('GO-12345-4F71D6BC240A40B2AC50DF516F5FDE79')).toBeNull();
  });

  it('retorna null quando o código tem mais de 7 dígitos', () => {
    expect(extractIbgeCode('GO-12345678-4F71D6BC240A40B2AC50DF516F5FDE79')).toBeNull();
  });

  it('retorna null para string vazia', () => {
    expect(extractIbgeCode('')).toBeNull();
  });

  it('ignora espaços no início/fim', () => {
    expect(extractIbgeCode('  GO-5217302-4F71D6BC240A40B2AC50DF516F5FDE79  ')).toBe('5217302');
  });
});

// ─── parseNum ────────────────────────────────────────────────────────────────

describe('parseNum', () => {
  it('converte número simples', () => {
    expect(parseNum('1000')).toBe(1000);
  });

  it('trata separador de milhar brasileiro (ponto)', () => {
    expect(parseNum('1.234.567')).toBe(1234567);
  });

  it('trata separador decimal brasileiro (vírgula)', () => {
    expect(parseNum('1.234,56')).toBe(1234.56);
  });

  it('retorna 0 para traço (dado não disponível IBGE)', () => {
    expect(parseNum('-')).toBe(0);
  });

  it('retorna 0 para reticências (dado não disponível IBGE)', () => {
    expect(parseNum('...')).toBe(0);
  });

  it('retorna 0 para string vazia', () => {
    expect(parseNum('')).toBe(0);
  });

  it('retorna 0 para "0"', () => {
    expect(parseNum('0')).toBe(0);
  });
});

// ─── gerarNumeroPDF ──────────────────────────────────────────────────────────

describe('gerarNumeroPDF', () => {
  it('gera código com prefixo válido', () => {
    const prefixosValidos = ['AA', 'AB', 'AC', 'BA', 'CA'];
    for (let i = 0; i < 20; i++) {
      const num = gerarNumeroPDF();
      const prefixo = num.slice(0, 2);
      expect(prefixosValidos).toContain(prefixo);
    }
  });

  it('gera código com 4 dígitos numéricos após o prefixo', () => {
    for (let i = 0; i < 20; i++) {
      const num = gerarNumeroPDF();
      const digitos = num.slice(2);
      expect(digitos).toMatch(/^\d{4}$/);
      expect(parseInt(digitos)).toBeGreaterThanOrEqual(1000);
      expect(parseInt(digitos)).toBeLessThanOrEqual(9999);
    }
  });
});

// ─── calcScore ───────────────────────────────────────────────────────────────

describe('calcScore', () => {
  describe('situação do CAR', () => {
    it('Ativo = 200 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: true, focos: 0 });
      expect(criterios[0].pontos).toBe(200);
    });

    it('Pendente = 100 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Pendente', embargosQtd: 0, sigefCertificado: true, focos: 0 });
      expect(criterios[0].pontos).toBe(100);
    });

    it('Suspenso = 30 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Suspenso', embargosQtd: 0, sigefCertificado: true, focos: 0 });
      expect(criterios[0].pontos).toBe(30);
    });

    it('Cancelado = 0 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Cancelado', embargosQtd: 0, sigefCertificado: true, focos: 0 });
      expect(criterios[0].pontos).toBe(0);
    });

    it('case-insensitive: "ATIVO" = 200 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'ATIVO', embargosQtd: 0, sigefCertificado: true, focos: 0 });
      expect(criterios[0].pontos).toBe(200);
    });
  });

  describe('embargos IBAMA', () => {
    it('0 embargos = 250 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null });
      expect(criterios[1].pontos).toBe(250);
    });

    it('1 embargo = 80 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 1, sigefCertificado: null, focos: null });
      expect(criterios[1].pontos).toBe(80);
    });

    it('2 embargos = 30 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 2, sigefCertificado: null, focos: null });
      expect(criterios[1].pontos).toBe(30);
    });

    it('3+ embargos = 0 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 3, sigefCertificado: null, focos: null });
      expect(criterios[1].pontos).toBe(0);
      const { criterios: c5 } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 5, sigefCertificado: null, focos: null });
      expect(c5[1].pontos).toBe(0);
    });
  });

  describe('SIGEF', () => {
    it('certificado = 200 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: true, focos: null });
      expect(criterios[2].pontos).toBe(200);
      expect(criterios[2].disponivel).toBe(true);
    });

    it('não certificado = 50 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: false, focos: null });
      expect(criterios[2].pontos).toBe(50);
    });

    it('null (não verificado) = 100 pts neutro', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null });
      expect(criterios[2].pontos).toBe(100);
      expect(criterios[2].disponivel).toBe(false);
    });
  });

  describe('focos de incêndio', () => {
    it('0 focos = 150 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: 0 });
      expect(criterios[3].pontos).toBe(150);
    });

    it('1-3 focos = 120 pts', () => {
      [1, 2, 3].forEach(f => {
        const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: f });
        expect(criterios[3].pontos).toBe(120);
      });
    });

    it('4-10 focos = 80 pts', () => {
      [4, 7, 10].forEach(f => {
        const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: f });
        expect(criterios[3].pontos).toBe(80);
      });
    });

    it('11-20 focos = 40 pts', () => {
      [11, 15, 20].forEach(f => {
        const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: f });
        expect(criterios[3].pontos).toBe(40);
      });
    });

    it('21+ focos = 0 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: 21 });
      expect(criterios[3].pontos).toBe(0);
    });

    it('null = 75 pts neutro', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null });
      expect(criterios[3].pontos).toBe(75);
      expect(criterios[3].disponivel).toBe(false);
    });
  });

  describe('critérios neutros fixos', () => {
    it('sobreposições socioambientais = 50 pts (neutro)', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null });
      expect(criterios[4].pontos).toBe(50);
      expect(criterios[4].disponivel).toBe(false);
    });

    it('passivo ambiental = 50 pts (neutro) quando desmatamento_ha não fornecido', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null });
      expect(criterios[5].pontos).toBe(50);
      expect(criterios[5].disponivel).toBe(false);
    });
  });

  describe('passivo ambiental / desmatamento com dados reais', () => {
    it('0 ha desmatado = 100 pts, disponivel true', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null, desmatamento_ha: 0, area_total: 500 });
      expect(criterios[5].pontos).toBe(100);
      expect(criterios[5].disponivel).toBe(true);
    });

    it('< 5% da área = 70 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null, desmatamento_ha: 20, area_total: 500 });
      expect(criterios[5].pontos).toBe(70);
      expect(criterios[5].disponivel).toBe(true);
    });

    it('5-20% da área = 30 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null, desmatamento_ha: 50, area_total: 500 });
      expect(criterios[5].pontos).toBe(30);
    });

    it('>= 20% da área = 0 pts', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null, desmatamento_ha: 100, area_total: 500 });
      expect(criterios[5].pontos).toBe(0);
    });

    it('desmatamento_ha null mantém neutro (50 pts)', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null, desmatamento_ha: null, area_total: 500 });
      expect(criterios[5].pontos).toBe(50);
      expect(criterios[5].disponivel).toBe(false);
    });
  });

  describe('total e classificação', () => {
    it('propriedade excelente: Ativo + sem embargos + certificado + sem focos = 850pts', () => {
      const { total, classificacao } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: true, focos: 0 });
      expect(total).toBe(200 + 250 + 200 + 150 + 50 + 50);
      expect(total).toBe(900);
      expect(classificacao).toBe('Excelente');
    });

    it('propriedade crítica: Cancelado + 3 embargos + não certificado + 21+ focos', () => {
      const { total, classificacao } = calcScore({ situacaoCar: 'Cancelado', embargosQtd: 5, sigefCertificado: false, focos: 50 });
      expect(total).toBe(0 + 0 + 50 + 0 + 50 + 50);
      expect(total).toBe(150);
      expect(classificacao).toBe('Crítico');
    });

    it('classificação Muito Bom entre 650-799', () => {
      const { total, classificacao } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 1, sigefCertificado: true, focos: 0 });
      expect(total).toBeGreaterThanOrEqual(650);
      expect(total).toBeLessThan(800);
      expect(classificacao).toBe('Muito Bom');
    });

    it('classificação Bom entre 500-649', () => {
      // Ativo=200 + 2 embargos=30 + certificado=200 + 4-10 focos=80 + neutros=100 → 610
      const { total, classificacao } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 2, sigefCertificado: true, focos: 7 });
      expect(total).toBeGreaterThanOrEqual(500);
      expect(total).toBeLessThan(650);
      expect(classificacao).toBe('Bom');
    });

    it('total nunca excede 1000', () => {
      const { total } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: true, focos: 0 });
      expect(total).toBeLessThanOrEqual(1000);
    });

    it('retorna sempre 6 critérios', () => {
      const { criterios } = calcScore({ situacaoCar: 'Ativo', embargosQtd: 0, sigefCertificado: null, focos: null });
      expect(criterios).toHaveLength(6);
    });
  });
});

// ─── fetchMunicipio ──────────────────────────────────────────────────────────

describe('fetchMunicipio', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retorna população e PIB quando ambas as APIs respondem', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { V: 'Valor' },
          { V: '250000', D3N: '2024' },
        ],
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { V: 'Valor' },
          { V: '1.500.000', D2C: '6575', D3N: '2021' },
          { V: '6.000', D2C: '513', D3N: '2021' },
        ],
      } as any);

    const result = await fetchMunicipio('5217302');
    expect(result.populacao).toBe(250000);
    expect(result.pib_mil_reais).toBe(1500000);
    expect(result.pib_per_capita).toBe(6000);
    expect(result.ano_populacao).toBe('2024');
    expect(result.ano_pib).toBe('2021');
  });

  it('retorna nulls quando a API de população falha', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce({ ok: false } as any)
      .mockResolvedValueOnce({ ok: false } as any);

    const result = await fetchMunicipio('9999999');
    expect(result.populacao).toBeNull();
    expect(result.pib_mil_reais).toBeNull();
    expect(result.pib_per_capita).toBeNull();
  });

  it('retorna nulls quando fetch lança exceção', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const result = await fetchMunicipio('5217302');
    expect(result.populacao).toBeNull();
    expect(result.pib_mil_reais).toBeNull();
  });

  it('ignora linha de cabeçalho (V === "Valor")', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ V: 'Valor', D3N: 'Ano' }],
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ V: 'Valor', D2C: '6575', D3N: 'Ano' }],
      } as any);

    const result = await fetchMunicipio('5217302');
    expect(result.populacao).toBeNull();
    expect(result.pib_mil_reais).toBeNull();
  });
});

// ─── fetchReservaLegal ───────────────────────────────────────────────────────

describe('fetchReservaLegal', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('soma áreas de múltiplos polígonos de RL', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            { properties: { num_area: '10.5' } },
            { properties: { num_area: '5.2500' } },
          ],
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [
            { properties: { num_area: '3.0' } },
          ],
        }),
      } as any);

    const result = await fetchReservaLegal('GO-5217302-4F71D6BC240A40B2AC50DF516F5FDE79');
    expect(result.area_rl_ha).toBeCloseTo(15.75, 2);
    expect(result.area_app_ha).toBeCloseTo(3.0, 2);
  });

  it('retorna null quando a API retorna lista vazia', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [] }) } as any);

    const result = await fetchReservaLegal('GO-5217302-4F71D6BC240A40B2AC50DF516F5FDE79');
    expect(result.area_rl_ha).toBeNull();
    expect(result.area_app_ha).toBeNull();
  });

  it('retorna nulls quando a API responde com erro HTTP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as any));
    const result = await fetchReservaLegal('GO-5217302-4F71D6BC240A40B2AC50DF516F5FDE79');
    expect(result.area_rl_ha).toBeNull();
    expect(result.area_app_ha).toBeNull();
  });

  it('retorna nulls quando fetch lança exceção', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    const result = await fetchReservaLegal('GO-5217302-4F71D6BC240A40B2AC50DF516F5FDE79');
    expect(result.area_rl_ha).toBeNull();
    expect(result.area_app_ha).toBeNull();
  });

  it('usa campo alternativo "area" quando "num_area" não existe', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          features: [{ properties: { area: '20.0' } }],
        }),
      } as any)
      .mockResolvedValueOnce({ ok: false } as any);

    const result = await fetchReservaLegal('GO-5217302-4F71D6BC240A40B2AC50DF516F5FDE79');
    expect(result.area_rl_ha).toBeCloseTo(20.0, 1);
  });
});

// ─── fetchDesmatamentos ───────────────────────────────────────────────────────

describe('fetchDesmatamentos', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('soma áreas de múltiplos polígonos de desmatamento', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          { properties: { num_area: '12.5', dat_referencia: '2023-01-01' } },
          { properties: { num_area: '7.25', dat_referencia: '2022-06-15' } },
        ],
      }),
    } as any);
    const result = await fetchDesmatamentos('GO-5217302-XXXX');
    expect(result?.total_ha).toBeCloseTo(19.75, 2);
    expect(result?.qty).toBe(2);
    expect(result?.ano_mais_recente).toBe('2023-01-01');
  });

  it('retorna total_ha=0 e qty=0 quando não há polígonos', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    } as any);
    const result = await fetchDesmatamentos('GO-5217302-XXXX');
    expect(result?.total_ha).toBe(0);
    expect(result?.qty).toBe(0);
  });

  it('retorna null quando API responde com erro HTTP', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as any);
    const result = await fetchDesmatamentos('GO-5217302-XXXX');
    expect(result).toBeNull();
  });

  it('retorna null quando fetch lança exceção', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('timeout'));
    const result = await fetchDesmatamentos('GO-5217302-XXXX');
    expect(result).toBeNull();
  });

  it('usa campo alternativo "des_area" quando "num_area" não existe', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ properties: { des_area: '30.0' } }],
      }),
    } as any);
    const result = await fetchDesmatamentos('GO-5217302-XXXX');
    expect(result?.total_ha).toBeCloseTo(30.0, 1);
  });
});

// ─── fetchVegetacaoNativa ─────────────────────────────────────────────────────

describe('fetchVegetacaoNativa', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('soma áreas de múltiplos polígonos de vegetação', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          { properties: { num_area: '80.0' } },
          { properties: { num_area: '40.5' } },
        ],
      }),
    } as any);
    const result = await fetchVegetacaoNativa('GO-5217302-XXXX');
    expect(result?.area_ha).toBeCloseTo(120.5, 1);
  });

  it('retorna null quando não há polígonos', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    } as any);
    const result = await fetchVegetacaoNativa('GO-5217302-XXXX');
    expect(result).toBeNull();
  });

  it('retorna null quando API responde com erro HTTP', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as any);
    const result = await fetchVegetacaoNativa('GO-5217302-XXXX');
    expect(result).toBeNull();
  });

  it('retorna null quando fetch lança exceção', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network'));
    const result = await fetchVegetacaoNativa('GO-5217302-XXXX');
    expect(result).toBeNull();
  });
});

// ─── gerarDadosRelatorio — integração ────────────────────────────────────────

describe('gerarDadosRelatorio', () => {
  const propertyResult = {
    car: {
      codigo: 'GO-5217302-4F71D6BC240A40B2AC50DF516F5FDE79',
      nomeImovel: 'Fazenda Teste',
      areaTotal: 500,
      municipio: 'Rio Verde',
      estado: 'GO',
      situacao: 'Ativo',
    },
    sigef: {
      numeroCCIR: '123456',
      situacaoCertificacao: 'Certificado',
      areaCertificada: 498,
    },
    embargos: [],
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => [],
    } as any));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lança erro quando não há dados de CAR', async () => {
    await expect(
      gerarDadosRelatorio({ embargos: [] }, { email: 'test@test.com' }),
    ).rejects.toThrow('Dados do CAR não disponíveis');
  });

  it('retorna estrutura completa mesmo quando todas as APIs externas falham', async () => {
    const data = await gerarDadosRelatorio(propertyResult, { email: 'user@prylom.com' });

    expect(data.car.codigo).toBe('GO-5217302-4F71D6BC240A40B2AC50DF516F5FDE79');
    expect(data.car.municipio).toBe('Rio Verde');
    expect(data.usuarioEmail).toBe('user@prylom.com');
    expect(data.usuarioNome).toBe('user');
    expect(data.score.total).toBeGreaterThan(0);
    expect(data.score.criterios).toHaveLength(6);
    expect(data.embargos).toHaveLength(0);
    expect(data.numeroPDF).toBeTruthy();
    expect(data.dataEmissao).toBeTruthy();
  });

  it('calcula score com SIGEF certificado e sem embargos', async () => {
    const data = await gerarDadosRelatorio(propertyResult, { email: 'test@test.com' });
    const criterioSigef = data.score.criterios.find(c => c.nome.includes('SIGEF'));
    expect(criterioSigef?.pontos).toBe(200);
    const criterioEmb = data.score.criterios.find(c => c.nome.includes('Embargo'));
    expect(criterioEmb?.pontos).toBe(250);
  });

  it('inclui campos de reservaLegal, municipioData, desmatamento, vegetacaoNativa e meioFisico na estrutura', async () => {
    const data = await gerarDadosRelatorio(propertyResult, { email: 'test@test.com' });
    expect(data).toHaveProperty('reservaLegal');
    expect(data).toHaveProperty('municipioData');
    expect(data).toHaveProperty('desmatamento');
    expect(data).toHaveProperty('vegetacaoNativa');
    expect(data).toHaveProperty('meioFisico');
  });

  it('meioFisico é null quando coordenadas nao sao obtidas (fetch falha)', async () => {
    const data = await gerarDadosRelatorio(propertyResult, { email: 'test@test.com' });
    // Com fetch mockado sempre retornando ok:false, coords = null → meioFisico = null
    expect(data.meioFisico).toBeNull();
  });

  it('numero PDF tem formato correto', async () => {
    const data = await gerarDadosRelatorio(propertyResult, { email: 'test@test.com' });
    expect(data.numeroPDF).toMatch(/^(AA|AB|AC|BA|CA)\d{4}$/);
  });
});
