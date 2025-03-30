# BriefButler

BriefButler is a modern platform for letter processing and delivery, providing automated services for document handling, address extraction, and mail management.

## Features

- PDF document upload and processing
- Automated address extraction
- Recipient name parsing with academic title detection
- Address validation
- Sender profile management
- Google OAuth authentication
- Document metadata editing

## Project Structure

The project is divided into two main parts:

### Backend (Express.js + TypeScript)

- RESTful API endpoints
- PDF processing services
- Address validation
- Authentication (JWT + Google OAuth)
- Prisma ORM for database

### Frontend (Vue.js)

- User-friendly document upload
- Address extraction visualization
- Profile management
- Authentication UI

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies for both backend and frontend
3. Configure environment variables
4. Set up the database using Prisma migrations
5. Start the development servers

For detailed instructions, see the documentation in the `docs` directory.

## License

This project is licensed under the ISC License.

## Acknowledgments

- PDF.js for PDF processing
- Tesseract.js for OCR capabilities
- Express.js for the backend framework
- Vue.js for the frontend framework

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