import { useState, useEffect } from 'react';
import { fetchWeather } from '../../services/weatherService';

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getWeather = async () => {
      const city = localStorage.getItem('weatherCity');
      const apiKey = localStorage.getItem('weatherApiKey');

      if (!city || !apiKey) {
        setLoading(false);
        return;
      }

      const data = await fetchWeather(city, apiKey);
      setWeather(data);
      setLoading(false);
    };

    getWeather();

    // Refresh weather every 10 minutes
    const interval = setInterval(getWeather, 10 * 60 * 1000);

    // Listen for settings changes
    const handleStorageChange = () => getWeather();
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (loading) return null;
  
  if (!weather) return null;

  return (
    <div className="flex items-center gap-3 text-text-secondary text-sm">
      <span className="text-text-primary font-medium">{weather.temp}°F</span>
      <span>•</span>
      <span>H:{weather.high}° L:{weather.low}°</span>
      <span>•</span>
      <span>{weather.condition}</span>
    </div>
  );
};

export default WeatherWidget;
