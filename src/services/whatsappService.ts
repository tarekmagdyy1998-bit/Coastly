/**
 * WhatsApp Notification Service
 * Handles client-side requests to send WhatsApp notifications via the server.
 */

export const sendWhatsAppNotification = async (phoneNumber: string, message: string) => {
  try {
    const response = await fetch('/api/notify/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phoneNumber, message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send WhatsApp notification');
    }

    return await response.json();
  } catch (error) {
    console.error('WhatsApp Service Error:', error);
    throw error;
  }
};

/**
 * Formats a chalet notification message.
 */
export const formatChaletNotification = (chaletName: string, location: string, price: number, language: 'ar' | 'en' = 'ar') => {
  if (language === 'ar') {
    return `🏖️ شاليه جديد متاح الآن!
🏠 الاسم: ${chaletName}
📍 الموقع: ${location}
💰 السعر: ${price} ج.م
🔗 احجز الآن عبر منصة ساحلي!`;
  }
  
  return `🏖️ New Chalet Available!
🏠 Name: ${chaletName}
📍 Location: ${location}
💰 Price: ${price} EGP
🔗 Book now on Sahel Platform!`;
};
