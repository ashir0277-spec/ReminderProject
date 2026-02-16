import React, { useState, useEffect } from 'react';
import Sidebar from './HrSidebar';
import user01 from '../../assets/user-01.svg';
import calendardate from '../../assets/calendar-date.svg';
import star from '../../assets/star.svg';
import { IoAddOutline, IoChevronDown, IoChevronUp, IoChevronForward, IoTrashOutline } from "react-icons/io5";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../Components/firebase";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const HRDashboard = () => {
  const [showModal, setShowModal] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [expandedReminder, setExpandedReminder] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, reminderId: null });
  const [activeTab, setActiveTab] = useState('my');
  
  const currentUser = sessionStorage.getItem('userRole') || "HR";
  const currentUserEmail = sessionStorage.getItem('userEmail') || "";

  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    priority: 'Normal',
    date: null,
    time: null,
    alertTime: null,
    assignTo: '',
    assignedEmails: []
  });

  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [expandedRole, setExpandedRole] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAllCTO, setSelectAllCTO] = useState(false);
  const [selectAllHR, setSelectAllHR] = useState(false);

  const [users, setUsers] = useState({
    HR: [],
    CTO: [],
    CEO: []
  });
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchReminders();
  }, []);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const fetchedUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers({
        HR: fetchedUsers.filter(u => u.role === 'HR'),
        CTO: fetchedUsers.filter(u => u.role === 'CTO'),
        CEO: fetchedUsers.filter(u => u.role === 'CEO')
      });
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const myQuery = query(collection(db, "reminders"), where("createdBy", "==", currentUser));
      const assignedRoleQuery = query(collection(db, "reminders"), where("assignedTo", "array-contains", "HR"));
      const sharedRoleQuery = query(collection(db, "reminders"), where("sharedWith", "array-contains", "HR"));
      const assignedEmailQuery = currentUserEmail ? query(collection(db, "reminders"), where("assignedEmails", "array-contains", currentUserEmail)) : null;

      const queries = [myQuery, assignedRoleQuery, sharedRoleQuery];
      if (assignedEmailQuery) queries.push(assignedEmailQuery);

      const snapshots = await Promise.all(queries.map(q => getDocs(q)));

      const allReminders = snapshots.flatMap(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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

  const handleRoleClick = (role) => {
    const roleUsers = users[role] || [];
    if (roleUsers.length === 1) {
      toggleUserSelection(roleUsers[0]);
      return;
    }
    setExpandedRole(expandedRole === role ? null : role);
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

  const confirmAssignment = () => {
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

  const handleInputChange = (e) => {
    setNewReminder({
      ...newReminder,
      [e.target.name]: e.target.value
    });
  };

  const createReminder = async () => {
    if (!newReminder.title.trim()) {
      toast.error("Please enter a title for the reminder.");
      return;
    }

    if (!newReminder.date) {
      toast.error("Please select a date.");
      return;
    }

    if (!newReminder.time) {
      toast.error("Please select a time.");
      return;
    }

    try {
      const assignedRoles = [...new Set(selectedUsers.map(u => u.role))];
      const allSharedRoles = [...assignedRoles, currentUser];
      const allSharedEmails = [...new Set([...newReminder.assignedEmails, currentUserEmail])];
      const sharedWith = [...new Set([...allSharedRoles, ...allSharedEmails])];

      await addDoc(collection(db, "reminders"), {
        title: newReminder.title.trim(),
        description: newReminder.description.trim(),
        priority: newReminder.priority,
        createdBy: currentUser,
        assignedTo: newReminder.assignTo.trim(),
        assignedEmails: newReminder.assignedEmails,
        sharedWith,
        date: newReminder.date.toISOString().split('T')[0],
        time: newReminder.time.toTimeString().slice(0, 5),
        alertTime: newReminder.alertTime ? newReminder.alertTime.toTimeString().slice(0, 5) : null,
        status: "pending",
        starred: false,
        createdAt: serverTimestamp(),
      });

      toast.success("Reminder created successfully!");
      
      setShowModal(false);
      setNewReminder({
        title: '', description: '', priority: 'Normal',
        date: null, time: null, alertTime: null, assignTo: '', assignedEmails: []
      });
      setSelectedUsers([]);
      setSelectAllCTO(false);
      setSelectAllHR(false);

      fetchReminders();
    } catch (error) {
      console.error("Create error:", error);
      toast.error("Failed to create reminder. Please try again.");
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

  const handleDeleteClick = (id) => {
    setDeleteModal({ show: true, reminderId: id });
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, "reminders", deleteModal.reminderId));
      setReminders(prev => prev.filter(r => r.id !== deleteModal.reminderId));
      toast.success("Reminder deleted successfully!");
      setExpandedReminder(null);
    } catch (err) {
      toast.error("Failed to delete reminder");
      console.error(err);
    }
    setDeleteModal({ show: false, reminderId: null });
  };

  const toggleReminderExpansion = (id) => {
    setExpandedReminder(expandedReminder === id ? null : id);
  };

  const shouldShowStatus = (item) => {
    const assignedRoles = (item.assignedTo || '').split(', ').filter(Boolean);
    const isOnlyHR = (assignedRoles.length === 0 || 
                     (assignedRoles.length === 1 && assignedRoles[0] === 'HR'));

    if (isOnlyHR && item.createdBy === currentUser) {
      return false;
    }

    return true;
  };

  const filterByTab = (reminder) => {
    if (activeTab === 'my') return reminder.createdBy === currentUser;
    if (activeTab === 'sharedWithMe') return reminder.sharedWith?.includes(currentUser) && reminder.createdBy !== currentUser;
    if (activeTab === 'sharedByMe') return reminder.createdBy === currentUser && reminder.sharedWith?.length > 0;
    return true;
  };

  const filteredReminders = reminders.filter(filterByTab);

  return (
    <>
      <style>{`
        .reminders-scroll-container::-webkit-scrollbar {
          width: 8px;
        }
        
        .reminders-scroll-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        
        .reminders-scroll-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        
        .reminders-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Sidebar />

      <div className='rounded-md min-h-screen border border-[#E2E4E7] p-3'>
        <div className='flex justify-between items-center mb-6'>
          <h1 className='text-xl sm:text-2xl font-semibold whitespace-nowrap'>HR Dashboard</h1>
          <button
            onClick={() => setShowModal(true)}
            className='bg-[#0081FFFC] flex gap-2 items-center text-white text-sm font-medium px-3 py-2.5 rounded-xl whitespace-nowrap'
          >
            <IoAddOutline className='text-[20px]' />
            New Reminder
          </button>
        </div>

        {/* Tabs */}
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

        {filteredReminders.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No reminders found</p>
        ) : (
          <div className='reminders-scroll-container max-h-[600px] overflow-y-auto pr-2'>
            {filteredReminders.map((item) => {
              const isExpanded = expandedReminder === item.id;
              
              return (
                <div
                  key={item.id}
                  className='border border-[#E5E5E5] shadow-md px-4 py-4 mt-6 rounded-lg cursor-pointer hover:shadow-lg transition-shadow'
                  onClick={() => toggleReminderExpansion(item.id)}
                >
                  <div className='flex justify-between'>
                    <h1 className='text-sm font-semibold'>{item.title}</h1>
                    <p className='text-[#D4183D] text-xs'>! {item.priority}</p>
                  </div>

                  {item.description && (
                    <p className='text-xs text-gray-600 mt-2'>
                      {item.description}
                    </p>
                  )}

                  <div className='flex gap-2 mt-3'>
                    <img src={user01} className='w-5 h-5' alt="user" />
                    <p className='text-xs text-gray-600'>
                      Created by: <span className='font-medium'>{item.createdBy}</span>
                    </p>
                  </div>

                  {item.assignedTo && item.assignedTo.trim() !== '' && (
                    <p className='text-xs text-gray-600 mt-2'>
                      Assigned to: <span className='font-medium text-blue-600'>{item.assignedTo}</span>
                    </p>
                  )}

                  {item.alertTime && (
                    <p className='text-xs text-gray-600 mt-2'>
                      ⏰ Alert Time: <span className='font-medium'>{item.alertTime}</span>
                    </p>
                  )}

                  <div className='flex justify-between items-center mt-3'>
                    <div className='flex gap-2 items-center'>
                      <img src={calendardate} className='w-4 h-4' alt="calendar" />
                      <p className='text-xs text-gray-700'>
                        {item.date} {item.time && `at ${item.time}`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(item.id, item.starred);
                      }}
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

                  {!isExpanded && (
                    <div className='flex justify-center pt-2'>
                      <p className='text-[10px] text-gray-400 italic'>Click to see details</p>
                    </div>
                  )}

                  {isExpanded && (
                    <>
                      <div className='h-[1px] bg-[#E5E5E5] my-3'></div>
                      
                      <div className='flex justify-between items-center'>
                        {shouldShowStatus(item) && item.createdBy === currentUser && (
                          <span
                            className={`font-medium text-sm ${
                              item.status === 'approved' ? 'text-green-600' : item.status === 'reject' ? 'text-red-600' : 'text-orange-600'
                            }`}
                          >
                            {item.status === 'approved' ? '✓ Approved' : item.status === 'reject' ? '✗ Rejected' : 'Pending'}
                          </span>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.id);
                          }}
                          className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ml-auto'
                        >
                          <IoTrashOutline className='text-base' />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal.show && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          <div className='absolute inset-0 bg-black/50' onClick={() => setDeleteModal({ show: false, reminderId: null })}></div>
          <div className='relative bg-white p-6 rounded-xl w-full max-w-md shadow-2xl'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center'>
                <IoTrashOutline className='text-2xl text-red-600' />
              </div>
              <div>
                <h2 className='text-xl font-semibold text-gray-800'>Delete Reminder</h2>
                <p className='text-sm text-gray-500'>This action cannot be undone</p>
              </div>
            </div>
            <p className='text-gray-600 text-sm mb-6'>
              Are you sure you want to delete this reminder?
            </p>
            <div className='flex justify-end gap-3'>
              <button
                onClick={() => setDeleteModal({ show: false, reminderId: null })}
                className='bg-gray-200 hover:bg-gray-300 px-5 py-2 rounded-lg text-gray-700 font-medium transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className='bg-red-500 hover:bg-red-600 px-5 py-2 rounded-lg text-white font-medium transition-colors'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Reminder Modal - Same as before */}
      {showModal && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          <div className='absolute inset-0 bg-black/50' onClick={() => setShowModal(false)} />
          
          <div className='relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 z-30'>
            <h2 className='text-xl font-semibold mb-6'>Create New Reminder</h2>
            
            <div className='space-y-5'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>Title *</label>
                <input
                  name="title"
                  value={newReminder.title}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  placeholder='Enter reminder title'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>Description</label>
                <textarea
                  name="description"
                  value={newReminder.description}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm min-h-[90px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                  placeholder='Optional description'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>Priority</label>
                <select
                  name="priority"
                  value={newReminder.priority}
                  onChange={handleInputChange}
                  className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none'
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Very High">Very High</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>Date *</label>
                <DatePicker
                  selected={newReminder.date}
                  onChange={(date) => setNewReminder({ ...newReminder, date })}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select date"
                  className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer'
                  wrapperClassName="w-full"
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>Time *</label>
                <DatePicker
                  selected={newReminder.time}
                  onChange={(time) => setNewReminder({ ...newReminder, time })}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="h:mm aa"
                  placeholderText="Select time"
                  className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer'
                  wrapperClassName="w-full"
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>Alert Time</label>
                <DatePicker
                  selected={newReminder.alertTime}
                  onChange={(alertTime) => setNewReminder({ ...newReminder, alertTime })}
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={15}
                  timeCaption="Alert Time"
                  dateFormat="h:mm aa"
                  placeholderText="Select alert time (optional)"
                  className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer'
                  wrapperClassName="w-full"
                />
              </div>

              {/* Assign To Dropdown - Same as before */}
              <div className='relative'>
                <label className='block text-sm font-medium text-gray-700 mb-1.5'>Assign To (optional)</label>
                <div
                  onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                  className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm cursor-pointer hover:border-blue-500 bg-white flex justify-between items-center transition-colors'
                >
                  <span className={newReminder.assignTo ? 'text-gray-900' : 'text-gray-400'}>
                    {newReminder.assignTo || 'Select users...'}
                  </span>
                  {showAssignDropdown ? <IoChevronUp className='text-gray-500' /> : <IoChevronDown className='text-gray-500' />}
                </div>

                {newReminder.assignedEmails?.length > 0 && (
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    {newReminder.assignTo.split(', ').map((role, index) => (
                      <span
                        key={index}
                        className='inline-flex items-center bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full'
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}

                {showAssignDropdown && (
                  <div className='absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto'>
                    {/* HR Section */}
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
                                checked={selectedUsers.some(u => u.id === user.id)}
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

                    {/* CTO Section */}
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
                                checked={selectedUsers.some(u => u.id === user.id)}
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

                    {/* CEO Section */}
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
                                checked={selectedUsers.some(u => u.id === user.id)}
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
                          onClick={() => {
                            setSelectedUsers([]);
                            setSelectAllCTO(false);
                            setSelectAllHR(false);
                          }}
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
                  </div>
                )}
              </div>
            </div>

            <div className='flex gap-3 mt-8'>
              <button
                onClick={() => setShowModal(false)}
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
      )}
    </>
  );
};

export default HRDashboard;