import React from 'react';
import UsersIcon from '../assets/Users.svg';
import ActiveIcon from '../assets/active.svg';
import InactiveIcon from '../assets/inactive.svg';
import { useUserStats } from '../Context/UserContext'

const StatsCard = () => {
  const { userStats, loading } = useUserStats();

  const dashboardStats = [
    { id: 1, title: "Total Users", value: userStats.total, icon: UsersIcon },
    { id: 2, title: "Active Users", value: userStats.active, icon: ActiveIcon },
    { id: 3, title: "Inactive Users", value: userStats.inactive, icon: InactiveIcon },
  ];

  return (
    <>
      <p className='text-2xl font-semibold pt- lgml-[21%]'>Admin Dashboard</p>
      
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 lg:ml[21%]">
        {loading ? (
          // Loading skeleton
          [1, 2, 3].map((item) => (
            <div key={item} className='min-h-auto py-1 w-full mr-5 border border-[#47546729] bg-white rounded-md animate-pulse'>
              <div className='flex justify-between px-4 py-2'>
                <div className='h-8 w-16 bg-gray-200 rounded'></div>
                <div className='w-6 h-6 bg-gray-200 rounded'></div>
              </div>
              <div className='pl-4 py-2'>
                <div className='h-4 w-24 bg-gray-200 rounded'></div>
              </div>
            </div>
          ))
        ) : (
          // Actual stats with smooth transition
          dashboardStats.map((item) => (
            <div 
              key={item.id} 
              className='min-h-auto py-1 w-full mr-5 border border-[#47546729] bg-white rounded-md hover:shadow-md transition-all duration-300'
            >
              <div className='flex justify-between px-4 py-2'>
                <p className='text-xl font-bold transition-all duration-300'>{item.value}</p>
                <img src={item.icon} alt={item.title} className="w-6 h-6" />
              </div>
              <p className='pl-4 py-2 text-sm font-medium'>{item.title}</p>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default StatsCard;