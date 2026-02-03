import React from 'react'
import Sidebar from './SidebarOther'
import Topbar from '../Admin/Topbar'
import AdminDashboard from '../Admin/AdminDashboard'
import StatsCard from '../StatsCard'
import UserManagement from './UserManagement'
import CTOCalendar from './CTOCalendar'

import ReminderStats from '../ReminderStats'



const CTODashboard = () => {
  return (
    <div className='bg-gray-100 '>
    <Sidebar/>
    <ReminderStats/>
    <CTOCalendar/>
   

    </div>
  )
}

export default CTODashboard
