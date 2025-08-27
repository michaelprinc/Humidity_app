// Enhanced implementation supporting both current weather and forecast data
// In production, this would use a real weather API like OpenWeatherMap

export async function InvokeLLM({ prompt, add_context_from_internet, response_json_schema }) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Mock weather data based on location (extracted from prompt)
  const latMatch = prompt.match(/latitude ([-\d.]+)/);
  const lonMatch = prompt.match(/longitude ([-\d.]+)/);
  
  if (!latMatch || !lonMatch) {
    throw new Error("Unable to parse location from prompt");
  }
  
  const lat = parseFloat(latMatch[1]);
  const lon = parseFloat(lonMatch[1]);
  
  // Check if this is a forecast request
  const isForecastRequest = prompt.includes('forecast') || prompt.includes('hourly');
  
  if (isForecastRequest) {
    return generateForecastData(lat, lon);
  } else {
    return generateCurrentWeather(lat, lon);
  }
}

function generateCurrentWeather(lat, lon) {
  // Generate realistic mock data based on coordinates
  const baseTemp = 15 + Math.sin(lat * Math.PI / 180) * 10;
  const humidity = 40 + Math.random() * 40; // 40-80%
  const temperature = baseTemp + (Math.random() - 0.5) * 10;
  
  return {
    temperature: Math.round(temperature * 10) / 10,
    humidity: Math.round(humidity)
  };
}

function generateForecastData(lat, lon) {
  const baseTemp = 15 + Math.sin(lat * Math.PI / 180) * 10;
  const now = new Date();
  
  const generateDayForecast = (dayOffset = 0) => {
    const hours = [];
    const startHour = dayOffset === 0 ? now.getHours() : 0;
    const endHour = dayOffset === 0 ? 24 : 24;
    
    for (let hour = startHour; hour < endHour; hour++) {
      // Create temperature variation throughout the day
      const timeOfDay = hour / 24;
      const tempVariation = Math.sin(timeOfDay * 2 * Math.PI - Math.PI/2) * 8; // ±8°C variation
      const dailyVariation = (Math.random() - 0.5) * 4; // ±2°C random variation
      const seasonalVariation = Math.sin((dayOffset + 1) * Math.PI / 365) * 3; // seasonal trend
      
      const temperature = baseTemp + tempVariation + dailyVariation + seasonalVariation;
      
      // Humidity typically inversely related to temperature with some randomness
      const baseHumidity = 80 - (temperature - baseTemp) * 2;
      const humidity = Math.max(20, Math.min(95, baseHumidity + (Math.random() - 0.5) * 20));
      
      hours.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        temperature: Math.round(temperature * 10) / 10,
        humidity: Math.round(humidity)
      });
    }
    
    return hours;
  };
  
  return {
    today: generateDayForecast(0),
    tomorrow: generateDayForecast(1),
    dayAfter: generateDayForecast(2)
  };
}

// Real-world implementation would look like this:
/*
export async function InvokeLLM({ prompt, add_context_from_internet, response_json_schema }) {
  const latMatch = prompt.match(/latitude ([-\d.]+)/);
  const lonMatch = prompt.match(/longitude ([-\d.]+)/);
  
  if (!latMatch || !lonMatch) {
    throw new Error("Unable to parse location from prompt");
  }
  
  const lat = parseFloat(latMatch[1]);
  const lon = parseFloat(lonMatch[1]);
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  
  if (prompt.includes('forecast') || prompt.includes('hourly')) {
    // 5-day/3-hour forecast from OpenWeatherMap
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    const data = await response.json();
    
    // Process the forecast data according to response_json_schema
    return processForecastData(data);
  } else {
    // Current weather
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    const data = await response.json();
    
    return {
      temperature: data.main.temp,
      humidity: data.main.humidity
    };
  }
}
*/
