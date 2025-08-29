import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Home, Settings, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import GoogleAuthButton from './GoogleAuthButton';
import { getCurrentIndoorTemperature, getAuthStatus } from '../integrations/GoogleAuth';

/**
 * IndoorTemperature Component
 * 
 * Handles indoor temperature data with three sources:
 * 1. Google Home/Nest devices (primary)
 * 2. Manual user input (fallback)
 * 3. No data (prompts user to choose)
 */
export default function IndoorTemperature({ onTemperatureChange }) {
  const [temperatureData, setTemperatureData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('none'); // 'google', 'manual', 'none'
  
  // Google Home state
  const [isGoogleConfigured, setIsGoogleConfigured] = useState(false);
  
  // Manual entry state
  const [manualTemp, setManualTemp] = useState('');
  const [manualHumidity, setManualHumidity] = useState('');
  
  // Initialize component
  useEffect(() => {
    checkGoogleConfiguration();
  }, []);

  // Notify parent component when temperature changes
  useEffect(() => {
    if (temperatureData && onTemperatureChange) {
      onTemperatureChange(temperatureData);
    }
  }, [temperatureData, onTemperatureChange]);

  const checkGoogleConfiguration = () => {
    const status = getAuthStatus();
    setIsGoogleConfigured(status.isConfigured);
    
    if (!status.isConfigured) {
      setDataSource('manual'); // Default to manual if Google not configured
    }
  };

  // Handle successful Google authentication
  const handleGoogleAuthSuccess = (authState) => {
    console.log('🎉 Google authentication successful:', authState);
    setDataSource('google');
    setError(null);
    fetchGoogleHomeTemperature();
  };

  // Handle Google authentication errors
  const handleGoogleAuthError = (error) => {
    console.error('❌ Google authentication failed:', error);
    setError(`Google authentication failed: ${error.message}`);
    setDataSource('manual'); // Fallback to manual
  };

  const fetchGoogleHomeTemperature = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getCurrentIndoorTemperature();
      
      setTemperatureData({
        temperature: data.temperature,
        humidity: data.humidity,
        source: 'google_nest',
        deviceName: data.deviceName,
        room: data.room,
        timestamp: new Date(data.timestamp),
        lastUpdated: new Date()
      });
      
    } catch (error) {
      console.error('Failed to fetch Google Home temperature:', error);
      setError(`Failed to get Google Home data: ${error.message}`);
      // Don't automatically switch to manual mode - let user decide
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEntry = () => {
    if (!manualTemp || isNaN(parseFloat(manualTemp))) {
      setError('Please enter a valid temperature');
      return;
    }

    const temperature = parseFloat(manualTemp);
    const humidity = manualHumidity ? parseFloat(manualHumidity) : null;

    setTemperatureData({
      temperature,
      humidity: !isNaN(humidity) ? humidity : null,
      source: 'manual',
      timestamp: new Date(),
      lastUpdated: new Date()
    });

    setDataSource('manual');
    setError(null);
  };

  const handleSwitchToManual = () => {
    setDataSource('manual');
    setError(null);
    // Keep current values as defaults if available
    if (temperatureData) {
      setManualTemp(temperatureData.temperature.toString());
      if (temperatureData.humidity) {
        setManualHumidity(temperatureData.humidity.toString());
      }
    }
  };

  const handleRefresh = () => {
    if (dataSource === 'google') {
      fetchGoogleHomeTemperature();
    } else if (dataSource === 'manual') {
      handleManualEntry();
    }
  };

  const signOutGoogle = () => {
    // Note: signOut is now handled by GoogleAuthButton component
    setDataSource('none');
    setTemperatureData(null);
    setError(null);
  };

  const renderDataSourceSelector = () => {
    if (dataSource !== 'none') return null;

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-slate-700 mb-2">Choose Indoor Temperature Source</h3>
          <p className="text-sm text-slate-500 mb-4">
            Select how you'd like to provide indoor temperature data
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isGoogleConfigured && (
            <Button
              onClick={() => setDataSource('google')}
              className="flex flex-col items-center p-6 h-auto space-y-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              variant="outline"
            >
              <Home className="h-8 w-8" />
              <div className="text-center">
                <div className="font-medium">Google Home/Nest</div>
                <div className="text-xs text-blue-600">Automatic from your devices</div>
              </div>
            </Button>
          )}

          <Button
            onClick={() => setDataSource('manual')}
            className="flex flex-col items-center p-6 h-auto space-y-3 bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
            variant="outline"
          >
            <Smartphone className="h-8 w-8" />
            <div className="text-center">
              <div className="font-medium">Manual Entry</div>
              <div className="text-xs text-gray-600">Enter temperature manually</div>
            </div>
          </Button>
        </div>

        {!isGoogleConfigured && (
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              Google Home integration not configured. Using manual entry only.
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Set VITE_GOOGLE_CLIENT_ID in .env to enable Google Home features.
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderGoogleHomeView = () => {
    if (dataSource !== 'google') return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Home className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-slate-700">Google Home/Nest</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleSwitchToManual}
              size="sm"
              variant="outline"
            >
              Switch to Manual
            </Button>
          </div>
        </div>

        {/* Google Authentication Component */}
        <GoogleAuthButton 
          onAuthSuccess={handleGoogleAuthSuccess}
          onAuthError={handleGoogleAuthError}
        />

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : temperatureData ? (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-semibold text-blue-800">
                    {temperatureData.temperature}°C
                  </span>
                </div>
                {temperatureData.humidity && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm text-blue-600">
                      {temperatureData.humidity}% humidity
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right text-sm text-blue-600">
                <div>{temperatureData.deviceName}</div>
                <div>{temperatureData.room}</div>
                <div className="text-xs">
                  Updated: {temperatureData.lastUpdated.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderManualView = () => {
    if (dataSource !== 'manual') return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-slate-700">Manual Entry</span>
          </div>
          <div className="flex items-center space-x-2">
            {isGoogleConfigured && (
              <Button
                onClick={() => setDataSource('google')}
                size="sm"
                variant="outline"
              >
                Switch to Google Home
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="manual-temp">Temperature (°C) *</Label>
            <Input
              id="manual-temp"
              type="number"
              step="0.1"
              value={manualTemp}
              onChange={(e) => setManualTemp(e.target.value)}
              placeholder="e.g. 22.5"
            />
          </div>
          <div>
            <Label htmlFor="manual-humidity">Humidity (%) Optional</Label>
            <Input
              id="manual-humidity"
              type="number"
              step="1"
              min="0"
              max="100"
              value={manualHumidity}
              onChange={(e) => setManualHumidity(e.target.value)}
              placeholder="e.g. 45"
            />
          </div>
        </div>

        <Button onClick={handleManualEntry} className="w-full">
          Update Indoor Temperature
        </Button>

        {temperatureData && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Thermometer className="h-5 w-5 text-gray-600" />
                <span className="text-2xl font-semibold text-gray-800">
                  {temperatureData.temperature}°C
                </span>
              </div>
              {temperatureData.humidity && (
                <span className="text-sm text-gray-600">
                  {temperatureData.humidity}% humidity
                </span>
              )}
              <div className="ml-auto text-sm text-gray-500">
                Updated: {temperatureData.lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Indoor Temperature
          </CardTitle>
          {dataSource !== 'none' && (
            <Button
              onClick={() => setDataSource('none')}
              size="sm"
              variant="ghost"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {renderDataSourceSelector()}
          {renderGoogleHomeView()}
          {renderManualView()}
        </CardContent>
      </Card>
    </motion.div>
  );
}
