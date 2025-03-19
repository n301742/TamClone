# BriefButler

BriefButler is a modern web application for uploading, processing, and forwarding letters in PDF format. The application extracts address metadata from uploaded letters and forwards them to the BriefButler API for physical delivery.

## Features

- Upload letters in PDF format
- Extract address metadata using AI
- Forward letters to the BriefButler API for delivery
- Track letter status and delivery
- User authentication via Google OAuth
- Multi-language support (German, English, French, Italian)

## Technology Stack

### Frontend
- Vue 3 with Composition API
- TypeScript for type safety
- Vite for fast development and building
- PrimeVue v4 for UI components
- Tailwind CSS for styling
- Vue Router for navigation
- Pinia for state management

### Backend
- Express.js for the REST API
- TypeScript for type safety
- Prisma as the ORM
- PostgreSQL for the database
- JWT for authentication
- Passport.js for authentication strategies

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/briefbutler.git
cd briefbutler
```

2. Install dependencies for both frontend and backend
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables
```bash
# In the backend directory
cp .env.example .env
# Edit .env with your database and API credentials
```

4. Run database migrations
```bash
# In the backend directory
npx prisma migrate dev
```

5. Start the development servers
```bash
# Start backend server (from backend directory)
npm run dev

# Start frontend server (from frontend directory)
npm run dev
```

6. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── app.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── router/
│   │   ├── stores/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── views/
│   │   ├── App.vue
│   │   └── main.ts
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [BriefButler API](https://developers.briefbutler.com) for letter delivery services
- [PrimeVue](https://primevue.org/) for UI components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vue.js](https://vuejs.org/) for the frontend framework

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