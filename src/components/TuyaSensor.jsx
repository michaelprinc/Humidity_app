import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { getLocalTemperatureHumidity } from '../integrations/TuyaAuth';

/**
 * TuyaSensor Component
 *
 * Retrieves indoor temperature and humidity from Tuya Cloud. If the
 * data cannot be retrieved, the user can manually enter values.
 */
export default function TuyaSensor({ onTemperatureChange }) {
  const [temperatureData, setTemperatureData] = useState(null);
  const [error, setError] = useState(null);
  const [manualTemp, setManualTemp] = useState('');
  const [manualHumidity, setManualHumidity] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchFromTuya();
  }, []);

  const fetchFromTuya = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getLocalTemperatureHumidity();
      const payload = {
        temperature: data.temperature,
        humidity: data.humidity,
        source: 'tuya',
        timestamp: new Date(),
        lastUpdated: new Date()
      };
      setTemperatureData(payload);
      if (onTemperatureChange) {
        onTemperatureChange(payload);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = () => {
    const t = parseFloat(manualTemp);
    const h = manualHumidity ? parseFloat(manualHumidity) : null;
    if (isNaN(t)) {
      setError('Please enter a valid temperature');
      return;
    }
    const payload = {
      temperature: t,
      humidity: h,
      source: 'manual',
      timestamp: new Date(),
      lastUpdated: new Date()
    };
    setTemperatureData(payload);
    setError(null);
    if (onTemperatureChange) {
      onTemperatureChange(payload);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading indoor data...</div>;
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Indoor Conditions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {temperatureData ? (
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold">{temperatureData.temperature}°C</div>
            {temperatureData.humidity !== null && (
              <div className="text-xl">Humidity: {temperatureData.humidity}%</div>
            )}
            <Button onClick={fetchFromTuya} className="mt-2" variant="secondary">Refresh</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="manualTemp">Temperature (°C)</Label>
              <Input id="manualTemp" value={manualTemp} onChange={e => setManualTemp(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="manualHumidity">Humidity (%)</Label>
              <Input id="manualHumidity" value={manualHumidity} onChange={e => setManualHumidity(e.target.value)} />
            </div>
            <Button onClick={handleManualSubmit}>Submit</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
