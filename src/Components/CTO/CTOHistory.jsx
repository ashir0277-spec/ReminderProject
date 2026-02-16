import React, { useState, useEffect } from 'react';
import Sidebar from './SidebarOther';
import Topbar from '../Admin/Topbar';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from '../firebase';
import { IoEllipsisVertical, IoTrashOutline, IoCheckboxOutline } from "react-icons/io5";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CTOHistory = () => {
  const [history, setHistory] = useState([]);
  const [expandedReminder, setExpandedReminder] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, reminderId: null, isMultiple: false, deleting: false });
  const [activeTab, setActiveTab] = useState(() => {
    // Get saved tab from localStorage or default to 'all'
    return localStorage.getItem('ctoHistoryTab') || 'all';
  });

  // Save active tab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('ctoHistoryTab', activeTab);
  }, [activeTab]);

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

  // Toggle reminder expansion
  const toggleReminderExpansion = (id) => {
    setExpandedReminder(expandedReminder === id ? null : id);
  };

  // Toggle item selection
  const toggleSelection = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Select all items
  const handleSelectAll = () => {
    if (selectedItems.length === filteredHistory.length && filteredHistory.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredHistory.map(item => item.id));
    }
    // Don't close menu
  };

  // Delete single reminder
  const handleDeleteClick = (id) => {
    setDeleteModal({ show: true, reminderId: id, isMultiple: false, deleting: false });
  };

  // Delete multiple reminders
  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }
    setDeleteModal({ show: true, reminderId: null, isMultiple: true, deleting: false });
    setShowMenu(false);
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      setDeleteModal({ ...deleteModal, deleting: true });
      
      if (deleteModal.isMultiple) {
        // Delete multiple
        await Promise.all(
          selectedItems.map(id => deleteDoc(doc(db, "reminders", id)))
        );
        toast.success(`${selectedItems.length} reminder(s) deleted successfully!`);
        setSelectedItems([]);
      } else {
        // Delete single
        await deleteDoc(doc(db, "reminders", deleteModal.reminderId));
        toast.success("Reminder deleted successfully!");
        setExpandedReminder(null);
      }
    } catch (err) {
      toast.error("Failed to delete reminder(s)");
      console.error(err);
    }
    setDeleteModal({ show: false, reminderId: null, isMultiple: false, deleting: false });
  };

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

  // Priority badge color
  const priorityColor = (priority) => {
    switch (priority) {
      case "Very High":
        return "bg-red-100 text-red-600";
      case "High":
        return "bg-orange-100 text-orange-600";
      default:
        return "bg-blue-100 text-blue-600";
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

  const shouldShowStatus = (item) => {
    return !item.assignedTo?.includes("HR") || item.assignedTo.split(', ').length > 1;
  };

  // Filter reminders by active tab
  const filterByTab = (reminder) => {
    if (activeTab === 'all') return true;
    
    if (activeTab === 'ceo') {
      // Show reminders ONLY created BY CEO
      return reminder.createdBy === 'CEO';
    }
    
    if (activeTab === 'cto') {
      // Show reminders ONLY created BY CTO
      return reminder.createdBy === 'CTO';
    }
    
    if (activeTab === 'hr') {
      // Show reminders ONLY created BY HR
      return reminder.createdBy === 'HR';
    }
    
    return true;
  };

  // Get filtered history
  const filteredHistory = history.filter(filterByTab);

  // Get counts for each tab - EXACT counts, no overlap
  const allCount = history.length; // Total all reminders
  
  // CEO count - reminders CREATED by CEO only
  const ceoCount = history.filter(r => r.createdBy === 'CEO').length;
  
  // CTO count - reminders CREATED by CTO only
  const ctoCount = history.filter(r => r.createdBy === 'CTO').length;
  
  // HR count - reminders CREATED by HR only
  const hrCount = history.filter(r => r.createdBy === 'HR').length;

  return (
    <>
      <style>{`
        .history-scroll-container::-webkit-scrollbar {
          width: 8px;
        }
        
        .history-scroll-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        
        .history-scroll-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        
        .history-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Hide scrollbar for tabs */
        .tabs-container::-webkit-scrollbar {
          width: 0px;
          height: 0px;
        }

        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }

        .animate-progress {
          animation: progress 1.5s ease-in-out infinite;
        }
      `}</style>

      <Sidebar />
      
      <div className="p-6">
        <ToastContainer />
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Reminders History</h2>
            {selectedItems.length > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                {selectedItems.length} item(s) selected
              </p>
            )}
          </div>

          {/* Three Dots Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <IoEllipsisVertical className="text-xl text-gray-600" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  onClick={handleSelectAll}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left text-sm"
                >
                  <IoCheckboxOutline className="text-lg text-blue-600" />
                  <span className="text-gray-700">
                    {selectedItems.length === filteredHistory.length && filteredHistory.length > 0 ? "Deselect All" : "Select All"}
                  </span>
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left text-sm border-t border-gray-200"
                  disabled={selectedItems.length === 0}
                >
                  <IoTrashOutline className="text-lg text-red-600" />
                  <span className={selectedItems.length === 0 ? "text-gray-400" : "text-red-600"}>
                    Delete Selected ({selectedItems.length})
                  </span>
                </button>
              </div>
            )}

            {/* Backdrop to close menu */}
            {showMenu && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              ></div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container flex gap-2 mb-5 overflow-x-auto pb-2">
          <button
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'all' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => {
              setActiveTab('all');
              setSelectedItems([]);
            }}
          >
            All ({allCount})
          </button>
          <button
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'ceo' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => {
              setActiveTab('ceo');
              setSelectedItems([]);
            }}
          >
            CEO ({ceoCount})
          </button>
          <button
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'cto' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => {
              setActiveTab('cto');
              setSelectedItems([]);
            }}
          >
            CTO ({ctoCount})
          </button>
          <button
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'hr' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => {
              setActiveTab('hr');
              setSelectedItems([]);
            }}
          >
            HR ({hrCount})
          </button>
        </div>

        {/* Scroll Container */}
        <div className="overflow-x-auto">
          {/* Table Headings */}
          <div className="min-w-[900px] grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr] bg-gray-200 px-4 py-2 rounded-md font-semibold text-gray-700">
            <div>Title</div>
            <div>Date & Time</div>
            <div>Created By</div>
            <div>Status</div>
            <div className="text-right">Priority</div>
          </div>

          {/* Table Rows */}
          {filteredHistory.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg mt-2">
              <p className="text-gray-500 text-lg">📭 No reminder history available</p>
              <p className="text-gray-400 text-sm mt-2">
                {activeTab === 'ceo' ? 'No CEO reminders found' : 
                 activeTab === 'cto' ? 'No CTO reminders found' : 
                 activeTab === 'hr' ? 'No HR reminders found' : 
                 'No reminders found'}
              </p>
            </div>
          ) : (
            <div className="history-scroll-container max-h-[600px] overflow-y-auto space-y-2 mt-2">
              {filteredHistory.map((item) => {
                const isExpanded = expandedReminder === item.id;
                const isSelected = selectedItems.includes(item.id);

                // Format date and time
                const formatDateTime = (date, time) => {
                  if (!date) return "No Date";
                  const dateObj = new Date(date);
                  const formattedDate = dateObj.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  });
                  const formattedTime = time || "";
                  return `${formattedDate} ${formattedTime}`;
                };

                // Get status text
                const getStatusText = (status, updatedBy) => {
                  if (status === 'approved') {
                    return updatedBy ? `Approved by ${updatedBy}` : 'Approved';
                  }
                  if (status === 'reject') {
                    return updatedBy ? `Rejected by ${updatedBy}` : 'Rejected';
                  }
                  if (status === 'pending') return 'Pending';
                  return status;
                };

                // Get status color
                const getStatusColor = (status) => {
                  if (status === 'approved') return 'text-green-600';
                  if (status === 'reject') return 'text-red-600';
                  if (status === 'pending') return 'text-orange-500';
                  return 'text-gray-600';
                };

                // Get priority color
                const getPriorityColor = (priority) => {
                  if (priority === 'Very High' || priority === 'High') return 'text-red-600';
                  if (priority === 'Normal') return 'text-orange-500';
                  return 'text-blue-600';
                };

                return (
                  <div key={item.id} className={isSelected ? 'ring-2 ring-blue-500 rounded-md' : ''}>
                    <div
                      className="min-w-[900px] grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr] bg-white px-4 py-3 rounded-md shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => toggleReminderExpansion(item.id)}
                    >
                      <div>{item.title}</div>
                      <div>{formatDateTime(item.date, item.time)}</div>
                      <div>{item.createdBy}</div>
                      <div className={getStatusColor(item.status)}>
                        {shouldShowStatus(item) ? getStatusText(item.status, item.updatedBy) : '-'}
                      </div>
                      <div className={`text-right font-semibold ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="min-w-[900px] bg-gray-50 px-4 py-4 rounded-b-md border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          {item.description && (
                            <div className="col-span-2">
                              <p className="text-xs font-medium text-gray-500 mb-1">Description:</p>
                              <p className="text-xs text-gray-700">{item.description}</p>
                            </div>
                          )}

                          {item.alertTime && (
                            <div>
                              <p className="text-xs text-gray-600">
                                ⏰ Alert Time: <span className="font-medium">{item.alertTime}</span>
                              </p>
                            </div>
                          )}

                          <div>
                            <p className="text-xs text-gray-600">
                              To: <span className="font-medium text-blue-700">{getAssignedToDisplay(item)}</span>
                            </p>
                          </div>

                          {item.status === 'reject' && item.reason && (
                            <div className="col-span-2 bg-red-50 p-2 rounded">
                              <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason:</p>
                              <p className="text-xs text-red-600">{item.reason}</p>
                            </div>
                          )}

                          {item.status === 'approved' && item.updatedBy && (
                            <div className="col-span-2">
                              <p className="text-xs text-green-600">
                                ✓ Approved By: <span className="font-medium">{item.updatedBy}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Delete Button */}
                        <div className="flex justify-end pt-3 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(item.id);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                          >
                            <IoTrashOutline className="text-base" />
                            Delete Reminder
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleteModal.deleting && setDeleteModal({ show: false, reminderId: null, isMultiple: false, deleting: false })}
          ></div>
          <div className="relative bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <IoTrashOutline className="text-2xl text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Delete Reminder{deleteModal.isMultiple ? 's' : ''}</h2>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            
            {!deleteModal.deleting ? (
              <>
                <p className="text-gray-600 text-sm mb-6">
                  {deleteModal.isMultiple
                    ? `Are you sure you want to delete ${selectedItems.length} selected reminder(s)?`
                    : 'Are you sure you want to delete this reminder?'}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteModal({ show: false, reminderId: null, isMultiple: false, deleting: false })}
                    className="bg-gray-200 hover:bg-gray-300 px-5 py-2 rounded-lg text-gray-700 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="bg-red-500 hover:bg-red-600 px-5 py-2 rounded-lg text-white font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="py-4">
                <p className="text-center text-gray-700 font-medium mb-4">Deleting...</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-red-600 h-2.5 rounded-full animate-progress"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CTOHistory;