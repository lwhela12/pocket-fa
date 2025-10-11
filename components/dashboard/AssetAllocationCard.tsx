import { useState } from 'react';
import { motion } from 'framer-motion';

type AssetAllocation = {
  label: string;
  value: number;
};

type AssetAllocationCardProps = {
  allocations: AssetAllocation[];
  total: number;
};

const colorMap: Record<string, string> = {
  'Cash': '#4CAF50',      // Green
  'Stocks': '#2196F3',    // Blue
  'Bonds': '#FFC107',     // Amber/Yellow
  'ETFs': '#9C27B0',      // Purple
  'Mutual Funds': '#FF5722', // Deep Orange
  'Real Estate': '#607D8B',  // Blue Grey
  'Investment': '#00BCD4',   // Cyan
  'Lifestyle': '#E91E63',    // Pink
  'Other': '#795548',        // Brown
  'Default': '#9E9E9E',      // Grey
};

const getAllocationColor = (label: string) => colorMap[label] || colorMap['Default'];

export default function AssetAllocationCard({ allocations, total }: AssetAllocationCardProps) {
  const [selectedSlice, setSelectedSlice] = useState<AssetAllocation | null>(null);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    return ((value / total) * 100).toFixed(1) + '%';
  };

  return (
    <div className="card h-full">
      <h3 className="mb-4 text-lg font-medium text-gray-700">Asset Allocation</h3>
      
      <div className="relative mx-auto h-48 w-48">
        <svg className="h-full w-full" viewBox="0 0 200 200">
          {allocations.map((allocation, index) => {
            // Calculate angles
            const startAngle = allocations
              .slice(0, index)
              .reduce((sum, curr) => sum + (curr.value / total) * 360, 0);
            const endAngle = startAngle + (allocation.value / total) * 360;

            // Convert to radians
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);

            // Calculate arc points
            const radius = 100;
            const x1 = 100 + radius * Math.cos(startRad);
            const y1 = 100 + radius * Math.sin(startRad);
            const x2 = 100 + radius * Math.cos(endRad);
            const y2 = 100 + radius * Math.sin(endRad);

            const largeArc = endAngle - startAngle > 180 ? 1 : 0;

            // Create path for pie slice
            const pathData = [
              `M 100 100`,           // Move to center
              `L ${x1} ${y1}`,       // Line to start of arc
              `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`, // Arc
              `Z`                    // Close path back to center
            ].join(' ');

            return (
              <path
                key={allocation.label}
                d={pathData}
                fill={getAllocationColor(allocation.label)}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseEnter={() => setSelectedSlice(allocation)}
                onMouseLeave={() => setSelectedSlice(null)}
              />
            );
          })}

          {/* Center circle */}
          <circle cx="100" cy="100" r="50" fill="white" />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center justify-center">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-sm font-medium text-gray-900">{formatCurrency(total)}</p>
          </div>
        </div>
        
        {selectedSlice && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 top-full z-10 mt-2 w-48 -translate-x-1/2 rounded-md bg-white p-3 shadow-lg ring-1 ring-black ring-opacity-5"
          >
            <div className="text-sm text-gray-700">
              <div className="mb-1 flex items-center">
                <div 
                  className="mr-2 h-3 w-3 rounded-full" 
                  style={{ backgroundColor: getAllocationColor(selectedSlice.label) }}
                />
                <span className="font-medium">{selectedSlice.label}</span>
              </div>
              <div className="flex justify-between">
                <span>Value:</span>
                <span className="font-medium">{formatCurrency(selectedSlice.value)}</span>
              </div>
              <div className="flex justify-between">
                <span>Percentage:</span>
                <span className="font-medium">{formatPercentage(selectedSlice.value, total)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-2">
        {allocations.map((allocation) => (
          <div 
            key={allocation.label}
            className="flex items-center"
            onMouseEnter={() => setSelectedSlice(allocation)}
            onMouseLeave={() => setSelectedSlice(null)}
          >
            <div 
              className="mr-2 h-3 w-3 rounded-full" 
              style={{ backgroundColor: getAllocationColor(allocation.label) }}
            />
            <div className="text-xs">
              <p className="font-medium">{allocation.label}</p>
              <p className="text-gray-500">{formatPercentage(allocation.value, total)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
