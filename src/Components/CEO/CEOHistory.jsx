import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

const CEOHistory = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "reminders"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setHistory(data);
    });

    return () => unsubscribe();
  }, []);

  // Border color by status
  const statusColor = (status) => {
    switch (status) {
      case "approved":
        return "border-green-500 bg-green-50";
      case "reject":
        return "border-red-500 bg-red-50";
      case "pending":
        return "border-orange-500 bg-orange-50";
      default:
        return "border-gray-400 bg-gray-50";
    }
  };

  // Status badge color
  const statusBadgeColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "reject":
        return "bg-red-100 text-red-700";
      case "pending":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Assigned to smart display
  const getAssignedToDisplay = (item) => {
    if (item.assignedTo && item.assignedTo.trim() !== '') {
      return item.assignedTo.trim();
    }
    if (item.assignedEmails && item.assignedEmails.length > 0) {
      return item.assignedEmails.join(", ");
    }
    return "Not Assigned";
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Reminders History</h2>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {history.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No reminder history available
          </p>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-4 border-l-[4px] rounded-lg ${statusColor(
                item.status
              )}`}
            >
              {/* Content */}
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">{item.title}</h3>

                {/* Assigned To */}
                <p className="text-sm text-gray-700 mt-1">
                  To:{" "}
                  <span className="font-medium text-blue-700">
                    {getAssignedToDisplay(item)}
                  </span>
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Created At:{" "}
                  {item.createdAt?.toDate?.()
                    ? item.createdAt.toDate().toLocaleString()
                    : "N/A"}
                </p>
              </div>

              {/* FIXED: Status sirf tab dikhao jab reminder SIRF HR ke liye nahi bana */}
              {/* Yani agar assignedTo mein "HR" nahi hai ya multiple log hain to dikhao */}
              {(!item.assignedTo?.includes("HR") || item.assignedTo.split(', ').length > 1) && (
                <span
                  className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${statusBadgeColor(
                    item.status
                  )}`}
                >
                  {item.status === "reject" ? "Rejected" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CEOHistory;