import React, { useState, useEffect } from 'react';
import MiniCalendar from '../../Calendar';
import user01 from '../../assets/user-01.svg';
import calendardate from '../../assets/calendar-date.svg';
import star from '../../assets/star.svg';
import { IoAddOutline } from "react-icons/io5";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from '../firebase';
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const UserManagement = () => {
  // ==================== STATE MANAGEMENT ====================
  // Calendar & Filtering States
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState('my');
  
  // Reminder Data States
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [approveModal, setApproveModal] = useState({ show: false, reminderId: null });
  const [rejectModal, setRejectModal] = useState({ show: false, reminderId: null, reason: '' });
  
  // Notification & Snooze States
  const [notificationPopup, setNotificationPopup] = useState({ show: false, reminder: null });
  const [snoozePopup, setSnoozePopup] = useState({ show: false, reminder: null });
  const [shownNotifications, setShownNotifications] = useState(new Set()); // Track already shown alerts
  
  // Form State
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    priority: 'Normal',
    date: '',
    time: '',
    alertTime: '',
    assignTo: ''
  });

  // Current User
  const currentUser = sessionStorage.getItem('userRole') || "HR";

  // ==================== DATA FETCHING ====================
  /**
   * Fetch all reminders from Firestore
   */
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

  // Fetch reminders on component mount
  useEffect(() => {
    fetchReminders();
  }, []);

  // ==================== FIRESTORE UPDATE OPERATIONS ====================
  /**
   * Update reminder status (approved/reject)
   */
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

  /**
   * Toggle star status for a reminder
   */
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
  /**
   * Handle form input changes
   */
  const handleInputChange = e => {
    setNewReminder({ ...newReminder, [e.target.name]: e.target.value });
  };

  /**
   * Create new reminder in Firestore
   */
  const createReminder = async () => {
    if (!newReminder.title || !newReminder.date) {
      toast.error("Title and Date are required");
      return;
    }
    
    try {
      const docRef = await addDoc(collection(db, "reminders"), {
        ...newReminder,
        createdBy: currentUser,
        status: 'pending',
        starred: false,
        dismissed: false, // Track if user dismissed this reminder
        sharedWith: newReminder.assignTo ? [newReminder.assignTo] : [],
        createdAt: serverTimestamp()
      });
      
      setReminders(prev => [...prev, {
        id: docRef.id,
        ...newReminder,
        createdBy: currentUser,
        status: 'pending',
        starred: false,
        dismissed: false,
        sharedWith: newReminder.assignTo ? [newReminder.assignTo] : []
      }]);
      
      setShowModal(false);
      setNewReminder({
        title: '',
        description: '',
        priority: 'Normal',
        date: '',
        time: '',
        alertTime: '',
        assignTo: ''
      });
      toast.success("Reminder created!");
    } catch (err) {
      toast.error("Failed to create reminder");
      console.error(err);
    }
  };

  // ==================== APPROVE / REJECT HANDLERS ====================
  /**
   * Open approve confirmation modal
   */
  const handleApproveClick = id => {
    setApproveModal({ show: true, reminderId: id });
  };

  /**
   * Open reject modal with reason input
   */
  const handleRejectClick = id => {
    setRejectModal({ show: true, reminderId: id, reason: '' });
  };

  /**
   * Confirm and execute approval
   * Note: Once approved, reminder won't show alerts anymore (status !== 'pending')
   */
  const confirmApprove = async () => {
    await updateStatus(approveModal.reminderId, 'approved');
    setApproveModal({ show: false, reminderId: null });
  };

  /**
   * Submit rejection with reason
   * Note: Once rejected, reminder won't show alerts anymore (status !== 'pending')
   */
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
  /**
   * Check for reminders that need to show alerts
   * Checks immediately on load and then every 30 seconds
   */
  useEffect(() => {
    // Function to check and show alerts
    const checkAlerts = () => {
      const now = new Date();
      
      reminders.forEach(r => {
        // Determine if alert should show to current user:
        // - If reminder is assigned to someone (assignTo field), only show to that user
        // - If no assignment, show to creator only
        const shouldShowToCurrentUser = r.sharedWith?.includes(currentUser) || 
                                        (r.createdBy === currentUser && (!r.sharedWith || r.sharedWith.length === 0));
        
        // Only show notification if:
        // 1. Reminder has alertTime set
        // 2. Status is PENDING (not approved/rejected)
        // 3. Not dismissed
        // 4. Not already shown
        // 5. Alert is for current user
        if (r.alertTime && 
            r.status === 'pending' && 
            !r.dismissed && 
            !shownNotifications.has(r.id) &&
            shouldShowToCurrentUser) {
          
          const alertDateTime = new Date(`${r.date}T${r.alertTime}`);
          const timeDiff = alertDateTime - now;
          
          // Show notification if alert time has passed or within 1 minute window
          if (timeDiff <= 60000 && timeDiff >= -300000) { // Show if within 5 minutes past due
            setNotificationPopup({ show: true, reminder: r });
            setShownNotifications(prev => new Set(prev).add(r.id));
          }
        }
      });
    };
    
    // Check immediately when component loads or reminders change
    checkAlerts();
    
    // Then check every 30 seconds
    const interval = setInterval(checkAlerts, 30000);
    
    return () => clearInterval(interval);
  }, [reminders, shownNotifications, currentUser]);

  /**
   * Dismiss notification - marks reminder as dismissed in database
   * This prevents the notification from showing again
   */
  const handleDismiss = async () => {
    if (!notificationPopup.reminder) return;
    
    try {
      const reminderRef = doc(db, "reminders", notificationPopup.reminder.id);
      await updateDoc(reminderRef, {
        dismissed: true,
        dismissedAt: serverTimestamp(),
        dismissedBy: currentUser
      });
      
      // Update local state
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

  /**
   * Open snooze options popup
   */
  const handleSnooze = () => {
    setSnoozePopup({ show: true, reminder: notificationPopup.reminder });
    setNotificationPopup({ show: false, reminder: null });
  };

  /**
   * Snooze reminder for specified minutes
   * Updates the alert time in database and removes from shown notifications
   */
  const confirmSnooze = async (minutes) => {
    if (!snoozePopup.reminder) return;
    
    try {
      const reminderRef = doc(db, "reminders", snoozePopup.reminder.id);
      
      // Calculate new alert time
      const snoozedDateTime = new Date();
      snoozedDateTime.setMinutes(snoozedDateTime.getMinutes() + minutes);
      
      // Update both date and time to handle cross-day snoozing
      const snoozedDate = snoozedDateTime.toISOString().split('T')[0];
      const snoozedTime = snoozedDateTime.toTimeString().slice(0, 5);
      
      await updateDoc(reminderRef, {
        date: snoozedDate,
        alertTime: snoozedTime,
        snoozedAt: serverTimestamp(),
        snoozedBy: currentUser
      });
      
      // Update local state
      setReminders(prev => prev.map(r =>
        r.id === snoozePopup.reminder.id
          ? { ...r, date: snoozedDate, alertTime: snoozedTime }
          : r
      ));
      
      // Remove from shown notifications so it can show again
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
  /**
   * Get priority numeric value for sorting
   */
  const getPriorityValue = (priority) => {
    if (priority === 'Very High') return 3;
    if (priority === 'High') return 2;
    return 1;
  };

  /**
   * Filter reminders based on active tab
   */
  const filterByTab = (reminder) => {
    if (activeTab === 'my') return reminder.createdBy === currentUser;
    if (activeTab === 'sharedWithMe') return reminder.sharedWith?.includes(currentUser);
    if (activeTab === 'sharedByMe') return reminder.createdBy === currentUser && reminder.sharedWith?.length > 0;
    return true;
  };

  /**
   * Get filtered and sorted reminders
   */
  const filteredReminders = reminders
    .filter(filterByTab)
    .filter(r => !selectedDate || new Date(r.date).toDateString() === selectedDate.toDateString())
    .sort((a, b) => getPriorityValue(b.priority) - getPriorityValue(a.priority));

  // ==================== HELPER FUNCTIONS ====================
  /**
   * Get status display text
   */
  const getStatusText = item => {
    if (item.status === 'approved') return `✓ Approved by ${item.updatedBy || ''}`;
    if (item.status === 'reject') return `✗ Rejected by ${item.updatedBy || ''}`;
    return 'Pending';
  };

  // ==================== RENDER ====================
  return (
    <div className='bg-white mt-6 overflow-hidden rounded-xl px-4 relative'>
      <ToastContainer />
      
      {/* ==================== HEADER & TABS ==================== */}
      <div className='flex justify-between items-center mb-5 mt-5'>
        <p className='sm:text-xl font-semibold'>User Management</p>
        <button
          className='bg-[#0081FFFC] flex gap-1 items-center justify-center text-white text-xs font-medium px-4 py-3 rounded-xl hover:bg-blue-600 transition-colors whi'
          onClick={() => setShowModal(true)}
        >
          <IoAddOutline className='text-[20px] ' /> New Reminder
        </button>
      </div>

      {/* Tab Navigation */}
      <div className='flex gap-2 mb-5 whitespace-nowrap overflow-x-auto ' style={{scrollbarWidth: 'none'}}>
        <button
          className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'my'
              ? 'bg-[#0081FFFC] text-white'
              : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('my')}
        >
          My Reminders ({reminders.filter(r => r.createdBy === currentUser).length})
        </button>
        <button
          className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'sharedWithMe'
              ? 'bg-[#0081FFFC] text-white'
              : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('sharedWithMe')}
        >
          Shared With Me ({reminders.filter(r => r.sharedWith?.includes(currentUser)).length})
        </button>
        <button
          className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            activeTab === 'sharedByMe'
              ? 'bg-[#0081FFFC] text-white'
              : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
          }`}
          onClick={() => setActiveTab('sharedByMe')}
        >
          Shared By Me ({reminders.filter(r => r.createdBy === currentUser && r.sharedWith?.length > 0).length})
        </button>
      </div>

      {/* ==================== CALENDAR & REMINDERS LIST ==================== */}
      <div className='md:flex gap-6'>
        {/* Calendar Section */}
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

        {/* Reminders List Section */}
        <div className='flex-1 mt-2.5'>
          <p className='text- font-semibold mb-4'>
            {selectedDate ? `Reminders for ${selectedDate.toLocaleDateString()}` : 'All Reminder'}
            <span className='text-sm text-gray-500 ml-2'>({filteredReminders.length})</span>
          </p>

          {/* Loading State */}
          {loading ? (
            <div className='flex justify-center items-center py-10'>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredReminders.length > 0 ? (
            /* Reminders List */
            filteredReminders.map(item => (
              <div
                key={item.id}
                className='w-full border border-[#E5E5E5] rounded-lg mt-4 p-4 hover:shadow-md transition-shadow'
              >
                {/* Reminder Header */}
                <div className='flex justify-between items-start'>
                  <p className='text-sm font-semibold'>{item.title}</p>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      item.priority === 'Very High'
                        ? 'bg-red-100 text-red-600'
                        : item.priority === 'High'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {item.priority}
                  </span>
                </div>

                {/* Description */}
                {item.description && (
                  <p className='text-xs text-gray-600 mt-2'>{item.description}</p>
                )}

                {/* Creator Info */}
                <div className='flex gap-2 pt-3'>
                  <img src={user01} className='w-5 h-5' alt="user" />
                  <p className='text-xs text-gray-600'>
                    Created by: <span className='font-medium'>{item.createdBy}</span>
                  </p>
                </div>

                {/* Date & Star */}
                <div className='flex justify-between items-center pt-3'>
                  <div className='flex gap-2 items-center'>
                    <img src={calendardate} className='w-4 h-4' alt="calendar" />
                    <p className='text-xs text-gray-700'>
                      {new Date(item.date).toLocaleDateString()}
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
                          ? 'invert(66%) sepia(93%) saturate(1352%)'
                          : 'grayscale(100%) opacity(40%)'
                      }}
                    />
                  </button>
                </div>

                <div className='h-[1px] bg-[#E5E5E5] my-3'></div>

                {/* Action Buttons */}
                {item.status === 'pending' ? (
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
                ) : (
                  <div className='flex items-center gap-2'>
                    <span
                      className={`font-medium text-sm ${
                        item.status === 'approved' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {getStatusText(item)}
                    </span>
                  </div>
                )}
              </div>
            ))
          ) : (
            /* Empty State */
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

      {/* ==================== CREATE REMINDER MODAL ==================== */}
      {showModal && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setShowModal(false)}
          ></div>
          <div className='relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 z-30'>
            <h2 className='text-xl font-semibold mb-4'>Create New Reminder</h2>
            <div className='space-y-4'>
              <input
                name="title"
                value={newReminder.title}
                onChange={handleInputChange}
                className='w-full border border-gray-300 outline-none focus:border-blue-500 rounded-lg px-3 py-2 text-sm'
                placeholder='Enter reminder title'
              />
              <textarea
                name="description"
                value={newReminder.description}
                onChange={handleInputChange}
                className='w-full border border-gray-300 outline-none focus:border-blue-500 rounded-lg px-3 py-2 text-sm min-h-[80px]'
                placeholder='Enter description (optional)'
              />
              <select
                name="priority"
                value={newReminder.priority}
                onChange={handleInputChange}
                className='w-full border border-gray-300 outline-none focus:border-blue-500 rounded-lg px-3 py-2 text-sm'
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Very High">Very High</option>
              </select>
              <div className='grid grid-cols-2 gap-4'>
                <input
                  type="date"
                  name="date"
                  value={newReminder.date}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 outline-none focus:border-blue-500 rounded-lg px-3 py-2 text-sm'
                />
                <input
                  type="time"
                  name="time"
                  value={newReminder.time}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 outline-none focus:border-blue-500 rounded-lg px-3 py-2 text-sm'
                />
              </div>
              <input
                type="time"
                name="alertTime"
                value={newReminder.alertTime}
                onChange={handleInputChange}
                className='w-full border border-gray-300 outline-none focus:border-blue-500 rounded-lg px-3 py-2 text-sm'
                placeholder='Alert Time'
              />
              <input
                type="text"
                name="assignTo"
                value={newReminder.assignTo}
                onChange={handleInputChange}
                className='w-full border border-gray-300 outline-none focus:border-blue-500 rounded-lg px-3 py-2 text-sm'
                placeholder='Assign To'
              />
            </div>
            <div className='flex gap-3 mt-6'>
              <button
                onClick={() => setShowModal(false)}
                className='flex-1 px-4 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={createReminder}
                className='flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors'
              >
                Create Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== APPROVE MODAL ==================== */}
      {approveModal.show && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setApproveModal({ show: false, reminderId: null })}
          ></div>
          <div className='relative bg-white p-6 rounded-xl w-full max-w-md'>
            <h2 className='text-xl font-semibold'>Approve Request</h2>
            <p className='text-gray-600 mt-2 text-sm'>
              Are you sure you want to approve this reminder?
            </p>
            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={() => setApproveModal({ show: false, reminderId: null })}
                className='bg-gray-200 px-4 py-2 rounded text-[#707070]'
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                className='bg-green-500 px-4 py-2 rounded text-white'
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== REJECT MODAL ==================== */}
      {rejectModal.show && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          <div
            className='absolute inset-0 bg-black/50'
            onClick={() => setRejectModal({ show: false, reminderId: null, reason: '' })}
          ></div>
          <div className='relative bg-white p-6 rounded-xl w-full max-w-md'>
            <h2 className='text-xl font-semibold'>Provide Reason</h2>
            <p className='text-gray-600 mt-2 text-sm'>
              Please provide a reason for rejecting this reminder
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder='Enter your Reason...'
              className='w-full border border-gray-300 rounded-md mt-2 p-2 text-sm'
            />
            <div className='flex justify-end gap-3 mt-4'>
              <button
                onClick={() => setRejectModal({ show: false, reminderId: null, reason: '' })}
                className='bg-gray-200 px-4 py-2 rounded text-[#707070]'
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                className='bg-red-500 px-4 py-2 rounded text-white'
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== NOTIFICATION POPUP ==================== */}
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
            <button
              onClick={handleSnooze}
              className='bg-blue-500 px-3 py-1 text-white rounded text-xs hover:bg-blue-600 transition-colors'
            >
              Snooze
            </button>
            <button
              onClick={handleDismiss}
              className='bg-gray-200 px-3 py-1 text-[#707070] rounded text-xs hover:bg-gray-300 transition-colors'
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ==================== SNOOZE SELECTION POPUP ==================== */}
      {snoozePopup.show && (
        <div className='fixed top-20 right-5 bg-white shadow-xl rounded-xl p-4 w-60 z-50 border border-gray-200'>
          <p className='font-semibold mb-3'>Snooze for how long?</p>
          <div className='flex flex-col gap-2'>
            <button
              onClick={() => confirmSnooze(2)}
              className='bg-blue-500 hover:bg-blue-600 px-3 py-2 text-white rounded text-sm transition-colors'
            >
              2 minutes
            </button>
            <button
              onClick={() => confirmSnooze(15)}
              className='bg-blue-500 hover:bg-blue-600 px-3 py-2 text-white rounded text-sm transition-colors'
            >
              15 minutes
            </button>
            <button
              onClick={() => setSnoozePopup({ show: false, reminder: null })}
              className='bg-gray-200 hover:bg-gray-300 px-3 py-2 text-[#707070] rounded text-sm transition-colors'
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;