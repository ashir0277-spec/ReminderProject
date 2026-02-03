import React, { useEffect, useState } from 'react';
import Sidebar from './HrSidebar';
import Topbar from '../Admin/Topbar';

// Firebase
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../Components/firebase";

const HRReminder = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [hrReminders, setHrReminders] = useState([]);
  const currentUser = "HR";

  // ================= FETCH REMINDERS =================
  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const q = query(
        collection(db, "reminders"),
        where("createdBy", "==", currentUser)
      );

      const snapshot = await getDocs(q);

      const list = snapshot.docs.map(docSnap => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          title: data.title || "Untitled",
          name: data.assignedTo || "HR",
          dueDate: data.date ? new Date(data.date).toLocaleDateString() : "",
          status: data.status ? data.status.charAt(0).toUpperCase() + data.status.slice(1) : "Pending",
          statusColor:
            data.status === "pending"
              ? "#FF8D28"
              : data.status === "approved"
              ? "#22C55E"
              : "#EF4444",
          priority: data.priority || "Normal"
        };
      });

      // Sort by priority (Very High > High > Normal > Low)
      const priorityOrder = { 'Very High': 4, 'High': 3, 'Normal': 2, 'Low': 1 };
      list.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

      setHrReminders(list);
    } catch (error) {
      console.error("Fetch HR reminders error:", error);
    }
  };

  // ================= FILTER =================
  const filteredReminders =
    activeTab === "All"
      ? hrReminders
      : hrReminders.filter(item => item.status.toLowerCase() === activeTab.toLowerCase());

  // ================= AVATAR =================
  const avatarColors = [
    { bg: "bg-[#0081FF14]", text: "text-[#0081FF]" },
    { bg: "bg-[#22C55E14]", text: "text-[#22C55E]" },
    { bg: "bg-[#FF8D2814]", text: "text-[#FF8D28]" },
    { bg: "bg-[#EF444414]", text: "text-[#EF4444]" },
    { bg: "bg-[#A855F714]", text: "text-[#A855F7]" },
  ];

  const getInitials = (name) => {
    const parts = name.split(" ");
    return parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0][0];
  };

  return (
    <>
      <Sidebar />

      <div className='min-h-screen'>
        <h1 className='text-2xl font-semibold pl-4'>HR Dashboard</h1>

        <div className='w-[35%] min-h-20 mt-5'>
          <p className='pl-4'>Sent Reminders</p>

          <div className='py-3 flex justify-between px-4 mt-6'>
            {["All", "Pending", "Approved", "Rejected"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`font-medium text-xs px-8 py-2 rounded-2xl
                  ${activeTab === tab
                    ? "bg-[#0081FF] text-white"
                    : "bg-transparent text-[#575B74]"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredReminders.length === 0 ? (
          <div className='mx-4 mt-6 border border-[#E5E5E5] rounded-2xl p-6 text-center'>
            <p className='text-sm font-medium text-[#575B74]'>
              No {activeTab !== "All" ? activeTab : ""} reminders found
            </p>
          </div>
        ) : (
          filteredReminders.map((item, index) => {
            const avatar = avatarColors[index % avatarColors.length];

            return (
              <div
                key={item.id}
                className='border border-[#E5E5E5] min-h-30 mx-4 mt-4 rounded-2xl shadow-sm p-4'
              >
                <div className='flex items-start gap-3'>
                  <div
                    className={`w-15 h-15 rounded-full 
                    ${avatar.bg} 
                    flex items-center justify-center flex-shrink-0`}
                  >
                    <p className={`text-base font-medium ${avatar.text}`}>
                      {getInitials(item.name)}
                    </p>
                  </div>

                  <div className='flex flex-col flex-1 mt-2'>
                    <p className='text-sm font-medium'>{item.title}</p>
                    <p className='text-[#575B74] text-xs font-medium mt-1'>
                      {item.name}
                    </p>

                    <div className='h-[2px] w-full bg-[#E5E5E5] mt-6'></div>

                    <div className='flex items-center justify-between mt-3'>
                      <p className='text-[#2C3E50] font-medium text-xs'>
                        {item.dueDate}
                      </p>

                      <p
                        className='font-medium text-sm'
                        style={{ color: item.statusColor }}
                      >
                        • {item.status}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default HRReminder;
