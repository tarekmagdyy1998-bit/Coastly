import { Notification } from './types';

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'عرض جديد!',
    message: 'لقد استلمت عرضاً جديداً لشاليه هاسيندا.',
    type: 'offer',
    read: false,
    timestamp: 'منذ ٥ دقائق',
    link: '/negotiations',
  },
  {
    id: '2',
    title: 'تم تأكيد الدفع',
    message: 'تم تأمين مبلغ الحجز في نظام الضمان بنجاح.',
    type: 'payment',
    read: true,
    timestamp: 'منذ ٢ ساعة',
    link: '/negotiations',
  },
];
