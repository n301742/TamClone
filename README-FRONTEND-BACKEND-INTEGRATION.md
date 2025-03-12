# Frontend-Backend Integration

This document outlines the steps to test the integration between the frontend and backend of the BriefButler application.

## Components Created

1. **PDF Service**
   - Located at: `frontend/src/services/api/PdfService.ts`
   - Provides methods for PDF upload and address extraction
   - Includes TypeScript interfaces matching the backend API response format

2. **PDF Uploader Component**
   - Located at: `frontend/src/components/PdfUploader.vue`
   - User interface for uploading PDF files and displaying extraction results
   - Shows confidence scores and validation results for extracted addresses

3. **PDF Processing Demo Page**
   - Located at: `frontend/src/views/pages/PdfProcessingDemo.vue`
   - Demonstrates the PDF upload and address extraction functionality
   - Available at `/pdf-processing` route in the application

4. **Test API Connection Script**
   - Located at: `backend/scripts/test-api-connection.js`
   - Simulates backend API responses for testing the frontend integration
   - Provides mock endpoints for authentication, PDF processing, and address book

## How to Test

1. **Start the Backend Server**
   - The backend should be running on `http://localhost:3000`
   - If not already running, start it with:
     ```
     cd /home/neo/cursor/BriefButler/backend
     npm run dev
     ```

2. **Start the Frontend Development Server**
   - Run the frontend on `http://localhost:5173`:
     ```
     cd /home/neo/cursor/BriefButler/frontend
     npm run dev -- --host
     ```

3. **Access the Application**
   - Open your browser and navigate to `http://localhost:5173`
   - Login with the test credentials:
     - Email: `test@example.com`
     - Password: `password123`

4. **Test the PDF Processing Feature**
   - Click on the "PDF Processing" link in the sidebar menu
   - Upload a PDF document (preferably with an address in German/Austrian format)
   - Observe the address extraction and validation results
   - Check the confidence score and validation details

## API Endpoints

The frontend integrates with the following backend endpoints:

1. **Authentication**
   - `POST /api/auth/login`: User login
   - `POST /api/auth/register`: User registration
   - `GET /api/auth/me`: Get current user
   - `POST /api/auth/refresh`: Refresh authentication token
   - `POST /api/auth/logout`: User logout

2. **Letters**
   - `POST /api/letters`: Upload PDF and extract address
   - `GET /api/letters`: Get all letters
   - `GET /api/letters/:id`: Get letter by ID
   - `PUT /api/letters/:id`: Update letter
   - `DELETE /api/letters/:id`: Delete letter

3. **Address Book**
   - `GET /api/address-book`: Get address book entries
   - `POST /api/address-book`: Create address entry
   - `PUT /api/address-book/:id`: Update address
   - `DELETE /api/address-book/:id`: Delete address

## Troubleshooting

- If you encounter CORS issues, ensure the backend has proper CORS configuration to allow requests from `http://localhost:5173`
- Check browser dev tools for network requests to verify proper communication
- If the PDF upload fails, check that the backend uploads directory exists and has proper permissions
- For authentication issues, verify that the tokens are being properly stored in localStorage

## Next Steps

1. **Implement Address Form Integration**
   - Create a form to manually input and validate addresses
   - Connect to the address validation API

2. **Enhance PDF Upload Flow**
   - Add support for multiple file uploads
   - Implement progress tracking for uploads

3. **Improve Error Handling**
   - Implement more robust error handling for API failures
   - Add retry mechanisms for failed uploads

4. **Add Test Data**
   - Create test PDFs with different address formats
   - Implement sample data generation for development 