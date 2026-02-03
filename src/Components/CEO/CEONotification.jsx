import React, { useState } from 'react'
import Sidebar from './CEOSidebar'
import Topbar from '../Admin/Topbar'
import user01 from '../../assets/user-01.svg'
import calendardate from '../../assets/calendar-date.svg'
import clock from '../../assets/clock.svg'
import tickCircle from '../../assets/tick-circle.svg'

const CEONotification = () => {

  const [activeTab, setActiveTab] = useState("All")

  const meetingsData = [
    {
      id: 1,
      title: "Meeting with Client",
      priority: "High",
      status: "Approved",
      date: "Oct 12 2025",
      time: "12:45",
      createdBy: "HR",
      approvedBy: "CEO",
    },
    {
      id: 2,
      title: "Project Review",
      priority: "Normal",
      status: "Approved",
      date: "Oct 14 2025",
      time: "10:30",
      createdBy: "HR",
      approvedBy: "CTO",
    },
    {
      id: 3,
      title: "Team Standup",
      priority: "Normal",
      status: "Pending",
      date: "Oct 15 2025",
      time: "09:00",
      createdBy: "HR",
      approvedBy: "",
    },
    {
      id: 4,
      title: "Budget Approval",
      priority: "High",
      status: "Rejected",
      date: "Oct 16 2025",
      time: "02:15",
      createdBy: "HR",
      approvedBy: "CEO",
    },
    {
      id: 5,
      title: "Hiring Discussion",
      priority: "Normal",
      status: "Approved",
      date: "Oct 18 2025",
      time: "11:00",
      createdBy: "HR",
      approvedBy: "CEO",
    },
    {
      id: 6,
      title: "Policy Update Meeting",
      priority: "High",
      status: "Pending",
      date: "Oct 20 2025",
      time: "04:30",
      createdBy: "HR",
      approvedBy: "",
    }
  ]

  // 🔹 Priority TEXT color only
  const priorityColor = (priority) =>
    priority === "High"
      ? "text-[#FF383C]"
      : "text-green-600"

  const statusColor = (status) => {
    if (status === "Approved") return "text-green-600"
    if (status === "Pending") return "text-orange-500"
    if (status === "Rejected") return "text-red-600"
  }

  const formatTime = (time) => {
    const [hours, minutes] = time.split(":")
    const hour = parseInt(hours)
    const suffix = hour >= 12 ? "PM" : "AM"
    const formattedHour = hour % 12 || 12
    return `${formattedHour}:${minutes} ${suffix}`
  }

  const filteredData =
    activeTab === "All"
      ? meetingsData
      : meetingsData.filter(item => item.status === activeTab)

  return (
    <>
      <Sidebar />
     

      <div className='lg:ml[21%] mt- px-4'>
        <h1 className='text-2xl font-semibold'>Notification</h1>

        {/* Tabs */}
        <div className='w-1/2 flex justify-between px-4 py-3 mt-3 bg-[#CCCCCC14] rounded-full'>
          {["All", "Approved", "Pending", "Rejected"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-2 rounded-full text-xs font-medium
                ${activeTab === tab
                  ? "bg-[#0081FF] text-white"
                  : "text-[#2C3E50]"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Cards */}
        {filteredData.map(item => (
          <div
            key={item.id}
            className='border border-[#f1858599] shadow-sm rounded-xl mt-6 mr-4 h-40'
          >
            <div className='m-5 space-y-4'>
              <div className='flex justify-between items-center'>
                <p className='text-sm font-semibold'>{item.title}</p>
                <p className={`text-[10px] font-medium ${priorityColor(item.priority)}`}>
                  {item.priority}
                </p>
              </div>

              <div className='flex space-x-2 items-center'>
                <img src={calendardate} alt="calendar" />
                <p className='text-[#575B74] text-xs font-medium'>{item.date}</p>
                <img src={clock} alt="clock" />
                <p className='text-[#575B74] text-xs font-medium'>
                  {formatTime(item.time)}
                </p>
              </div>

              <div className='flex space-x-2 items-center'>
                <img src={user01} alt="user" />
                <p className='text-[#72758E] text-xs'>
                  Created By: {item.createdBy}
                </p>
              </div>

              <div className='flex justify-between items-center'>
                <div className='flex space-x-2 items-center'>
                  <img src={tickCircle} alt="check" />
                  <p className='text-[#72758E] text-xs'>
                    Approved By: {item.approvedBy || "—"}
                  </p>
                </div>

                <p className={`text-xs font-semibold ${statusColor(item.status)}`}>
                  {item.status}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default CEONotification
