  import React from 'react'


  import Users from './Users'
  import Mainfile from './Mainfile'
import StatsCard from '../StatsCard'
      const AdminDashboard = () => {
       
      
    return (
      
          <>
        {/* Admin Dashboard   */} 
                  
      <div className="h-screen px-3 w-full rounded-lg    ">
          <StatsCard/>
        
        <Users/>
      </div>
    
    
      
    
      </>

      
    )
  }

  export default AdminDashboard


