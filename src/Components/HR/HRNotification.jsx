import React, { useState, useEffect } from 'react';
import HrSidebar from './HrSidebar';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { IoTrash, IoCheckmarkDone } from 'react-icons/io5';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const HRNotification = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const currentUser = "HR";

  /* ================= FETCH NOTIFICATIONS (Real-time) ================= */
  useEffect(() => {
    // Simple query without orderBy to avoid index requirement
    const q = query(
      collection(db, "reminders"),
      where("createdBy", "==", currentUser)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // STRICT CONDITIONS: Only show valid notifications
        // 1. Must have status (approved or rejected, NOT pending)
        // 2. Must have updatedAt and updatedBy (someone took action)
        // 3. Must NOT be deleted
        if (
          data.status && 
          data.status !== "pending" &&
          data.updatedAt &&
          data.updatedBy &&
          data.notificationDeleted !== true
        ) {
          const updatedDate = data.updatedAt.toDate();
          const now = new Date();
          const diffMinutes = Math.floor((now - updatedDate) / 60000);
          const diffHours = Math.floor(diffMinutes / 60);
          const diffDays = Math.floor(diffHours / 24);

          let timeAgo = "Just now";
          if (diffMinutes >= 1 && diffMinutes < 60) timeAgo = `${diffMinutes}m ago`;
          else if (diffHours >= 1 && diffHours < 24) timeAgo = `${diffHours}h ago`;
          else if (diffDays >= 1) timeAgo = `${diffDays}d ago`;

          // Explicit check: isNotificationRead === true means READ
          // Anything else (false, undefined, null) means UNREAD
          const isRead = data.isNotificationRead === true;

          notifs.push({
            id: docSnap.id,
            day: diffDays === 0 ? "Today" : "Yesterday",
            firstName: data.updatedBy || "System",
            lastName: "",
            messageTitle:
              data.status === "approved"
                ? `approved '${data.title}'`
                : `rejected '${data.title}'`,
            messageSub: `Reminder for ${data.assignedTo || "All"}`,
            time: timeAgo,
            isRead,
            status: data.status,
            updatedAt: updatedDate,
            bgColor:
              data.status === "approved" ? "bg-[#28C76F14]" : "bg-[#FF9F4314]",
            textColor:
              data.status === "approved" ? "text-[#28C76F]" : "text-[#FF9F43]"
          });
        }
      });

      // Sort by updatedAt in JavaScript (newest first)
      notifs.sort((a, b) => b.updatedAt - a.updatedAt);

      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  /* ================= FILTER TABS ================= */
  const filteredData =
    activeTab === "All"
      ? notifications
      : activeTab === "Unread"
      ? notifications.filter(n => !n.isRead)
      : notifications.filter(n => n.isRead); // Due = Read

  /* ================= ACTIONS ================= */
  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation(); // Prevent event bubbling
    
    try {
      await updateDoc(doc(db, "reminders", id), {
        isNotificationRead: true
      });
      
      // Success toast with custom styling
      toast.success("✓ Marked as read", {
        position: "top-center",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        className: "px-5"
      });
    } catch (err) {
      console.error("Error marking as read:", err);
      toast.error("Failed to mark as read", {
        position: "top-center",
        autoClose: 2000,
        className: "px-5"
      });
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.isRead);
    
    if (unreadNotifs.length === 0) {
      toast.info("All notifications are already read", {
        position: "top-center",
        autoClose: 2000,
        className: "px-5"
      });
      return;
    }

    try {
      const batch = writeBatch(db);
      
      unreadNotifs.forEach(n => {
        batch.update(doc(db, "reminders", n.id), {
          isNotificationRead: true
        });
      });
      
      await batch.commit();
      
      toast.success(`✓ ${unreadNotifs.length} notification${unreadNotifs.length > 1 ? 's' : ''} marked as read`, {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: false,
        className: "px-5"
      });
    } catch (err) {
      console.error("Error marking all as read:", err);
      toast.error("Failed to mark all as read", {
        position: "top-center",
        autoClose: 2000,
        className: "px-5"
      });
    }
  };

  const deleteNotification = async (id, e) => {
    if (e) e.stopPropagation(); // Prevent event bubbling
    
    try {
      await updateDoc(doc(db, "reminders", id), {
        notificationDeleted: true
      });
      
      toast.success("✓ Notification removed", {
        position: "top-center",
        autoClose: 1500,
        hideProgressBar: false,
        className: "px-5"
      });
    } catch (err) {
      console.error("Error deleting notification:", err);
      toast.error("Failed to remove notification", {
        position: "top-center",
        autoClose: 2000,
        className: "px-5"
      });
    }
  };

  const getInitials = (first, last) =>
    `${first.charAt(0)}${last ? last.charAt(0) : first.charAt(1) || ''}`;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  /* ================= UI ================= */
  return (
    <>
      <HrSidebar />
      <ToastContainer />

      {/* Main Content */}
      <div className=''>
        <div className="flex justify-between items-center px-4 pt-4">
          <p className="text-2xl font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              <IoCheckmarkDone className='text-lg' />
              Mark All Read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className='lg:w-1/2 px-4 mt-4 flex justify-between py-3'>
          {["All", "Unread", "Due"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2 rounded-full text-xs font-medium relative
                ${activeTab === tab
                  ? "bg-[#0081FF] text-white"
                  : "text-[#2C3E50]"
                }`}
            >
              {tab}
              {tab === "Unread" && unreadCount > 0 && (
                <span className='absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold'>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className='min-h-screen mt-4 mr-4'>
          {filteredData.length === 0 ? (
            <div className='text-center py-10'>
              <p className="text-gray-500 text-lg">📭 No notifications found</p>
              <p className="text-gray-400 text-sm mt-2">
                {activeTab === "Unread" ? "All caught up!" : "You'll see notifications here"}
              </p>
            </div>
          ) : (
            <>
              {/* TODAY */}
              {filteredData.filter(item => item.day === "Today").length > 0 && (
                <>
                  <p className='text-[#6C7B91] text-sm font-semibold px-4'>Today</p>
                  {filteredData
                    .filter(item => item.day === "Today")
                    .map(item => (
                      <div 
                        key={item.id} 
                        className={`m-5 h-25 flex relative group ${!item.isRead ? 'bg-blue-50 rounded-lg p-2' : ''}`}
                      >
                        {!item.isRead && (
                          <div className='absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg'></div>
                        )}
                        
                        <div className={`w-15 h-15 rounded-full ${item.bgColor} flex items-center justify-center mt-3 ml-2`}>
                          <p className={`${item.textColor} font-medium text-base`}>
                            {getInitials(item.firstName, item.lastName)}
                          </p>
                        </div>
                        <div className='space-y-2 px-4 mt-3 flex-1'>
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

                        {/* Action buttons - show on hover */}
                        <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                          {!item.isRead && (
                            <button
                              onClick={(e) => markAsRead(item.id, e)}
                              className='p-2 hover:bg-green-100 rounded-full transition-colors'
                              title='Mark as read'
                            >
                              <IoCheckmarkDone className='text-green-600 text-xl' />
                            </button>
                          )}
                          <button
                            onClick={(e) => deleteNotification(item.id, e)}
                            className='p-2 hover:bg-red-100 rounded-full transition-colors'
                            title='Remove'
                          >
                            <IoTrash className='text-red-500 text-xl' />
                          </button>
                        </div>
                      </div>
                    ))}
                </>
              )}

              {/* YESTERDAY */}
              {filteredData.filter(item => item.day === "Yesterday").length > 0 && (
                <>
                  <p className='text-[#6C7B91] text-sm font-semibold px-4 mt-6'>Yesterday</p>
                  {filteredData
                    .filter(item => item.day === "Yesterday")
                    .map(item => (
                      <div 
                        key={item.id} 
                        className={`m-5 h-25 flex relative group ${!item.isRead ? 'bg-blue-50 rounded-lg p-2' : ''}`}
                      >
                        {!item.isRead && (
                          <div className='absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg'></div>
                        )}
                        
                        <div className={`w-15 h-15 rounded-full ${item.bgColor} flex items-center justify-center mt-3 ml-2`}>
                          <p className={`${item.textColor} font-medium text-base`}>
                            {getInitials(item.firstName, item.lastName)}
                          </p>
                        </div>
                        <div className='space-y-2 px-4 mt-3 flex-1'>
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

                        {/* Action buttons - show on hover */}
                        <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                          {!item.isRead && (
                            <button
                              onClick={(e) => markAsRead(item.id, e)}
                              className='p-2 hover:bg-green-100 rounded-full transition-colors'
                              title='Mark as read'
                            >
                              <IoCheckmarkDone className='text-green-600 text-xl' />
                            </button>
                          )}
                          <button
                            onClick={(e) => deleteNotification(item.id, e)}
                            className='p-2 hover:bg-red-100 rounded-full transition-colors'
                            title='Remove'
                          >
                            <IoTrash className='text-red-500 text-xl' />
                          </button>
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