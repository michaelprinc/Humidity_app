import React, { useState, useEffect, useCallback } from 'react';
import { Home, Sun, Wind, BarChart3, Thermometer } from 'lucide-react';
import { InvokeLLM } from './integrations/WeatherAPICore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Button } from './components/ui/button';

import ClimateDisplayCard from './components/ClimateDisplayCard';
import ComparisonResult from './components/ComparisonResult';
import LocationPermission from './components/LocationPermission';
import VentilationForecast from './components/VentilationForecast';
import TemperatureForecast from './components/TemperatureForecast';
import TuyaSensor from './components/TuyaSensor';

export default function HumidityHub() {
  const [indoorTemp, setIndoorTemp] = useState(21);
  const [indoorHumidity, setIndoorHumidity] = useState(55);
  const [indoorTempSource, setIndoorTempSource] = useState('manual'); // Track source of indoor data
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'forecast', or 'temperature'
  
  // Shared forecast data for both forecast tabs
  const [forecastData, setForecastData] = useState(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  // Handle indoor temperature updates from the TuyaSensor component
  const handleIndoorTemperatureChange = useCallback((tempData) => {
    console.log('🏠 Indoor temperature updated:', tempData);
    setIndoorTemp(tempData.temperature);
    setIndoorHumidity(tempData.humidity || 55); // Default humidity if not provided
    setIndoorTempSource(tempData.source);
  }, []);

  // Dew Point Calculation
  const calculateDewPoint = (T, RH) => {
    if (T === null || RH === null) return null;
    const A = 17.27;
    const B = 237.7;
    const alpha = Math.log(RH / 100) + (A * T) / (B + T);
    return (B * alpha) / (A - alpha);
  };

  const indoorDewPoint = calculateDewPoint(indoorTemp, indoorHumidity);
  const outdoorDewPoint = weatherData ? calculateDewPoint(weatherData.temperature, weatherData.humidity) : null;
  
  // Debug outdoor weather data
  console.log('🎯 Weather data state:', weatherData);
  console.log('🎯 Outdoor dew point:', outdoorDewPoint);
  
  const indoorData = {
    temperature: indoorTemp,
    humidity: indoorHumidity,
    dewPoint: indoorDewPoint,
  };

  const outdoorData = weatherData ? {
    temperature: weatherData.temperature,
    humidity: weatherData.humidity,
    dewPoint: outdoorDewPoint,
  } : null;
  
  console.log('🎯 Outdoor data object:', outdoorData);

  const requestLocation = useCallback(() => {
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setLocationError(error.message);
          setIsLoadingWeather(false);
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      setIsLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (location) {
      const fetchWeather = async () => {
        setIsLoadingWeather(true);
        try {
          console.log('🌤️ Fetching current weather from forecast data for:', location);
          
          // Use the same forecast data source to ensure consistency
          const prompt = `Get 24-hour hourly weather forecast for latitude ${location.latitude} and longitude ${location.longitude}. Include current conditions and temperature and humidity for each hour.`;
          const result = await InvokeLLM({
            prompt,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                current: {
                  type: "object",
                  properties: {
                    temperature: { type: "number", description: "Temperature in Celsius" },
                    humidity: { type: "number", description: "Relative humidity in percent" },
                    condition: { type: "string", description: "Weather condition" },
                    wind_kph: { type: "number", description: "Wind speed in km/h" },
                    pressure_mb: { type: "number", description: "Pressure in mb" },
                    uv: { type: "number", description: "UV index" }
                  },
                  required: ["temperature", "humidity"]
                },
                hourly: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time: { type: "string", description: "ISO datetime string" },
                      temperature: { type: "number", description: "Temperature in Celsius" },
                      humidity: { type: "number", description: "Relative humidity in percent" },
                      condition: { type: "string", description: "Weather condition" }
                    },
                    required: ["time", "temperature", "humidity"]
                  }
                }
              },
              required: ["current"]
            },
          });
          
          console.log('🌤️ Forecast weather result for current analysis:', result);
          console.log('🌤️ Type of result:', typeof result, Array.isArray(result));
          
          // Extract current weather from forecast data to ensure consistency
          let weatherData = null;
          if (result && result.current) {
            weatherData = result.current;
            console.log('🌤️ Using current weather from forecast endpoint');
          } else if (result && result.hourly && result.hourly.length > 0) {
            // Fallback: use first hour of forecast as current
            const firstHour = result.hourly[0];
            weatherData = {
              temperature: firstHour.temperature,
              humidity: firstHour.humidity,
              condition: firstHour.condition || 'Partly cloudy',
              wind_kph: 0, // Default values for missing data
              pressure_mb: 1013,
              uv: 0
            };
            console.log('🌤️ Using first forecast hour as current weather');
          }
          
          console.log('🌤️ Processed current weather data:', weatherData);
          setWeatherData(weatherData);
        } catch (error) {
          console.error("❌ Failed to fetch weather data:", error);
          setWeatherData(null);
        } finally {
          setIsLoadingWeather(false);
        }
      };
      fetchWeather();
    }
  }, [location]);

  // Shared forecast data fetcher for both forecast tabs
  // Note: Current Analysis tab also uses forecast endpoint for data consistency
  const fetchForecastData = useCallback(async () => {
    if (!location) return;
    
    setIsForecastLoading(true);
    setForecastError(null);
    
    try {
      const prompt = `Get 24-hour hourly weather forecast for latitude ${location.latitude} and longitude ${location.longitude}. Include temperature and humidity for each hour.`;
      const result = await InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            current: {
              type: "object",
              properties: {
                temperature: { type: "number" },
                humidity: { type: "number" },
                condition: { type: "string" }
              }
            },
            hourly: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  time: { type: "string", description: "ISO datetime string" },
                  temperature: { type: "number", description: "Temperature in Celsius" },
                  humidity: { type: "number", description: "Relative humidity in percent" },
                  condition: { type: "string", description: "Weather condition" }
                },
                required: ["time", "temperature", "humidity"]
              }
            }
          },
          required: ["hourly"]
        }
      });
      
      setForecastData(result);
    } catch (err) {
      setForecastError("Failed to fetch forecast data");
      console.error("Forecast error:", err);
    } finally {
      setIsForecastLoading(false);
    }
  }, [location]);

  // Auto-fetch forecast data when location changes and we're on a forecast tab
  useEffect(() => {
    if (location && (activeTab === 'forecast' || activeTab === 'temperature')) {
      fetchForecastData();
    }
  }, [location, activeTab, fetchForecastData]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">Humidity Hub</h1>
        <p className="text-slate-500">Analyze indoor & outdoor humidity levels and ventilation opportunities.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-slate-100 p-1 rounded-lg">
          <Button
            variant={activeTab === 'current' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('current')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Current Analysis
          </Button>
          <Button
            variant={activeTab === 'forecast' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('forecast')}
            className="flex items-center gap-2"
          >
            <Wind className="h-4 w-4" />
            Ventilation Forecast
          </Button>
          <Button
            variant={activeTab === 'temperature' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('temperature')}
            className="flex items-center gap-2"
          >
            <Thermometer className="h-4 w-4" />
            24-Hour Forecast
          </Button>
        </div>
      </div>

      {activeTab === 'current' && (
        <>
        <TuyaSensor onTemperatureChange={handleIndoorTemperatureChange} />
          
          <div className="grid grid-cols-1 gap-6">
            <ClimateDisplayCard title="Indoor Climate" icon={<Home className="h-5 w-5 text-slate-600" />} data={indoorData} isLoading={false} />
            
            {locationError ? (
              <LocationPermission onAllow={requestLocation} />
            ) : (
              <ClimateDisplayCard title="Outdoor Climate" icon={<Sun className="h-5 w-5 text-slate-600" />} data={outdoorData} isLoading={isLoadingWeather} />
            )}
          </div>

          <ComparisonResult indoorDewPoint={indoorDewPoint} outdoorDewPoint={outdoorDewPoint} />
        </>
      )}

      {activeTab === 'forecast' && (
        <>
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700">
                <Home className="h-5 w-5" />
                Indoor Reference
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full ml-auto">
                  {indoorTempSource === 'google_nest' ? 'Google Nest' : 'Manual Entry'}
                </span>
              </CardTitle>
              <CardDescription>Current indoor conditions for ventilation analysis.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">{indoorTemp}°C</div>
                <div className="text-sm text-slate-500">Temperature</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">{indoorHumidity}%</div>
                <div className="text-sm text-slate-500">Humidity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">{indoorDewPoint?.toFixed(1)}°C</div>
                <div className="text-sm text-slate-500">Dew Point</div>
              </div>
            </CardContent>
          </Card>

          {locationError ? (
            <LocationPermission onAllow={requestLocation} />
          ) : (
            <VentilationForecast 
              location={location} 
              indoorDewPoint={indoorDewPoint}
              forecastData={forecastData}
              isLoading={isForecastLoading}
              error={forecastError}
              onRefresh={fetchForecastData}
            />
          )}
        </>
      )}

      {activeTab === 'temperature' && (
        <>
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700">
                <Home className="h-5 w-5" />
                Indoor Reference
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full ml-auto">
                  {indoorTempSource === 'google_nest' ? 'Google Nest' : 'Manual Entry'}
                </span>
              </CardTitle>
              <CardDescription>Current indoor conditions for comparison with outdoor forecast.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">{indoorTemp}°C</div>
                <div className="text-sm text-slate-500">Temperature</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">{indoorHumidity}%</div>
                <div className="text-sm text-slate-500">Humidity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">{indoorDewPoint?.toFixed(1)}°C</div>
                <div className="text-sm text-slate-500">Dew Point</div>
              </div>
            </CardContent>
          </Card>

          {locationError ? (
            <LocationPermission onAllow={requestLocation} />
          ) : (
            <TemperatureForecast 
              location={location}
              forecastData={forecastData}
              isLoading={isForecastLoading}
              error={forecastError}
              onRefresh={fetchForecastData}
            />
          )}
        </>
      )}
    </div>
  );
}
