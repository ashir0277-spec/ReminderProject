import React, { useState, useEffect } from 'react';
import Sidebar from './HrSidebar';
import user01 from '../../assets/user-01.svg';
import calendardate from '../../assets/calendar-date.svg';
import { IoAddOutline } from "react-icons/io5";

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
  
  const currentUser = sessionStorage.getItem('userRole') || "HR";
  const currentUserEmail = sessionStorage.getItem('userEmail') || "";

  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    priority: 'Normal',
    date: '',
    time: '',
    alertTime: '',
    assignTo: '',
  });

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const myQuery = query(
        collection(db, "reminders"),
        where("createdBy", "==", currentUser)
      );

      const assignedRoleQuery = query(
        collection(db, "reminders"),
        where("assignedTo", "==", "HR")
      );

      const sharedRoleQuery = query(
        collection(db, "reminders"),
        where("sharedWith", "array-contains", "HR")
      );

      const assignedEmailQuery = currentUserEmail ? query(
        collection(db, "reminders"),
        where("assignedEmails", "array-contains", currentUserEmail)
      ) : null;

      const queries = [myQuery, assignedRoleQuery, sharedRoleQuery];
      if (assignedEmailQuery) queries.push(assignedEmailQuery);

      const snapshots = await Promise.all(queries.map(q => getDocs(q)));

      const allReminders = snapshots.flatMap(snap => 
        snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      );

      const uniqueMap = new Map();
      allReminders.forEach(r => uniqueMap.set(r.id, r));
      const unique = Array.from(uniqueMap.values());

      const priorityOrder = { 'Very High': 3, 'High': 2, 'Normal': 1 };
      unique.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

      setReminders(unique);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const handleInputChange = (e) => {
    setNewReminder({
      ...newReminder,
      [e.target.name]: e.target.value
    });
  };

  const createReminder = async () => {
    if (!newReminder.title || !newReminder.date || !newReminder.time) {
      alert("Title, Date aur Time zaroori hain");
      return;
    }

    if (!newReminder.assignTo) {
      alert("Assign To select karen");
      return;
    }

    try {
      const sharedWith = [newReminder.assignTo, currentUser];

      await addDoc(collection(db, "reminders"), {
        title: newReminder.title,
        description: newReminder.description,
        priority: newReminder.priority,
        createdBy: currentUser,
        assignedTo: newReminder.assignTo,
        sharedWith: sharedWith,
        date: newReminder.date,
        time: newReminder.time,
        alertTime: newReminder.alertTime,
        status: "pending",
        starred: false,
        createdAt: serverTimestamp(),
      });

      setShowModal(false);
      setNewReminder({
        title: '', description: '', priority: 'Normal',
        date: '', time: '', alertTime: '', assignTo: '',
      });

      fetchReminders();
      alert("Reminder ban gaya!");
    } catch (error) {
      console.error("Create error:", error);
      alert("Kuch galat ho gaya");
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

        {reminders.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No reminders found</p>
        ) : (
          reminders.map((item) => (
            <div
              key={item.id}
              className='border border-[#E5E5E5] shadow-md px-4 py-4 mt-6 rounded-lg space-y-3'
            >
              <div className='flex justify-between'>
                <h1 className='text-sm font-semibold'>{item.title}</h1>
                <p className='text-[#D4183D] text-xs'>! {item.priority}</p>
              </div>

              {item.description && (
                <p className='text-xs text-gray-600'>
                  {item.description}
                </p>
              )}

              <div className='flex gap-2'>
                <img src={user01} className='w-5 h-5' alt="user" />
                <p className='text-xs text-gray-600'>
                  Created by: <span className='font-medium'>{item.createdBy}</span>
                </p>
              </div>

              {item.assignedTo && item.assignedTo.trim() !== '' && (
                <p className='text-xs text-gray-600'>
                  Assigned to: <span className='font-medium text-blue-600'>{item.assignedTo}</span>
                </p>
              )}

              <div className='flex gap-2'>
                <img src={calendardate} className='w-4 h-4' alt="calendar" />
                <p className='text-xs text-gray-700'>
                  {new Date(item.date).toLocaleDateString()}
                  {item.time && ` at ${item.time}`}
                </p>
              </div>

              <div className='h-[1px] bg-[#E5E5E5] my-3'></div>
              
              {/* FIXED: Status sirf tab dikhao jab reminder HR ne banaya ho (outgoing) */}
              {item.createdBy === currentUser && (
                <div className='flex justify-end items-center'>
                  <span
                    className={`font-medium text-sm ${
                      item.status === 'approved' ? 'text-green-600' : item.status === 'reject' ? 'text-red-600' : 'text-orange-600'
                    }`}
                  >
                    {item.status === 'approved' ? '✓ Approved' : item.status === 'reject' ? '✗ Rejected' : 'Pending'}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal same */}
      {showModal && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          <div className='absolute inset-0 bg-black/50' onClick={() => setShowModal(false)} />
          
          <div className='relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 z-30'>
            <h2 className='text-xl font-semibold mb-6'>Create New Reminder</h2>
            
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Title *</label>
                <input
                  name="title"
                  value={newReminder.title}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500'
                  placeholder='Enter reminder title'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Description</label>
                <textarea
                  name="description"
                  value={newReminder.description}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:border-blue-500'
                  placeholder='Optional description'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Priority</label>
                <select
                  name="priority"
                  value={newReminder.priority}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500'
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Very High">Very High</option>
                </select>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className="cursor-pointer" onClick={() => document.getElementById('date-input-hr').showPicker()}>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={newReminder.date}
                    onChange={handleInputChange}
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 cursor-pointer'
                    id="date-input-hr"
                  />
                </div>
                <div className="cursor-pointer" onClick={() => document.getElementById('time-input-hr').showPicker()}>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Time *</label>
                  <input
                    type="time"
                    name="time"
                    value={newReminder.time}
                    onChange={handleInputChange}
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 cursor-pointer'
                    id="time-input-hr"
                  />
                </div>
              </div>

              <div className="cursor-pointer" onClick={() => document.getElementById('alert-time-input-hr').showPicker()}>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Alert Time</label>
                <input
                  type="time"
                  name="alertTime"
                  value={newReminder.alertTime}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 cursor-pointer'
                  id="alert-time-input-hr"
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Assign To *</label>
                <select
                  name="assignTo"
                  value={newReminder.assignTo}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500'
                >
                  <option value="">Select...</option>
                  <option value="CEO">CEO</option>
                  <option value="CTO">CTO</option>
                </select>
              </div>
            </div>

            <div className='flex gap-3 mt-8'>
              <button
                onClick={() => setShowModal(false)}
                className='flex-1 bg-gray-200 hover:bg-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium'
              >
                Cancel
              </button>
              <button
                onClick={createReminder}
                className='flex-1 bg-[#0081FFFC] hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium'
              >
                Create Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HRDashboard;