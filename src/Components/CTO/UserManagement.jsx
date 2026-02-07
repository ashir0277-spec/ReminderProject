import React, { useState, useEffect } from 'react';
import MiniCalendar from '../../Calendar';
import user01 from '../../assets/user-01.svg';
import calendardate from '../../assets/calendar-date.svg';
import star from '../../assets/star.svg';
import { IoAddOutline, IoChevronDown, IoChevronUp, IoChevronForward } from "react-icons/io5";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from '../firebase';
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const UserManagement = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState('my');
  
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [approveModal, setApproveModal] = useState({ show: false, reminderId: null });
  const [rejectModal, setRejectModal] = useState({ show: false, reminderId: null, reason: '' });
  
  const [notificationPopup, setNotificationPopup] = useState({ show: false, reminder: null });
  const [snoozePopup, setSnoozePopup] = useState({ show: false, reminder: null });
  const [shownNotifications, setShownNotifications] = useState(new Set());
  
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [expandedRole, setExpandedRole] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAllHR, setSelectAllHR] = useState(false);
  const [selectAllCTO, setSelectAllCTO] = useState(false);
  
  const [users, setUsers] = useState({
    HR: [],
    CTO: [],
    CEO: []
  });
  const [usersLoading, setUsersLoading] = useState(false);
  
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    priority: 'Normal',
    date: null,          // Date object for DatePicker
    time: null,          // Date object for TimePicker
    alertTime: null,
    assignTo: '',
    assignedEmails: []
  });
  
  const currentUser = sessionStorage.getItem('userRole') || "HR";

  // ==================== DATA FETCHING ====================
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const organizedUsers = {
        HR: fetchedUsers.filter(u => u.role === 'HR'),
        CTO: fetchedUsers.filter(u => u.role === 'CTO'),
        CEO: fetchedUsers.filter(u => u.role === 'CEO')
      };
      
      setUsers(organizedUsers);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "reminders"));
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReminders(fetched);
    } catch (err) {
      toast.error("Failed to load reminders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    fetchUsers();
  }, []);

  // ==================== ASSIGNMENT HANDLERS ====================
  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleSingleUserSelect = (user) => {
    const isAlreadySelected = selectedUsers.some(u => u.id === user.id);
    
    if (isAlreadySelected) {
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers(prev => [...prev, user]);
    }
    
    setTimeout(confirmAssignment, 150);
  };

  const handleRoleClick = (role) => {
    const roleUsers = users[role] || [];
    
    if (roleUsers.length === 1) {
      handleSingleUserSelect(roleUsers[0]);
      return;
    }
    
    setExpandedRole(expandedRole === role ? null : role);
  };

  const handleSelectAllHR = () => {
    if (selectAllHR) {
      setSelectedUsers(prev => prev.filter(u => u.role !== 'HR'));
      setSelectAllHR(false);
    } else {
      const hrUsers = users.HR || [];
      setSelectedUsers(prev => {
        const nonHR = prev.filter(u => u.role !== 'HR');
        return [...nonHR, ...hrUsers];
      });
      setSelectAllHR(true);
    }
    
    setTimeout(() => setExpandedRole(null), 200);
  };

  const handleSelectAllCTO = () => {
    if (selectAllCTO) {
      setSelectedUsers(prev => prev.filter(u => u.role !== 'CTO'));
      setSelectAllCTO(false);
    } else {
      const ctoUsers = users.CTO || [];
      setSelectedUsers(prev => {
        const nonCTO = prev.filter(u => u.role !== 'CTO');
        return [...nonCTO, ...ctoUsers];
      });
      setSelectAllCTO(true);
    }
    
    setTimeout(() => setExpandedRole(null), 200);
  };

  const isUserSelected = (userId) => {
    return selectedUsers.some(u => u.id === userId);
  };

  const confirmAssignment = () => {
    if (selectedUsers.length === 0) return;

    const assignedRoles = [...new Set(selectedUsers.map(u => u.role))].join(', ');
    const assignedEmails = selectedUsers.map(u => u.email);

    setNewReminder(prev => ({
      ...prev,
      assignTo: assignedRoles.trim() || '',
      assignedEmails: assignedEmails || []
    }));

    setShowAssignDropdown(false);
    setExpandedRole(null);
  };

  const clearAssignments = () => {
    setSelectedUsers([]);
    setSelectAllHR(false);
    setSelectAllCTO(false);
    setNewReminder(prev => ({
      ...prev,
      assignTo: '',
      assignedEmails: []
    }));
  };

  // ==================== FIRESTORE UPDATE OPERATIONS ====================
  const updateStatus = async (id, newStatus) => {
    try {
      const reminderRef = doc(db, "reminders", id);
      await updateDoc(reminderRef, {
        status: newStatus,
        updatedBy: currentUser,
        updatedAt: serverTimestamp()
      });
      setReminders(prev => prev.map(r =>
        r.id === id ? { ...r, status: newStatus, updatedBy: currentUser } : r
      ));
      toast.success(`Reminder ${newStatus}!`);
    } catch (err) {
      toast.error("Failed to update status");
      console.error(err);
    }
  };

  const toggleStar = async (id, currentStarred) => {
    try {
      const reminderRef = doc(db, "reminders", id);
      await updateDoc(reminderRef, {
        starred: !currentStarred,
        starredBy: !currentStarred ? currentUser : null,
        starredAt: !currentStarred ? serverTimestamp() : null
      });
      setReminders(prev => prev.map(r =>
        r.id === id ? { ...r, starred: !currentStarred } : r
      ));
      toast.success(!currentStarred ? "⭐ Starred!" : "Star removed");
    } catch (err) {
      toast.error("Failed to update star");
      console.error(err);
    }
  };

  // ==================== REMINDER CREATION ====================
  const handleInputChange = e => {
    setNewReminder({ ...newReminder, [e.target.name]: e.target.value });
  };

  const createReminder = async () => {
    if (selectedUsers.length > 0 && !newReminder.assignTo) {
      confirmAssignment();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!newReminder.title || !newReminder.date) {
      toast.error("Title and Date are required");
      return;
    }
    
    try {
      const assignedEmails = newReminder.assignedEmails || [];

      let sharedWith = [...assignedEmails];

      const assignedRoles = new Set(selectedUsers.map(user => user.role));
      assignedRoles.forEach(role => {
        if (!sharedWith.includes(role)) {
          sharedWith.push(role);
        }
      });

      const docRef = await addDoc(collection(db, "reminders"), {
        title: newReminder.title,
        description: newReminder.description,
        priority: newReminder.priority,
        date: newReminder.date.toISOString().split('T')[0], // Save as YYYY-MM-DD
        time: newReminder.time ? newReminder.time.toTimeString().slice(0, 5) : null,
        alertTime: newReminder.alertTime ? newReminder.alertTime.toTimeString().slice(0, 5) : null,
        createdBy: currentUser,
        status: 'pending',
        starred: false,
        dismissed: false,
        assignedTo: newReminder.assignTo.trim(),
        assignedEmails: assignedEmails,
        sharedWith: sharedWith,
        createdAt: serverTimestamp()
      });
      
      setReminders(prev => [...prev, {
        id: docRef.id,
        ...newReminder,
        date: newReminder.date.toISOString().split('T')[0],
        time: newReminder.time ? newReminder.time.toTimeString().slice(0, 5) : null,
        alertTime: newReminder.alertTime ? newReminder.alertTime.toTimeString().slice(0, 5) : null,
        assignedTo: newReminder.assignTo.trim(),
        assignedEmails,
        createdBy: currentUser,
        status: 'pending',
        starred: false,
        dismissed: false,
        sharedWith,
        createdAt: new Date()
      }]);
      
      setShowModal(false);
      setNewReminder({
        title: '',
        description: '',
        priority: 'Normal',
        date: null,
        time: null,
        alertTime: null,
        assignTo: '',
        assignedEmails: []
      });
      setSelectedUsers([]);
      setSelectAllHR(false);
      setSelectAllCTO(false);
      
      toast.success("Reminder created successfully!");
    } catch (err) {
      toast.error("Failed to create reminder");
      console.error(err);
    }
  };

  // ==================== APPROVE / REJECT HANDLERS ====================
  const handleApproveClick = id => setApproveModal({ show: true, reminderId: id });
  const handleRejectClick = id => setRejectModal({ show: true, reminderId: id, reason: '' });

  const confirmApprove = async () => {
    await updateStatus(approveModal.reminderId, 'approved');
    setApproveModal({ show: false, reminderId: null });
  };

  const submitReject = async () => {
    if (!rejectModal.reason) {
      toast.error("Please provide a reason");
      return;
    }
    
    try {
      const reminderRef = doc(db, "reminders", rejectModal.reminderId);
      await updateDoc(reminderRef, {
        status: 'reject',
        reason: rejectModal.reason,
        updatedBy: currentUser,
        updatedAt: serverTimestamp()
      });
      
      setReminders(prev => prev.map(r =>
        r.id === rejectModal.reminderId
          ? { ...r, status: 'reject', reason: rejectModal.reason }
          : r
      ));
      
      toast.success("Reminder rejected");
    } catch (err) {
      toast.error("Failed to reject reminder");
      console.error(err);
    }
    
    setRejectModal({ show: false, reminderId: null, reason: '' });
  };

  // ==================== NOTIFICATION SYSTEM ====================
  useEffect(() => {
    const checkAlerts = () => {
      const now = new Date();
      
      reminders.forEach(r => {
        const shouldShowToCurrentUser = r.sharedWith?.includes(currentUser) ||
                                        (r.createdBy === currentUser && (!r.sharedWith || r.sharedWith.length === 0));
        
        if (r.alertTime &&
            r.status === 'pending' &&
            !r.dismissed &&
            !shownNotifications.has(r.id) &&
            shouldShowToCurrentUser) {
          
          const alertDateTime = new Date(`${r.date}T${r.alertTime}`);
          const timeDiff = alertDateTime - now;
          
          if (timeDiff <= 60000 && timeDiff >= -300000) {
            setNotificationPopup({ show: true, reminder: r });
            setShownNotifications(prev => new Set([...prev, r.id]));
          }
        }
      });
    };
    
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [reminders, shownNotifications, currentUser]);

  const handleDismiss = async () => {
    if (!notificationPopup.reminder) return;
    
    try {
      const reminderRef = doc(db, "reminders", notificationPopup.reminder.id);
      await updateDoc(reminderRef, {
        dismissed: true,
        dismissedAt: serverTimestamp(),
        dismissedBy: currentUser
      });
      
      setReminders(prev => prev.map(r =>
        r.id === notificationPopup.reminder.id ? { ...r, dismissed: true } : r
      ));
      
      toast.info("Reminder dismissed");
    } catch (err) {
      toast.error("Failed to dismiss reminder");
      console.error(err);
    }
    
    setNotificationPopup({ show: false, reminder: null });
  };

  const handleSnooze = () => {
    setSnoozePopup({ show: true, reminder: notificationPopup.reminder });
    setNotificationPopup({ show: false, reminder: null });
  };

  const confirmSnooze = async (minutes) => {
    if (!snoozePopup.reminder) return;
    
    try {
      const reminderRef = doc(db, "reminders", snoozePopup.reminder.id);
      
      const snoozedDateTime = new Date();
      snoozedDateTime.setMinutes(snoozedDateTime.getMinutes() + minutes);
      
      const snoozedDate = snoozedDateTime.toISOString().split('T')[0];
      const snoozedTime = snoozedDateTime.toTimeString().slice(0, 5);
      
      await updateDoc(reminderRef, {
        date: snoozedDate,
        alertTime: snoozedTime,
        snoozedAt: serverTimestamp(),
        snoozedBy: currentUser
      });
      
      setReminders(prev => prev.map(r =>
        r.id === snoozePopup.reminder.id
          ? { ...r, date: snoozedDate, alertTime: snoozedTime }
          : r
      ));
      
      setShownNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(snoozePopup.reminder.id);
        return newSet;
      });
      
      toast.info(`⏰ Reminder snoozed for ${minutes} minutes`);
    } catch (err) {
      toast.error("Failed to snooze reminder");
      console.error(err);
    }
    
    setSnoozePopup({ show: false, reminder: null });
  };

  // ==================== FILTERING & SORTING ====================
  const getPriorityValue = (priority) => {
    if (priority === 'Very High') return 3;
    if (priority === 'High') return 2;
    return 1;
  };

  const filterByTab = (reminder) => {
    if (activeTab === 'my') return reminder.createdBy === currentUser;
    if (activeTab === 'sharedWithMe') return reminder.sharedWith?.includes(currentUser) && reminder.createdBy !== currentUser;
    if (activeTab === 'sharedByMe') return reminder.createdBy === currentUser && reminder.sharedWith?.length > 0;
    return true;
  };

  const filteredReminders = reminders
    .filter(filterByTab)
    .filter(r => !selectedDate || (r.date && new Date(r.date).toDateString() === selectedDate.toDateString()))
    .sort((a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority));

  const getStatusText = item => {
    if (item.status === 'approved') return `✓ Approved by ${item.updatedBy || ''}`;
    if (item.status === 'reject') return `✗ Rejected by ${item.updatedBy || ''}`;
    return 'Pending';
  };

  const shouldShowStatus = (item) => {
    const assignedRoles = (item.assignedTo || '').split(', ').filter(Boolean);
    const isOnlyHR = assignedRoles.length === 1 && assignedRoles[0] === 'HR';

    if (isOnlyHR) {
      return false;
    }

    const isSelfAssigned = assignedRoles.length === 1 && assignedRoles[0] === currentUser;

    if (isSelfAssigned && item.createdBy === currentUser) {
      return false;
    }

    if (currentUser === "HR" && item.createdBy !== currentUser) {
      return false;
    }

    return true;
  };

  // ==================== RENDER ====================
  return (
    <div className='bg-white mt-6 overflow-hidden rounded-xl px-4 relative'>
      <ToastContainer />
      
      {/* HEADER & TABS */}
      <div className='flex justify-between items-center mb-5 mt-5'>
        <p className='sm:text-xl font-semibold'>User Management</p>
        <button
          className='bg-[#0081FFFC] flex gap-1 items-center justify-center text-white text-xs font-medium px-4 py-3 rounded-xl hover:bg-blue-600 transition-colors'
          onClick={() => setShowModal(true)}
        >
          <IoAddOutline className='text-[20px]' /> New Reminder
        </button>
      </div>

      <div className='flex gap-2 mb-5 whitespace-nowrap overflow-x-auto' style={{scrollbarWidth: 'none'}}>
        <button
          className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'my' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('my')}
        >
          My Reminders ({reminders.filter(r => r.createdBy === currentUser).length})
        </button>
        <button
          className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'sharedWithMe' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('sharedWithMe')}
        >
          Shared With Me ({reminders.filter(r => r.sharedWith?.includes(currentUser) && r.createdBy !== currentUser).length})
        </button>
        <button
          className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'sharedByMe' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('sharedByMe')}
        >
          Shared By Me ({reminders.filter(r => r.createdBy === currentUser && r.sharedWith?.length > 0).length})
        </button>
      </div>

      {/* CALENDAR & REMINDERS LIST */}
      <div className='md:flex gap-6'>
        <div className='md:w-auto'>
          <MiniCalendar selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className='mt-3 w-full text-sm text-blue-600 hover:text-blue-800 font-medium'
            >
              Clear Date Filter
            </button>
          )}
        </div>

        <div className='flex-1 mt-2.5'>
          <p className='font-semibold mb-4'>
            {selectedDate ? `Reminders for ${selectedDate.toLocaleDateString()}` : 'All Reminders'}
            <span className='text-sm text-gray-500 ml-2'>({filteredReminders.length})</span>
          </p>

          {loading ? (
            <div className='flex justify-center items-center py-10'>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredReminders.length > 0 ? (
            <div className='max-h-[600px] overflow-y-auto pr-2' style={{scrollbarWidth: 'thin', scrollbarColor: '#cbd5e0 #f7fafc'}}>
              {filteredReminders.map(item => (
                <div
                  key={item.id}
                  className='w-full border border-[#E5E5E5] rounded-lg mt-4 p-4 hover:shadow-md transition-shadow'
                >
                  <div className='flex justify-between items-start'>
                    <p className='text-sm font-semibold'>{item.title}</p>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        item.priority === 'Very High' ? 'bg-red-100 text-red-600' :
                        item.priority === 'High' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>
                  {item.description && (
                    <p className='text-xs text-gray-600 mt-2'>{item.description}</p>
                  )}
                  <div className='flex gap-2 pt-3'>
                    <img src={user01} className='w-5 h-5' alt="user" />
                    <p className='text-xs text-gray-600'>
                      Created by: <span className='font-medium'>{item.createdBy}</span>
                    </p>
                  </div>

                  {(item.assignedTo || (item.assignedEmails && item.assignedEmails.length > 0)) && (
                    <div className='flex gap-2 pt-2'>
                      <img src={user01} className='w-5 h-5' alt="assigned" />
                      <p className='text-xs text-gray-600'>
                        Assigned to: <span className='font-medium text-blue-600'>
                          {item.assignedTo || item.assignedEmails.join(', ')}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className='flex justify-between items-center pt-3'>
                    <div className='flex gap-2 items-center'>
                      <img src={calendardate} className='w-4 h-4' alt="calendar" />
                      <p className='text-xs text-gray-700'>
                        {item.date}
                        {item.time && ` at ${item.time}`}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleStar(item.id, item.starred)}
                      className='transition-transform hover:scale-110 active:scale-95'
                    >
                      <img
                        src={star}
                        className='w-5 h-5'
                        alt="star"
                        style={{
                          filter: item.starred
                            ? 'invert(66%) sepia(93%) saturate(1352%) brightness(95%) contrast(101%)'
                            : 'grayscale(100%) opacity(40%)'
                        }}
                      />
                    </button>
                  </div>
                  <div className='h-[1px] bg-[#E5E5E5] my-3'></div>
                  
                  {shouldShowStatus(item) && (
                    item.status === 'pending' ? (
                      item.createdBy === currentUser ? (
                        <div className='flex justify-end'>
                          <span className='bg-[#F9FAFB] border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-xs font-medium'>
                            Pending
                          </span>
                        </div>
                      ) : (
                        <div className='flex gap-2 flex-wrap'>
                          <button
                            onClick={() => handleApproveClick(item.id)}
                            className='bg-[#22C55E] hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors'
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectClick(item.id)}
                            className='bg-[#EF4444] hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors'
                          >
                            Reject
                          </button>
                          <button className='bg-[#F9FAFB] border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-xs font-medium cursor-default'>
                            Pending
                          </button>
                        </div>
                      )
                    ) : (
                      <div className='flex justify-end items-center'>
                        <span
                          className={`font-medium text-sm ${
                            item.status === 'approved' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {getStatusText(item)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center py-10 bg-gray-50 rounded-lg'>
              <p className='text-gray-500 text-lg'>📭 No reminders found</p>
              <p className='text-gray-400 text-sm mt-2'>
                {selectedDate
                  ? 'Try selecting a different date or clearing the filter'
                  : 'Create your first reminder to get started'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== CREATE REMINDER MODAL WITH CUSTOM PICKERS ==================== */}
      {showModal && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setShowModal(false)}
          ></div>
          <div className='relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 z-30'>
            <h2 className='text-xl font-semibold mb-6'>Create New Reminder</h2>
            <div className='space-y-5'>
              
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Reminder Title <span className='text-red-500'>*</span>
                </label>
                <input
                  name="title"
                  value={newReminder.title}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-2.5 text-sm transition-colors'
                  placeholder='Enter reminder title'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Description
                </label>
                <textarea
                  name="description"
                  value={newReminder.description}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-2.5 text-sm min-h-[80px] resize-none transition-colors'
                  placeholder='Enter description (optional)'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Priority
                </label>
                <div className='relative'>
                  <select
                    name="priority"
                    value={newReminder.priority}
                    onChange={handleInputChange}
                    className='w-full border border-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-2.5 text-sm appearance-none cursor-pointer transition-colors bg-white'
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                  <IoChevronDown className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none' />
                </div>
              </div>

              {/* Custom Date Picker */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Date <span className='text-red-500'>*</span>
                </label>
                <DatePicker
                  selected={newReminder.date}
                  onChange={(date) => setNewReminder({ ...newReminder, date })}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select date"
                  className='w-full border border-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer'
                  wrapperClassName="w-full"
                />
              </div>

              {/* Custom Time Picker */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Time
                </label>
                <DatePicker
                  selected={newReminder.time}
                  onChange={(time) => setNewReminder({ ...newReminder, time })}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="h:mm aa"
                  placeholderText="Select time"
                  className='w-full border border-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer'
                  wrapperClassName="w-full"
                />
              </div>

              {/* Custom Alert Time Picker */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Alert Time
                </label>
                <DatePicker
                  selected={newReminder.alertTime}
                  onChange={(alertTime) => setNewReminder({ ...newReminder, alertTime })}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Alert Time"
                  dateFormat="h:mm aa"
                  placeholderText="Select alert time (optional)"
                  className='w-full border border-gray-300 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-2.5 text-sm transition-colors cursor-pointer'
                  wrapperClassName="w-full"
                />
              </div>

              {/* Assign To Dropdown */}
              <div className='relative'>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>
                  Assign To
                </label>
                <div
                  onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                  className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm cursor-pointer hover:border-blue-500 bg-white flex justify-between items-center transition-colors'
                >
                  <span className={newReminder.assignTo ? 'text-gray-900' : 'text-gray-400'}>
                    {newReminder.assignTo || 'Select users to assign...'}
                  </span>
                  {showAssignDropdown ? <IoChevronUp className='text-gray-500' /> : <IoChevronDown className='text-gray-500' />}
                </div>

                {newReminder.assignedEmails?.length > 0 && (
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    {newReminder.assignTo.split(', ').map((role, index) => (
                      <span
                        key={index}
                        className='inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full'
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}

                {showAssignDropdown && (
                  <div className='absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto'>
                    
                    {usersLoading ? (
                      <div className='flex justify-center items-center py-8'>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <>
                        <div className='border-b border-gray-200'>
                          <div
                            className='px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center'
                            onClick={() => handleRoleClick('CEO')}
                          >
                            <span className='font-medium text-sm text-gray-700'>
                              CEO {users.CEO.length > 0 && `(${users.CEO.length})`}
                            </span>
                            {users.CEO.length > 1 && (
                              expandedRole === 'CEO' ? <IoChevronUp className='text-gray-500' /> : <IoChevronForward className='text-gray-500' />
                            )}
                          </div>
                          {expandedRole === 'CEO' && users.CEO.length > 1 && (
                            <div className='bg-gray-50 px-4 pb-3'>
                              {users.CEO.map(user => (
                                <label key={user.id} className='flex items-center gap-2 py-2 cursor-pointer hover:bg-white px-2 rounded'>
                                  <input
                                    type="checkbox"
                                    checked={isUserSelected(user.id)}
                                    onChange={() => toggleUserSelection(user)}
                                    className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
                                  />
                                  <div className='flex-1'>
                                    <p className='text-sm font-medium text-gray-900'>{user.email}</p>
                                    <p className='text-xs text-gray-500'>{user.role}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className='border-b border-gray-200'>
                          <div
                            className='px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center'
                            onClick={() => handleRoleClick('CTO')}
                          >
                            <span className='font-medium text-sm text-gray-700'>
                              CTO {users.CTO.length > 0 && `(${users.CTO.length})`}
                            </span>
                            {users.CTO.length > 1 && (
                              expandedRole === 'CTO' ? <IoChevronUp className='text-gray-500' /> : <IoChevronForward className='text-gray-500' />
                            )}
                          </div>
                          {expandedRole === 'CTO' && users.CTO.length > 1 && (
                            <div className='bg-gray-50 px-4 pb-3'>
                              <label className='flex items-center gap-2 py-2 cursor-pointer hover:bg-white px-2 rounded'>
                                <input
                                  type="checkbox"
                                  checked={selectAllCTO}
                                  onChange={handleSelectAllCTO}
                                  className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
                                />
                                <span className='text-sm font-medium text-blue-600'>Select All CTO</span>
                              </label>
                              {users.CTO.map(user => (
                                <label key={user.id} className='flex items-center gap-2 py-2 cursor-pointer hover:bg-white px-2 rounded'>
                                  <input
                                    type="checkbox"
                                    checked={isUserSelected(user.id)}
                                    onChange={() => toggleUserSelection(user)}
                                    className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
                                  />
                                  <div className='flex-1'>
                                    <p className='text-sm font-medium text-gray-900'>{user.email}</p>
                                    <p className='text-xs text-gray-500'>{user.role}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className='border-b border-gray-200'>
                          <div
                            className='px-4 py-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center'
                            onClick={() => handleRoleClick('HR')}
                          >
                            <span className='font-medium text-sm text-gray-700'>
                              HR {users.HR.length > 0 && `(${users.HR.length})`}
                            </span>
                            {users.HR.length > 1 && (
                              expandedRole === 'HR' ? <IoChevronUp className='text-gray-500' /> : <IoChevronForward className='text-gray-500' />
                            )}
                          </div>
                          {expandedRole === 'HR' && users.HR.length > 1 && (
                            <div className='bg-gray-50 px-4 pb-3'>
                              <label className='flex items-center gap-2 py-2 cursor-pointer hover:bg-white px-2 rounded'>
                                <input
                                  type="checkbox"
                                  checked={selectAllHR}
                                  onChange={handleSelectAllHR}
                                  className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
                                />
                                <span className='text-sm font-medium text-blue-600'>Select All HR</span>
                              </label>
                              {users.HR.map(user => (
                                <label key={user.id} className='flex items-center gap-2 py-2 cursor-pointer hover:bg-white px-2 rounded'>
                                  <input
                                    type="checkbox"
                                    checked={isUserSelected(user.id)}
                                    onChange={() => toggleUserSelection(user)}
                                    className='w-4 h-4 text-blue-600 rounded focus:ring-blue-500'
                                  />
                                  <div className='flex-1'>
                                    <p className='text-sm font-medium text-gray-900'>{user.email}</p>
                                    <p className='text-xs text-gray-500'>{user.role}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        {selectedUsers.length > 0 && (
                          <div className='flex gap-2 p-3 border-t border-gray-200 bg-gray-50 sticky bottom-0 z-10'>
                            <button
                              onClick={clearAssignments}
                              className='flex-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors'
                            >
                              Clear
                            </button>
                            <button
                              onClick={confirmAssignment}
                              className='flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors'
                            >
                              Confirm ({selectedUsers.length})
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className='flex gap-3 mt-8'>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedUsers([]);
                    setSelectAllHR(false);
                    setSelectAllCTO(false);
                  }}
                  className='flex-1 bg-gray-200 hover:bg-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={createReminder}
                  className='flex-1 bg-[#0081FFFC] hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors'
                >
                  Create Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModal.show && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          <div className='absolute inset-0 bg-black/50' onClick={() => setApproveModal({ show: false, reminderId: null })}></div>
          <div className='relative bg-white p-6 rounded-xl w-full max-w-md'>
            <h2 className='text-xl font-semibold'>Approve Request</h2>
            <p className='text-gray-600 mt-2 text-sm'>Are you sure you want to approve this reminder?</p>
            <div className='flex justify-end gap-3 mt-6'>
              <button onClick={() => setApproveModal({ show: false, reminderId: null })} className='bg-gray-200 px-4 py-2 rounded text-gray-700'>
                Cancel
              </button>
              <button onClick={confirmApprove} className='bg-green-500 px-4 py-2 rounded text-white'>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.show && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          <div className='absolute inset-0 bg-black/50' onClick={() => setRejectModal({ show: false, reminderId: null, reason: '' })}></div>
          <div className='relative bg-white p-6 rounded-xl w-full max-w-md'>
            <h2 className='text-xl font-semibold'>Provide Reason</h2>
            <p className='text-gray-600 mt-2 text-sm'>Please provide a reason for rejecting this reminder</p>
            <textarea
              value={rejectModal.reason}
              onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder='Enter your Reason...'
              className='w-full border border-gray-300 rounded-md mt-2 p-2 text-sm'
            />
            <div className='flex justify-end gap-3 mt-4'>
              <button onClick={() => setRejectModal({ show: false, reminderId: null, reason: '' })} className='bg-gray-200 px-4 py-2 rounded text-gray-700'>
                Cancel
              </button>
              <button onClick={submitReject} className='bg-red-500 px-4 py-2 rounded text-white'>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Popup */}
      {notificationPopup.show && (
        <div className='fixed top-5 right-5 bg-white shadow-xl rounded-xl p-4 w-80 z-50 border-2 border-blue-500'>
          <div className='flex items-start gap-2 mb-2'>
            <span className='text-2xl'>⏰</span>
            <div className='flex-1'>
              <p className='font-semibold text-base'>{notificationPopup.reminder.title}</p>
              <p className='text-gray-600 text-sm mt-1'>{notificationPopup.reminder.description}</p>
            </div>
          </div>
          <div className='flex justify-end gap-2 mt-3'>
            <button onClick={handleSnooze} className='bg-blue-500 px-3 py-1 text-white rounded text-xs hover:bg-blue-600 transition-colors'>
              Snooze
            </button>
            <button onClick={handleDismiss} className='bg-gray-200 px-3 py-1 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors'>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Snooze Popup */}
      {snoozePopup.show && (
        <div className='fixed top-20 right-5 bg-white shadow-xl rounded-xl p-4 w-60 z-50 border border-gray-200'>
          <p className='font-semibold mb-3'>Snooze for how long?</p>
          <div className='flex flex-col gap-2'>
            <button onClick={() => confirmSnooze(2)} className='bg-blue-500 hover:bg-blue-600 px-3 py-2 text-white rounded text-sm transition-colors'>
              2 minutes
            </button>
            <button onClick={() => confirmSnooze(15)} className='bg-blue-500 hover:bg-blue-600 px-3 py-2 text-white rounded text-sm transition-colors'>
              15 minutes
            </button>
            <button onClick={() => setSnoozePopup({ show: false, reminder: null })} className='bg-gray-200 hover:bg-gray-300 px-3 py-2 text-gray-700 rounded text-sm transition-colors'>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;