import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, secondaryAuth } from "../../Components/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import profile from '../../assets/profile.svg';
import menudots from '../../assets/dots-horizontal.svg';

const Users = () => {
  // ✅ Load active tab from localStorage on component mount
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('userManagementActiveTab') || 'All';
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('HR'); // ✅ Changed default from Admin to HR
  const [isActive, setIsActive] = useState(true);

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [userData, setUserData] = useState([]);

  const filteredUsers = activeTab === 'All' ? userData : userData.filter((u) => u.role === activeTab);

  // ✅ Removed Admin from count
  const count = {
    All: userData.length,
    CEO: userData.filter((u) => u.role === 'CEO').length,
    HR: userData.filter((u) => u.role === 'HR').length,
    CTO: userData.filter((u) => u.role === 'CTO').length,
  };

  // ─── FETCH USERS ───────────────────────────────
  useEffect(() => {
    fetchUsers();
  }, []);

  // ✅ Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('userManagementActiveTab', activeTab);
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({
          id: docSnap.id,
          name: data.fullName || data.name || 'Unknown',
          email: data.email || '',
          role: data.role || 'HR',
          status: data.status || 'active',
          profile: profile,
        });
      });
      setUserData(users);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the dropdown menu
      const isClickInsideDropdown = event.target.closest('.dropdown-menu');
      const isClickOnMenuButton = event.target.closest('.menu-button');
      
      if (!isClickInsideDropdown && !isClickOnMenuButton) {
        setOpenDropdownId(null);
      }
    };
    
    if (openDropdownId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  // ─── ADD USER ───────────────────────────────
  const openAddModal = () => {
    setEditingUser(null);
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('HR'); // ✅ Changed default
    setIsActive(true);
    setShowAddModal(true);
  };

  const addUser = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // 🔹 Create user with secondaryAuth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );
      const user = userCredential.user;

      // 🔹 Add user to Firestore
      await addDoc(collection(db, "users"), {
        uid: user.uid,
        fullName: username,
        email,
        role,
        status: isActive ? 'active' : 'inactive',
        createdAt: serverTimestamp(),
      });

      // 🔹 Sign out secondary auth to keep admin session safe
      await secondaryAuth.signOut();

      toast.success('User created successfully!');
      await fetchUsers();

      setShowAddModal(false);
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('HR');
      setIsActive(true);

    } catch (error) {
      let message = 'Failed to create user';
      if (error.code === 'auth/email-already-in-use') message = 'Email already registered';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email';
      else if (error.code === 'auth/weak-password') message = 'Weak password (min 6 chars)';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ─── EDIT USER ───────────────────────────────
  const openEditModal = (user) => {
    setEditingUser(user);
    setUsername(user.name);
    setEmail(user.email || '');
    setPassword('');
    setRole(user.role);
    setIsActive(user.status === 'active');
    setShowEditModal(true);
    setOpenDropdownId(null);
  };

  const updateUser = async () => {
    if (!username.trim()) {
      toast.error('Name is required');
      return;
    }
    
    // For Admin: only update name
    if (editingUser.role === 'Admin') {
      setLoading(true);
      try {
        const userRef = doc(db, "users", editingUser.id);
        await updateDoc(userRef, {
          fullName: username,
          updatedAt: serverTimestamp(),
        });
        toast.success('Admin name updated successfully!');
        await fetchUsers();
        setShowEditModal(false);
      } catch (error) {
        toast.error('Failed to update admin');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    // For other roles: update all fields
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    
    setLoading(true);
    try {
      const userRef = doc(db, "users", editingUser.id);
      await updateDoc(userRef, {
        fullName: username,
        email,
        role,
        status: isActive ? 'active' : 'inactive',
        updatedAt: serverTimestamp(),
      });
      toast.success('User updated successfully!');
      await fetchUsers();
      setShowEditModal(false);
    } catch (error) {
      toast.error('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // ─── DELETE USER ─────────────────────────────
  const openDeleteModal = (user) => {
    setEditingUser(user);
    setShowDeleteModal(true);
    setOpenDropdownId(null);
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "users", editingUser.id));
      toast.success('User deleted successfully!');
      await fetchUsers();
      setShowDeleteModal(false);
    } catch (error) {
      toast.error('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const anyModalOpen = showAddModal || showEditModal || showDeleteModal;

  return (
    <div className="relative min-h-screen">
      <ToastContainer position="top-center" autoClose={3000} />

      <div className={`transition-all duration-300 ${anyModalOpen ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="bg-white rounded-lg shadow-sm mt-5 p-3 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-semibold text-gray-800">User Management</h1>
            <button onClick={openAddModal} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:opacity-50">
              + Add User
            </button>
          </div>

          {/* ✅ Removed Admin tab */}
          <div className="flex flex-wrap justify-around md:w-[30%] mb-6">
            {['All', 'CEO', 'HR', 'CTO'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-2 md:px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {tab} ({count[tab]})
              </button>
            ))}
          </div>

          {loading && userData.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.length > 0 ? filteredUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <img src={user.profile} alt="profile" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="text-xs md:text-sm font-bold md:font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm font-medium text-gray-500">{user.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 relative">
                    {/* ✅ Show status only for non-Admin users */}
                    {user.role !== 'Admin' && (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: user.status === 'active' ? '#19B65B' : '#7A838A' }} 
                        />
                        <span 
                          className="text-sm capitalize font-medium" 
                          style={{ color: user.status === 'active' ? '#19B65B' : '#7A838A' }}
                        >
                          {user.status}
                        </span>
                      </div>
                    )}
                    
                    <img 
                      src={menudots} 
                      alt="menu" 
                      className="menu-button w-6 h-6 cursor-pointer p-1 hover:bg-gray-100 rounded-full transition-colors"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setOpenDropdownId(openDropdownId === user.id ? null : user.id); 
                      }} 
                    />

                    {openDropdownId === user.id && (
                      <div className="dropdown-menu absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                        <button onClick={() => openEditModal(user)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm transition-colors">Edit</button>
                        <button onClick={() => openDeleteModal(user)} className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-gray-50 text-sm transition-colors">Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-lg">No users found</p>
                  <p className="text-gray-400 text-sm mt-2">Click "Add User" to create your first user</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(showAddModal || showEditModal) && (
        <UserModal
          isEdit={showEditModal}
          title={showEditModal ? 'Edit User' : 'Add New User'}
          username={username}
          setUsername={setUsername}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          role={role}
          setRole={setRole}
          isActive={isActive}
          setIsActive={setIsActive}
          onClose={() => { setShowAddModal(false); setShowEditModal(false); }}
          onSubmit={showEditModal ? updateUser : addUser}
          loading={loading}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 shadow-md flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Confirm Delete</h2>
            <p className="mb-6 text-gray-600">
              Are you sure you want to delete <strong>{editingUser?.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} disabled={loading} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={confirmDelete} disabled={loading} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MODAL COMPONENT ─────────────────────────────
const UserModal = ({ isEdit, title, username, setUsername, email, setEmail, password, setPassword, role, setRole, isActive, setIsActive, onClose, onSubmit, loading }) => {
  // Check if editing an admin user
  const isAdminEdit = isEdit && role === 'Admin';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <button onClick={onClose} disabled={loading} className="text-gray-500 hover:text-gray-800 text-2xl font-bold leading-none disabled:opacity-50">×</button>
          </div>
          
          {isAdminEdit ? (
            // ✅ ADMIN EDIT MODAL - Only Name Field
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  disabled={loading} 
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100" 
                  placeholder="Enter full name"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> As an Admin, you can only update your name. Other fields are locked for security.
                </p>
              </div>
            </div>
          ) : (
            // ✅ REGULAR USER MODAL - All Fields (HR, CEO, CTO)
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  disabled={loading} 
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100" 
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={loading || isEdit} 
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100" 
                  placeholder="user@example.com"
                />
                {isEdit && <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>}
              </div>
              {!isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={loading} 
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100" 
                    placeholder="Minimum 6 characters"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  disabled={loading} 
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-gray-100"
                >
                  <option value="CEO">CEO</option>
                  <option value="CTO">CTO</option>
                  <option value="HR">HR</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-700">Active Status</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isActive} 
                    onChange={(e) => setIsActive(e.target.checked)} 
                    disabled={loading} 
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 mt-8">
            <button 
              onClick={onClose} 
              disabled={loading} 
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={onSubmit} 
              disabled={loading} 
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update User' : 'Create User')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;