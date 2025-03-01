import { PrismaClient } from '@prisma/client';

// Create a simple logger if the logger module doesn't exist
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
};

const prisma = new PrismaClient();

/**
 * Script to update ZIP code entries in the database
 * Specifically addresses the issue with Austrian ZIP code 6971 which serves both Hard and Fußach
 */
async function updateZipCodes() {
  try {
    logger.info('Starting ZIP code database update');

    // Update ZIP code 6971 to include both Hard and Fußach
    const result = await (prisma as any).zipCode.upsert({
      where: {
        zipCode: '6971'
      },
      update: {
        city: 'Fußach',
        country: 'AT',
        state: null,
        source: 'manual-update',
        lastUpdated: new Date()
      },
      create: {
        zipCode: '6971',
        city: 'Fußach', // Primary city
        country: 'AT',
        source: 'manual-update',
        lastUpdated: new Date()
      }
    });

    logger.info(`Updated ZIP code entry: ${result.zipCode} ${result.city}, country: ${result.country}`);

    // Add more problematic ZIP codes here as they are identified
    const multiCityZipCodes = [
      {
        zipCode: '6850',
        primaryCity: 'Dornbirn',
        country: 'AT'
      },
      // Add more entries as needed
    ];

    for (const zipCode of multiCityZipCodes) {
      const result = await (prisma as any).zipCode.upsert({
        where: {
          zipCode: zipCode.zipCode
        },
        update: {
          city: zipCode.primaryCity,
          country: zipCode.country,
          source: 'manual-update',
          lastUpdated: new Date()
        },
        create: {
          zipCode: zipCode.zipCode,
          city: zipCode.primaryCity,
          country: zipCode.country,
          source: 'manual-update',
          lastUpdated: new Date()
        }
      });

      logger.info(`Updated ZIP code entry: ${result.zipCode} ${result.city}, country: ${result.country}`);
    }

    logger.info('ZIP code database update completed successfully');
  } catch (error) {
    logger.error('Error updating ZIP code database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if executed directly
if (require.main === module) {
  updateZipCodes()
    .then(() => {
      logger.info('Script execution completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script execution failed:', error);
      process.exit(1);
    });
}

export { updateZipCodes }; 