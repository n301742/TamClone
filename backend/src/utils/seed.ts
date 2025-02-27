import { PrismaClient, UserRole, AuthProvider, LetterStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean up existing data
  await prisma.statusHistory.deleteMany();
  await prisma.letter.deleteMany();
  await prisma.billingInfo.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleaned up existing data');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@briefbutler.com',
      passwordHash: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      authProvider: AuthProvider.LOCAL,
      documentRetentionDays: 30,
      darkMode: false,
    },
  });

  console.log('Created admin user:', admin.email);

  // Create regular user
  const userPasswordHash = await bcrypt.hash('User123!', 10);
  const user = await prisma.user.create({
    data: {
      email: 'user@example.com',
      passwordHash: userPasswordHash,
      firstName: 'Test',
      lastName: 'User',
      mobileNumber: '+1234567890',
      role: UserRole.USER,
      authProvider: AuthProvider.LOCAL,
      documentRetentionDays: 30,
      darkMode: true,
      billingInfo: {
        create: {
          paymentMethod: 'credit_card',
          billingAddress: JSON.stringify({
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            postalCode: '12345',
            country: 'USA',
          }),
        },
      },
    },
  });

  console.log('Created regular user:', user.email);

  // Create sample letters for the user
  const letters = await Promise.all([
    prisma.letter.create({
      data: {
        userId: user.id,
        pdfPath: 'uploads/sample1.pdf',
        recipientName: 'John Doe',
        recipientAddress: '456 Oak St',
        recipientCity: 'Somewhere',
        recipientState: 'NY',
        recipientZip: '67890',
        recipientCountry: 'USA',
        status: LetterStatus.PROCESSING,
        statusHistory: {
          create: {
            status: LetterStatus.PROCESSING,
            message: 'Letter uploaded and ready for processing',
          },
        },
      },
    }),
    prisma.letter.create({
      data: {
        userId: user.id,
        pdfPath: 'uploads/sample2.pdf',
        recipientName: 'Jane Smith',
        recipientAddress: '789 Pine St',
        recipientCity: 'Elsewhere',
        recipientState: 'CA',
        recipientZip: '54321',
        recipientCountry: 'USA',
        status: LetterStatus.SENT,
        trackingId: 'TRK123456789',
        deliveryId: 'DEL987654321',
        statusHistory: {
          createMany: {
            data: [
              {
                status: LetterStatus.PROCESSING,
                message: 'Letter uploaded and ready for processing',
              },
              {
                status: LetterStatus.SENT,
                message: 'Letter sent to BriefButler for delivery',
              },
            ],
          },
        },
      },
    }),
    prisma.letter.create({
      data: {
        userId: user.id,
        pdfPath: 'uploads/sample3.pdf',
        recipientName: 'Robert Johnson',
        recipientAddress: '101 Maple Ave',
        recipientCity: 'Nowhere',
        recipientState: 'TX',
        recipientZip: '13579',
        recipientCountry: 'USA',
        status: LetterStatus.DELIVERED,
        trackingId: 'TRK987654321',
        deliveryId: 'DEL123456789',
        statusHistory: {
          createMany: {
            data: [
              {
                status: LetterStatus.PROCESSING,
                message: 'Letter uploaded and ready for processing',
              },
              {
                status: LetterStatus.SENT,
                message: 'Letter sent to BriefButler for delivery',
              },
              {
                status: LetterStatus.DELIVERED,
                message: 'Letter delivered to recipient',
              },
            ],
          },
        },
      },
    }),
  ]);

  console.log(`Created ${letters.length} sample letters`);
  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 