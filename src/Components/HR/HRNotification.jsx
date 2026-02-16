import React, { useState, useEffect } from 'react';
import HrSidebar from './HrSidebar';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
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

  /* ================= FETCH NOTIFICATIONS ================= */
  useEffect(() => {
    const q = query(
      collection(db, "reminders"),
      where("createdBy", "==", currentUser),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // SAFER CONDITIONS (no blank UI)
        if (
          data.status !== "pending" &&
          data.updatedAt &&
          data.notificationDeleted !== true
        ) {
          const updatedDate = data.updatedAt.toDate();
          const now = new Date();
          const diffMinutes = Math.floor((now - updatedDate) / 60000);
          const diffHours = Math.floor(diffMinutes / 60);
          const diffDays = Math.floor(diffHours / 24);

          let timeAgo = "Just now";
          if (diffMinutes >= 1 && diffMinutes < 60) timeAgo = `${diffMinutes}m ago`;
          else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
          else timeAgo = `${diffDays}d ago`;

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
            bgColor:
              data.status === "approved" ? "bg-[#28C76F14]" : "bg-[#FF9F4314]",
            textColor:
              data.status === "approved" ? "text-[#28C76F]" : "text-[#FF9F43]"
          });
        }
      });

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
  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "reminders", id), {
        isNotificationRead: true
      });
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications
        .filter(n => !n.isRead)
        .forEach(n => {
          batch.update(doc(db, "reminders", n.id), {
            isNotificationRead: true
          });
        });
      await batch.commit();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id) => {
    try {
      await updateDoc(doc(db, "reminders", id), {
        notificationDeleted: true
      });
      toast.success("Notification removed");
    } catch {
      toast.error("Failed to remove notification");
    }
  };

  const getInitials = (first, last) =>
    `${first?.[0] || ""}${last?.[0] || ""}`;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  /* ================= UI ================= */
  return (
    <>
      <HrSidebar />
      <ToastContainer />

      <div>
        <div className="flex justify-between items-center px-4 pt-4">
          <p className="text-2xl font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs flex gap-2"
            >
              <IoCheckmarkDone /> Mark All Read
            </button>
          )}
        </div>

        <div className="px-4 mt-4 flex gap-4">
          {["All", "Unread", "Due"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full text-xs ${
                activeTab === tab
                  ? "bg-blue-500 text-white"
                  : "text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {filteredData.length === 0 ? (
            <p className="text-center text-gray-400 py-10">
              📭 No notifications found
            </p>
          ) : (
            filteredData.map(item => (
              <div
                key={item.id}
                className={`m-4 p-4 flex gap-4 rounded-lg ${
                  !item.isRead ? "bg-blue-50" : ""
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${item.bgColor}`}
                >
                  <span className={`${item.textColor} font-semibold`}>
                    {getInitials(item.firstName, item.lastName)}
                  </span>
                </div>

                <div className="flex-1">
                  <p className="font-semibold">
                    {item.firstName} {item.messageTitle}
                  </p>
                  <p className="text-sm text-gray-500">{item.messageSub}</p>
                  <p className="text-xs text-gray-400">{item.time}</p>
                </div>

                <div className="flex gap-2">
                  {!item.isRead && (
                    <button onClick={() => markAsRead(item.id)}>
                      <IoCheckmarkDone className="text-green-600 text-xl" />
                    </button>
                  )}
                  <button onClick={() => deleteNotification(item.id)}>
                    <IoTrash className="text-red-500 text-xl" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default HRNotification;
