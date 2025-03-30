import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Creates a default sender profile for each user that doesn't have one
 */
async function createDefaultSenderProfiles() {
  try {
    console.log('Starting to create default sender profiles...');
    
    // Get all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    
    let created = 0;
    let skipped = 0;
    
    for (const user of users) {
      // Check if user already has at least one sender profile
      const existingProfiles = await prisma.senderProfile.findMany({
        where: { userId: user.id }
      });
      
      if (existingProfiles.length > 0) {
        console.log(`User ${user.email} already has ${existingProfiles.length} sender profile(s). Skipping.`);
        skipped++;
        continue;
      }
      
      // Create a default sender profile based on user information
      await prisma.senderProfile.create({
        data: {
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          isCompany: false,
          address: 'Please update your sender address',
          city: 'Vienna',
          zip: '1010',
          country: 'AT',
          email: user.email,
          isDefault: true,
          deliveryProfile: 'briefbutler-test',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`Created default sender profile for user ${user.email}`);
      created++;
    }
    
    console.log(`Done! Created default sender profiles for ${created} users. Skipped ${skipped} users.`);
  } catch (error) {
    console.error('Error creating default sender profiles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createDefaultSenderProfiles(); 