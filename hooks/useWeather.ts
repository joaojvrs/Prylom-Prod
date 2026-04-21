import { useState } from 'react';

export const useWeather = () => {
  const [weather, setWeather] = useState<any>(null);
  const [forecastDays, setForecastDays] = useState(7);

  const fetchWeather = async (cidade: string) => {
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`
      );
      const geoData = await geoRes.json();

      if (geoData.results && geoData.results.length > 0) {
        const { latitude, longitude } = geoData.results[0];
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`
        );
        if (!weatherRes.ok) throw new Error("Erro na API de Clima");
        const weatherData = await weatherRes.json();
        setWeather(weatherData);
      }
    } catch (error) {
      console.error("Erro ao carregar clima:", error);
    }
  };

  const getWeatherIcon = (code: number): string => {
    if (code === 0) return '☀️';
    if (code <= 3) return '🌤️';
    if (code <= 48) return '☁️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    if (code <= 99) return '⛈️';
    return '☁️';
  };

  return { weather, forecastDays, setForecastDays, fetchWeather, getWeatherIcon };
};
