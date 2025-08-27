import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wind, Clock, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/src/components/ui/alert';
import { Button } from '@/src/components/ui/button';
import { Skeleton } from '@/src/components/ui/skeleton';
import { InvokeLLM } from '@/src/integrations/Core';

export default function VentilationForecast({ location, indoorDewPoint }) {
  const [forecastData, setForecastData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Calculate dew point helper function
  const calculateDewPoint = (T, RH) => {
    if (T === null || RH === null) return null;
    const A = 17.27;
    const B = 237.7;
    const alpha = Math.log(RH / 100) + (A * T) / (B + T);
    return (B * alpha) / (A - alpha);
  };

  // Get day name from date
  const getDayName = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Find optimal ventilation periods
  const findOptimalPeriods = (hourlyData, targetDewPoint) => {
    if (!hourlyData || !targetDewPoint) return [];
    
    const optimalPeriods = [];
    let currentPeriod = null;

    hourlyData.forEach((hour, index) => {
      const dewPoint = calculateDewPoint(hour.temperature, hour.humidity);
      const isOptimal = dewPoint < (targetDewPoint - 1); // 1°C buffer for safety
      
      if (isOptimal && !currentPeriod) {
        // Start new period
        currentPeriod = {
          start: index,
          startTime: hour.time,
          startDewPoint: dewPoint,
          hours: [hour]
        };
      } else if (isOptimal && currentPeriod) {
        // Continue current period
        currentPeriod.hours.push(hour);
        currentPeriod.endTime = hour.time;
        currentPeriod.endDewPoint = dewPoint;
      } else if (!isOptimal && currentPeriod) {
        // End current period
        currentPeriod.end = index - 1;
        if (currentPeriod.hours.length >= 2) { // Minimum 2 hours for meaningful ventilation
          optimalPeriods.push(currentPeriod);
        }
        currentPeriod = null;
      }
    });

    // Handle case where period extends to end of forecast
    if (currentPeriod && currentPeriod.hours.length >= 2) {
      currentPeriod.end = hourlyData.length - 1;
      optimalPeriods.push(currentPeriod);
    }

    return optimalPeriods;
  };

  // Analyze forecast data
  const analyzeForecast = (data) => {
    if (!data || !indoorDewPoint) return null;

    const today = findOptimalPeriods(data.today, indoorDewPoint);
    const tomorrow = findOptimalPeriods(data.tomorrow, indoorDewPoint);
    const dayAfter = findOptimalPeriods(data.dayAfter, indoorDewPoint);

    return {
      today: {
        periods: today,
        hasOptimal: today.length > 0,
        date: new Date(),
        dayName: 'Today'
      },
      tomorrow: {
        periods: tomorrow,
        hasOptimal: tomorrow.length > 0,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        dayName: 'Tomorrow'
      },
      dayAfter: {
        periods: dayAfter,
        hasOptimal: dayAfter.length > 0,
        date: new Date(Date.now() + 48 * 60 * 60 * 1000),
        dayName: getDayName(new Date(Date.now() + 48 * 60 * 60 * 1000))
      }
    };
  };

  const fetchForecastData = async () => {
    if (!location || !indoorDewPoint) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const prompt = `Get 3-day hourly weather forecast for latitude ${location.latitude} and longitude ${location.longitude}. Include temperature and humidity for each hour.`;
      const result = await InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            today: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  time: { type: "string", description: "Hour in HH:mm format" },
                  temperature: { type: "number", description: "Temperature in Celsius" },
                  humidity: { type: "number", description: "Relative humidity in percent" }
                },
                required: ["time", "temperature", "humidity"]
              }
            },
            tomorrow: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  time: { type: "string", description: "Hour in HH:mm format" },
                  temperature: { type: "number", description: "Temperature in Celsius" },
                  humidity: { type: "number", description: "Relative humidity in percent" }
                },
                required: ["time", "temperature", "humidity"]
              }
            },
            dayAfter: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  time: { type: "string", description: "Hour in HH:mm format" },
                  temperature: { type: "number", description: "Temperature in Celsius" },
                  humidity: { type: "number", description: "Relative humidity in percent" }
                },
                required: ["time", "temperature", "humidity"]
              }
            }
          },
          required: ["today", "tomorrow", "dayAfter"]
        }
      });
      
      setForecastData(result);
    } catch (err) {
      setError("Failed to fetch forecast data");
      console.error("Forecast error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastData();
  }, [location, indoorDewPoint]);

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700">
            <Wind className="h-5 w-5" />
            Ventilation Forecast
          </CardTitle>
          <CardDescription>Analyzing optimal ventilation periods...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700">
            <Wind className="h-5 w-5" />
            Ventilation Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-50 border-red-200 text-red-800 rounded-2xl">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchForecastData} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const analysis = analyzeForecast(forecastData);
  
  if (!analysis) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardContent className="pt-6">
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 rounded-2xl">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription>Please set indoor conditions and enable location to get ventilation recommendations.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Find next suitable day
  const findNextSuitableDay = () => {
    if (analysis.today.hasOptimal) return null;
    if (analysis.tomorrow.hasOptimal) return analysis.tomorrow;
    if (analysis.dayAfter.hasOptimal) return analysis.dayAfter;
    return null;
  };

  const nextSuitableDay = findNextSuitableDay();
  const hasAnyOptimalPeriods = analysis.today.hasOptimal || analysis.tomorrow.hasOptimal || analysis.dayAfter.hasOptimal;

  const renderOptimalPeriods = (dayAnalysis) => {
    if (!dayAnalysis.hasOptimal) return null;

    return dayAnalysis.periods.map((period, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-green-50 border border-green-200 rounded-lg p-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800">
              {period.startTime} - {period.endTime || period.startTime}
            </span>
          </div>
          <div className="text-sm text-green-600">
            Dew point: {period.startDewPoint?.toFixed(1)}°C
            {period.endDewPoint && ` - ${period.endDewPoint.toFixed(1)}°C`}
          </div>
        </div>
        <div className="text-xs text-green-600 mt-1">
          Duration: {period.hours.length} hour{period.hours.length !== 1 ? 's' : ''}
        </div>
      </motion.div>
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-700">
            <Wind className="h-5 w-5" />
            Ventilation Forecast
          </CardTitle>
          <CardDescription>
            Optimal ventilation periods when outdoor dew point is lower than indoor ({indoorDewPoint?.toFixed(1)}°C)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Today's Analysis */}
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-3">
              <Calendar className="h-4 w-4" />
              Next 24 Hours
            </h3>
            
            {analysis.today.hasOptimal ? (
              <div className="space-y-2">
                <Alert className="bg-green-50 border-green-200 text-green-800 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-sm">Good periods found!</AlertTitle>
                  <AlertDescription className="text-xs">
                    Optimal times for ventilation today:
                  </AlertDescription>
                </Alert>
                {renderOptimalPeriods(analysis.today)}
              </div>
            ) : (
              <Alert className="bg-amber-50 border-amber-200 text-amber-800 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-sm">No optimal periods today</AlertTitle>
                <AlertDescription className="text-xs">
                  The next 24 hours will not be suitable for ventilation.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Extended Forecast */}
          {!analysis.today.hasOptimal && (
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-3">
                <Calendar className="h-4 w-4" />
                Extended Forecast
              </h3>
              
              {nextSuitableDay ? (
                <div className="space-y-2">
                  <Alert className="bg-blue-50 border-blue-200 text-blue-800 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    <AlertTitle className="text-sm">
                      Next suitable day: {nextSuitableDay.dayName}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      {nextSuitableDay.date.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </AlertDescription>
                  </Alert>
                  {renderOptimalPeriods(nextSuitableDay)}
                </div>
              ) : (
                <Alert className="bg-red-50 border-red-200 text-red-800 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertTitle className="text-sm">No suitable periods found</AlertTitle>
                  <AlertDescription className="text-xs">
                    Until {analysis.dayAfter.dayName}, there are no suitable time periods for ventilation.
                    Consider using mechanical ventilation or dehumidifiers.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Refresh button */}
          <Button 
            onClick={fetchForecastData} 
            variant="outline" 
            size="sm" 
            className="w-full"
          >
            Refresh Forecast
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
