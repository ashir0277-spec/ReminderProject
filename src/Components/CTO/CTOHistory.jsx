import React, { useState, useEffect } from 'react';
import Sidebar from './SidebarOther';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from '../firebase';
import {
  IoEllipsisVertical,
  IoTrashOutline,
  IoCheckboxOutline,
  IoCloseOutline,
} from "react-icons/io5";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSearch } from '../../Context/SearchContext';

const CTOHistory = () => {
  const [history, setHistory] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, reminderId: null, isMultiple: false, deleting: false });
  const [detailModal, setDetailModal] = useState({ show: false, item: null });
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ctoHistoryTab') || 'all');

  const { searchQuery } = useSearch();

  useEffect(() => { localStorage.setItem('ctoHistoryTab', activeTab); }, [activeTab]);

  useEffect(() => {
    const q = query(collection(db, "reminders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelection = (e, id) => {
    e.stopPropagation();
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredHistory.length && filteredHistory.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredHistory.map(item => item.id));
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const openDeleteSingle = (id) => {
    setDetailModal({ show: false, item: null });
    setDeleteModal({ show: true, reminderId: id, isMultiple: false, deleting: false });
  };

  const openDeleteMultiple = () => {
    if (selectedItems.length === 0) { toast.error("No items selected"); return; }
    setDeleteModal({ show: true, reminderId: null, isMultiple: true, deleting: false });
    setShowMenu(false);
  };

  const confirmDelete = async () => {
    try {
      setDeleteModal(prev => ({ ...prev, deleting: true }));
      if (deleteModal.isMultiple) {
        await Promise.all(selectedItems.map(id => deleteDoc(doc(db, "reminders", id))));
        toast.success(`${selectedItems.length} reminder(s) deleted successfully!`);
        setSelectedItems([]);
      } else {
        await deleteDoc(doc(db, "reminders", deleteModal.reminderId));
        toast.success("Reminder deleted successfully!");
      }
    } catch (err) {
      toast.error("Failed to delete reminder(s)");
      console.error(err);
    }
    setDeleteModal({ show: false, reminderId: null, isMultiple: false, deleting: false });
  };

  // ── Filters ────────────────────────────────────────────────────────────────
  const filterByTab = (r) => {
    if (activeTab === 'all') return true;
    return r.createdBy === activeTab.toUpperCase();
  };

  const filterBySearch = (r) => {
    if (!searchQuery?.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  };

  const filteredHistory = history.filter(filterByTab).filter(filterBySearch);
  const allCount = history.length;
  const ceoCount = history.filter(r => r.createdBy === 'CEO').length;
  const ctoCount = history.filter(r => r.createdBy === 'CTO').length;
  const hrCount  = history.filter(r => r.createdBy === 'HR').length;
  const selectionMode = selectedItems.length > 0;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getAssignedToDisplay = (item) => {
    if (item.assignedTo?.trim()) return item.assignedTo.trim();
    if (item.assignedEmails?.length > 0) return item.assignedEmails.join(", ");
    return "Not Assigned";
  };

  const shouldShowStatus = (item) =>
    !item.assignedTo?.includes("HR") || item.assignedTo.split(', ').length > 1;

  const getStatusText = (status, updatedBy) => {
    if (status === 'approved') return updatedBy ? `Approved by ${updatedBy}` : 'Approved';
    if (status === 'reject')   return updatedBy ? `Rejected by ${updatedBy}` : 'Rejected';
    if (status === 'pending')  return 'Pending';
    return status || '-';
  };

  const getStatusColor = (status) => {
    if (status === 'approved') return 'text-green-600';
    if (status === 'reject')   return 'text-red-600';
    if (status === 'pending')  return 'text-orange-500';
    return 'text-gray-600';
  };

  const getStatusBadge = (status) => {
    if (status === 'approved') return 'bg-green-100 text-green-700 border border-green-200';
    if (status === 'reject')   return 'bg-red-100 text-red-700 border border-red-200';
    if (status === 'pending')  return 'bg-orange-100 text-orange-700 border border-orange-200';
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'Very High' || priority === 'High') return 'text-red-600';
    if (priority === 'Normal') return 'text-orange-500';
    return 'text-blue-600';
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'Very High') return 'bg-red-100 text-red-700 border border-red-200';
    if (priority === 'High')      return 'bg-orange-100 text-orange-700 border border-orange-200';
    return 'bg-blue-100 text-blue-700 border border-blue-200';
  };

  const formatDateLong = (date, time) => {
    if (!date) return "No Date";
    const d = new Date(date);
    const fd = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    return time ? `${fd} at ${time}` : fd;
  };

  const formatDateShort = (date, time) => {
    if (!date) return "No Date";
    const d = new Date(date);
    const fd = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return time ? `${fd} ${time}` : fd;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .history-scroll-container::-webkit-scrollbar { width: 8px; }
        .history-scroll-container::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .history-scroll-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .history-scroll-container::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .tabs-container::-webkit-scrollbar { width: 0; height: 0; }
        .modal-scroll::-webkit-scrollbar { width: 6px; }
        .modal-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-progress { animation: progress 1.5s ease-in-out infinite; }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
      `}</style>

      <Sidebar />

      <div className="p-4 lg:p-6 min-h-screen bg-gray-50">
        <ToastContainer />

        {/* ── Header ── */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">Reminders History</h2>
            {searchQuery?.trim() && (
              <p className="text-sm text-gray-500 mt-1">
                {filteredHistory.length} result{filteredHistory.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
              </p>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <IoEllipsisVertical className="text-xl text-gray-600" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button onClick={handleSelectAll} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm">
                  <IoCheckboxOutline className="text-lg text-blue-600 shrink-0" />
                  <span className="text-gray-700">
                    {selectedItems.length === filteredHistory.length && filteredHistory.length > 0 ? "Deselect All" : "Select All"}
                  </span>
                </button>
                <button
                  onClick={openDeleteMultiple}
                  disabled={selectedItems.length === 0}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-left text-sm border-t border-gray-200"
                >
                  <IoTrashOutline className="text-lg text-red-600 shrink-0" />
                  <span className={selectedItems.length === 0 ? "text-gray-400" : "text-red-600"}>
                    Delete Selected ({selectedItems.length})
                  </span>
                </button>
              </div>
            )}
            {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
          </div>
        </div>

        {/* ── Floating Delete Bar ── */}
        {selectionMode && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {selectedItems.length}
              </div>
              <span className="text-sm font-medium text-blue-800">
                item{selectedItems.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedItems([])}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={openDeleteMultiple}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                <IoTrashOutline className="text-sm" />
                Delete {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="tabs-container flex gap-2 mb-5 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All', count: allCount },
            { key: 'ceo', label: 'CEO', count: ceoCount },
            { key: 'cto', label: 'CTO', count: ctoCount },
            { key: 'hr',  label: 'HR',  count: hrCount  },
          ].map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.key ? 'bg-[#0081FFFC] text-white' : 'text-[#2C3E50] bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => { setActiveTab(tab.key); setSelectedItems([]); }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto -mx-4 lg:mx-0 px-4 lg:px-0">
          <div className="min-w-[700px] grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr] bg-gray-200 px-4 py-2 rounded-md font-semibold text-gray-700 text-sm">
            <div>Title</div>
            <div>Date &amp; Time</div>
            <div>Created By</div>
            <div>Status</div>
            <div className="text-right">Priority</div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg mt-2 min-w-[700px]">
              {searchQuery?.trim() ? (
                <>
                  <p className="text-gray-500 text-lg">🔍 No matching results</p>
                  <p className="text-gray-400 text-sm mt-2">No reminders found for &quot;<span className="font-medium">{searchQuery}</span>&quot;</p>
                  <p className="text-gray-400 text-xs mt-1">Try a different keyword</p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg"> No reminder history available !</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {activeTab !== 'all' ? `No ${activeTab.toUpperCase()} reminders found` : 'No reminders found'}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="history-scroll-container max-h-[600px] overflow-y-auto space-y-2 mt-2 min-w-[700px]" style={{scrollbarWidth:"none"}}>
              {filteredHistory.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <div key={item.id} className={`relative ${isSelected ? 'ring-2 ring-blue-500 rounded-md' : ''}`}>

                    {selectionMode && (
                      <button
                        onClick={(e) => toggleSelection(e, item.id)}
                        className={`absolute top-1/2 -translate-y-1/2 right-3 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-400 text-transparent hover:border-blue-400'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}

                    <div
                      className={`grid grid-cols-[2fr_2fr_1.5fr_1.5fr_1fr] bg-white px-4 py-3 rounded-md shadow-sm text-sm transition-all cursor-pointer ${
                        selectionMode
                          ? `pr-12 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`
                          : 'hover:shadow-md hover:bg-blue-50/40'
                      }`}
                      onClick={(e) => {
                        if (selectionMode) { toggleSelection(e, item.id); }
                        else { setDetailModal({ show: true, item }); }
                      }}
                    >
                      <div className="truncate pr-2 font-medium text-gray-800">{item.title}</div>
                      <div className="truncate pr-2 text-gray-600">{formatDateShort(item.date, item.time)}</div>
                      <div className="truncate pr-2 text-gray-700">{item.createdBy}</div>
                      <div className={`truncate pr-2 font-medium ${getStatusColor(item.status)}`}>
                        {shouldShowStatus(item) ? getStatusText(item.status, item.updatedBy) : '-'}
                      </div>
                      <div className={`text-right font-semibold ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          Detail Popup — Simple
      ══════════════════════════════════════ */}
      {detailModal.show && detailModal.item && (() => {
        const item = detailModal.item;
        return (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDetailModal({ show: false, item: null })} />

            <div className="relative bg-white w-full max-w-md rounded-xl shadow-xl animate-slide-up">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900 truncate pr-4">{item.title}</h2>
                <button onClick={() => setDetailModal({ show: false, item: null })} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <IoCloseOutline className="text-xl" />
                </button>
              </div>

              {/* Body */}
              <div className="modal-scroll overflow-y-auto max-h-[55vh] px-5 py-4 space-y-3 text-sm">

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusBadge(item.status)}`}>
                    {shouldShowStatus(item) ? getStatusText(item.status, item.updatedBy) : 'N/A'}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getPriorityBadge(item.priority)}`}>
                    {item.priority || 'Normal'}
                  </span>
                  {item.createdBy && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {item.createdBy}
                    </span>
                  )}
                </div>

                {/* Info rows */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex gap-3">
                    <span className="text-gray-400 w-24 shrink-0">Date</span>
                    <span className="text-gray-800">{formatDateLong(item.date, item.time)}</span>
                  </div>
                  {item.alertTime && (
                    <div className="flex gap-3">
                      <span className="text-gray-400 w-24 shrink-0">Alert</span>
                      <span className="text-gray-800">{item.alertTime}</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <span className="text-gray-400 w-24 shrink-0">Assigned To</span>
                    <span className="text-gray-800">{getAssignedToDisplay(item)}</span>
                  </div>
                  {item.description && (
                    <div className="flex gap-3">
                      <span className="text-gray-400 w-24 shrink-0">Description</span>
                      <span className="text-gray-700 leading-relaxed">{item.description}</span>
                    </div>
                  )}
                </div>

                {/* Rejection reason */}
                {item.status === 'reject' && item.reason && (
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
                    <span className="font-semibold block mb-1">Rejection Reason</span>
                    {item.reason}
                  </div>
                )}

                {/* Approved by */}
                {item.status === 'approved' && item.updatedBy && (
                  <p className="text-xs text-green-600 font-medium">✓ Approved by {item.updatedBy}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
                <button
                  onClick={() => setDetailModal({ show: false, item: null })}
                  className="px-4 py-1.5 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => openDeleteSingle(item.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  <IoTrashOutline className="text-sm" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════
          Delete Confirmation Modal
      ══════════════════════════════════════ */}
      {deleteModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleteModal.deleting && setDeleteModal({ show: false, reminderId: null, isMultiple: false, deleting: false })}
          />
          <div className="relative bg-white p-6 rounded-xl w-full max-w-md shadow-2xl animate-slide-up">
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
                  <div className="bg-red-600 h-2.5 rounded-full animate-progress" />
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