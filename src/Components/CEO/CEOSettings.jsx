import React, { useEffect, useState } from 'react'
import Sidebar from './CEOSidebar'
import user from '../../assets/user-01.svg'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { User } from 'lucide-react'

const CEOSettings = () => {
  const [name, setName] = useState('CEO')
  const [email, setEmail] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [initialData, setInitialData] = useState({ name: '', email: '' })

  // 🔹 Fetch existing data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', 'CEO')
        const snap = await getDoc(docRef)

        if (snap.exists()) {
          const data = snap.data()
          setName(data.name || 'CEO')
          setEmail(data.email || '')
          setInitialData({
            name: data.name || 'CEO',
            email: data.email || ''
          })
        }
      } catch (error) {
        console.error('Failed to fetch profile', error)
      }
    }

    fetchProfile()
  }, [])

  // 🔹 Save to Firebase
  const handleSave = async () => {
    try {
      await setDoc(
        doc(db, 'users', 'CEO'),
        { name, email },
        { merge: true }
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
    <div className="flex min-h-screen bg-[#F6F7FB]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1  px-6 py-4">
        <h1 className="font-semibold text-2xl">Settings</h1>
        <p className="text-[#80849C] text-sm font-medium">
          Manage your account and preferences
        </p>

        <div className="flex items-center mt-6 p-4 rounded-md border border-[#E5E5E5] bg-white">
          {/* User Icon */}
          <User size={28}/>

          {/* Inputs */}
          <div className="flex flex-col w-full pl-4">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setIsEditing(true)
              }}
              className="text-xl font-medium outline-none"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setIsEditing(true)
              }}
              className="text-[#575B74] outline-none w-[80%] text-sm font-medium mt-1 border border-gray-400 rounded-sm px-4 py-1"
              placeholder="ceoexample@gmail.com"
            />

            {/* Buttons */}
            {isEditing && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm"
                >
                  Save
                </button>

                <button
                  onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-5 py-2 rounded-md text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CEOSettings