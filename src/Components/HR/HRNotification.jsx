import React, { useState, useEffect } from 'react';
import Sidebar from './HrSidebar';
import Topbar from '../Admin/Topbar';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const HRNotification = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const currentUser = "HR";

  // Fetch real notifications from Firebase
  useEffect(() => {
    const q = query(
      collection(db, "reminders"),
      where("createdBy", "==", currentUser),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Only show if status changed (approved or rejected)
        if (data.status !== 'pending' && data.updatedBy && data.updatedAt) {
          const updatedDate = data.updatedAt?.toDate();
          const now = new Date();
          const diffTime = now - updatedDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
          const diffMinutes = Math.floor(diffTime / (1000 * 60));
          
          let timeAgo = '';
          if (diffMinutes < 60) timeAgo = `${diffMinutes}m ago`;
          else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
          else timeAgo = `${diffDays}d ago`;
          
          notifs.push({
            id: doc.id,
            day: diffDays === 0 ? "Today" : "Yesterday",
            firstName: data.updatedBy || "Unknown",
            lastName: "",
            messageTitle: data.status === 'approved' 
              ? `approved '${data.title}'`
              : `rejected '${data.title}'`,
            messageSub: `Reminder for ${data.assignedTo}`,
            time: timeAgo,
            type: data.status === 'approved' ? "Due" : "Unread",
            bgColor: data.status === 'approved' ? "bg-[#28C76F14]" : "bg-[#FF9F4314]",
            textColor: data.status === 'approved' ? "text-[#28C76F]" : "text-[#FF9F43]"
          });
        }
      });

      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, []);

  // Tabs filter
  const filteredData =
    activeTab === "All"
      ? notifications
      : notifications.filter(item => item.type === activeTab);

  // Initials
  const getInitials = (first, last) =>
    `${first.charAt(0)}${last ? last.charAt(0) : first.charAt(1) || ''}`;

  return (
    <>
      <Sidebar />

      <div className=''>
        <p className='text-2xl font-semibold px-4 pt-4'>Notifications</p>

        {/* Tabs */}
        <div className='lg:w-1/2 px-4 mt-4 flex justify-between py-3'>
          {["All", "Unread", "Due"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2 rounded-full text-xs font-medium
                ${activeTab === tab
                  ? "bg-[#0081FF] text-white"
                  : "text-[#2C3E50]"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className='min-h-screen mt-4 mr-4'>
          {filteredData.length === 0 ? (
            <p className="text-gray-500 text-sm pl-6">No notifications found</p>
          ) : (
            <>
              {/* TODAY */}
              {filteredData.filter(item => item.day === "Today").length > 0 && (
                <>
                  <p className='text-[#6C7B91] text-sm font-semibold px-4'>Today</p>
                  {filteredData
                    .filter(item => item.day === "Today")
                    .map(item => (
                      <div key={item.id} className='m-5 h-25 flex'>
                        <div className={`w-15 h-15 rounded-full ${item.bgColor} flex items-center justify-center mt-3`}>
                          <p className={`${item.textColor} font-medium text-base`}>
                            {getInitials(item.firstName, item.lastName)}
                          </p>
                        </div>
                        <div className='space-y-2 px-4 mt-3'>
                          <p className='text-base font-semibold'>
                            {item.firstName} {item.lastName} {item.messageTitle}
                          </p>
                          <p className='text-[#575B74] text-sm font-medium'>
                            {item.messageSub}
                          </p>
                          <p className='text-[#8D91AF] text-xs font-medium'>
                            {item.time}
                          </p>
                        </div>
                      </div>
                    ))}
                </>
              )}

              {/* YESTERDAY */}
              {filteredData.filter(item => item.day === "Yesterday").length > 0 && (
                <>
                  <p className='text-[#6C7B91] text-sm font-semibold px-4'>Yesterday</p>
                  {filteredData
                    .filter(item => item.day === "Yesterday")
                    .map(item => (
                      <div key={item.id} className='m-5 h-25 flex'>
                        <div className={`w-15 h-15 rounded-full ${item.bgColor} flex items-center justify-center mt-3`}>
                          <p className={`${item.textColor} font-medium text-base`}>
                            {getInitials(item.firstName, item.lastName)}
                          </p>
                        </div>
                        <div className='space-y-2 px-4 mt-3'>
                          <p className='text-base font-semibold'>
                            {item.firstName} {item.lastName} {item.messageTitle}
                          </p>
                          <p className='text-[#575B74] text-sm font-medium'>
                            {item.messageSub}
                          </p>
                          <p className='text-[#8D91AF] text-xs font-medium'>
                            {item.time}
                          </p>
                        </div>
                      </div>
                    ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default HRNotification;