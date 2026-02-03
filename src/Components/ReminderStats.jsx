import React, { useState, useEffect } from 'react'
import { FiUsers } from "react-icons/fi";
import { MdOutlinePriorityHigh } from "react-icons/md";
import { IoTimeOutline } from "react-icons/io5";
import { collection, getDocs } from "firebase/firestore";
import { db } from './firebase';

const ReminderStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    urgent: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);

  const currentUser = sessionStorage.getItem('userRole') || "HR";

  // Fetch and calculate stats from Firebase
  const fetchStats = async () => {
    try {
      const snapshot = await getDocs(collection(db, "reminders"));
      const reminders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by current user (my reminders)
      const myReminders = reminders.filter(r => r.createdBy === currentUser);
      
      // Calculate stats
      const total = myReminders.length;
      const urgent = myReminders.filter(r => r.priority === 'Very High' || r.priority === 'High').length;
      const pending = myReminders.filter(r => r.status === 'pending').length;
      
      setStats({ total, urgent, pending });
      
      console.log('✅ Stats Updated:', { total, urgent, pending });
    } catch (err) {
      console.error("❌ Error fetching reminder stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const reminderStats = [
    {
      id: 1,
      count: stats.total,
      label: "Total Reminders",
      icon: <FiUsers className='text-white text-2xl' />,
      bgColor: "bg-[#0081FF]",
    },
    {
      id: 2,
      count: stats.urgent,
      label: "Urgent",
      icon: <MdOutlinePriorityHigh className='text-white text-2xl' />,
      bgColor: "bg-[#EF4444]",
    },
    {
      id: 3,
      count: stats.pending,
      label: "Pending",
      icon: <IoTimeOutline className='text-white text-2xl' />,
      bgColor: "bg-[#F59E0B]",
    }
  ];

  return (
    <>
      <p className='text-2xl font-semibold px-3'>My Reminders</p>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-3  my-6'>
        {reminderStats.map((item) => (
          <div 
            key={item.id} 
            className='bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200'
          >
            <div className='flex justify-between items-start'>
              <div className='flex flex-col gap-4'>
                <p className='text-xl font-bold text-gray-800'>
                  {loading && stats.total === 0 ? (
                    <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse"></span>
                  ) : (
                    item.count
                  )}
                </p>
                <p className='text-sm font-medium text-gray-600 mt-1'>{item.label}</p>
              </div>
              <div className={`w-12 h-12 flex items-center justify-center ${item.bgColor} rounded-lg shadow-sm`}>
                {item.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default ReminderStats