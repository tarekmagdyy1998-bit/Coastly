import { db, collection, addDoc, getDocs, deleteDoc, doc, writeBatch } from './firebase';

const INITIAL_CHALETS = [
  {
    name: "Marassi - Marina 1",
    location: "Sidi Abdel Rahman",
    price: 15000,
    rooms: 3,
    bathrooms: 2,
    images: ["https://picsum.photos/seed/marassi1/800/600", "https://picsum.photos/seed/marassi2/800/600"],
    officeId: "system",
    description: "Luxury chalet with sea view in Marassi Marina.",
    amenities: ["Sea View", "Pool", "AC", "WiFi"],
    status: "available",
    lat: 30.992,
    lng: 28.945,
    createdAt: new Date().toISOString()
  },
  {
    name: "Hacienda Bay - Villa",
    location: "Sidi Abdel Rahman",
    price: 25000,
    rooms: 5,
    bathrooms: 4,
    images: ["https://picsum.photos/seed/hacienda1/800/600", "https://picsum.photos/seed/hacienda2/800/600"],
    officeId: "system",
    description: "Spacious villa in Hacienda Bay with private pool.",
    amenities: ["Private Pool", "Garden", "AC", "WiFi"],
    status: "available",
    lat: 30.945,
    lng: 28.732,
    createdAt: new Date().toISOString()
  },
  {
    name: "Amwaj Chalet",
    location: "Sidi Abdel Rahman",
    price: 8000,
    rooms: 2,
    bathrooms: 1,
    images: ["https://picsum.photos/seed/amwaj1/800/600"],
    officeId: "system",
    description: "Cozy chalet in Amwaj, close to the beach.",
    amenities: ["Beach Access", "AC"],
    status: "available",
    lat: 30.968,
    lng: 28.821,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_REQUESTS = [
  {
    userId: "system",
    clientCode: "A.M.***",
    location: "Marina",
    checkIn: "2025-07-01",
    checkOut: "2025-07-07",
    guests: 4,
    rooms: 2,
    budget: 3500,
    features: ["Pool", "Sea View"],
    note: "Looking for something very close to the beach.",
    status: "active",
    urgent: false,
    createdAt: new Date().toISOString()
  },
  {
    userId: "system",
    clientCode: "T.M.***",
    location: "Hacienda",
    checkIn: "2025-08-15",
    checkOut: "2025-08-20",
    guests: 6,
    rooms: 3,
    budget: 8000,
    features: ["Pool", "Garden"],
    note: "Large family, need privacy.",
    status: "active",
    urgent: true,
    createdAt: new Date().toISOString()
  }
];

export const clearFirestore = async () => {
  try {
    const collections = ['chalets', 'requests', 'negotiations'];
    
    for (const collectionName of collections) {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((document) => {
        batch.delete(doc(db, collectionName, document.id));
      });
      await batch.commit();
    }
    console.log('Database cleared!');
  } catch (error) {
    console.error('Error clearing Firestore:', error);
    throw error;
  }
};

export const seedFirestore = async () => {
  try {
    console.log('Seeding Firestore...');
    
    // Seed Chalets
    for (const chalet of INITIAL_CHALETS) {
      await addDoc(collection(db, 'chalets'), chalet);
    }
    
    // Seed Requests
    for (const request of INITIAL_REQUESTS) {
      await addDoc(collection(db, 'requests'), request);
    }
    
    console.log('Seeding complete!');
  } catch (error) {
    console.error('Error seeding Firestore:', error);
    throw error;
  }
};
