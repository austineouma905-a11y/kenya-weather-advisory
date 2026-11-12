import React, { useState } from 'react';
import { County } from '../data/types';
import { kenyanCounties } from '../data/counties';

interface SidebarProps {
  selectedCounty: string;
  onCountySelect: (countyName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedCounty, onCountySelect }) => {
  const [countyQuery, setCountyQuery] = useState('');
  // Group counties by region
  const countiesByRegion = kenyanCounties.reduce((acc, county) => {
    if (!acc[county.region]) {
      acc[county.region] = [];
    }
    acc[county.region].push(county);
    return acc;
  }, {} as Record<string, County[]>);
  const normalizedQuery = countyQuery.trim().toLocaleLowerCase();
  const filteredRegions = Object.entries(countiesByRegion)
    .map(([region, counties]) => [
      region,
      counties.filter((county) => county.name.toLocaleLowerCase().includes(normalizedQuery)),
    ] as const)
    .filter(([, counties]) => counties.length > 0);

  const selectCounty = (countyName: string) => {
    onCountySelect(countyName);
    setCountyQuery('');
  };

  return (
    <aside className="sidebar">
      <div className="region-selector">
        <h3>Select County</h3>
        <label className="county-search-label" htmlFor="county-search">Search counties</label>
        <div className="county-search">
          <i className="fas fa-search" aria-hidden="true"></i>
          <input
            id="county-search"
            type="search"
            value={countyQuery}
            onChange={(event) => setCountyQuery(event.target.value)}
            placeholder="Type a county name"
            autoComplete="off"
          />
        </div>
        <ul className="region-list">
          {filteredRegions.length === 0 && (
            <li className="county-search-empty" role="status">No counties found.</li>
          )}
          {filteredRegions.map(([region, counties]) => (
            <React.Fragment key={region}>
              <li style={{ 
                backgroundColor: '#f0f0f0', 
                fontWeight: 'bold',
                cursor: 'default',
                color: '#555'
              }}>
                <i className="fas fa-map"></i> {region} Region
              </li>
              {counties.map((county) => (
                <li key={county.id}>
                  <button
                    type="button"
                    className={`county-option${selectedCounty === county.name ? ' active' : ''}`}
                    onClick={() => selectCounty(county.name)}
                    data-location={county.name}
                  >
                    <i className="fas fa-map-marker-alt" aria-hidden="true"></i> {county.name}
                  </button>
                </li>
              ))}
            </React.Fragment>
          ))}
        </ul>
      </div>
      
      <div className="county-info" style={{ marginTop: '2rem' }}>
        <h3>County Information</h3>
        {kenyanCounties
          .filter(county => county.name === selectedCounty)
          .map(county => (
            <div key={county.id} style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '1rem',
              borderRadius: 'var(--border-radius)',
              marginTop: '1rem'
            }}>
              <p><strong>Capital:</strong> {county.capital}</p>
              <p><strong>Population:</strong> {county.population.toLocaleString()}</p>
              <p><strong>Area:</strong> {county.area_sq_km.toLocaleString()} km²</p>
              <p><strong>Climate:</strong> {county.climate_zone}</p>
            </div>
          ))}
      </div>
    </aside>
  );
};

export default Sidebar;
