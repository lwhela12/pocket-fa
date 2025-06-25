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
  'Cash': '#4CAF50',
  'Stocks': '#2196F3',
  'Bonds': '#FFC107',
  'Other Investments': '#9C27B0',
  'Default': '#E0E0E0',
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
        <div className="relative h-full w-full rounded-full">
          {/* Placeholder for pie chart - in a real app, use a charting library */}
          <div className="absolute inset-0 overflow-hidden rounded-full bg-gray-200">
            {allocations.map((allocation, index) => {
              const startAngle = allocations
                .slice(0, index)
                .reduce((sum, curr) => sum + (curr.value / total) * 360, 0);
              const angle = (allocation.value / total) * 360;
              
              return (
                <div
                  key={allocation.label}
                  className="absolute inset-0 origin-center"
                  style={{
                    backgroundColor: getAllocationColor(allocation.label),
                    clipPath: `polygon(50% 50%, 50% 0, ${angle <= 180 ? 
                      `${50 + 50 * Math.sin(Math.PI * angle / 180)}% ${50 - 50 * Math.cos(Math.PI * angle / 180)}%` :
                      '100% 0%, 100% 100%, 0% 100%, 0% 0%'
                    }, 50% 0%)`,
                    transform: `rotate(${startAngle}deg)`,
                  }}
                  onMouseEnter={() => setSelectedSlice(allocation)}
                  onMouseLeave={() => setSelectedSlice(null)}
                />
              );
            })}
          </div>
          
          {/* Center circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-sm">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-sm font-medium text-gray-900">{formatCurrency(total)}</p>
            </div>
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
