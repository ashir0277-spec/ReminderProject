import React, { useEffect, useState } from "react";
import Sidebar from "./HrSidebar";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

const HRHistory = () => {
  const [history, setHistory] = useState([]);
  const currentUser = "HR";

  // Border color by status
  const getBorderColor = (status) => {
    if (status === "approved") return "border-l-green-500";
    if (status === "reject") return "border-l-red-500";
    if (status === "pending") return "border-l-orange-400";
    return "border-l-gray-400";
  };

  // Fetch HR reminders history (only created by HR)
  useEffect(() => {
    const q = query(
      collection(db, "reminders"),
      where("createdBy", "==", currentUser),
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

  return (
    <>
      <Sidebar />

      <div className=" rounded-md min-h-screen border border-[#E2E4E7] p-6">
        <h1 className="text-2xl font-semibold pl-1 pt-3">
          Reminders History
        </h1>

        <div className="min-h-screen mx-4 mt-6 space-y-4">
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm pl-6">
              No reminders history found
            </p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="relative flex items-center border border-[#E5E5E5] rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Reminder Info */}
                <div
                  className={`border-l-[3px] pl-10 space-y-1 ${getBorderColor(
                    item.status
                  )}`}
                >
                  <p className="text-base font-semibold">
                    {item.title}
                  </p>
                  <p className="text-[#575B74] font-medium">
                    To: {item.assignedTo || "All Employees"}
                  </p>
                  <p className="text-[#575B74] font-medium">
                    Created At:{" "}
                    {item.createdAt
                      ?.toDate()
                      .toLocaleDateString()}
                  </p>
                </div>

                {/* Status Right Center */}
                <div className="ml-auto flex items-center pr-4">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      item.status === "approved"
                        ? "bg-green-100 text-green-600"
                        : item.status === "reject"
                        ? "bg-red-100 text-red-600"
                        : "bg-orange-100 text-orange-500"
                    }`}
                  >
                    {item.status.charAt(0).toUpperCase() +
                      item.status.slice(1)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default HRHistory;