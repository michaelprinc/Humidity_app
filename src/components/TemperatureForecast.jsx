import React, { useState, useEffect } from 'react';
import { Thermometer, Droplets, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Skeleton } from './ui/skeleton';

export default function TemperatureForecast({ location, forecastData, isLoading, error, onRefresh }) {
  // Extract location name from forecast data if available
  const getLocationDisplayName = () => {
    if (forecastData?.location) {
      const { name, region, country } = forecastData.location;
      // Create a precise location string
      if (region && region !== name) {
        return `${name}, ${region}, ${country}`;
      }
      return `${name}, ${country}`;
    }
    return null;
  };

  const locationDisplayName = getLocationDisplayName();
  // Calculate dew point helper function
  const calculateDewPoint = (T, RH) => {
    if (T === null || RH === null) return null;
    const A = 17.27;
    const B = 237.7;
    const alpha = Math.log(RH / 100) + (A * T) / (B + T);
    return (B * alpha) / (A - alpha);
  };

  // Format time from ISO string to local time
  const formatTime = (timeString) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return timeString;
    }
  };

  // Get current hour for highlighting
  const getCurrentHour = () => {
    return new Date().getHours();
  };

  // Process hourly data for display
  const processHourlyData = (hourlyData) => {
    if (!hourlyData || !Array.isArray(hourlyData)) return [];
    
    return hourlyData.slice(0, 24).map((hour, index) => ({
      time: formatTime(hour.time),
      rawTime: hour.time,
      temperature: hour.temperature,
      humidity: hour.humidity,
      dewPoint: calculateDewPoint(hour.temperature, hour.humidity),
      condition: hour.condition || 'Unknown',
      isCurrentHour: index === 0, // First hour is typically current/next hour
      index
    }));
  };

  const hourlyData = forecastData?.hourly ? processHourlyData(forecastData.hourly) : [];

  // Statistics calculations
  const getStatistics = (data) => {
    if (!data || data.length === 0) return null;

    const temps = data.map(h => h.temperature).filter(t => t !== null);
    const humidities = data.map(h => h.humidity).filter(h => h !== null);
    const dewPoints = data.map(h => h.dewPoint).filter(dp => dp !== null);

    return {
      temperature: {
        min: Math.min(...temps),
        max: Math.max(...temps),
        avg: temps.reduce((a, b) => a + b, 0) / temps.length
      },
      humidity: {
        min: Math.min(...humidities),
        max: Math.max(...humidities),
        avg: humidities.reduce((a, b) => a + b, 0) / humidities.length
      },
      dewPoint: {
        min: Math.min(...dewPoints),
        max: Math.max(...dewPoints),
        avg: dewPoints.reduce((a, b) => a + b, 0) / dewPoints.length
      }
    };
  };

  const stats = getStatistics(hourlyData);

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700">
            <Thermometer className="h-5 w-5" />
            <div className="flex flex-col">
              <span>24-Hour Temperature & Humidity Forecast</span>
              {locationDisplayName && (
                <span className="text-sm font-normal text-slate-500 mt-1">
                  📍 {locationDisplayName}
                </span>
              )}
            </div>
          </CardTitle>
          <CardDescription>Loading detailed hourly predictions...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700">
            <Thermometer className="h-5 w-5" />
            <div className="flex flex-col">
              <span>24-Hour Temperature & Humidity Forecast</span>
              {locationDisplayName && (
                <span className="text-sm font-normal text-slate-500 mt-1">
                  📍 {locationDisplayName}
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-50 border-red-200 text-red-800 rounded-2xl">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={onRefresh} className="mt-4 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Forecast
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!forecastData || !hourlyData.length) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700">
            <Thermometer className="h-5 w-5" />
            <div className="flex flex-col">
              <span>24-Hour Temperature & Humidity Forecast</span>
              {locationDisplayName && (
                <span className="text-sm font-normal text-slate-500 mt-1">
                  📍 {locationDisplayName}
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800 rounded-2xl">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription>Unable to load forecast data. Please try refreshing.</AlertDescription>
          </Alert>
          <Button onClick={onRefresh} className="mt-4 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh Forecast
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Conditions & Stats */}
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              <div className="flex flex-col">
                <span>24-Hour Temperature & Humidity Forecast</span>
                {locationDisplayName && (
                  <span className="text-sm font-normal text-slate-500 mt-1">
                    📍 {locationDisplayName}
                  </span>
                )}
              </div>
            </div>
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Forecast
            </Button>
          </CardTitle>
          <CardDescription>
            Detailed hourly predictions with computed dew points
            {locationDisplayName && ` for ${locationDisplayName}`}
          </CardDescription>
        </CardHeader>
        
        {stats && (
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">{stats.temperature.min.toFixed(1)}° - {stats.temperature.max.toFixed(1)}°C</div>
                <div className="text-sm text-blue-600">Temperature Range</div>
                <div className="text-xs text-slate-500 mt-1">Avg: {stats.temperature.avg.toFixed(1)}°C</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{stats.humidity.min.toFixed(0)}% - {stats.humidity.max.toFixed(0)}%</div>
                <div className="text-sm text-green-600">Humidity Range</div>
                <div className="text-xs text-slate-500 mt-1">Avg: {stats.humidity.avg.toFixed(0)}%</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">{stats.dewPoint.min.toFixed(1)}° - {stats.dewPoint.max.toFixed(1)}°C</div>
                <div className="text-sm text-purple-600">Dew Point Range</div>
                <div className="text-xs text-slate-500 mt-1">Avg: {stats.dewPoint.avg.toFixed(1)}°C</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Hourly Forecast Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700">
            <TrendingUp className="h-5 w-5" />
            Hourly Breakdown
          </CardTitle>
          <CardDescription>Next 24 hours - Temperature, humidity, and dew point predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Time</th>
                  <th className="text-center py-3 px-2 font-medium text-slate-600">Temperature</th>
                  <th className="text-center py-3 px-2 font-medium text-slate-600">Humidity</th>
                  <th className="text-center py-3 px-2 font-medium text-slate-600">Dew Point</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Condition</th>
                </tr>
              </thead>
              <tbody>
                {hourlyData.map((hour, index) => (
                  <tr 
                    key={index} 
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      hour.isCurrentHour ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${hour.isCurrentHour ? 'text-blue-700' : 'text-slate-700'}`}>
                          {hour.time}
                        </span>
                        {hour.isCurrentHour && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                            Now
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="font-semibold text-slate-700">
                        {hour.temperature?.toFixed(1)}°C
                      </span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <Droplets className="h-3 w-3 text-blue-500" />
                        <span className="font-semibold text-slate-700">
                          {hour.humidity?.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="font-semibold text-purple-700">
                        {hour.dewPoint?.toFixed(1)}°C
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-slate-600 text-xs">
                        {hour.condition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
