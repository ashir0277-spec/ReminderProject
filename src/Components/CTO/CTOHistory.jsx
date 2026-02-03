import React, { useState, useEffect } from 'react'
import Sidebar from './SidebarOther'
import Topbar from '../Admin/Topbar'
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase';

const CTOHistory = () => {
  const [contractsData, setContractsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch reminders from Firebase
  const fetchReminders = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "reminders"));
      const fetched = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          title: data.title || "No Title",
          dateAndTime: formatDateTime(data.date, data.time),
          createdBy: data.createdBy || "Unknown",
          status: getStatusText(data.status, data.updatedBy),
          statusColor: getStatusColor(data.status),
          priority: data.priority || "Normal",
          priorityColor: getPriorityColor(data.priority),
          createdAt: data.createdAt?.toDate() || new Date()
        };
      });
      
      // Sort by date (newest first)
      const sorted = fetched.sort((a, b) => b.createdAt - a.createdAt);
      
      setContractsData(sorted);
      console.log('✅ Fetched CTO History:', sorted);
    } catch (err) {
      console.error("❌ Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchReminders();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Helper functions
  const formatDateTime = (date, time) => {
    if (!date) return "No Date";
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const formattedTime = time || "";
    return `${formattedDate} ${formattedTime}`;
  };

  const getStatusText = (status, updatedBy) => {
    if (status === 'approved') {
      return updatedBy ? `Approved by ${updatedBy}` : 'Approved';
    }
    if (status === 'reject') {
      return updatedBy ? `Rejected by ${updatedBy}` : 'Rejected';
    }
    if (status === 'pending') return 'Pending';
    return status;
  };

  const getStatusColor = (status) => {
    if (status === 'approved') return 'text-green-600';
    if (status === 'reject') return 'text-red-600';
    if (status === 'pending') return 'text-orange-500';
    return 'text-gray-600';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'Very High' || priority === 'High') return 'text-red-600';
    if (priority === 'Normal') return 'text-orange-500';
    return 'text-blue-600';
  };

  return (
    <>
      <Sidebar />
     
      <div className=" ">
        {/* Scroll Container */}
        <div className="overflow-x-auto">

          {/* Headings */}
          <div className="min-w-[900px] grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr]
                          bg-gray-200 px-4 py-2 rounded-md font-semibold text-gray-700">
            <div>Title</div>
            <div>Date & Time</div>
            <div>Created By</div>
            <div>Status</div>
            <div className="text-right">Priority</div>
          </div>

          {/* Loading State */}
          {loading && contractsData.length === 0 ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            /* Rows */
            <div className="space-y-2 mt-2">
              {contractsData.length > 0 ? (
                contractsData.map((item, index) => (
                  <div
                    key={index}
                    className="min-w-[900px] grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr]
                               bg-white px-4 py-3 rounded-md shadow-sm"
                  >
                    <div>{item.title}</div>
                    <div>{item.dateAndTime}</div>
                    <div>{item.createdBy}</div>
                    <div className={item.statusColor}>{item.status}</div>
                    <div className={`text-right font-semibold ${item.priorityColor}`}>
                      {item.priority}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <p>No reminders found</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default CTOHistory