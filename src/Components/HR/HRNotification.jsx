import React, { useState, useEffect, useRef } from 'react';
import HrSidebar from './HrSidebar';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { IoCheckmarkDone, IoClose } from 'react-icons/io5';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const HRNotification = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupNotification, setPopupNotification] = useState(null);
  const previousNotificationsRef = useRef([]);
  const currentUser = "HR";

  useEffect(() => {
    const q = query(
      collection(db, "reminders"),
      where("createdBy", "==", currentUser)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        if (
          data.status &&
          data.status !== "pending" &&
          data.updatedAt &&
          data.updatedBy &&
          data.notificationDeleted !== true
        ) {
          // Safely convert updatedAt timestamp
          let updatedDate = new Date(); // fallback

          if (data.updatedAt instanceof Timestamp) {
            updatedDate = data.updatedAt.toDate();
          } else if (data.updatedAt?.toDate) {
            updatedDate = data.updatedAt.toDate();
          } else if (data.updatedAt instanceof Date) {
            updatedDate = data.updatedAt;
          } else if (typeof data.updatedAt === 'number') {
            updatedDate = new Date(data.updatedAt);
          }

          // Calculate difference using epoch milliseconds (timezone-independent)
          const diffMs = Date.now() - updatedDate.getTime();

          // Format "time ago"
          let timeAgo = "Just now";

          if (diffMs < 0) {
            timeAgo = "in the future";
          } else {
            const seconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours   = Math.floor(minutes / 60);
            const days    = Math.floor(hours / 24);

            if (seconds < 45) {
              timeAgo = "Just now";
            } else if (seconds < 90) {
              timeAgo = "1 minute ago";
            } else if (minutes < 45) {
              timeAgo = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
            } else if (minutes < 90) {
              timeAgo = "about 1 hour ago";
            } else if (hours < 24) {
              timeAgo = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            } else if (days < 7) {
              timeAgo = `${days} day${days !== 1 ? 's' : ''} ago`;
            } else {
              timeAgo = updatedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: updatedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              });
            }
          }

          const isRead = data.isNotificationRead === true;

          notifs.push({
            id: docSnap.id,
            day: diffMs < 86400000 ? "Today" : diffMs < 172800000 ? "Yesterday" : "Earlier",
            firstName: data.updatedBy || "System",
            lastName: "",
            title: data.title || "Untitled",
            description: data.description || "",
            messageTitle:
              data.status === "approved"
                ? `approved '${data.title}'`
                : `rejected '${data.title}'`,
            messageSub: `Reminder for ${data.assignedTo || "All"}`,
            time: timeAgo,
            date: data.date || "",
            timeSlot: data.time || "",
            isRead,
            status: data.status,
            updatedAt: updatedDate,
            bgColor: data.status === "approved" ? "bg-[#28C76F14]" : "bg-[#FF9F4314]",
            textColor: data.status === "approved" ? "text-[#28C76F]" : "text-[#FF9F43]",
          });
        }
      });

      // Sort newest first
      notifs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // Detect new unread notifications for popup
      const previousIds = previousNotificationsRef.current.map(n => n.id);
      const newUnread = notifs.find(n => !previousIds.includes(n.id) && !n.isRead);

      if (newUnread && previousNotificationsRef.current.length > 0) {
        setPopupNotification(newUnread);
        setShowPopup(true);
      }

      previousNotificationsRef.current = notifs;
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Filter based on tab
  const filteredData =
    activeTab === "All"
      ? notifications.filter(n => n.isRead === true)
      : activeTab === "Unread"
      ? notifications.filter(n => n.isRead !== true)
      : notifications;

  // Auto-mark unread as read when viewing "Unread" tab
  useEffect(() => {
    if (activeTab !== "Unread") return;

    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const batch = writeBatch(db);
        unread.forEach(n => {
          batch.update(doc(db, "reminders", n.id), {
            isNotificationRead: true,
          });
        });
        await batch.commit();

        toast.success(
          `${unread.length} notification${unread.length !== 1 ? 's' : ''} marked as read`,
          { position: "top-center", autoClose: 1800 }
        );

        setTimeout(() => setActiveTab("All"), 700);
      } catch (err) {
        console.error("Auto mark read failed:", err);
        toast.error("Could not mark notifications as read");
      }
    }, 2400);

    return () => clearTimeout(timer);
  }, [activeTab, notifications]);

  const handleSnooze = () => {
    if (!popupNotification) return;
    setShowPopup(false);
    toast.info("Snoozed for 10 minutes", { position: "top-center", autoClose: 2200 });
  };

  const handleDismiss = async () => {
    if (!popupNotification) return;
    try {
      await updateDoc(doc(db, "reminders", popupNotification.id), {
        isNotificationRead: true,
      });
      setShowPopup(false);
      toast.success("Notification dismissed", { position: "top-center", autoClose: 1600 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to dismiss notification");
    }
  };

  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await updateDoc(doc(db, "reminders", id), {
        isNotificationRead: true,
      });
      toast.success("Marked as read", { position: "top-center", autoClose: 1400 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) {
      toast.info("All notifications already read", { autoClose: 2000 });
      return;
    }

    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, "reminders", n.id), { isNotificationRead: true });
      });
      await batch.commit();
      toast.success(`${unread.length} notification${unread.length !== 1 ? 's' : ''} marked as read`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark all as read");
    }
  };

  const getInitials = (first, last) =>
    `${first.charAt(0)}${last ? last.charAt(0) : first.charAt(1) || ''}`;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <HrSidebar />
      <ToastContainer
        position="top-center"
        autoClose={1800}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* Notification Popup */}
      {showPopup && popupNotification && (
        <div
          className="fixed bottom-6 right-6 z-50 animate-slide-in"
          style={{ width: '547px', maxWidth: 'calc(100vw - 48px)' }}
        >
          <div className="bg-white shadow-2xl rounded-[20px] p-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${popupNotification.bgColor} flex items-center justify-center`}>
                    <span className={`${popupNotification.textColor} font-semibold text-sm`}>
                      {getInitials(popupNotification.firstName, popupNotification.lastName)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">
                      {popupNotification.firstName} {popupNotification.messageTitle}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{popupNotification.time}</p>
                  </div>
                </div>
                <button onClick={() => setShowPopup(false)} className="text-gray-400 hover:text-gray-600">
                  <IoClose className="text-xl" />
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Title:</p>
                  <p className="text-sm text-gray-600">{popupNotification.title}</p>
                </div>
                {popupNotification.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Description:</p>
                    <p className="text-sm text-gray-600">{popupNotification.description}</p>
                  </div>
                )}
                <div className="flex gap-4 text-xs text-gray-500">
                  {popupNotification.date && <span>📅 {popupNotification.date}</span>}
                  {popupNotification.timeSlot && <span>🕐 {popupNotification.timeSlot}</span>}
                </div>
              </div>

              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleSnooze}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm"
                >
                  ⏰ Snooze
                </button>
                <button
                  onClick={handleDismiss}
                  className="flex-1 bg-[#0081FF] hover:bg-[#0066cc] text-white font-medium py-2 rounded-lg text-sm"
                >
                  ✓ Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="">
        <div className="flex justify-between items-center px-4 pt-4">
          <p className="text-2xl font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-medium"
            >
              <IoCheckmarkDone className="text-lg" />
              Mark All Read
            </button>
          )}
        </div>

        <div className="lg:w-1/2 px-4 mt-4 flex gap-4 py-3">
          {["All", "Unread"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2 rounded-full text-xs font-medium relative ${
                activeTab === tab ? "bg-[#0081FF] text-white" : "text-[#2C3E50]"
              }`}
            >
              {tab}
              {tab === "Unread" && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="min-h-screen mt-4 mr-4">
          {filteredData.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-lg">📭 No notifications found</p>
              <p className="text-gray-400 text-sm mt-2">
                {activeTab === "Unread" ? "All caught up!" : "You'll see notifications here"}
              </p>
            </div>
          ) : (
            <>
              {["Today", "Yesterday", "Earlier"].map(section => {
                const items = filteredData.filter(item => item.day === section);
                if (items.length === 0) return null;

                return (
                  <div key={section}>
                    <p className="text-[#6C7B91] text-sm font-semibold px-4 mt-6">{section}</p>
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={`m-5 flex relative group ${!item.isRead ? 'bg-blue-50 rounded-lg p-2' : ''}`}
                      >
                        {!item.isRead && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg" />
                        )}
                        <div className={`w-15 h-15 rounded-full ${item.bgColor} flex items-center justify-center mt-3 ml-2`}>
                          <p className={`${item.textColor} font-medium text-base`}>
                            {getInitials(item.firstName, item.lastName)}
                          </p>
                        </div>
                        <div className="space-y-2 px-4 mt-3 flex-1">
                          <p className="text-base font-semibold">
                            {item.firstName} {item.lastName} {item.messageTitle}
                          </p>
                          <p className="text-[#575B74] text-sm font-medium">
                            {item.messageSub}
                          </p>
                          <p className="text-[#8D91AF] text-xs font-medium">
                            {item.time}
                          </p>
                        </div>

                        {activeTab === "Unread" && !item.isRead && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={e => markAsRead(item.id, e)}
                              className="p-2 hover:bg-green-100 rounded-full transition-colors"
                              title="Mark as read"
                            >
                              <IoCheckmarkDone className="text-green-600 text-xl" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default HRNotification;