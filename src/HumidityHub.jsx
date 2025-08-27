import React, { useState, useEffect, useCallback } from 'react';
import { Home, Sun, Wind, BarChart3 } from 'lucide-react';
import { InvokeLLM } from '@/src/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';

import ClimateDisplayCard from './components/ClimateDisplayCard';
import ComparisonResult from './components/ComparisonResult';
import LocationPermission from './components/LocationPermission';
import VentilationForecast from './components/VentilationForecast';

export default function HumidityHub() {
  const [indoorTemp, setIndoorTemp] = useState(21);
  const [indoorHumidity, setIndoorHumidity] = useState(55);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [activeTab, setActiveTab] = useState('current'); // 'current' or 'forecast'

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
          const prompt = `Get the current weather for latitude ${location.latitude} and longitude ${location.longitude}.`;
          const result = await InvokeLLM({
            prompt,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                temperature: { type: "number", description: "Temperature in Celsius" },
                humidity: { type: "number", description: "Relative humidity in percent" },
              },
              required: ["temperature", "humidity"],
            },
          });
          setWeatherData(result);
        } catch (error) {
          console.error("Failed to fetch weather data:", error);
          setWeatherData(null);
        } finally {
          setIsLoadingWeather(false);
        }
      };
      fetchWeather();
    }
  }, [location]);

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
        </div>
      </div>

      {activeTab === 'current' && (
        <>
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700">
                <Home className="h-5 w-5" />
                Your Indoor Climate
              </CardTitle>
              <CardDescription>Set your current indoor conditions.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="indoor-temp">Temperature (°C)</Label>
                <Input
                  id="indoor-temp"
                  type="number"
                  value={indoorTemp}
                  onChange={(e) => setIndoorTemp(parseFloat(e.target.value) || 0)}
                  className="font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="indoor-humidity">Humidity (%)</Label>
                <Input
                  id="indoor-humidity"
                  type="number"
                  value={indoorHumidity}
                  onChange={(e) => setIndoorHumidity(parseFloat(e.target.value) || 0)}
                  className="font-medium"
                />
              </div>
            </CardContent>
          </Card>
          
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
            <VentilationForecast location={location} indoorDewPoint={indoorDewPoint} />
          )}
        </>
      )}
    </div>
  );
}
