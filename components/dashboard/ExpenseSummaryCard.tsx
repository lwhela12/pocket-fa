import { motion } from 'framer-motion';
import { useRouter } from 'next/router';

type ExpenseSummaryCardProps = {
  living: number;
  entertainment: number;
  discretionary: number;
  total: number;
  monthlyIncome?: number;
};

export default function ExpenseSummaryCard({
  living,
  entertainment,
  discretionary,
  total,
  monthlyIncome = 0,
}: ExpenseSummaryCardProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePercentage = (amount: number) => {
    if (total === 0) return 0;
    return (amount / total) * 100;
  };

  const savings = monthlyIncome > 0 ? monthlyIncome - total : 0;
  const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;

  const categories = [
    {
      name: 'Living',
      amount: living,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100',
      icon: '🏠',
    },
    {
      name: 'Entertainment',
      amount: entertainment,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-100',
      icon: '🎬',
    },
    {
      name: 'Discretionary',
      amount: discretionary,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-100',
      icon: '💳',
    },
  ];

  if (monthlyIncome > 0) {
    categories.push({
      name: 'Savings',
      amount: savings,
      color: 'bg-green-500',
      lightColor: 'bg-green-100',
      icon: '💰',
    });
  }

  return (
    <div className="card h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-700">Monthly Expenses</h3>
        <button
          onClick={() => router.push('/dashboard/expenses')}
          className="text-sm text-primary hover:text-blue-700 font-medium"
        >
          View Details →
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(total)}
          </p>
          {monthlyIncome > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Savings</p>
              <p className={`text-lg font-medium ${savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(savings)}
              </p>
            </div>
          )}
        </div>
        {monthlyIncome > 0 && (
          <p className="text-xs text-gray-500">
            Saving {savingsRate.toFixed(1)}% of income
          </p>
        )}
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const percentage = category.name === 'Savings'
            ? (monthlyIncome > 0 ? (category.amount / monthlyIncome) * 100 : 0)
            : calculatePercentage(category.amount);

          return (
            <div key={category.name}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {category.name}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(category.amount)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  className={`h-full ${category.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {percentage.toFixed(1)}% of {category.name === 'Savings' ? 'income' : 'expenses'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
