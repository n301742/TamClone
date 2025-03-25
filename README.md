# BriefButler Application

BriefButler is a comprehensive application for processing and sending letters through an automated mail service. The application allows users to upload PDF documents, extract recipient information, and submit letters for printing and delivery.

## Features

- PDF document parsing and information extraction
- Address detection and parsing
- Name parsing with academic title detection
- Integration with BriefButler mail service API
- Secure certificate-based authentication
- Mock mode for testing without API integration

## Tech Stack

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL database with Prisma ORM
- PDF processing with pdf.js
- JWT authentication
- Google OAuth integration

### Frontend
- Vue 3 with Composition API
- TypeScript
- PrimeVue components
- Tailwind CSS for styling
- Vite for fast development server

## Setup

### Prerequisites
- Node.js (v16 or later)
- PostgreSQL database
- OpenSSL for certificate management

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd BriefButler
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up the database:
```bash
cd backend
npx prisma migrate dev
```

4. Create .env file in the backend directory:
```
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/briefbutler?schema=public"

# Authentication
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"

# Server
PORT=3000
NODE_ENV="development"

# BriefButler API
BRIEFBUTLER_API_URL="https://opsworkspace.int.hpcdual.at/api"
BRIEFBUTLER_API_KEY="your-briefbutler-api-key"
BRIEFBUTLER_CERTIFICATE_PATH="certificates/briefbutler-cert.pfx"
BRIEFBUTLER_CERTIFICATE_PASSWORD="your-certificate-password"
BRIEFBUTLER_TEST_MODE="false"

# File Storage
UPLOAD_DIR="uploads"
MAX_FILE_SIZE="10485760" # 10MB in bytes
```

5. Certificate Setup:
```bash
# Create certificates directory
mkdir -p backend/certificates

# If you have a PFX certificate file, place it in the certificates directory
# If you have PEM format certificates (modern approach):
mkdir -p backend/certs_temp
# Extract certificate and private key from PFX
openssl pkcs12 -in certificates/your-certificate.pfx -out certs_temp/certificate.pem -clcerts -nokeys -legacy
openssl pkcs12 -in certificates/your-certificate.pfx -out certs_temp/private_key.pem -nocerts -legacy
```

## Running the Application

### Development Mode

```bash
# Start backend server
cd backend
npm run dev

# Start frontend server
cd frontend
npm run dev
```

### Production Mode

```bash
# Build frontend
cd frontend
npm run build

# Start backend server (which will serve the frontend)
cd backend
npm run build
npm start
```

## Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

## API Documentation

The API documentation is available at `/api-docs` when the server is running.

## Mock Mode

The application supports a mock mode for testing without connecting to the actual BriefButler API. Set `BRIEFBUTLER_TEST_MODE="true"` in your .env file to enable this mode.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Name Parsing Utility

The application includes a robust name parsing utility that can intelligently split full names into first and last name components. This is especially useful when extracting recipient information from PDF documents.

### Features:

- Handles various name formats (simple, compound, with titles, etc.)
- Recognizes common prefixes and titles (Dr., Prof., Herr, Frau, etc.)
- Supports international name formats, including nobility prefixes (von, van, etc.)
- Handles comma-separated formats (LastName, FirstName)
- Provides confidence scoring to indicate parsing quality
- Identifies potential issues during parsing

### Usage:

```typescript
import { parseNameField } from './utils/name-parser';

// Simple usage
const result = parseNameField('John Doe');
console.log(result.firstName); // "John"
console.log(result.lastName);  // "Doe"

// With titles
const withTitle = parseNameField('Dr. Jane Smith');
console.log(withTitle.firstName); // "Jane"
console.log(withTitle.lastName);  // "Smith"

// With nobility prefixes
const noble = parseNameField('Ludwig von Beethoven');
console.log(noble.firstName); // "Ludwig"
console.log(noble.lastName);  // "von Beethoven"

// With comma notation
const comma = parseNameField('Müller, Hans');
console.log(comma.firstName); // "Hans"
console.log(comma.lastName);  // "Müller"
```

### Command-line Demo:

Test the name parser from the command line:

```bash
cd backend
npx ts-node src/scripts/name-parser-demo.ts "Johann Sebastian Bach"
```

This will output the parsed name components along with confidence score and any potential issues detected. 