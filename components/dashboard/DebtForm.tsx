import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type DebtFormProps = {
  onSubmit: (debt: any) => Promise<void>;
  onCancel: () => void;
  initialValues?: any;
  isSubmitting: boolean;
};

const debtTypes = ['Credit Card', 'Mortgage', 'Student Loan', 'Auto Loan', 'Personal Loan', 'Medical Debt', 'Other'];

const DebtForm = ({ onSubmit, onCancel, initialValues, isSubmitting }: DebtFormProps) => {
  const [formData, setFormData] = useState({
    type: '',
    lender: '',
    balance: '',
    interestRate: '',
    monthlyPayment: '',
    termLength: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // If we're editing a debt, initialize with passed values
  useEffect(() => {
    if (initialValues) {
      setFormData({
        type: initialValues.type || '',
        lender: initialValues.lender || '',
        balance: initialValues.balance?.toString() || '',
        interestRate: initialValues.interestRate?.toString() || '',
        monthlyPayment: initialValues.monthlyPayment?.toString() || '',
        termLength: initialValues.termLength?.toString() || '',
      });
    }
  }, [initialValues]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error on change
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.type) newErrors.type = 'Debt type is required';
    if (!formData.lender) newErrors.lender = 'Lender name is required';
    
    if (!formData.balance) {
      newErrors.balance = 'Balance is required';
    } else if (isNaN(Number(formData.balance))) {
      newErrors.balance = 'Balance must be a number';
    }
    
    if (!formData.interestRate) {
      newErrors.interestRate = 'Interest rate is required';
    } else if (isNaN(Number(formData.interestRate))) {
      newErrors.interestRate = 'Interest rate must be a number';
    }
    
    if (!formData.monthlyPayment) {
      newErrors.monthlyPayment = 'Monthly payment is required';
    } else if (isNaN(Number(formData.monthlyPayment))) {
      newErrors.monthlyPayment = 'Monthly payment must be a number';
    }
    
    if (formData.termLength && isNaN(Number(formData.termLength))) {
      newErrors.termLength = 'Term length must be a number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const debtData = {
      ...formData,
      balance: parseFloat(formData.balance),
      interestRate: parseFloat(formData.interestRate),
      monthlyPayment: parseFloat(formData.monthlyPayment),
      termLength: formData.termLength ? parseInt(formData.termLength) : null,
    };
    
    onSubmit(debtData);
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
          <label className="block text-sm font-medium text-gray-700">Debt Type*</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
              errors.type ? 'border-red-500' : ''
            }`}
            required
          >
            <option value="">Select Type</option>
            {debtTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Lender Name*</label>
          <input
            type="text"
            name="lender"
            value={formData.lender}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
              errors.lender ? 'border-red-500' : ''
            }`}
            placeholder="E.g., Chase Bank, Sallie Mae"
            required
          />
          {errors.lender && <p className="mt-1 text-xs text-red-500">{errors.lender}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Balance*</label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="text"
              name="balance"
              value={formData.balance}
              onChange={handleChange}
              className={`block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                errors.balance ? 'border-red-500' : ''
              }`}
              placeholder="0.00"
              required
            />
          </div>
          {errors.balance && <p className="mt-1 text-xs text-red-500">{errors.balance}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Interest Rate (%)*</label>
          <input
            type="text"
            name="interestRate"
            value={formData.interestRate}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
              errors.interestRate ? 'border-red-500' : ''
            }`}
            placeholder="5.25"
            required
          />
          {errors.interestRate && <p className="mt-1 text-xs text-red-500">{errors.interestRate}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Monthly Payment*</label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="text"
              name="monthlyPayment"
              value={formData.monthlyPayment}
              onChange={handleChange}
              className={`block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                errors.monthlyPayment ? 'border-red-500' : ''
              }`}
              placeholder="0.00"
              required
            />
          </div>
          {errors.monthlyPayment && <p className="mt-1 text-xs text-red-500">{errors.monthlyPayment}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Loan Term (months)</label>
          <div className="flex items-center">
            <input
              type="text"
              name="termLength"
              value={formData.termLength}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                errors.termLength ? 'border-red-500' : ''
              }`}
              placeholder="360"
            />
            <span className="ml-2 text-sm text-gray-500">Leave blank for revolving debt (like credit cards)</span>
          </div>
          {errors.termLength && <p className="mt-1 text-xs text-red-500">{errors.termLength}</p>}
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
          {isSubmitting ? 'Saving...' : initialValues ? 'Update Debt' : 'Add Debt'}
        </button>
      </div>
    </motion.form>
  );
};

export default DebtForm;