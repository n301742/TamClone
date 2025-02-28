import { PrismaClient, UserRole, AuthProvider } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      mobileNumber: '+1234567890',
      passwordHash: '$2b$10$CsyCLAomU5nuRH3Zhe.0jOYDd31TalFyNOeNm0HGUQLLTNQXhhp6e', // password123
      role: UserRole.USER,
      authProvider: AuthProvider.LOCAL,
    },
  });

  console.log('Created test user:', testUser);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 