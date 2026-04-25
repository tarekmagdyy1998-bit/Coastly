import { db, collection, addDoc, serverTimestamp } from '../firebase';

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: 'offer' | 'agreement' | 'payment' | 'system' | 'message';
  read: boolean;
  link: string;
  createdAt: any;
}

export const createNotification = async (
  userId: string, 
  title: string, 
  message: string, 
  type: Notification['type'], 
  link: string
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      link,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
