import { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api-utils';

type ExpenseFormProps = {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  initialValues?: any;
  isSubmitting?: boolean;
  month: Date; // which month we're editing
};

type TabType = 'quick' | 'detailed' | 'item';

const EXPENSE_CATEGORIES = [
  'Housing',
  'Utilities',
  'Groceries',
  'Dining',
  'Transport',
  'Healthcare',
  'Entertainment',
  'Miscellaneous',
];

const FREQUENCIES = [
  { value: 'one-time', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export default function ExpenseForm({
  onSubmit,
  onCancel,
  initialValues,
  isSubmitting,
  month,
}: ExpenseFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('item');

  // Quick entry state
  const [quickTotal, setQuickTotal] = useState(initialValues?.totalMonthly?.toString() || '');

  // Detailed entry state
  const [housing, setHousing] = useState(initialValues?.housing?.toString() || '');
  const [utilities, setUtilities] = useState(initialValues?.utilities?.toString() || '');
  const [groceries, setGroceries] = useState(initialValues?.groceries?.toString() || '');
  const [dining, setDining] = useState(initialValues?.dining?.toString() || '');
  const [transport, setTransport] = useState(initialValues?.transport?.toString() || '');
  const [healthcare, setHealthcare] = useState(initialValues?.healthcare?.toString() || '');
  const [entertainment, setEntertainment] = useState(initialValues?.entertainment?.toString() || '');
  const [miscellaneous, setMiscellaneous] = useState(initialValues?.miscellaneous?.toString() || '');

  // Item entry state
  const [itemDescription, setItemDescription] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemFrequency, setItemFrequency] = useState('one-time');
  const [itemCategory, setItemCategory] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [categoryConfidence, setCategoryConfidence] = useState(0);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);

  useEffect(() => {
    if (initialValues?.isDetailed) {
      setActiveTab('detailed');
    } else if (initialValues?.totalMonthly) {
      setActiveTab('quick');
    }
  }, [initialValues]);

  // Auto-categorize when description changes
  useEffect(() => {
    if (itemDescription.length > 3 && activeTab === 'item') {
      const timer = setTimeout(async () => {
        setIsLoadingCategory(true);
        try {
          const res = await fetchApi('/api/expenses/quick-add?preview=true', {
            method: 'POST',
            body: JSON.stringify({ description: itemDescription }),
          });

          if (res.success && res.data) {
            setSuggestedCategory(res.data.category);
            setCategoryConfidence(res.data.confidence);
            if (!itemCategory) {
              setItemCategory(res.data.category);
            }
          }
        } catch (error) {
          console.error('Error categorizing:', error);
        } finally {
          setIsLoadingCategory(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [itemDescription, activeTab]);

  const calculateDetailedTotal = () => {
    return (
      (parseFloat(housing) || 0) +
      (parseFloat(utilities) || 0) +
      (parseFloat(groceries) || 0) +
      (parseFloat(dining) || 0) +
      (parseFloat(transport) || 0) +
      (parseFloat(healthcare) || 0) +
      (parseFloat(entertainment) || 0) +
      (parseFloat(miscellaneous) || 0)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'quick') {
      await onSubmit({
        month: month.toISOString(),
        isDetailed: false,
        totalMonthly: parseFloat(quickTotal) || 0,
      });
    } else if (activeTab === 'detailed') {
      await onSubmit({
        month: month.toISOString(),
        isDetailed: true,
        totalMonthly: calculateDetailedTotal(),
        housing: parseFloat(housing) || 0,
        utilities: parseFloat(utilities) || 0,
        groceries: parseFloat(groceries) || 0,
        dining: parseFloat(dining) || 0,
        transport: parseFloat(transport) || 0,
        healthcare: parseFloat(healthcare) || 0,
        entertainment: parseFloat(entertainment) || 0,
        miscellaneous: parseFloat(miscellaneous) || 0,
      });
    } else if (activeTab === 'item') {
      // Submit via quick-add API
      try {
        const response = await fetchApi('/api/expenses/quick-add', {
          method: 'POST',
          body: JSON.stringify({
            description: itemDescription,
            amount: parseFloat(itemAmount),
            frequency: itemFrequency,
            category: itemCategory,
            date: month.toISOString(),
          }),
        });

        if (response.success) {
          // Reset form
          setItemDescription('');
          setItemAmount('');
          setItemCategory('');
          setSuggestedCategory('');

          // Close modal and trigger refresh by calling parent's onCancel
          // which will cause the parent to refetch data
          onCancel();
        }
      } catch (error) {
        console.error('Error adding expense item:', error);
        throw error;
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('item')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'item'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Item Entry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('quick')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'quick'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Quick Entry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('detailed')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'detailed'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Detailed Breakdown
        </button>
      </div>

      {/* Quick Entry Tab */}
      {activeTab === 'quick' && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Enter your total monthly expenses as a single amount.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Monthly Expenses
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={quickTotal}
                onChange={(e) => setQuickTotal(e.target.value)}
                className="block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="0.00"
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* Detailed Breakdown Tab */}
      {activeTab === 'detailed' && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Break down your monthly expenses by category.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '🏠 Housing', value: housing, setter: setHousing },
              { label: '⚡ Utilities', value: utilities, setter: setUtilities },
              { label: '🛒 Groceries', value: groceries, setter: setGroceries },
              { label: '🍽️ Dining Out', value: dining, setter: setDining },
              { label: '🚗 Transportation', value: transport, setter: setTransport },
              { label: '🏥 Healthcare', value: healthcare, setter: setHealthcare },
              { label: '🎭 Entertainment', value: entertainment, setter: setEntertainment },
              { label: '💰 Miscellaneous', value: miscellaneous, setter: setMiscellaneous },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">Total:</span>
              <span className="text-2xl font-bold text-primary">
                ${calculateDetailedTotal().toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Item Entry Tab */}
      {activeTab === 'item' && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Add individual expenses with AI-powered categorization.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What did you buy?
              </label>
              <input
                type="text"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="e.g., Starbucks coffee, Netflix subscription, groceries"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={itemAmount}
                    onChange={(e) => setItemAmount(e.target.value)}
                    className="block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={itemFrequency}
                  onChange={(e) => setItemFrequency(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                >
                  {FREQUENCIES.map((freq) => (
                    <option key={freq.value} value={freq.value}>
                      {freq.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {itemDescription.length > 3 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {isLoadingCategory ? (
                      'Categorizing...'
                    ) : suggestedCategory ? (
                      <>
                        AI Suggests: {suggestedCategory}
                        {categoryConfidence > 0 && (
                          <span className="ml-2 text-xs text-blue-600">
                            ({(categoryConfidence * 100).toFixed(0)}% confident)
                          </span>
                        )}
                      </>
                    ) : (
                      'Category'
                    )}
                  </span>
                </div>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  required
                >
                  <option value="">Select category...</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : activeTab === 'item' ? 'Add Expense' : 'Save'}
        </button>
      </div>
    </form>
  );
}
