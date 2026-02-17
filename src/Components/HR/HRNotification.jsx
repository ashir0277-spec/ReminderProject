import React, { useState, useEffect } from 'react';
import HrSidebar from './HrSidebar';
import {
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { IoCheckmarkDone } from 'react-icons/io5';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useHRNotification } from './HRNotificationContext';

const HRNotification = () => {
  const [activeTab, setActiveTab] = useState("All");
  const { notifications, unreadCount } = useHRNotification();

  const filteredData =
    activeTab === "All"
      ? notifications.filter(n => n.isRead)
      : notifications.filter(n => !n.isRead);

  // Auto-mark as read when Unread tab is opened
  useEffect(() => {
    if (activeTab !== "Unread") return;
    const unread = notifications.filter(n => !n.isRead);
    if (!unread.length) return;

    const timer = setTimeout(async () => {
      try {
        const batch = writeBatch(db);
        unread.forEach(n => {
          batch.update(doc(db, "reminders", n.id), { isNotificationRead: true });
        });
        await batch.commit();
        toast.success(`${unread.length} notification${unread.length > 1 ? 's' : ''} marked as read`, {
          position: "top-center",
          autoClose: 1600,
        });
        setTimeout(() => setActiveTab("All"), 600);
      } catch (err) {
        console.error("Auto-mark failed:", err);
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [activeTab, notifications]);

  const markAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await updateDoc(doc(db, "reminders", id), { isNotificationRead: true });
      toast.success("✓ Marked as read", { position: "top-center", autoClose: 1200 });
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (!unread.length) {
      toast.info("All caught up!", { autoClose: 1800 });
      return;
    }
    try {
      const batch = writeBatch(db);
      unread.forEach(n => batch.update(doc(db, "reminders", n.id), { isNotificationRead: true }));
      await batch.commit();
      toast.success(`✓ ${unread.length} notification${unread.length > 1 ? 's' : ''} marked as read`);
    } catch (err) {
      console.error("Mark all failed:", err);
    }
  };

  const getInitials = (first, last) =>
    `${first?.charAt(0) || ''}${last ? last.charAt(0) : first?.charAt(1) || ''}`;

  return (
    <>
      <HrSidebar />
      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={3}
      />

      <div className="p-5 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-2xl font-semibold">Notifications</h1>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition w-full sm:w-auto shadow-md"
            >
              <IoCheckmarkDone size={18} />
              Mark All Read ({unreadCount})
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {["All", "Unread"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab}
              {tab === "Unread" && unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2.5 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-xl font-medium"> No notifications yet</p>
            <p className="mt-3 text-gray-400">
              {activeTab === "Unread"
                ? "You're all caught up! "
                : "New approvals/rejections will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {["Today", "Yesterday", "Earlier"].map(section => {
              const sectionItems = filteredData.filter(n => n.day === section);
              if (!sectionItems.length) return null;

              return (
                <div key={section}>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">{section}</h3>
                  {sectionItems.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all group mb-3 ${
                        !item.isRead
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'hover:bg-gray-50 border-gray-100'
                      }`}
                    >
                      {!item.isRead && (
                        <div className="w-2.5 h-2.5 mt-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                      )}

                      <div className={`w-12 h-12 rounded-full ${item.bgColor} flex items-center justify-center flex-shrink-0 font-semibold ${item.textColor}`}>
                        {getInitials(item.firstName, item.lastName)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">
                          {item.firstName} {item.messageTitle}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{item.messageSub}</p>
                        <p className="text-xs text-gray-500 mt-2">{item.time}</p>
                      </div>

                      {activeTab === "Unread" && !item.isRead && (
                        <button
                          onClick={e => markAsRead(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-all p-2.5 hover:bg-green-50 rounded-full flex-shrink-0"
                          title="Mark as read"
                        >
                          <IoCheckmarkDone className="text-green-600" size={22} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default HRNotification;