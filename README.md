# BriefButler

A modern web application for uploading, processing, and forwarding letters in PDF format. BriefButler extracts address metadata from uploaded documents and forwards them to the appropriate delivery service.

## Features

- PDF letter upload with drag-and-drop support
- Automatic address extraction from PDF documents
- Integration with BriefButler API for letter delivery
- Status tracking for sent letters
- User authentication via Google OAuth and username/password
- Responsive design with dark/light mode support

## Technology Stack

### Frontend
- Vue 3 with Composition API
- TypeScript
- Vite for build tooling
- PrimeVue v4 for UI components
- Tailwind CSS for styling
- Vue Router for navigation
- Pinia for state management

### Backend
- Express.js for REST API
- TypeScript
- Prisma as ORM
- PostgreSQL database
- JWT for authentication
- Passport.js for auth strategies
- Zod for request validation

## Project Structure

The project is divided into two main parts:

```
├── backend/           # Express.js API server
│   ├── src/           # Source code
│   ├── prisma/        # Database schema and migrations
│   └── uploads/       # Temporary storage for uploaded PDFs
│
└── frontend/          # Vue 3 web application
    ├── src/           # Source code
    ├── public/        # Static assets
    └── index.html     # Entry HTML file
```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/BriefButler.git
   cd BriefButler
   ```

2. Install dependencies:
   ```
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the backend directory based on `.env.example`
   - Configure your database connection and other settings

4. Set up the database:
   ```
   cd backend
   npx prisma migrate dev
   ```

5. Start the development servers:
   ```
   # Start backend server
   cd backend
   npm run dev

   # In another terminal, start frontend server
   cd frontend
   npm run dev
   ```

## Development

### Backend

The backend server will be available at http://localhost:3000 by default.

### Frontend

The frontend development server will be available at http://localhost:5173 by default.

## Deployment

Detailed deployment instructions can be found in the [deployment guide](./docs/deployment.md).

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [BriefButler API](https://developers.briefbutler.com) for letter delivery services
- All open-source libraries and tools used in this project 