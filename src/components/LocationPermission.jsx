import React from 'react';
import { MapPin, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

export default function LocationPermission({ onAllow }) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl text-center">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-700">
          <MapPin className="h-5 w-5 text-blue-500" />
          Location Access Needed
        </CardTitle>
        <CardDescription>
          To get local weather data, please allow location access.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          Your location is private and not stored.
        </p>
        <Button onClick={onAllow} className="w-full bg-blue-600 hover:bg-blue-700">
          Allow Location
        </Button>
      </CardContent>
    </Card>
  );
}
