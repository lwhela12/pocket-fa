import { ReactElement } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { NextPageWithLayout } from '../_app';
import { useAuth } from '../../hooks/useAuth';

const ProfilePage: NextPageWithLayout = () => {
  const { user } = useAuth();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
        <p className="mt-1 text-gray-600">Personal information and goal summary</p>
      </div>


      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-semibold text-gray-900">{user?.name || 'User'}</h2>
        <p className="mt-1 text-gray-600">Age: {user?.age ?? 'N/A'}</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Retirement Age</h2>
        <p className="text-gray-700">{user?.retirementAge ?? 'N/A'}</p>
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
