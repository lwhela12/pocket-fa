import { useState } from 'react';
import { motion } from 'framer-motion';

type NetWorthCardProps = {
  netWorth: number;
  assets: number;
  debts: number;
};

export default function NetWorthCard({ netWorth, assets, debts }: NetWorthCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="card relative">
      <h3 className="mb-2 text-lg font-medium text-gray-700">Net Worth</h3>
      
      <div 
        className="relative inline-block"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <p className={`text-4xl font-bold ${netWorth >= 0 ? 'text-secondary' : 'text-error'}`}>
          {formatCurrency(netWorth)}
        </p>
        
        {showTooltip && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 top-full z-10 mt-2 w-64 rounded-md bg-white p-3 shadow-lg ring-1 ring-black ring-opacity-5"
          >
            <div className="text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Total Assets:</span>
                <span className="font-medium text-secondary">{formatCurrency(assets)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Total Debts:</span>
                <span className="font-medium text-error">{formatCurrency(debts)}</span>
              </div>
              <div className="mt-2 border-t border-gray-200 pt-2 font-medium">
                <div className="flex justify-between">
                  <span>Net Worth:</span>
                  <span className={netWorth >= 0 ? 'text-secondary' : 'text-error'}>
                    {formatCurrency(netWorth)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      <p className="mt-1 text-sm text-gray-500">
        Total assets minus total liabilities
      </p>
    </div>
  );
}