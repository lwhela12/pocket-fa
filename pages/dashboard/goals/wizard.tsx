// @ts-nocheck
import { useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { NextPageWithLayout } from '../../_app';
import { fetchApi } from '../../../lib/api-utils';
import { useAuth } from '../../../hooks/useAuth';

const goalOptions = [
  { id: 'college', label: 'College Planning' },
  { id: 'house', label: 'Buying a house' },
  { id: 'business', label: 'Starting a business' },
  { id: 'other', label: 'Other' },
];

const Wizard: NextPageWithLayout = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [age, setAge] = useState('');
  const [retirementAge, setRetirementAge] = useState('');
  const [spending, setSpending] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [goalData, setGoalData] = useState<Record<string, { amount: string; date: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const toggleGoal = (id: string) => {
    setSelectedGoals(g =>
      g.includes(id) ? g.filter(x => x !== id) : [...g, id]
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      await fetchApi('/api/profile', {
        method: 'POST',
        body: JSON.stringify({ age: parseInt(age, 10), retirementAge: parseInt(retirementAge, 10) }),
      });

      const goalsToCreate = [] as any[];
      if (retirementAge && spending) {
        const yearsToRetire = parseInt(retirementAge, 10) - parseInt(age || '0', 10);
        const targetDate = new Date();
        targetDate.setFullYear(targetDate.getFullYear() + yearsToRetire);
        const retirementAmount = parseFloat(spending) * 12 * 25;
        goalsToCreate.push({ name: 'Retirement', targetAmount: retirementAmount, currentAmount: 0, targetDate });
      }
      selectedGoals.forEach(id => {
        const info = goalData[id];
        if (info?.amount && info?.date) {
          goalsToCreate.push({
            name: goalOptions.find(g => g.id === id)?.label || id,
            targetAmount: parseFloat(info.amount),
            currentAmount: 0,
            targetDate: new Date(info.date),
          });
        }
      });

      for (const g of goalsToCreate) {
        await fetchApi('/api/dashboard/goals', {
          method: 'POST',
          body: JSON.stringify(g),
        });
      }

      router.push('/dashboard/goals');
    } catch (err: any) {
      setError(err.message || 'Failed to save goals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-8">
      {error && <p className="mb-4 text-red-600">{error}</p>}

      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">How old are you?</h1>
          <input type="number" className="input w-full" value={age} onChange={e => setAge(e.target.value)} />
          <div className="flex justify-end space-x-2">
            <button className="btn" onClick={() => setStep(2)} disabled={!age}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Is there an age you have in mind that you would like to retire?</h1>
          <input type="number" className="input w-full" value={retirementAge} onChange={e => setRetirementAge(e.target.value)} />
          <div className="flex justify-between">
            <button className="btn" onClick={() => setStep(1)}>Back</button>
            <button className="btn" onClick={() => setStep(3)} disabled={!retirementAge}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">About how much money do you spend per month?</h1>
          <input type="number" className="input w-full" value={spending} onChange={e => setSpending(e.target.value)} />
          <div className="flex justify-between">
            <button className="btn" onClick={() => setStep(2)}>Back</button>
            <button className="btn" onClick={() => setStep(4)} disabled={!spending}>Next</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold">Are there other financial goals that you might like to achieve before you retire?</h1>
          {goalOptions.map(option => (
            <label key={option.id} className="flex items-center space-x-2">
              <input type="checkbox" checked={selectedGoals.includes(option.id)} onChange={() => toggleGoal(option.id)} />
              <span>{option.label}</span>
            </label>
          ))}
          {selectedGoals.map(id => (
            <div key={id} className="mt-4 space-y-2 rounded-md bg-gray-50 p-4">
              <p className="font-medium">{goalOptions.find(g => g.id === id)?.label || id}</p>
              <input
                type="number"
                className="input w-full"
                placeholder="Amount"
                value={goalData[id]?.amount || ''}
                onChange={e => setGoalData({ ...goalData, [id]: { ...(goalData[id] || {}), amount: e.target.value } })}
              />
              <input
                type="date"
                className="input w-full"
                value={goalData[id]?.date || ''}
                onChange={e => setGoalData({ ...goalData, [id]: { ...(goalData[id] || {}), date: e.target.value } })}
              />
            </div>
          ))}
          <div className="flex justify-between">
            <button className="btn" onClick={() => setStep(3)}>Back</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : 'Finish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

Wizard.getLayout = function getLayout(page: React.ReactElement) {
  return <DashboardLayout title="Goal Setup">{page}</DashboardLayout>;
};

export default Wizard;
