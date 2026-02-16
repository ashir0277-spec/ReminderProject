import React, { useEffect, useState } from "react";
import HrSidebar from './HrSidebar';
import user01 from '../../assets/user-01.svg';
import calendardate from '../../assets/calendar-date.svg';

// Firebase
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../../Components/firebase";
import { IoEllipsisVertical, IoTrashOutline, IoCheckboxOutline } from "react-icons/io5";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const HRReminder = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [hrReminders, setHrReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedReminder, setExpandedReminder] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ 
    show: false, 
    reminderId: null, 
    isMultiple: false, 
    deleting: false 
  });

  const currentUser = sessionStorage.getItem('userRole') || "HR";

  useEffect(() => {
    const loadReminders = async () => {
      setLoading(true);
      setError(null);

      try {
        // HR ke dwara BHEJI gayi reminders (outgoing)
        const myQuery = query(
          collection(db, "reminders"),
          where("createdBy", "==", currentUser)
        );

        // HR ko AAYI hui reminders (incoming)
        const incomingQuery = query(
          collection(db, "reminders"),
          where("assignedTo", "==", currentUser)
        );

        const [mySnap, incomingSnap] = await Promise.all([
          getDocs(myQuery),
          getDocs(incomingQuery)
        ]);

        // Outgoing reminders (HR ne bheje)
        const myList = mySnap.docs.map(docSnap => {
          const data = docSnap.data();
          let status = data.status || "pending";
          if (status === "reject") status = "rejected";
          status = status.charAt(0).toUpperCase() + status.slice(1);

          return {
            id: docSnap.id,
            title: data.title || "Untitled",
            description: data.description || "",
            name: data.assignedTo || "Unknown",
            createdBy: data.createdBy || "Unknown",
            dueDate: data.date ? new Date(data.date).toLocaleDateString() : "",
            time: data.time || "",
            status: status,
            statusColor:
              status.toLowerCase() === "pending" ? "#FF8D28" :
              status.toLowerCase() === "approved" ? "#22C55E" :
              "#EF4444",
            priority: data.priority || "Normal",
            isIncoming: false,
            type: "outgoing"
          };
        });

        // Incoming reminders (CEO, CTO ne HR ko bheji)
        const incomingList = incomingSnap.docs
          .filter(docSnap => docSnap.data().createdBy !== currentUser)
          .map(docSnap => {
            const data = docSnap.data();
            let status = data.status || "pending";
            if (status === "reject") status = "rejected";
            status = status.charAt(0).toUpperCase() + status.slice(1);

            return {
              id: docSnap.id,
              title: data.title || "Untitled",
              description: data.description || "",
              name: data.assignedTo || "HR",
              createdBy: data.createdBy || "Unknown",
              dueDate: data.date ? new Date(data.date).toLocaleDateString() : "",
              time: data.time || "",
              status: status,
              statusColor:
                status.toLowerCase() === "pending" ? "#FF8D28" :
                status.toLowerCase() === "approved" ? "#22C55E" :
                "#EF4444",
              priority: data.priority || "Normal",
              isIncoming: true,
              type: "incoming"
            };
          });

        const combined = [...myList, ...incomingList];
        const uniqueList = Array.from(
          new Map(combined.map(item => [item.id, item])).values()
        );

        const priorityOrder = { 'Very High': 4, 'High': 3, 'Normal': 2, 'Low': 1 };
        uniqueList.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

        setHrReminders(uniqueList);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Reminders load nahi ho rahe. Firebase check karo.");
      } finally {
        setLoading(false);
      }
    };

    loadReminders();
  }, []);

  // Filter logic
  const filteredReminders =
    activeTab === "All"
      ? hrReminders
      : hrReminders.filter(item => 
          item.type === "outgoing" && 
          item.status.toLowerCase() === activeTab.toLowerCase()
        );

  // Toggle expand/collapse
  const toggleReminderExpansion = (id) => {
    setExpandedReminder(expandedReminder === id ? null : id);
  };

  // Toggle selection
  const toggleSelection = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Select all
  const handleSelectAll = () => {
    if (selectedItems.length === filteredReminders.length && filteredReminders.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredReminders.map(item => item.id));
    }
  };

  // Delete single reminder
  const handleDeleteClick = (id) => {
    setDeleteModal({ show: true, reminderId: id, isMultiple: false, deleting: false });
  };

  // Delete multiple reminders
  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      toast.error("No items selected", {
        position: "top-center",
        className: "px-5"
      });
      return;
    }
    setDeleteModal({ show: true, reminderId: null, isMultiple: true, deleting: false });
    setShowMenu(false);
  };

  // Confirm delete (soft delete)
  const confirmDelete = async () => {
    try {
      setDeleteModal(prev => ({ ...prev, deleting: true }));

      if (deleteModal.isMultiple) {
        // Batch delete for multiple items
        const batch = writeBatch(db);
        selectedItems.forEach(id => {
          batch.update(doc(db, "reminders", id), { isDeleted: true });
        });
        await batch.commit();
        
        toast.success(`${selectedItems.length} reminder(s) deleted successfully!`, {
          position: "top-center",
          autoClose: 2000,
          className: "px-5"
        });
        setSelectedItems([]);
      } else {
        // Single delete
        await updateDoc(doc(db, "reminders", deleteModal.reminderId), { 
          isDeleted: true 
        });
        
        toast.success("Reminder deleted successfully!", {
          position: "top-center",
          autoClose: 2000,
          className: "px-5"
        });
        setExpandedReminder(null);
      }

      // Refresh reminders list
      const updatedReminders = hrReminders.filter(r => {
        if (deleteModal.isMultiple) {
          return !selectedItems.includes(r.id);
        }
        return r.id !== deleteModal.reminderId;
      });
      setHrReminders(updatedReminders);

    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete reminder(s)", {
        position: "top-center",
        className: "px-5"
      });
    }

    setDeleteModal({ show: false, reminderId: null, isMultiple: false, deleting: false });
  };

  // Avatar logic
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
      : parts[0][0] || "?";
  };

  const shouldShowStatus = (item) => {
    return item.type === "outgoing";
  };

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

      <div className='min-h-screen'>
        {/* Header */}
        <div className='flex justify-between items-center px-4 pt-4'>
          <h1 className='text-2xl font-semibold'>HR Dashboard</h1>

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
                    {selectedItems.length === filteredReminders.length && filteredReminders.length > 0 
                      ? "Deselect All" 
                      : "Select All"}
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

            {/* Overlay to close menu */}
            {showMenu && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              ></div>
            )}
          </div>
        </div>

        <div className='min-h-20 mt-5'>
          <p className='px-4 text-sm font-medium whitespace-nowrap'>Sent Reminders</p>

          {/* Tabs */}
          <div className='py-3 flex justify-between lg:w-[40%] px-4'>
            {["All", "Pending", "Approved", "Rejected"].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedItems([]);
                }}
                className={`font-medium text-xs px-5 py-2 rounded-2xl
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

        {/* Reminders List with Scrollbar */}
        <div className='reminders-scroll-container max-h-[600px] overflow-y-auto pr-2' style={{scrollbarWidth:'none'}}>
          {loading ? (
            <div className='mx-4 mt-6 text-center text-gray-500'>
              <p>Loading reminders...</p>
            </div>
          ) : error ? (
            <div className='mx-4 mt-6 border border-red-300 bg-red-50 rounded-2xl p-6 text-center'>
              <p className='text-red-600'>{error}</p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className='mx-4 mt-6 border border-[#E5E5E5] rounded-2xl p-6 text-center'>
              <p className='text-sm font-medium text-[#575B74]'>
                No {activeTab !== "All" ? activeTab : ""} reminders found
              </p>
            </div>
          ) : (
            filteredReminders.map((item, index) => {
              const avatar = avatarColors[index % avatarColors.length];
              const isExpanded = expandedReminder === item.id;
              const isSelected = selectedItems.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`border min-h-30 mx-4 mt-4 rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow relative ${
                    isSelected ? 'ring-2 ring-blue-500' : 'border-[#E5E5E5]'
                  }`}
                  onClick={() => toggleReminderExpansion(item.id)}
                >
                  <div className='flex items-start gap-3'>
                    <div
                      className={`w-10 h-10 rounded-full 
                      ${avatar.bg} 
                      flex items-center justify-center flex-shrink-0`}
                    >
                      <p className={`text-base font-medium ${avatar.text}`}>
                        {getInitials(item.name)}
                      </p>
                    </div>

                    <div className='flex flex-col flex-1 mt-2'>
                      <div className='flex justify-between items-start'>
                        <p className='text-sm font-medium'>{item.title}</p>
                        <p className='text-[#D4183D] text-xs whitespace-nowrap'>! {item.priority}</p>
                      </div>

                      {item.description && (
                        <p className='text-xs font-medium text-[#575B74] mt-2'>
                          {item.description}
                        </p>
                      )}

                      <p className='text-[#575B74] text-xs font-medium mt-2'>
                        Created by: {item.createdBy}
                      </p>

                      <p className='text-blue-600 text-xs font-medium mt-1'>
                        Assigned to: {item.name}
                      </p>

                      <div className='h-[2px] w-full bg-[#E5E5E5] mt-3'></div>

                      <div className='flex items-center justify-between mt-3'>
                        <p className='text-[#2C3E50] font-medium text-xs flex items-center gap-2'>
                          <img src={calendardate} className='w-4 h-4' alt="date" />
                          {item.dueDate} {item.time && `, ${item.time}`}
                        </p>

                        {shouldShowStatus(item) && (
                          <p
                            className='font-medium text-sm'
                            style={{ color: item.statusColor }}
                          >
                            • {item.status}
                          </p>
                        )}
                      </div>

                      {!isExpanded && (
                        <div className='flex justify-center pt-2'>
                          <p className='text-[10px] text-gray-400 italic'> see more </p>
                        </div>
                      )}

                      {/* Expanded Section */}
                      {isExpanded && (
                        <div className='mt-4 pt-4 border-t border-gray-200'>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(item.id);
                            }}
                            className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1'
                          >
                            <IoTrashOutline className='text-base' />
                            Delete Reminder
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          {/* Overlay - Only closes when NOT deleting and user clicks outside */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!deleteModal.deleting) {
                setDeleteModal({ show: false, reminderId: null, isMultiple: false, deleting: false });
              }
            }}
          ></div>
          
          <div className="relative bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <IoTrashOutline className="text-2xl text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Delete Reminder{deleteModal.isMultiple ? 's' : ''}
                </h2>
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

export default HRReminder;