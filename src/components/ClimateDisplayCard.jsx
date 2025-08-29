import React from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, CloudDrizzle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';

const Stat = ({ icon, value, label, unit }) => (
  <div className="flex items-center space-x-3">
    <div className="p-2 bg-slate-100 rounded-full">
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="font-semibold text-lg text-slate-800">
        {value}
        <span className="text-sm font-medium text-slate-500 ml-1">{unit}</span>
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  </div>
);

const LoadingSkeleton = () => (
    <div className="flex items-center space-x-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-12" />
        </div>
    </div>
);


export default function ClimateDisplayCard({ title, icon, data, isLoading }) {
  const { temperature, humidity, dewPoint } = data || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-subtle rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {isLoading ? (
            <>
              <LoadingSkeleton />
              <LoadingSkeleton />
              <LoadingSkeleton />
            </>
          ) : (
            <>
              <Stat icon={<Thermometer className="h-5 w-5 text-red-500" />} value={temperature?.toFixed(1)} unit="°C" label="Temperature" />
              <Stat icon={<Droplets className="h-5 w-5 text-blue-500" />} value={humidity?.toFixed(0)} unit="%" label="Humidity" />
              <Stat icon={<CloudDrizzle className="h-5 w-5 text-gray-500" />} value={dewPoint?.toFixed(1)} unit="°C" label="Dew Point" />
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
