import React from 'react';
import { CROP_DATA } from '../data/cropData';

interface CropScore {
  crop: string;
  score: number;
}

interface CropsCardProps {
  cropScores: CropScore[];
}

const CropsCard: React.FC<CropsCardProps> = ({ cropScores }) => {
  const topCrops = cropScores.sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Recommended Crops</h2>
        <i className="fas fa-leaf card-icon"></i>
      </div>
      
      <div>
        {topCrops.map((cropScore) => {
          const cropInfo = CROP_DATA[cropScore.crop];
          if (!cropInfo) return null;

          return (
            <div key={cropScore.crop} className="crop-recommendation">
              <i className="fas fa-seedling crop-icon"></i>
              <div className="crop-info">
                <h4>{cropScore.crop}</h4>
                <p>
                  Ideal temp: {cropInfo.idealTemp.min}°C - {cropInfo.idealTemp.max}°C | 
                  Rainfall: {cropInfo.idealRainfall.min}-{cropInfo.idealRainfall.max}mm/year |
                  Season: {cropInfo.season.join(', ')}
                </p>
                <small>Suitability score: {cropScore.score}/7</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CropsCard;