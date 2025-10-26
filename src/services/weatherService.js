import axios from 'axios';

export const fetchWeather = async (city, apiKey) => {
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=imperial`
    );
    
    return {
      temp: Math.round(response.data.main.temp),
      high: Math.round(response.data.main.temp_max),
      low: Math.round(response.data.main.temp_min),
      condition: response.data.weather[0].main,
      description: response.data.weather[0].description,
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
};
