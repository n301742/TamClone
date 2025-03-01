# BriefButler Backend API

This is the backend API for the BriefButler application, which allows users to upload letters in PDF format, extract address metadata, and send letters to the right address using the BriefButler API.

## Technology Stack

- Express.js for the REST API framework
- TypeScript for type safety
- Prisma as the ORM for database interactions
- PostgreSQL for the database
- JWT for authentication tokens
- Passport.js for authentication strategies (Google OAuth, local username/password)
- Zod for request validation
- Multer for file uploads

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the environment variables with your own values

3. Set up the database:
   ```
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/google` - Initiate Google OAuth flow
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout user

### Users

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `PUT /api/users/:id/preferences` - Update user preferences
- `PUT /api/users/:id/billing` - Update billing information
- `DELETE /api/users/:id` - Delete user account

### Letters

- `POST /api/letters` - Upload and create a new letter
- `GET /api/letters` - Get all letters for the current user
- `GET /api/letters/:id` - Get letter by ID
- `PUT /api/letters/:id` - Update letter details
- `GET /api/letters/:id/status` - Get letter status history
- `POST /api/letters/:id/send` - Send letter to BriefButler API
- `DELETE /api/letters/:id` - Delete a letter

## Address Validation

The system includes robust address validation capabilities for both postal codes/cities and street names. When a PDF is uploaded with address extraction enabled, the system:

1. Extracts text from the address window area
2. Validates postal codes, cities, and street names
3. Returns validation results while preserving original data

For detailed information about the address validation process and API response format, see the [Address Validation Documentation](../docs/address-validation.md).

Key features of the address validation system:
- Internal and external validation sources
- Handling of common variations and abbreviations
- Positive approach focusing on matches rather than mismatches
- Preservation of original extracted data

## Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with hot reloading
- `npm run build` - Build the TypeScript files
- `npm test` - Run tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## Folder Structure

- `src/` - Source code
  - `app.ts` - Main application file
  - `config/` - Configuration files
  - `controllers/` - API controllers
  - `middleware/` - Middleware functions
  - `models/` - Database models
  - `routes/` - API routes
  - `services/` - Business logic
  - `utils/` - Utility functions
  - `validators/` - Request validation schemas
- `prisma/` - Prisma schema and migrations
- `uploads/` - Uploaded files
- `dist/` - Compiled JavaScript files

## Testing

The backend uses Jest for testing. The tests are located in the `src/tests` directory.

### Running Tests

To run all tests:

```bash
npm test
```

To run tests in watch mode (tests will re-run when files change):

```bash
npm run test:watch
```

To run tests with coverage report:

```bash
npm run test:coverage
```

### Test Structure

- Unit tests: Test individual functions and components in isolation
- Integration tests: Test API endpoints and how components work together
- Test files are named with the `.test.ts` extension

### Writing Tests

When writing tests, follow these guidelines:

1. Create test files in the `src/tests` directory
2. Use descriptive test names that explain what is being tested
3. Mock external dependencies (database, external APIs, etc.)
4. Test both success and error cases
5. Keep tests independent of each other 


https://openplzapi.org/de/Localities?postalCode={Postleitzahl}