export interface CountyCropProduction {
  county: string;
  tonnes: number;
}

export interface CropProductionRecord {
  period: string;
  counties: CountyCropProduction[];
}

// Top three county production totals from the Ministry of Agriculture and
// Livestock Development, National Agriculture Production Report 2023-2024.
// Tea values are converted from kilograms to tonnes; coffee is reported by crop year.
export const TOP_CROP_PRODUCING_COUNTIES: Record<string, CropProductionRecord> = {
  Maize: {
    period: '2023',
    counties: [
      { county: 'Uasin Gishu', tonnes: 476538 },
      { county: 'Trans Nzoia', tonnes: 448011 },
      { county: 'Narok', tonnes: 314403 },
    ],
  },
  Wheat: {
    period: '2023',
    counties: [
      { county: 'Narok', tonnes: 130872 },
      { county: 'Nakuru', tonnes: 72252 },
      { county: 'Uasin Gishu', tonnes: 38798 },
    ],
  },
  Beans: {
    period: '2023',
    counties: [
      { county: 'Nakuru', tonnes: 99926 },
      { county: 'Meru', tonnes: 54244 },
      { county: 'Machakos', tonnes: 53826 },
    ],
  },
  Tea: {
    period: '2023',
    counties: [
      { county: 'Bomet', tonnes: 110665.892 },
      { county: 'Kericho', tonnes: 104846.091 },
      { county: 'Nandi', tonnes: 97681.32 },
    ],
  },
  Coffee: {
    period: '2022/23 crop year',
    counties: [
      { county: 'Kiambu', tonnes: 9460.3 },
      { county: 'Kirinyaga', tonnes: 8405.5 },
      { county: 'Nyeri', tonnes: 6315.7 },
    ],
  },
};
