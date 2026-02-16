import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook to fetch and manage notifications for HR
 * Returns unread count and total notifications
 */
export const useNotifications = (currentUser = "HR") => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Query to get all notifications for HR
    const q = query(
      collection(db, "reminders"),
      where("createdBy", "==", currentUser),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unread = 0;
      let total = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Only count if status changed (approved or rejected), not deleted, and has updatedAt
        if (
          data.status !== 'pending' && 
          data.updatedBy && 
          data.updatedAt && 
          !data.notificationDeleted // Don't count deleted notifications
        ) {
          total++;
          
          // Count as unread if isNotificationRead is false or undefined
          if (!data.isNotificationRead) {
            unread++;
          }
        }
      });

      setUnreadCount(unread);
      setTotalCount(total);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return { unreadCount, totalCount };
};