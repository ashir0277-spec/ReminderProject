import React, { useEffect, useState } from 'react'
import Sidebar from './SidebarOther'
import Topbar from '../Admin/Topbar'
import user from '../../assets/user-01.svg'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const CTOSettings = () => {
  const [name, setName] = useState('CTO')
  const [email, setEmail] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [initialData, setInitialData] = useState({ name: '', email: '' })

  // 🔹 Fetch existing CTO data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', 'CTO')
        const snap = await getDoc(docRef)

        if (snap.exists()) {
          const data = snap.data()
          setName(data.name || 'CTO')
          setEmail(data.email || '')
          setInitialData({ name: data.name || 'CTO', email: data.email || '' })
        }
      } catch (error) {
        console.error('Failed to fetch profile', error)
      }
    }

    fetchProfile()
  }, [])

  // 🔹 Save to Firebase (Create or Update)
  const handleSave = async () => {
    try {
      await setDoc(
        doc(db, 'users', 'CTO'),
        { name, email },
        { merge: true } // ensures update if doc exists
      )
      setInitialData({ name, email })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile', error)
    }
  }

  // 🔹 Cancel changes
  const handleCancel = () => {
    setName(initialData.name)
    setEmail(initialData.email)
    setIsEditing(false)
  }

  return (
    <>
      <Sidebar />

      <div className='mx-3 mt-5'>
        <h1 className='font-semibold text-2xl'>Settings</h1>
        <p className='text-[#80849C] text-sm font-medium'>
          Manage your account and preferences
        </p>

        <div className='pl-4 flex w-full rounded-md border border-[#E5E5E5] mt-4 py-4 items-center'>
          {/* User Icon */}
          <img src={user} alt="" className='mx-4' />

          {/* Inputs */}
          <div className='flex flex-col pl-4 w-full'>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setIsEditing(true)
              }}
              className='text-xl font-medium outline-gray-300 px-2 py-1'
            />

            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setIsEditing(true)
              }}
              className='text-[#575B74] w-[80%] text-sm font-medium mt-2 px-2 py-1 outline-gray-300'
              placeholder='ctoexample@gmail.com'
            />

            {/* Buttons (only when editing) */}
            {isEditing && (
              <div className='flex gap-3 px-2 mt-4'>
                <button
                  onClick={handleSave}
                  className='bg-blue-600 text-white px-5 py-2 rounded-md text-sm'
                >
                  Save
                </button>

                <button
                  onClick={handleCancel}
                  className='bg-gray-200 text-gray-700 px-5 py-2 rounded-md text-sm'
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default CTOSettings
