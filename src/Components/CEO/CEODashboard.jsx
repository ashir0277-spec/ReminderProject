import React from 'react'
import Sidebar from '../CEO/CEOSidebar'
import Topbar from '../Admin/Topbar'
import UserManagement from '../CTO/UserManagement'
import StatsCard from '../StatsCard'
import ReminderStats from '../ReminderStats'

const CEODashboard = () => {
  return (
    <>
     <Sidebar/> 
    
     <ReminderStats/>
    <UserManagement/>
    </>
  )
}

export default CEODashboard
