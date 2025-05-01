import { config } from 'dotenv';
import { databaseService } from "../services/databaseService.js";
import { Service } from '../models/Service.js';

config();

const services = [
  {
    category: 'HAIR',
    serviceId: 'haircut_men',
    title: 'Mens Haircut',
    description: 'Professional haircut for men',
    duration: 30,
    price: 300,
    loyaltyPoints: 30,
    isActive: true
  },
  {
    category: 'HAIR',
    serviceId: 'haircut_women',
    title: 'Ladies Haircut',
    description: 'Professional haircut for women',
    duration: 45,
    price: 500,
    loyaltyPoints: 50,
    isActive: true
  },
  {
    category: 'HAIR',
    serviceId: 'hair_color',
    title: 'Hair Color',
    description: 'Professional hair coloring service',
    duration: 90,
    price: 1500,
    loyaltyPoints: 150,
    isActive: true
  },
  {
    category: 'SKIN',
    serviceId: 'facial',
    title: 'Facial',
    description: 'Relaxing facial treatment',
    duration: 60,
    price: 800,
    loyaltyPoints: 80,
    isActive: true
  },
  {
    category: 'NAILS',
    serviceId: 'manicure',
    title: 'Manicure',
    description: 'Professional nail care for hands',
    duration: 45,
    price: 400,
    loyaltyPoints: 40,
    isActive: true
  }
];

const seedServices = async () => {
  try {
    const db = await databaseService.connect(); // get the db instance

    const collection = Service.getCollection(db);

    // Clear existing services
    await collection.deleteMany({});

    // Insert new services
    await collection.insertMany(services);

    console.log('Services seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding services:', error);
    process.exit(1);
  }
};

seedServices();