import React, { useEffect, useState } from "react";
import HrSidebar from "./HrSidebar";  // FIXED: Changed from Sidebar to HrSidebar
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { IoEllipsisVertical, IoTrashOutline, IoCheckboxOutline } from "react-icons/io5";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Clock, User, Users } from "lucide-react";

const HRHistory = () => {
  const [history, setHistory] = useState([]);
  const [expandedReminder, setExpandedReminder] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, reminderId: null, isMultiple: false, deleting: false });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('hrHistoryTab') || 'all';
  });
  
  const currentUser = "HR";

  useEffect(() => {
    localStorage.setItem('hrHistoryTab', activeTab);
  }, [activeTab]);

  // Fetch HR reminders history
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

  const toggleReminderExpansion = (id) => {
    setExpandedReminder(expandedReminder === id ? null : id);
  };

  const toggleSelection = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredHistory.length && filteredHistory.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredHistory.map(item => item.id));
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteModal({ show: true, reminderId: id, isMultiple: false, deleting: false });
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      toast.error("No items selected");
      return;
    }
    setDeleteModal({ show: true, reminderId: null, isMultiple: true, deleting: false });
    setShowMenu(false);
  };

  const confirmDelete = async () => {
    try {
      setDeleteModal({ ...deleteModal, deleting: true });
      
      if (deleteModal.isMultiple) {
        await Promise.all(
          selectedItems.map(id => deleteDoc(doc(db, "reminders", id)))
        );
        toast.success(`${selectedItems.length} reminder(s) deleted successfully!`);
        setSelectedItems([]);
      } else {
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
  const getBorderColor = (status) => {
    if (status === "approved") return "border-l-green-500";
    if (status === "reject") return "border-l-red-500";
    if (status === "pending") return "border-l-orange-400";
    return "border-l-gray-400";
  };

  // Status badge color
  const getStatusBadgeColor = (status) => {
    if (status === "approved") return "bg-green-100 text-green-600";
    if (status === "reject") return "bg-red-100 text-red-600";
    if (status === "pending") return "bg-orange-100 text-orange-500";
    return "bg-gray-100 text-gray-600";
  };

  // Filter by tab
  const filterByTab = (reminder) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'ceo') return reminder.createdBy === 'CEO';
    if (activeTab === 'cto') return reminder.createdBy === 'CTO';
    if (activeTab === 'hr') return reminder.createdBy === 'HR';
    return true;
  };

  const filteredHistory = history.filter(filterByTab);

  const allCount = history.length;
  const ceoCount = history.filter(r => r.createdBy === 'CEO').length;
  const ctoCount = history.filter(r => r.createdBy === 'CTO').length;
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

        .tabs-container::-webkit-scrollbar {
          width: 0px;
          height: 0px;
        }

        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        .animate-progress {
          animation: progress 1.5s ease-in-out infinite;
        }
      `}</style>

      <HrSidebar />
      <ToastContainer />

      <div className="rounded-md min-h-screen border border-[#E2E4E7] p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Reminders History</h1>
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

        {/* History List */}
        <div className="history-scroll-container min-h-screen mx-4 mt-6 space-y-4 overflow-y-auto max-h-[600px] pr-2">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-lg"> No reminder history available</p>
              <p className="text-gray-400 text-sm mt-2">
                {activeTab === 'ceo' ? 'No CEO reminders found' : 
                 activeTab === 'cto' ? 'No CTO reminders found' : 
                 activeTab === 'hr' ? 'No HR reminders found' : 
                 'No reminders found'}
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isExpanded = expandedReminder === item.id;
              const isSelected = selectedItems.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`relative flex items-center border border-[#E5E5E5] rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                    isSelected ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => toggleReminderExpansion(item.id)}
                >
                  {/* Reminder Info */}
                  <div
                    className={`border-l-[3px] pl-10 space-y-1 flex-1 ${getBorderColor(item.status)}`}
                  >
                    <p className="text-base font-semibold">
                      {item.title}
                    </p>
                    <p className="text-[#575B74] font-medium text-sm">
                      To: {item.assignedTo || "All Employees"}
                    </p>
                    <p className="text-[#575B74] font-medium text-xs">
                      Created At:{" "}
                      {item.createdAt?.toDate?.()
                        ? item.createdAt.toDate().toLocaleString()
                        : "N/A"}
                    </p>

                    {!isExpanded && (
                      <div className="flex justify-center pt-1">
                        <p className="text-[10px] text-gray-400 italic"> see more</p>
                      </div>
                    )}
                  </div>

                  {/* Status Right Center */}
                  <div className="ml-auto flex items-center pr-4">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusBadgeColor(item.status)}`}
                    >
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-lg z-10">
                      {item.description && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Description:</p>
                          <p className="text-xs text-gray-700">{item.description}</p>
                        </div>
                      )}

                      {item.date && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-600">
                            📅 Date: <span className="font-medium">{item.date}</span>
                            {item.time && <span className="ml-2">at {item.time}</span>}
                          </p>
                        </div>
                      )}

                      {item.alertTime && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-600 flex gap-2">
                            <Clock size={15}/> Alert Time: <span className="font-medium">{item.alertTime}</span>
                          </p>
                        </div>
                      )}

                      {item.priority && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-600">
                             Priority: <span className="font-medium">{item.priority}</span>
                          </p>
                        </div>
                      )}

                      {item.createdBy && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-600 flex gap-2">
                            <User size={15}/> Created By: <span className="font-medium">{item.createdBy}</span>
                          </p>
                        </div>
                      )}

                      {item.status === 'reject' && item.reason && (
                        <div className="mb-3 bg-red-50 p-2 rounded">
                          <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason:</p>
                          <p className="text-xs text-red-600">{item.reason}</p>
                        </div>
                      )}

                      {item.status === 'approved' && item.updatedBy && (
                        <div className="mb-2">
                          <p className="text-xs text-green-600">
                            ✓ Approved By: <span className="font-medium">{item.updatedBy}</span>
                          </p>
                        </div>
                      )}

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
            })
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

export default HRHistory;