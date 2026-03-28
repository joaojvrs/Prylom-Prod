
export enum AppView {
  LANDING = 'LANDING',
  OWNER_WIZARD = 'OWNER_WIZARD',
  BROKER_FLOW = 'BROKER_FLOW',
  SUCCESS = 'SUCCESS',
  TOOLS_HUB = 'TOOLS_HUB',
  SMART_MAP = 'SMART_MAP',
  VALUATION_CENTER = 'VALUATION_CENTER',
  MARKET_TERMINAL = 'MARKET_TERMINAL',
  SHOPPING_CENTER = 'SHOPPING_CENTER',
  PRODUCT_DETAILS = 'PRODUCT_DETAILS',
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  LEGAL_AGRO = 'LEGAL_AGRO'
}

export enum AppLanguage {
  PT = 'PT',
  EN = 'EN',
  ZH = 'ZH',
  RU = 'RU'
}

export enum AppCurrency {
  BRL = 'BRL',
  USD = 'USD',
  CNY = 'CNY',
  RUB = 'RUB'
}

export interface MarketNews {
  id: string;
  source: string;
  title: string;
  summary: string;
  category: 'CHICAGO' | 'USDA' | 'CHINA' | 'INPUTS' | 'CLIMATE';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timestamp: string;
  url?: string;
}

export interface BarterData {
  commodityPrice: number;
  inputPrice: number;
  ratio: number;
  historicalAvg: number;
}

export interface RegionalCostData {
  region: string;
  culture: string;
  totalCostHa: number;
  breakEvenYield: number;
}

export interface CalendarData {
  culture: string;
  region: string;
  plantingStart: string;
  plantingEnd: string;
  sanitaryBreakStart: string;
  sanitaryBreakEnd: string;
}

export interface AgroReportData {
  elevation: number;
  annualRainfall: number;
  avgTemp: number;
  frostRisk: 'low' | 'medium' | 'high';
  droughtRisk: 'low' | 'medium' | 'high';
  soilSuitability: string;
  historicalAnomalies: string[];
}

export interface OwnerFormData {
  location: { lat: number; lng: number } | null;
  areaType: string;
  sizeHectares: string;
  objective: string;
  name: string;
  whatsapp: string;
}

export interface BrokerFormData {
  name: string;
  creci: string;
  agency: string;
  region: string;
  partnershipType: string;
  acceptedTerms: boolean;
}
