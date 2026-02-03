import React from 'react'
import logout from '../../assets/logout.svg'

const Logout = () => {
  return (
    <div className='flex items-center justify-center m-0 p-0 h-screen  '>
    <div className=' flex flex-col items-center justify-center rounded-2xl w-[30%] py-8  bg-gray-300'>
      <div className='px-6 py-6 rounded-full bg-gray-50  '>
        <img src={logout} alt="logout-iocn" className=''/>
      </div>
      <div className='flex flex-col items-center '>
      <h1 className='pt-3 font-bold'>Logout</h1>
      <p className='pt-3 font-medium'>Are you sure, you want to logout?</p>
      </div>
       <div className='flex gap-8 mt-8 '>
        <button className='border px-4 py-2 rounded-md cursor-pointer text-[#0081FF] bg-gray-50 font-semibold'>Logout</button>
        <button className='border px-4 py-2 rounded-md cursor-pointer text-white bg-[#0081FF] font-semibold'>Cancel</button>
       </div>
      </div>
    </div>

   
  )
}

export default Logout
