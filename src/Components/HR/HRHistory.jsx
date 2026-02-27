import React, { useEffect, useState } from "react";
import HrSidebar from "./HrSidebar";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { IoEllipsisVertical, IoTrashOutline, IoCheckboxOutline, IoClose } from "react-icons/io5";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Clock, User } from "lucide-react";

const HRHistory = () => {
  const [history, setHistory] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ show: false, reminderId: null, isMultiple: false, deleting: false });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('hrHistoryTab') || 'all';
  });
  const [activePopup, setActivePopup] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ show: false, reminder: null });
  
  const currentUser = "HR";

  useEffect(() => {
    localStorage.setItem('hrHistoryTab', activeTab);
  }, [activeTab]);

  // Fetch all relevant reminders
  useEffect(() => {
    const q1 = query(
      collection(db, "reminders"),
      where("createdBy", "==", "HR"),
      orderBy("createdAt", "desc")
    );
    const q2 = query(
      collection(db, "reminders"),
      where("createdBy", "==", "CEO"),
      orderBy("createdAt", "desc")
    );
    const q3 = query(
      collection(db, "reminders"),
      where("createdBy", "==", "CTO"),
      orderBy("createdAt", "desc")
    );

    const mergeAndSet = (...snapshots) => {
      const map = new Map();
      snapshots.forEach(snap => {
        snap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
      });
      const merged = Array.from(map.values()).sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      setHistory(merged);
    };

    let snap1 = null, snap2 = null, snap3 = null;

    const unsub1 = onSnapshot(q1, s => { snap1 = s; if (snap1 && snap2 && snap3) mergeAndSet(snap1, snap2, snap3); });
    const unsub2 = onSnapshot(q2, s => { snap2 = s; if (snap1 && snap2 && snap3) mergeAndSet(snap1, snap2, snap3); });
    const unsub3 = onSnapshot(q3, s => { snap3 = s; if (snap1 && snap2 && snap3) mergeAndSet(snap1, snap2, snap3); });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  const toggleSelection = (id, e) => {
    e.stopPropagation();
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectionMode(true);
    setSelectedItems(filteredHistory.map(item => item.id));
    setShowMenu(false);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedItems([]);
  };

  const handleDeleteClick = (id, e) => {
    e.stopPropagation();
    setActivePopup(null);
    setDetailsModal({ show: false, reminder: null });
    setDeleteModal({ show: true, reminderId: id, isMultiple: false, deleting: false });
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      toast.error("No items selected", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
      return;
    }
    setDeleteModal({ show: true, reminderId: null, isMultiple: true, deleting: false });
  };

  const confirmDelete = async () => {
    try {
      setDeleteModal(prev => ({ ...prev, deleting: true }));
      
      if (deleteModal.isMultiple) {
        const batch = writeBatch(db);
        selectedItems.forEach(id => {
          batch.delete(doc(db, "reminders", id));
        });
        await batch.commit();
        
        toast.success(`${selectedItems.length} reminder(s) deleted successfully!`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        });
        setSelectedItems([]);
        setSelectionMode(false);
      } else {
        await deleteDoc(doc(db, "reminders", deleteModal.reminderId));
        toast.success("Reminder deleted successfully!", {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        });
      }
    } catch (err) {
      toast.error("Failed to delete reminder(s)", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
      console.error(err);
    }
    setDeleteModal({ show: false, reminderId: null, isMultiple: false, deleting: false });
  };

  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDate();
    const suffix = ['th', 'st', 'nd', 'rd'];
    const relevantDigits = (day < 30) ? day % 20 : day % 30;
    const daySuffix = (relevantDigits <= 3) ? suffix[relevantDigits] : suffix[0];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}${daySuffix} ${month} ${year}`;
  };

  const openDetailsModal = (reminder) => {
    setDetailsModal({ show: true, reminder });
  };

  const closeDetailsModal = () => {
    setDetailsModal({ show: false, reminder: null });
  };

  const getBorderColor = (status) => {
    if (status === "approved") return "border-l-green-500";
    if (status === "reject") return "border-l-red-500";
    if (status === "pending") return "border-l-orange-400";
    return "border-l-gray-400";
  };

  const getStatusBadgeColor = (status) => {
    if (status === "approved") return "bg-green-100 text-green-600";
    if (status === "reject") return "bg-red-100 text-red-600";
    if (status === "pending") return "bg-orange-100 text-orange-500";
    return "bg-gray-100 text-gray-600";
  };

  const belongsToRole = (reminder, role) => {
    const roleUpper = role.toUpperCase();
    const createdByRole = (reminder.createdBy || '').toUpperCase() === roleUpper;
    const assignedToRole = (reminder.assignedTo || '')
      .split(',')
      .map(r => r.trim().toUpperCase())
      .includes(roleUpper);
    const sharedWithRole = Array.isArray(reminder.sharedWith)
      ? reminder.sharedWith.some(r => (r || '').toUpperCase() === roleUpper)
      : false;
    return createdByRole || assignedToRole || sharedWithRole;
  };

  const filterByTab = (reminder) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'ceo') return belongsToRole(reminder, 'CEO');
    if (activeTab === 'cto') return belongsToRole(reminder, 'CTO');
    if (activeTab === 'hr')  return belongsToRole(reminder, 'HR');
    return true;
  };

  const filteredHistory = history.filter(filterByTab);

  const allCount = history.length;
  const ceoCount = history.filter(r => belongsToRole(r, 'CEO')).length;
  const ctoCount = history.filter(r => belongsToRole(r, 'CTO')).length;
  const hrCount  = history.filter(r => belongsToRole(r, 'HR')).length;

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
        .history-card {
          position: relative;
        }
        .history-card:hover .hover-hint {
          opacity: 1;
        }
        .hover-hint {
          opacity: 0;
          transition: opacity 0.3s ease;
        }
      `}</style>

      <HrSidebar />
      <ToastContainer />

      <div className="rounded-md min-h-screen border border-[#E2E4E7] p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Reminders History</h1>
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
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left text-sm"
                >
                  <IoCheckboxOutline className="text-lg text-blue-600" />
                  <span className="text-gray-700 font-medium">
                    Select All
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

        {/* Selection Mode Bar */}
        {selectionMode && (
          <div className="mx-4 mt-4 mb-4 flex justify-end">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 w-fit">
              {selectedItems.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <IoTrashOutline className="text-base" />
                  Delete ({selectedItems.length})
                </button>
              )}
              
              <button
                onClick={exitSelectionMode}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs-container flex gap-2 mb-5 overflow-x-auto pb-2">
          <button
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'all' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => { setActiveTab('all'); setSelectedItems([]); setSelectionMode(false); }}
          >
            All ({allCount})
          </button>
          <button
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'ceo' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => { setActiveTab('ceo'); setSelectedItems([]); setSelectionMode(false); }}
          >
            CEO ({ceoCount})
          </button>
          <button
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'cto' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => { setActiveTab('cto'); setSelectedItems([]); setSelectionMode(false); }}
          >
            CTO ({ctoCount})
          </button>
          <button
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'hr' ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => { setActiveTab('hr'); setSelectedItems([]); setSelectionMode(false); }}
          >
            HR ({hrCount})
          </button>
        </div>

        {/* History List */}
        <div className="history-scroll-container mt-6 space-y-4 overflow-y-auto max-h-[600px]" style={{scrollbarWidth:'none'}}>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-lg">No reminder history available</p>
              <p className="text-gray-400 text-sm mt-2">
                {activeTab === 'ceo' ? 'No CEO reminders found' : 
                 activeTab === 'cto' ? 'No CTO reminders found' : 
                 activeTab === 'hr' ? 'No HR reminders found' : 
                 'No reminders found'}
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isSelected = selectedItems.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`history-card relative flex items-start border rounded-lg px-4 py-3 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all min-h-[100px] ${
                    isSelected ? 'ring-2 ring-blue-500' : 'border-[#E5E5E5]'
                  } ${selectionMode ? 'cursor-pointer' : ''}`}
                  onClick={(e) => {
                    if (selectionMode) {
                      toggleSelection(item.id, e);
                    } else {
                      openDetailsModal(item);
                    }
                  }}
                >
                  {/* Checkbox - TOP RIGHT in selection mode */}
                  {selectionMode && (
                    <div
                      className="absolute top-3 right-3 z-10"
                      onClick={(e) => toggleSelection(item.id, e)}
                    >
                      <div className={`w-6 h-6 border-2 rounded-md flex items-center justify-center cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 scale-110'
                          : 'bg-white border-gray-300 hover:border-blue-400'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Three Dots - Top Right (only when NOT in selection mode) */}
                  {!selectionMode && (
                    <div className="absolute top-3 right-3 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopup(activePopup === item.id ? null : item.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <IoEllipsisVertical className="text-base text-gray-600" />
                      </button>

                      {activePopup === item.id && (
                        <>
                          <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <button
                              onClick={(e) => handleDeleteClick(item.id, e)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 transition-colors text-left text-sm rounded-lg"
                            >
                              <IoTrashOutline className="text-base text-red-600" />
                              <span className="text-red-600 font-medium">Delete</span>
                            </button>
                          </div>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePopup(null);
                            }}
                          ></div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Reminder Info */}
                  <div className={`border-l-[3px] space-y-1 flex-1 ${getBorderColor(item.status)} pl-4 pr-12 pb-8`}>
                    <p className="text-base font-semibold">{item.title}</p>
                    <p className="text-[#575B74] font-medium text-sm">
                      To: {item.assignedTo || "All Employees"}
                    </p>
                    <p className="text-[#575B74] font-medium text-xs">
                      Created At:{" "}
                      {item.createdAt?.toDate?.()
                        ? item.createdAt.toDate().toLocaleString()
                        : "N/A"}
                    </p>
                  </div>

                  {/* Status Badge - Bottom Right */}
                  <div className="absolute bottom-3 right-3">
                    {/* Hide status badge in selection mode to avoid overlap with checkbox */}
                    {!selectionMode && (
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusBadgeColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    )}
                  </div>

                  {/* Hover Hint */}
                  {!selectionMode && (
                    <div className='hover-hint absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-[10px] px-3 py-1 rounded-full'>
                      Click to see details
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Details Modal */}
      {detailsModal.show && detailsModal.reminder && (
        <div className='fixed inset-0 flex items-center justify-center z-50 p-4'>
          <div className='absolute inset-0 bg-black/50' onClick={closeDetailsModal}></div>
          
          <div className='relative bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden z-30'>
            <div className='bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center'>
              <h2 className='text-xl font-semibold text-gray-800'>Reminder Details</h2>
              <button onClick={closeDetailsModal} className='p-1.5 hover:bg-gray-100 rounded-full transition-colors'>
                <IoClose className='text-2xl text-gray-600' />
              </button>
            </div>

            <div className='p-6 overflow-y-auto max-h-[calc(90vh-80px)]' style={{scrollbarWidth:'none'}}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-xs font-medium text-gray-500 mb-1.5'>Title</label>
                  <p className='text-base font-semibold text-gray-900'>{detailsModal.reminder.title}</p>
                </div>

                {detailsModal.reminder.description && (
                  <div>
                    <label className='block text-xs font-medium text-gray-500 mb-1.5'>Description</label>
                    <p className='text-sm text-gray-700'>{detailsModal.reminder.description}</p>
                  </div>
                )}

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2'>
                  {detailsModal.reminder.priority && (
                    <div>
                      <label className='block text-xs font-medium text-gray-500 mb-1.5'>Priority</label>
                      <span className='inline-block bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded'>
                        {detailsModal.reminder.priority}
                      </span>
                    </div>
                  )}
                  <div>
                    <label className='block text-xs font-medium text-gray-500 mb-1.5'>Created By</label>
                    <p className='text-sm font-medium text-gray-900'>{detailsModal.reminder.createdBy}</p>
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-500 mb-1.5'>Assigned To</label>
                    <p className='text-sm font-medium text-gray-900'>{detailsModal.reminder.assignedTo || "All Employees"}</p>
                  </div>
                  {detailsModal.reminder.date && (
                    <div>
                      <label className='block text-xs font-medium text-gray-500 mb-1.5'>Date</label>
                      <p className='text-sm font-medium text-gray-900'>{formatDate(detailsModal.reminder.date)}</p>
                    </div>
                  )}
                  {detailsModal.reminder.time && (
                    <div>
                      <label className='block text-xs font-medium text-gray-500 mb-1.5'>Time</label>
                      <p className='text-sm font-medium text-gray-900'>{formatTime(detailsModal.reminder.time)}</p>
                    </div>
                  )}
                  {detailsModal.reminder.alertTime && (
                    <div>
                      <label className='block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1'>
                        <Clock size={12}/>
                        Alert Time
                      </label>
                      <p className='text-sm font-medium text-gray-900'>{formatTime(detailsModal.reminder.alertTime)}</p>
                    </div>
                  )}
                </div>

                <div className='pt-2'>
                  <label className='block text-xs font-medium text-gray-500 mb-2'>Status</label>
                  <div className={`p-4 rounded-lg border ${
                    detailsModal.reminder.status === 'approved' ? 'bg-green-50 border-green-200' : 
                    detailsModal.reminder.status === 'reject' ? 'bg-red-50 border-red-200' : 
                    'bg-orange-50 border-orange-200'
                  }`}>
                    <p className={`text-sm font-semibold mb-1 ${
                      detailsModal.reminder.status === 'approved' ? 'text-green-700' : 
                      detailsModal.reminder.status === 'reject' ? 'text-red-700' : 
                      'text-orange-700'
                    }`}>
                      {detailsModal.reminder.status === 'approved' ? '✓ Approved' : 
                       detailsModal.reminder.status === 'reject' ? '✗ Rejected' : 
                       'Pending'}
                    </p>
                    {detailsModal.reminder.status === 'approved' && detailsModal.reminder.updatedBy && (
                      <p className='text-xs text-green-600'>
                        Approved by: <span className='font-semibold'>{detailsModal.reminder.updatedBy}</span>
                      </p>
                    )}
                    {detailsModal.reminder.status === 'reject' && detailsModal.reminder.rejectedBy && (
                      <p className='text-xs text-red-600'>
                        Rejected by: <span className='font-semibold'>{detailsModal.reminder.rejectedBy}</span>
                      </p>
                    )}
                    {detailsModal.reminder.status === 'reject' && detailsModal.reminder.reason && (
                      <div className='mt-2 pt-2 border-t border-red-200'>
                        <p className='text-xs text-red-600'>
                          Reason: <span className='font-semibold'>{detailsModal.reminder.reason}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
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