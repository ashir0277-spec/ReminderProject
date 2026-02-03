import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../../assets/admin.svg';
import { FiUsers } from "react-icons/fi";
import logoutIcon from '../../assets/logout.svg'; 
import { BiSolidDashboard } from "react-icons/bi";
import { auth } from '../firebase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const activeClass = 'bg-[#0081FF] text-white';
  const inactiveClass = 'text-[#898989] hover:bg-[#1E2730] hover:text-white transition-colors duration-200';

  // Logout function
  const handleLogout = async () => {
    try {
      await auth.signOut(); // Firebase sign out
      setShowLogoutModal(false); // Close modal
      toast.success("Logged out successfully!", { position: "top-center" });
      navigate("/login"); // Redirect to login
    } catch (error) {
      toast.error("Error logging out: " + error.message, { position: "top-center" });
    }
  };

  return (
    <>
      <ToastContainer />

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 z-40 h-screen w-[280px] bg-[#13191D] text-white
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          flex flex-col overflow-y-auto
        `}
      >
        {/* Logo / Header */}
        <div className="flex items-center px-6 py-8 border-b border-gray-700">
          <img src={logo} alt="logo" className="w-12 h-12" />
          <div className="ml-4">
            <p className="text-[#888FBB] font-bold text-xl">Admin</p>
          
            <p className="text-[#888FBB] font-medium text-base">Dashboard</p>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
          <NavLink
            to="/admin/dashboard"
            onClick={onClose}
            className={({ isActive }) => `flex items-center px-5 py-3 rounded-lg ${isActive ? activeClass : inactiveClass}`}
          >
            <BiSolidDashboard className='text-2xl' />
            <span className="ml-5 text-sm font-medium">Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/users"
            onClick={onClose}
            className={({ isActive }) => `flex items-center px-5 py-3 rounded-lg ${isActive ? activeClass : inactiveClass}`}
          >
            <FiUsers className='text-2xl' />
            <span className="ml-5 text-sm font-medium">Users</span>
          </NavLink>
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-700">
          <button
            onClick={() => setShowLogoutModal(true)}
            className={`flex items-center w-full px-5 py-4 text-left hover:bg-[#1E2730] transition-colors duration-200`}
          >
            <img src={logoutIcon} alt="logout" className="w-6 h-6" />
            <span className="ml-5 text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg w-80 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirm Logout</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-500 text-white "
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
