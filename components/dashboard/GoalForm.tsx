import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type GoalFormProps = {
  onSubmit: (goal: any) => Promise<void>;
  onCancel: () => void;
  initialValues?: any;
  isSubmitting: boolean;
};

const priorityOptions = [
  { value: 1, label: 'High' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Low' },
];

const GoalForm = ({ onSubmit, onCancel, initialValues, isSubmitting }: GoalFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    isActive: true,
    priority: '1',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // If we're editing a goal, initialize with passed values
  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name || '',
        targetAmount: initialValues.targetAmount?.toString() || '',
        currentAmount: initialValues.currentAmount?.toString() || '',
        targetDate: initialValues.targetDate 
          ? new Date(initialValues.targetDate).toISOString().split('T')[0] 
          : '',
        isActive: initialValues.isActive !== undefined ? initialValues.isActive : true,
        priority: initialValues.priority?.toString() || '1',
      });
    }
  }, [initialValues]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error on change
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Goal name is required';
    
    if (!formData.targetAmount) {
      newErrors.targetAmount = 'Target amount is required';
    } else if (isNaN(Number(formData.targetAmount))) {
      newErrors.targetAmount = 'Target amount must be a number';
    }
    
    if (!formData.currentAmount) {
      newErrors.currentAmount = 'Current amount is required';
    } else if (isNaN(Number(formData.currentAmount))) {
      newErrors.currentAmount = 'Current amount must be a number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const goalData = {
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: parseFloat(formData.currentAmount),
      targetDate: formData.targetDate ? new Date(formData.targetDate) : null,
      priority: parseInt(formData.priority),
    };
    
    onSubmit(goalData);
  };
  
  return (
    <motion.form 
      onSubmit={handleSubmit}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Goal Name*</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
              errors.name ? 'border-red-500' : ''
            }`}
            placeholder="E.g., Emergency Fund, House Down Payment"
            required
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Target Amount*</label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="text"
              name="targetAmount"
              value={formData.targetAmount}
              onChange={handleChange}
              className={`block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                errors.targetAmount ? 'border-red-500' : ''
              }`}
              placeholder="0.00"
              required
            />
          </div>
          {errors.targetAmount && <p className="mt-1 text-xs text-red-500">{errors.targetAmount}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Current Amount*</label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="text"
              name="currentAmount"
              value={formData.currentAmount}
              onChange={handleChange}
              className={`block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                errors.currentAmount ? 'border-red-500' : ''
              }`}
              placeholder="0.00"
              required
            />
          </div>
          {errors.currentAmount && <p className="mt-1 text-xs text-red-500">{errors.currentAmount}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Target Date</label>
          <input
            type="date"
            name="targetDate"
            value={formData.targetDate}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label className="ml-2 block text-sm text-gray-700">
            Goal is active
          </label>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : initialValues ? 'Update Goal' : 'Add Goal'}
        </button>
      </div>
    </motion.form>
  );
};

export default GoalForm;