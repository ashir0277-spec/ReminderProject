import React, { useState, useEffect } from 'react';
import Sidebar from './HrSidebar';
import Topbar from '../Admin/Topbar';
import user01 from '../../assets/user-01.svg';
import calendardate from '../../assets/calendar-date.svg';
import { IoAddOutline } from "react-icons/io5";

// Firebase imports
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../Components/firebase";

const HRDashboard = () => {
  const [showModal, setShowModal] = useState(false);
  const [reminders, setReminders] = useState([]);
  const currentUser = "HR";

  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    priority: 'Normal',
    date: '',
    time: '',
    alertTime: '',
    assignTo: '',
  });

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

      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Priority sorting
      const priorityOrder = {
        'Very High': 3,
        'High': 2,
        'Normal': 1,
        'Low': 0
      };

      list.sort(
        (a, b) =>
          (priorityOrder[b.priority] ?? 0) -
          (priorityOrder[a.priority] ?? 0)
      );

      setReminders(list);
    } catch (error) {
      console.error("Fetch reminders error:", error);
    }
  };

  // ================= FORM HANDLER =================
  const handleInputChange = (e) => {
    setNewReminder({
      ...newReminder,
      [e.target.name]: e.target.value
    });
  };

  // ================= CREATE REMINDER =================
  const createReminder = async () => {
    if (!newReminder.title || !newReminder.date || !newReminder.time) {
      alert("Please fill required fields");
      return;
    }

    if (!newReminder.assignTo) {
      alert("Please select CEO or CTO");
      return;
    }

    try {
      await addDoc(collection(db, "reminders"), {
        title: newReminder.title,
        description: newReminder.description,
        priority: newReminder.priority,
        createdBy: "HR", // 🔴 EXACT MATCH
        assignedTo: newReminder.assignTo,
        sharedWith: [newReminder.assignTo],
        date: newReminder.date,
        time: newReminder.time,
        alertTime: newReminder.alertTime,
        status: "pending",
        starred: false,
        role: "hr",
        createdAt: serverTimestamp(),
      });

      setShowModal(false);
      setNewReminder({
        title: '',
        description: '',
        priority: 'Normal',
        date: '',
        time: '',
        alertTime: '',
        assignTo: '',
      });

      fetchReminders();
    } catch (error) {
      console.error("Create reminder error:", error);
    }
  };

  return (
    <>
      <Sidebar />

      <div className='mr-6 rounded-md min-h-screen border border-[#E2E4E7] p-6'>
        <div className='flex justify-between items-center mb-6'>
          <h1 className='text-2xl font-semibold'>HR Dashboard</h1>
          <button
            onClick={() => setShowModal(true)}
            className='bg-[#0081FFFC] flex gap-2 items-center text-white text-sm font-medium px-6 py-2.5 rounded-xl'
          >
            <IoAddOutline className='text-[20px]' />
            New Reminder
          </button>
        </div>

        {reminders.length === 0 && (
          <p className="text-center text-gray-400 mt-10">
            No reminders found
          </p>
        )}

        {reminders.map((item) => (
          <div
            key={item.id}
            className='border border-[#E5E5E5] shadow-md px-4 py-4 mt-6 rounded-lg space-y-3'
          >
            <div className='flex justify-between'>
              <h1 className='text-sm font-semibold'>{item.title}</h1>
              <p className='text-[#D4183D] text-xs'>! {item.priority}</p>
            </div>

            <div className='flex gap-2 items-center'>
              <img src={user01} className='w-5 h-5' />
              <p className='text-xs text-[#575B74]'>
                Created by: {item.createdBy}
              </p>
            </div>

            <div className='flex gap-2 items-center'>
              <img src={calendardate} className='w-5 h-5' />
              <p className='text-sm'>
                {new Date(item.date).toLocaleDateString()} , {item.time}
              </p>
            </div>

            <div className='h-[1px] bg-[#E5E5E5]' />

            <div className='flex justify-end'>
              {item.status === 'approved' && (
                <span className='text-green-600 text-sm font-semibold'>
                  ✓ Approved
                </span>
              )}
              {item.status === 'reject' && (
                <span className='text-red-600 text-sm font-semibold'>
                  ✗ Rejected
                </span>
              )}
              {item.status === 'pending' && (
                <span className='text-orange-600 text-sm font-semibold'>
                   Pending
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL — SAME UI */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setShowModal(false)}
          />
          {/* modal content same as tumhara */}
        </div>
      )}
    </>
  );
};

export default HRDashboard;
