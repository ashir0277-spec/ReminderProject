import React from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const Mainfile = ({ children }) => {  
  return (
    <div className='bg-gray-100 flex min-h-screen'>
      <Sidebar/>

      {/* Right Side */}
      <div className='flex-1 ml-[20%]'>
        <Topbar />

        {/* CONTENT AREA */}
        <div className=' h-[calc(100vh-4rem)] overflow-y-auto'>
          {children} 
        </div>
      </div>
    </div>
  )
}

export default Mainfile
