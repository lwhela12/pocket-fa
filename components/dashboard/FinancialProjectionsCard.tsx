import { motion } from 'framer-motion';

type ProjectionPoint = {
  year: number;
  value: number;
};

type FinancialProjectionsCardProps = {
  projections: ProjectionPoint[];
  yearsUntilRetirement: number;
};

export default function FinancialProjectionsCard({
  projections,
  yearsUntilRetirement
}: FinancialProjectionsCardProps) {
  console.log('FinancialProjectionsCard received projections:', JSON.stringify(projections, null, 2));
  if (!projections || projections.length === 0) {
    return (
      <div className="card h-full flex items-center justify-center p-4">
        <p className="text-sm text-gray-500">No projection data available.</p>
      </div>
    );
  }

  const values = projections.map(p => p.value);
  const dataMinActual = Math.min(...values);
  const dataMaxActual = Math.max(...values);
  console.log('FinancialProjectionsCard calculated maxValue:', dataMaxActual);
  console.log('FinancialProjectionsCard projections[0].value:', projections[0]?.value);

  let displayMin = 0;
  let displayMax = Math.max(dataMaxActual, 0);

  if (displayMin === displayMax && displayMin === 0) {
    displayMax = 1;
  } else if (displayMin === displayMax) {
    displayMin = Math.min(0, displayMin - Math.abs(displayMin * 0.1));
    displayMax = Math.max(0, displayMax + Math.abs(displayMax * 0.1));
    if (displayMin === displayMax) displayMax = displayMin + 1;
  }

  const displayRange = displayMax - displayMin;

  const getYPercentage = (value: number) => {
    if (displayRange === 0) {
      return displayMin === 0 ? 100 : 50;
    }
    const normalizedValue = (value - displayMin) / displayRange;
    return (1 - Math.max(0, Math.min(1, normalizedValue))) * 100;
  };

  const getXPercentage = (index: number, total: number) => {
    if (total <= 1) return 0;
    return (index / (total - 1)) * 100;
  };

  const firstYear = projections[0].year;
  const lastYear = projections[projections.length - 1].year;
  const totalYears = lastYear - firstYear;
  let retirementLineX = 0;
  if (totalYears > 0) {
    retirementLineX = ((yearsUntilRetirement - firstYear) / totalYears) * 100;
    retirementLineX = Math.max(0, Math.min(100, retirementLineX));
  }
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const yLabels = [
    displayMax,
    displayMax - displayRange * 0.25,
    displayMax - displayRange * 0.5,
    displayMax - displayRange * 0.75,
    displayMin,
  ];

  return (
    <div className="card h-full">
      <h3 className="mb-4 text-lg font-medium text-gray-700">Financial Projections</h3>
      
      <div className="h-60 w-full">
        <div className="relative h-full w-full">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 flex h-full flex-col justify-between pb-6 pr-2 text-xs text-gray-500">
            {yLabels.map((label, idx) => (
              <span key={idx}>{formatCurrency(label)}</span>
            ))}
          </div>
          
          {/* Graph area */}
          <div className="absolute inset-y-0 left-12 right-0">
            {/* Horizontal grid lines */}
            <div className="relative h-full w-full">
              {[0.25, 0.5, 0.75, 1].map((ratio) => (
                <div 
                  key={ratio}
                  className="absolute left-0 right-0 border-t border-gray-200"
                  style={{ top: `${(1 - ratio) * 100}%` }}
                />
              ))}
              
              {/* X-axis at the bottom */}
              <div className="absolute bottom-0 left-0 right-0 border-t border-gray-300" />
              
              {/* Retirement line */}
              <div
                className="absolute bottom-0 top-0 border-l border-dashed border-error"
                style={{ left: `${retirementLineX}%` }}
              >
                <div className="absolute -left-6 top-0 rounded bg-error px-1 text-xs text-white">
                  Retirement
                </div>
              </div>
              
              {/* Line chart */}
              <svg className="absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(33, 150, 243, 0.5)" />
                    <stop offset="100%" stopColor="rgba(33, 150, 243, 0)" />
                  </linearGradient>
                </defs>
                
                {/* Area fill */}
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  d={`
                    ${projections
                      .map((point, i) =>
                        `${i === 0 ? 'M' : 'L'} ${getXPercentage(i, projections.length)} ${getYPercentage(point.value)}`
                      )
                      .join(' ')}
                    L ${getXPercentage(projections.length - 1, projections.length)} 100
                    L ${getXPercentage(0, projections.length)} 100
                    Z
                  `}
                  fill="url(#projectionGradient)"
                  strokeWidth="0"
                  vectorEffect="non-scaling-stroke"
                />
                
                {/* Line */}
                <motion.path
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  d={`
                    ${projections
                      .map((point, i) =>
                        `${i === 0 ? 'M' : 'L'} ${getXPercentage(i, projections.length)} ${getYPercentage(point.value)}`
                      )
                      .join(' ')}
                  `}
                  fill="none"
                  stroke="#2196F3"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            
            {/* X-axis labels */}
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              {projections.filter((_, i) => i % Math.ceil(projections.length / 5) === 0 || i === projections.length - 1).map((point) => (
                <span key={point.year}>Year {point.year}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <p className="mt-4 text-sm text-gray-500">
        Projected net worth based on current savings, contributions, and assumed 7% annual growth rate.
      </p>
    </div>
  );
}