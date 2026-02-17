import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { IoClose } from 'react-icons/io5';
import { toast } from 'react-toastify';

const HRNotificationContext = createContext(null);

export const useHRNotification = () => useContext(HRNotificationContext);

export const HRNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [popupQueue, setPopupQueue] = useState([]);
  const [currentPopup, setCurrentPopup] = useState(null);
  const previousNotificationsRef = useRef({});
  const isInitialLoad = useRef(true);
  const snoozeTimeoutsRef = useRef({});
  const autoHideTimerRef = useRef(null);
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
                month: 'short', day: 'numeric',
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
            messageTitle: data.status === "approved" ? `approved '${data.title}'` : `rejected '${data.title}'`,
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
          currentMap[docSnap.id] = { id: docSnap.id, status: data.status || "pending" };
        }
      });

      notifs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      if (isInitialLoad.current) {
        // First load - don't show popups for existing notifications
        isInitialLoad.current = false;
      } else {
        const previousMap = previousNotificationsRef.current;
        const newPopups = [];

        notifs.forEach(notif => {
          const prev = previousMap[notif.id];
          if (prev && prev.status === "pending" && notif.status !== "pending" && !notif.popupDismissed) {
            newPopups.push(notif);
          } else if (!prev && notif.status !== "pending" && !notif.popupDismissed) {
            newPopups.push(notif);
          }
        });

        if (newPopups.length > 0) {
          setPopupQueue(prev => {
            const existingIds = new Set(prev.map(item => item.id));
            const fresh = newPopups.filter(n => !existingIds.has(n.id));
            return [...prev, ...fresh];
          });
        }
      }

      previousNotificationsRef.current = currentMap;
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Show next popup from queue
  useEffect(() => {
    if (!currentPopup && popupQueue.length > 0) {
      const next = popupQueue[0];
      setCurrentPopup(next);
      setPopupQueue(prev => prev.slice(1));

      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = setTimeout(() => {
        setCurrentPopup(null);
      }, 20000);
    }
  }, [currentPopup, popupQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(snoozeTimeoutsRef.current).forEach(clearTimeout);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, []);

  const handleDismiss = async () => {
    if (!currentPopup) return;
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    try {
      await updateDoc(doc(db, "reminders", currentPopup.id), {
        isNotificationRead: true,
        popupDismissed: true,
      });
      setCurrentPopup(null);
      toast.success("✓ Dismissed", { position: "top-center", autoClose: 1400 });
    } catch (err) {
      console.error("Dismiss failed:", err);
    }
  };

  const handleSnooze = () => {
    if (!currentPopup) return;
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);

    const notificationId = currentPopup.id;
    const snoozedNotif = { ...currentPopup };

    if (snoozeTimeoutsRef.current[notificationId]) {
      clearTimeout(snoozeTimeoutsRef.current[notificationId]);
    }

    setCurrentPopup(null);
    toast.info("⏰ Snoozed for 10 minutes", { position: "top-center", autoClose: 2000 });

    snoozeTimeoutsRef.current[notificationId] = setTimeout(() => {
      setPopupQueue(prev => {
        if (!prev.some(item => item.id === notificationId)) {
          return [...prev, snoozedNotif];
        }
        return prev;
      });
      delete snoozeTimeoutsRef.current[notificationId];
    }, 600000); // 10 minutes
  };

  const getInitials = (first, last) =>
    `${first?.charAt(0) || ''}${last ? last.charAt(0) : first?.charAt(1) || ''}`;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <HRNotificationContext.Provider value={{ notifications, unreadCount }}>
      {children}

      {/* Global Popup */}
      {currentPopup && (
        <div
          className="fixed bottom-5 right-5 z-[9999] bg-white shadow-xl"
          style={{
            width: 'min(90vw, 360px)',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            borderLeft: currentPopup.status === 'approved' ? '4px solid #22c55e' : '4px solid #ef4444',
            animation: 'hrPopupSlideIn 0.35s ease-out',
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                currentPopup.status === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {currentPopup.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
              </span>
              <span className="text-xs text-gray-400">{currentPopup.time}</span>
            </div>
            <button
              onClick={() => {
                if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
                setCurrentPopup(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <IoClose size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 pb-3 border-t border-gray-100 pt-2 space-y-2">
            {/* Title + who */}
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-snug">{currentPopup.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                by <span className="font-medium text-gray-700">{currentPopup.firstName}</span>
                {currentPopup.assignedTo && currentPopup.assignedTo !== 'All' && (
                  <> · To: <span className="text-blue-600 font-medium">{currentPopup.assignedTo}</span></>
                )}
              </p>
            </div>

            {/* Description */}
            {currentPopup.description && (
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{currentPopup.description}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
              {currentPopup.date && <span>📅 {currentPopup.date}</span>}
              {currentPopup.timeSlot && <span>🕒 {currentPopup.timeSlot}</span>}
              {currentPopup.priority && (
                <span className="text-orange-500 font-medium">! {currentPopup.priority}</span>
              )}
            </div>

            {/* Rejection reason */}
            {currentPopup.status === 'reject' && currentPopup.reason && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                <span className="font-semibold">Reason:</span> {currentPopup.reason}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex border-t border-gray-100">
            <button
              onClick={handleSnooze}
              className="flex-1 text-xs font-medium text-gray-600 hover:bg-gray-50 py-2.5 transition-colors rounded-bl-xl"
            >
              ⏰ Snooze 10 min
            </button>
            <div className="w-px bg-gray-100" />
            <button
              onClick={handleDismiss}
              className="flex-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 py-2.5 transition-colors rounded-br-xl"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes hrPopupSlideIn {
          from { transform: translateX(110%) translateY(8px); opacity: 0; }
          to   { transform: translateX(0)    translateY(0);   opacity: 1; }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </HRNotificationContext.Provider>
  );
};