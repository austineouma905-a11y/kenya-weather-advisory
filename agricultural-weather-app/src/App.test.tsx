import { render, screen } from '@testing-library/react';
import App from './App';
import { fetchForecastForCounty, fetchWeatherForCounty } from './services/WeatherService';

jest.mock('./services/WeatherService', () => ({
  fetchWeatherForCounty: jest.fn(),
  fetchForecastForCounty: jest.fn(),
}));

beforeEach(() => {
  (fetchWeatherForCounty as jest.Mock).mockResolvedValue({
    location: 'Nairobi', temp_c: 24, condition: 'Clear', humidity: 65,
    wind_kph: 12, precip_mm: 2, uv: 0, is_day: 1, icon_code: 1000,
  });
  (fetchForecastForCounty as jest.Mock).mockResolvedValue([
    { date: '2026-09-25', day: { maxtemp_c: 25, mintemp_c: 16, totalprecip_mm: 1, avgtemp_c: 20, condition: { code: 1000 } } },
  ]);
});

test('renders the agricultural weather dashboard', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Kenya Agricultural Weather Advisory' })).toBeInTheDocument();
  expect(screen.getByText(/Current Weather - Nairobi/i)).toBeInTheDocument();
});
