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