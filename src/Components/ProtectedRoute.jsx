import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setIsAuthenticated(false);
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        // Firestore se user ka role fetch karo
        const querySnapshot = await getDocs(collection(db, 'users'));
        let foundRole = null;
        let foundStatus = null;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.uid === currentUser.uid) {
            foundRole = data.role;
            foundStatus = data.status;
          }
        });

        // Inactive user check
        if (foundStatus === 'inactive') {
          console.log('❌ User is inactive');
          await auth.signOut();
          sessionStorage.clear();
          setIsAuthenticated(false);
          setUserRole(null);
          setLoading(false);
          return;
        }

        if (foundRole) {
          console.log('✅ User Role:', foundRole);
          setUserRole(foundRole);
          setIsAuthenticated(true);
          sessionStorage.setItem('userRole', foundRole);
        } else {
          console.log('❌ No role found for user');
          await auth.signOut();
          sessionStorage.clear();
          setIsAuthenticated(false);
          setUserRole(null);
        }

      } catch (error) {
        console.error('❌ Error fetching user role:', error);
        await auth.signOut();
        sessionStorage.clear();
        setIsAuthenticated(false);
        setUserRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  
  // Role-based access check
if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.log('❌ Access denied. User role:', userRole, 'Allowed:', allowedRoles);
    return <Navigate to="/unauthorized" replace />;
}

// Admin restricted to /admin routes only
if (userRole === 'Admin' && !location.pathname.startsWith('/admin')) {
    console.log('❌ Admin trying to access non-admin route');
    return <Navigate to="/unauthorized" replace />;
}


  // Role-based access check
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.log('❌ Access denied. User role:', userRole, 'Allowed:', allowedRoles);
    return <Navigate to="/unauthorized" replace />;
  }

  // Authorized user
  return children;
};

export default ProtectedRoute;
