import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Wind } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

export default function ComparisonResult({ indoorDewPoint, outdoorDewPoint }) {
  if (indoorDewPoint === null || outdoorDewPoint === null) {
    return null;
  }

  const isVentilationGood = outdoorDewPoint < indoorDewPoint;
  const difference = Math.abs(indoorDewPoint - outdoorDewPoint);

  let title, description, Icon, variant;

  if (isVentilationGood) {
    title = "Good to Ventilate";
    description = `The outside air is drier. Ventilating now will help reduce indoor humidity. The outdoor dew point is ${difference.toFixed(1)}°C lower.`;
    Icon = CheckCircle;
    variant = "success";
  } else {
    title = "Risk of Condensation";
    description = `The outside air is more humid. Ventilating now will increase indoor humidity and could cause condensation. The outdoor dew point is ${difference.toFixed(1)}°C higher.`;
    Icon = AlertCircle;
    variant = "warning";
  }

  const variants = {
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800"
  }
  
  const iconVariants = {
      success: "text-green-500",
      warning: "text-amber-500"
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <Alert className={`rounded-2xl shadow-subtle ${variants[variant]}`}>
        <Icon className={`h-5 w-5 ${iconVariants[variant]}`} />
        <AlertTitle className="font-bold">{title}</AlertTitle>
        <AlertDescription className="text-sm">
          {description}
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}
