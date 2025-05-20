import { ReactElement, useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { NextPageWithLayout } from '../_app';
import { useAuth } from '../../hooks/useAuth';
import { fetchApi } from '../../lib/api-utils';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

const ProfilePage: NextPageWithLayout = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const loadGoals = async () => {
    try {
      setIsLoading(true);
      const response = await fetchApi<Goal[]>('/api/dashboard/goals');
      if (response.success && response.data) {
        setGoals(response.data as Goal[]);
      } else {
        setError(response.error || 'Failed to fetch goals');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
        <p className="mt-1 text-gray-600">Personal information and goal summary</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-semibold text-gray-900">{user?.name || 'User'}</h2>
        <p className="mt-1 text-gray-600">Age: {user?.age ?? 'N/A'}</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Your Goals</h2>
        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : goals.length > 0 ? (
          <ul className="space-y-4">
            {goals.map((goal) => (
              <li key={goal.id} className="border-b pb-2 last:border-b-0">
                <p className="font-medium text-gray-900">{goal.name}</p>
                <p className="text-sm text-gray-500">
                  ${'{'}goal.currentAmount.toLocaleString(){'}'} of ${'{'}goal.targetAmount.toLocaleString(){'}'} saved
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">You have no saved goals yet.</p>
        )}
      </div>
    </>
  );
};

ProfilePage.getLayout = function getLayout(page: ReactElement) {
  return (
    <DashboardLayout title="Your Profile | Pocket Financial Advisor">
      {page}
    </DashboardLayout>
  );
};

export default ProfilePage;
