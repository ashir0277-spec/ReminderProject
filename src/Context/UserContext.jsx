import React, { createContext, useState, useContext, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../Components/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });
  
  // Logged-in user ka data
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshStats = async () => {
    try {
      console.log('🔄 Refreshing user stats...');
      const querySnapshot = await getDocs(collection(db, 'users'));
      
      let total = 0;
      let active = 0;
      let inactive = 0;

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        total++;
        
        if (data.status === 'active' || !data.status) {
          active++;
        } else {
          inactive++;
        }
      });

      setUserStats({ total, active, inactive });
      console.log('✅ Stats Updated:', { total, active, inactive });
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  // Fetch logged-in user data
  const fetchCurrentUser = async (uid) => {
    try {
      console.log('🔄 Fetching current user data...');
      const querySnapshot = await getDocs(collection(db, 'users'));
      
      let userData = null;
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.uid === uid) {
          userData = {
            id: docSnap.id,
            name: data.fullName || data.name || 'Unknown',
            email: data.email || '',
            role: data.role || 'Admin',
            status: data.status || 'active',
          };
        }
      });

      setCurrentUser(userData);
      console.log('✅ Current User:', userData);
    } catch (error) {
      console.error('❌ Error fetching current user:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('✅ User logged in:', user.uid);
        fetchCurrentUser(user.uid);
      } else {
        console.log('❌ No user logged in');
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Initial stats fetch
  useEffect(() => {
    refreshStats();
  }, []);

  // Auto-refresh stats every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshStats();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <UserContext.Provider value={{ userStats, currentUser, refreshStats, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserStats = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserStats must be used within UserProvider');
  }
  return context;
};