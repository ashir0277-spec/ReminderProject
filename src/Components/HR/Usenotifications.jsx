import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Custom hook to fetch and manage notifications for HR
 * Returns unread count - only counts notifications that are:
 * 1. Not pending (approved or rejected)
 * 2. Not deleted
 * 3. Not read
 * 4. Has updatedAt and updatedBy
 */
export const useNotifications = (currentUser = "HR") => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Simple query - just filter by createdBy
    const q = query(
      collection(db, "reminders"),
      where("createdBy", "==", currentUser)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let unread = 0;
      let total = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Only count valid notifications (approved/rejected, not pending)
        if (
          data.status && 
          data.status !== 'pending' && 
          data.updatedBy && 
          data.updatedAt && 
          !data.notificationDeleted
        ) {
          total++;
          
          // Count as unread ONLY if explicitly NOT read
          // This ensures new notifications show up in count
          if (data.isNotificationRead !== true) {
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