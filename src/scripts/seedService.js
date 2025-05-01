import { config } from 'dotenv';
import { connectDatabase } from '../config/database.js';
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
    await connectDatabase();
    
    // Clear existing services
    await Service.deleteMany({});
    
    // Insert new services
    await Service.insertMany(services);
    
    console.log('Services seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding services:', error);
    process.exit(1);
  }
};

seedServices();