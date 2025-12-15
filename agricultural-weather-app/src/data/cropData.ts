import { CropData } from './types';

export const CROP_DATA: Record<string, CropData> = {
  'Maize': {
    idealTemp: { min: 18, max: 30 },
    idealRainfall: { min: 500, max: 1200 },
    soilMoisture: { min: 60, max: 80 },
    season: ['Long Rains', 'Short Rains']
  },
  'Beans': {
    idealTemp: { min: 15, max: 25 },
    idealRainfall: { min: 300, max: 600 },
    soilMoisture: { min: 65, max: 85 },
    season: ['Long Rains', 'Short Rains']
  },
  'Tea': {
    idealTemp: { min: 15, max: 25 },
    idealRainfall: { min: 1200, max: 2500 },
    soilMoisture: { min: 70, max: 90 },
    season: ['Year-round']
  },
  'Coffee': {
    idealTemp: { min: 15, max: 24 },
    idealRainfall: { min: 1000, max: 2000 },
    soilMoisture: { min: 65, max: 85 },
    season: ['Year-round']
  },
  'Wheat': {
    idealTemp: { min: 10, max: 25 },
    idealRainfall: { min: 300, max: 500 },
    soilMoisture: { min: 50, max: 75 },
    season: ['Main Season']
  }
};