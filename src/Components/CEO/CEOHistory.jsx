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

  // 🔹 Fetch reminders history (real-time)
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

  // 🔹 Border color by status
  const statusColor = (status) => {
    switch (status) {
      case "approved":
        return "border-green-500 bg-green-";
      case "reject":
        return "border-red-500 ";
      case "pending":
        return "border-orange-500 ";
      default:
        return "border-gray-400 bg-gray-50";
    }
  };

  // 🔹 Status badge color
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

                <p className="text-sm text-gray-600 mt-1">
                  To:{" "}
                  <span className="font-medium">
                    {item.assignedTo || "N/A"}
                  </span>
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Created At:{" "}
                  {item.createdAt?.toDate().toLocaleDateString()}
                </p>
              </div>

              {/* Status Badge */}
              <span className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${statusBadgeColor(item.status)}`}>
                {item.status === 'reject' ? 'Rejected' : item.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CEOHistory;