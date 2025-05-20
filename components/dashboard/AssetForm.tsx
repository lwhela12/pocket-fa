import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type AssetFormProps = {
  onSubmit: (asset: any) => Promise<void>;
  onCancel: () => void;
  initialValues?: any;
  isSubmitting: boolean;
};

const assetTypes = ['Cash', 'Investment'];
const cashSubtypes = ['Checking', 'Savings', 'Money Market', 'Certificate of Deposit'];
const investmentSubtypes = ['401(k)', 'Roth IRA', 'Traditional IRA', 'Taxable', 'Stock', 'Bond', 'ETF', 'Mutual Fund'];
const assetClasses = ['Stocks', 'Bonds', 'ETFs', 'Mutual Funds', 'Real Estate', 'Cash Equivalents', 'Other'];

const AssetForm = ({ onSubmit, onCancel, initialValues, isSubmitting }: AssetFormProps) => {
  const [formData, setFormData] = useState({
    type: '',
    subtype: '',
    name: '',
    balance: '',
    interestRate: '',
    annualContribution: '',
    growthRate: '',
    assetClass: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // If we're editing an asset, initialize with passed values
  useEffect(() => {
    if (initialValues) {
      setFormData({
        type: initialValues.type || '',
        subtype: initialValues.subtype || '',
        name: initialValues.name || '',
        balance: initialValues.balance?.toString() || '',
        interestRate: initialValues.interestRate?.toString() || '',
        annualContribution: initialValues.annualContribution?.toString() || '',
        growthRate: initialValues.growthRate?.toString() || '',
        assetClass: initialValues.assetClass || '',
      });
    }
  }, [initialValues]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Reset subtype if type changes
    if (name === 'type' && value !== formData.type) {
      setFormData({ ...formData, [name]: value, subtype: '' });
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
    
    if (!formData.type) newErrors.type = 'Asset type is required';
    if (!formData.name) newErrors.name = 'Asset name is required';
    if (!formData.balance) {
      newErrors.balance = 'Balance is required';
    } else if (isNaN(Number(formData.balance))) {
      newErrors.balance = 'Balance must be a number';
    }
    
    if (formData.interestRate && isNaN(Number(formData.interestRate))) {
      newErrors.interestRate = 'Interest rate must be a number';
    }
    
    if (formData.annualContribution && isNaN(Number(formData.annualContribution))) {
      newErrors.annualContribution = 'Annual contribution must be a number';
    }
    
    if (formData.growthRate && isNaN(Number(formData.growthRate))) {
      newErrors.growthRate = 'Growth rate must be a number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    const assetData = {
      ...formData,
      balance: parseFloat(formData.balance),
      interestRate: formData.interestRate ? parseFloat(formData.interestRate) : null,
      annualContribution: formData.annualContribution ? parseFloat(formData.annualContribution) : null,
      growthRate: formData.growthRate ? parseFloat(formData.growthRate) : null,
    };

    if (initialValues?.statementPath) {
      (assetData as any).statementPath = initialValues.statementPath;
      (assetData as any).statementName = initialValues.statementName;
    }
    
    onSubmit(assetData);
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
          <label className="block text-sm font-medium text-gray-700">Asset Type*</label>
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
            {assetTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
        </div>
        
        {formData.type && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Subtype</label>
            <select
              name="subtype"
              value={formData.subtype}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="">Select Subtype</option>
              {formData.type === 'Cash' ? 
                cashSubtypes.map(subtype => (
                  <option key={subtype} value={subtype}>{subtype}</option>
                )) :
                investmentSubtypes.map(subtype => (
                  <option key={subtype} value={subtype}>{subtype}</option>
                ))
              }
            </select>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Asset Name*</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
              errors.name ? 'border-red-500' : ''
            }`}
            placeholder="E.g., Chase Checking, Vanguard 401(k)"
            required
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
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
        
        {formData.type === 'Cash' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Interest Rate (%)</label>
            <input
              type="text"
              name="interestRate"
              value={formData.interestRate}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                errors.interestRate ? 'border-red-500' : ''
              }`}
              placeholder="1.5"
            />
            {errors.interestRate && <p className="mt-1 text-xs text-red-500">{errors.interestRate}</p>}
          </div>
        )}
        
        {formData.type === 'Investment' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Annual Contribution</label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  name="annualContribution"
                  value={formData.annualContribution}
                  onChange={handleChange}
                  className={`block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                    errors.annualContribution ? 'border-red-500' : ''
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.annualContribution && <p className="mt-1 text-xs text-red-500">{errors.annualContribution}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Expected Growth Rate (%)</label>
              <input
                type="text"
                name="growthRate"
                value={formData.growthRate}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                  errors.growthRate ? 'border-red-500' : ''
                }`}
                placeholder="7.0"
              />
              {errors.growthRate && <p className="mt-1 text-xs text-red-500">{errors.growthRate}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Asset Class</label>
              <select
                name="assetClass"
                value={formData.assetClass}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="">Select Asset Class</option>
                {assetClasses.map(assetClass => (
                  <option key={assetClass} value={assetClass}>{assetClass}</option>
                ))}
              </select>
            </div>
          </>
        )}
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
          {isSubmitting ? 'Saving...' : initialValues ? 'Update Asset' : 'Add Asset'}
        </button>
      </div>
    </motion.form>
  );
};

export default AssetForm;