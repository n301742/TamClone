import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// Create a simple logger if the logger module doesn't exist
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[ERROR] ${message}`, ...args)
};

const prisma = new PrismaClient();

/**
 * Script to update ZIP code entries in the database
 * Uses a dynamic approach to fetch data from external API instead of hard-coding values
 */
async function updateZipCodes() {
  try {
    logger.info('Starting ZIP code database update');

    // List of ZIP codes to check and update
    // Instead of hard-coding the cities, we'll fetch them from the API
    const zipCodesToUpdate = [
      { zipCode: '6971', country: 'AT' },
      { zipCode: '6850', country: 'AT' },
      // Add more ZIP codes as needed
    ];

    for (const zipData of zipCodesToUpdate) {
      await updateZipCodeFromApi(zipData.zipCode, zipData.country);
    }

    logger.info('ZIP code database update completed successfully');
  } catch (error) {
    logger.error('Error updating ZIP code database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Fetch ZIP code data from external API and update the database
 * @param zipCode The ZIP code to update
 * @param countryCode The country code (AT or DE)
 */
async function updateZipCodeFromApi(zipCode: string, countryCode: string) {
  try {
    // Determine which API endpoint to use based on the country code
    const apiBaseUrl = 'https://openplzapi.org';
    const url = `${apiBaseUrl}/${countryCode.toLowerCase()}/Localities?postalCode=${zipCode}`;
    
    logger.info(`Fetching data for ZIP code ${zipCode} from ${url}`);
    
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data && response.data.length > 0) {
      // Process all places returned by the API
      const places = response.data;
      logger.info(`Found ${places.length} localities for ZIP code ${zipCode}`);
      
      // Extract city names and state from all places
      const cities: string[] = [];
      let state = '';
      
      for (const place of places) {
        const cityName = place.name || '';
        if (cityName && !cities.includes(cityName)) {
          cities.push(cityName);
        }
        
        // Use the state from the first place (should be the same for all)
        if (!state && place.federalProvince?.name) {
          state = place.federalProvince.name;
        } else if (!state && place.district?.name) {
          state = place.district.name;
        }
      }
      
      // Add each city as a separate entry for this ZIP code
      for (const city of cities) {
        const result = await (prisma as any).zipCode.upsert({
          where: {
            zipCode_city: {
              zipCode,
              city
            }
          },
          update: {
            state: state || null,
            country: countryCode,
            source: 'api-update',
            lastUpdated: new Date()
          },
          create: {
            zipCode,
            city,
            state: state || null,
            country: countryCode,
            source: 'api-update',
            lastUpdated: new Date()
          }
        });
        
        logger.info(`Updated ZIP code entry: ${result.zipCode} ${result.city}, country: ${result.country}`);
      }
      
      return cities;
    } else {
      logger.info(`No data found for ZIP code ${zipCode}`);
      return [];
    }
  } catch (error) {
    logger.error(`Error fetching data for ZIP code ${zipCode}:`, error);
    return [];
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