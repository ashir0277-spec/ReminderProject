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
  const [popupQueue, setPopupQueue] = useState([]);
  const [currentPopup, setCurrentPopup] = useState(null);
  const previousNotificationsRef = useRef({});
  const isInitialLoad = useRef(true);
  const snoozeTimeoutsRef = useRef({});
  const currentUser = "HR";

  useEffect(() => {
    const q = query(
      collection(db, "reminders"),
      where("createdBy", "==", currentUser)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];
      const currentMap = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Sirf approved/rejected reminders ko list mein dikhana hai
        if (
          data.status &&
          data.status !== "pending" &&
          data.updatedAt &&
          data.updatedBy &&
          data.notificationDeleted !== true
        ) {
          let updatedDate = new Date();
          if (data.updatedAt instanceof Timestamp) {
            updatedDate = data.updatedAt.toDate();
          } else if (data.updatedAt instanceof Date) {
            updatedDate = data.updatedAt;
          } else if (typeof data.updatedAt === 'number') {
            updatedDate = new Date(data.updatedAt);
          }

          const diffMs = Date.now() - updatedDate.getTime();

          let timeAgo = "Just now";
          if (diffMs > 0) {
            const seconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (seconds < 45) timeAgo = "Just now";
            else if (seconds < 90) timeAgo = "1 minute ago";
            else if (minutes < 45) timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            else if (minutes < 90) timeAgo = "about 1 hour ago";
            else if (hours < 24) timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
            else if (days < 7) timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
            else {
              timeAgo = updatedDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: updatedDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
              });
            }
          }

          const isRead = data.isNotificationRead === true;
          const popupDismissed = data.popupDismissed === true;

          const notif = {
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
            alertTime: data.alertTime || "",
            priority: data.priority || "Normal",
            assignedTo: data.assignedTo || "All",
            reason: data.reason || "",
            isRead,
            popupDismissed,
            status: data.status,
            updatedAt: updatedDate,
            bgColor: data.status === "approved" ? "bg-[#28C76F14]" : "bg-[#FF9F4314]",
            textColor: data.status === "approved" ? "text-[#28C76F]" : "text-[#FF9F43]",
          };
          notifs.push(notif);
          currentMap[docSnap.id] = notif;
        } else {
          // Pending reminders ko bhi map mein store karo taake status change detect ho sake
          // Unki details kam ki nahi, bas status pending store karo
          currentMap[docSnap.id] = {
            id: docSnap.id,
            status: data.status || "pending",
            // kuch aur fields ki zaroorat nahi
          };
        }
      });

      notifs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // --- Popup queue management ---
      if (isInitialLoad.current) {
        // Pehli baar load: saare unread aur non-dismissed notifications queue mein daalo
        const unreadNotDismissed = notifs.filter(n => !n.isRead && !n.popupDismissed);
        setPopupQueue(unreadNotDismissed);
        isInitialLoad.current = false;
      } else {
        // Subsequent updates: detect status changes (pending -> approved/rejected)
        const previousMap = previousNotificationsRef.current;
        const newPopups = [];

        notifs.forEach(notif => {
          const prev = previousMap[notif.id];
          // Agar pehle pending tha aur ab approved/rejected hai
          if (prev && prev.status === "pending" && notif.status !== "pending") {
            newPopups.push(notif);
          }
          // Agar bilkul naya document hai aur approved/rejected hai (rare)
          else if (!prev && notif.status !== "pending") {
            newPopups.push(notif);
          }
        });

        const undismissedNew = newPopups.filter(n => !n.popupDismissed);

        if (undismissedNew.length > 0) {
          setPopupQueue(prevQueue => {
            const existingIds = new Set(prevQueue.map(item => item.id));
            const fresh = undismissedNew.filter(n => !existingIds.has(n.id));
            return [...prevQueue, ...fresh];
          });
        }

        // Queue se hatao jo ab dismiss ya read ho gaye
        setPopupQueue(prevQueue =>
          prevQueue.filter(qItem => {
            const current = notifs.find(n => n.id === qItem.id);
            return current && !current.popupDismissed && !current.isRead;
          })
        );
      }

      // Update previous map for next comparison
      previousNotificationsRef.current = currentMap;
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- Automatically show next popup when none is visible ---
  useEffect(() => {
    if (!currentPopup && popupQueue.length > 0) {
      const next = popupQueue[0];
      setCurrentPopup(next);
      setPopupQueue(prev => prev.slice(1));

      const timer = setTimeout(() => {
        setCurrentPopup(null);
      }, 20000);
      return () => clearTimeout(timer);
    }
  }, [currentPopup, popupQueue]);

  // --- Mark as read (from list) ---
  const markAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await updateDoc(doc(db, "reminders", id), { isNotificationRead: true });
      toast.success("✓ Marked as read", { position: "top-center", autoClose: 1200 });
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  // --- Mark all as read ---
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

  // --- Dismiss popup (mark as read & dismissed) ---
  const handleDismiss = async () => {
    if (!currentPopup) return;
    try {
      await updateDoc(doc(db, "reminders", currentPopup.id), {
        isNotificationRead: true,
        popupDismissed: true,
      });
      setCurrentPopup(null);
      toast.success("✓ Notification dismissed", { 
        position: "top-center", 
        autoClose: 1400 
      });
    } catch (err) {
      console.error("Dismiss failed:", err);
      toast.error("Failed to dismiss notification");
    }
  };

  // --- Snooze popup ---
  const handleSnooze = () => {
    if (!currentPopup) return;

    const notificationId = currentPopup.id;
    if (snoozeTimeoutsRef.current[notificationId]) {
      clearTimeout(snoozeTimeoutsRef.current[notificationId]);
    }

    setCurrentPopup(null);
    toast.info("⏰ Snoozed for 10 minutes", { 
      position: "top-center", 
      autoClose: 2000 
    });

    const timeoutId = setTimeout(() => {
      const notif = notifications.find(n => n.id === notificationId);
      if (notif && !notif.popupDismissed && !notif.isRead) {
        setPopupQueue(prev => {
          if (!prev.some(item => item.id === notificationId)) {
            return [...prev, notif];
          }
          return prev;
        });
      }
      delete snoozeTimeoutsRef.current[notificationId];
    }, 600000);

    snoozeTimeoutsRef.current[notificationId] = timeoutId;
  };

  // --- Clean up snooze timers ---
  useEffect(() => {
    return () => {
      Object.values(snoozeTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  // --- Auto‑mark unread as read when switching to "Unread" tab ---
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

  // --- Helpers ---
  const filteredData =
    activeTab === "All"
      ? notifications.filter(n => n.isRead)
      : activeTab === "Unread"
      ? notifications.filter(n => !n.isRead)
      : notifications;

  const getInitials = (first, last) => `${first.charAt(0)}${last ? last.charAt(0) : first.charAt(1) || ''}`;

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
        limit={4}
      />

      {/* POPUP NOTIFICATION */}
      {currentPopup && (
        <div
          className="fixed bottom-6 right-6 z-[9999] shadow-2xl"
          style={{ 
            maxWidth: 'min(90vw, 560px)',
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '3px solid #3b82f6',
            padding: '24px',
            animation: 'slideIn 0.5s ease-out'
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full ${currentPopup.bgColor} flex items-center justify-center font-bold text-lg ${currentPopup.textColor}`}
              >
                {getInitials(currentPopup.firstName, currentPopup.lastName)}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {currentPopup.firstName} {currentPopup.messageTitle}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  🔔 {currentPopup.time}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentPopup(null)}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded-full"
            >
              <IoClose size={24} />
            </button>
          </div>

          {/* Details Section */}
          <div className="space-y-3 text-sm border-t border-gray-100 pt-4">
            {/* Title */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="font-semibold text-gray-700">Title:</span>{' '}
              <span className="text-gray-900 font-medium">{currentPopup.title}</span>
            </div>

            {/* Description */}
            {currentPopup.description && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-700">Description:</span>
                <p className="text-gray-900 mt-1">{currentPopup.description}</p>
              </div>
            )}

            {/* Priority & Assigned To */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-700">Priority:</span>
                <p className="text-red-600 font-bold mt-1">! {currentPopup.priority}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <span className="font-semibold text-gray-700">Assigned To:</span>
                <p className="text-blue-600 font-medium mt-1">{currentPopup.assignedTo}</p>
              </div>
            </div>

            {/* Date & Time Details */}
            <div className="bg-blue-50 p-3 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-gray-700">📅 Date:</span>
                <span className="text-gray-900 font-medium">{currentPopup.date}</span>
              </div>
              
              {currentPopup.timeSlot && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-700">🕒 Time:</span>
                  <span className="text-gray-900 font-medium">{currentPopup.timeSlot}</span>
                </div>
              )}
              
              {currentPopup.alertTime && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-700">⏰ Alert Time:</span>
                  <span className="text-gray-900 font-medium">{currentPopup.alertTime}</span>
                </div>
              )}
            </div>

            {/* Rejection Reason */}
            {currentPopup.status === "rejected" && currentPopup.reason && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                <span className="font-semibold text-red-700">✗ Rejection Reason:</span>
                <p className="text-red-900 mt-1 font-medium">{currentPopup.reason}</p>
              </div>
            )}

            {/* Status Badge */}
            <div className="flex justify-center pt-2">
              <span
                className={`px-6 py-2.5 rounded-full font-bold text-sm shadow-md ${
                  currentPopup.status === "approved"
                    ? "bg-green-100 text-green-700 border-2 border-green-300"
                    : "bg-red-100 text-red-700 border-2 border-red-300"
                }`}
              >
                {currentPopup.status === "approved" ? "✓ APPROVED" : "✗ REJECTED"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSnooze}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl transition-colors shadow-sm"
            >
              ⏰ Snooze 10 min
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-md"
            >
              ✓ Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-5 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>

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
            <p className="text-xl font-medium">🔔 No notifications yet</p>
            <p className="mt-3 text-gray-400">
              {activeTab === "Unread" ? "You're all caught up! 🎉" : "New approvals/rejections will appear here"}
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
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all group ${
                        !item.isRead
                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                          : 'hover:bg-gray-50 border-gray-100'
                      }`}
                    >
                      {!item.isRead && (
                        <div className="w-2.5 h-2.5 mt-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                      )}

                      <div
                        className={`w-12 h-12 rounded-full ${item.bgColor} flex items-center justify-center flex-shrink-0 font-semibold ${item.textColor}`}
                      >
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

      {/* CSS Animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideIn {
            from { 
              transform: translateX(120%) translateY(20px); 
              opacity: 0; 
            }
            to { 
              transform: translateX(0) translateY(0); 
              opacity: 1; 
            }
          }
        `
      }} />
    </>
  );
};

export default HRNotification;