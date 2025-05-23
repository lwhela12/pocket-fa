import { motion } from 'framer-motion';

type ProgressChartProps = {
  currentSavings: number;
  targetSavings: number;
  projectedAtRetirement?: number;
  goalName?: string;
};

export default function ProgressChart({
  currentSavings,
  targetSavings,
  projectedAtRetirement,
  goalName = 'Retirement',
}: ProgressChartProps) {
  const progressPercentage = Math.min(100, (currentSavings / targetSavings) * 100);
  const projectedPercentage =
    projectedAtRetirement !== undefined
      ? Math.min(100, (projectedAtRetirement / targetSavings) * 100)
      : null;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  return (
    <div className="card h-full">
      <h3 className="mb-4 text-lg font-medium text-gray-700">{goalName} Progress</h3>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Current</span>
          <span className="text-gray-500">Target</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="font-medium text-primary">{formatCurrency(currentSavings)}</span>
          <span className="font-medium text-gray-700">{formatCurrency(targetSavings)}</span>
        </div>
        
        <div className="relative mt-2">
          <div className="relative h-6 w-full overflow-hidden rounded-full bg-gray-200">
            {projectedPercentage !== null && (
              <motion.div
                className="absolute left-0 top-0 h-6 rounded-full bg-green-500"
                initial={{ width: 0 }}
                animate={{ width: `${projectedPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ zIndex: 0 }}
              />
            )}
            <motion.div
              className="absolute left-0 top-0 h-6 rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ zIndex: 10 }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          
          {/* Target line */}
          <div className="absolute bottom-0 right-0 top-0 border-r-2 border-dashed border-gray-500">
            <div className="absolute -top-5 right-0 translate-x-1/2 text-xs font-medium text-gray-700">
              Target
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Current Progress</span>
          <span className="font-medium">{progressPercentage.toFixed(1)}%</span>
        </div>
        {projectedPercentage !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500">Projected Progress</span>
            <span className="font-medium">{projectedPercentage.toFixed(1)}%</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Gap to Target</span>
          <span className="font-medium text-gray-700">
            {formatCurrency(Math.max(0, targetSavings - currentSavings))}
          </span>
        </div>
        {projectedAtRetirement !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-500">Projected at Retirement</span>
            <span className="font-medium text-gray-700">
              {formatCurrency(projectedAtRetirement)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}