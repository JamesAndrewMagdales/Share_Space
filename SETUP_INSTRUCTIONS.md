# ShareServe - Setup and Run Instructions

## Overview

ShareServe is a full-stack community skill-sharing platform built with React (Vite) frontend and Node.js/Express backend with MySQL database.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **MySQL** (XAMPP recommended for Windows)
3. **npm** or **yarn**

## Database Setup

### Option 1: Fresh Installation (New Database)

1. Start your MySQL server (XAMPP or standalone MySQL)
2. Open phpMyAdmin or MySQL command line
3. Create a new database named `shareserve`:
   ```sql
   CREATE DATABASE shareserve;
   ```
4. Import the schema file:
   - Open phpMyAdmin
   - Select the `shareserve` database
   - Go to Import tab
   - Upload `ShareSpace/database/schema.sql`
   - Click "Go"

### Option 2: Existing Database (Migration)

If you already have the database created, run the migration script to fix issues:

1. Open phpMyAdmin or MySQL command line
2. Select your `shareserve` database
3. Import the migration file:
   - Go to Import tab
   - Upload `ShareSpace/database/migration_fix.sql`
   - Click "Go"

This will:
- Add the missing `is_admin` column to the users table
- Fix the `price_type` enum typo in the services table
- Add the index for `is_admin` column

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd ShareSpace/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` (already done)
   - Update the database credentials if needed:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=
     DB_NAME=shareserve
     DB_PORT=3306
     ```

4. Start the backend server:
   ```bash
   npm start
   ```

   The server will start on `http://localhost:5000`

## Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd ShareSpace/ShareSpace
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will start on `http://localhost:5173`

## Running the Application

1. Make sure MySQL is running (XAMPP started)
2. Start the backend server (Terminal 1):
   ```bash
   cd ShareSpace/backend
   npm start
   ```
3. Start the frontend (Terminal 2):
   ```bash
   cd ShareSpace/ShareSpace
   npm run dev
   ```
4. Open your browser and go to `http://localhost:5173`

## Testing the CRUD Operations

### Create (Register & Create Service)
1. Click "Sign up" and create a new account
2. Log in with your credentials
3. Go to Dashboard → Click "Create New Service"
4. Fill in the service details and click "Publish Service"

### Read (View Services)
1. Go to the Search page to browse all services
2. Go to Dashboard → "My Services" to see your services
3. The services are fetched from the database

### Update (Edit Service)
1. Go to Dashboard → "My Services"
2. Click the Edit icon (pencil) on any service
3. Modify the details and click "Save Changes"

### Delete (Remove Service)
1. Go to Dashboard → "My Services"
2. Click the Delete icon (trash) on any service
3. Confirm the deletion in the modal

## Admin Features

1. During registration, enter the admin code `ADMIN2024` to create an admin account
2. Admin users can access `/admin` to manage users
3. Admins can create, edit, and deactivate user accounts

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Services
- `GET /api/services` - Get all services (with filters)
- `GET /api/services/:id` - Get single service
- `POST /api/services` - Create service (requires auth)
- `PUT /api/services/:id` - Update service (requires auth)
- `DELETE /api/services/:id` - Delete service (requires auth)
- `GET /api/services/provider/:providerId` - Get provider's services
- `GET /api/services/categories/all` - Get all categories

### Users
- `GET /api/users` - Get all users (requires admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (requires admin)
- `DELETE /api/users/:id` - Deactivate user (requires admin)
- `GET /api/users/:id/services` - Get user's services
- `GET /api/users/:id/reviews` - Get user's reviews

## Troubleshooting

### Login Issues ("Invalid credentials" or "No account found")
If you can't login as a regular user, try these steps:

1. **Check if the user exists in the database**:
   - Open phpMyAdmin
   - Select the `shareserve` database
   - Run: `SELECT id, email, first_name, last_name, is_active, is_verified, is_admin FROM users;`
   - Verify your user appears in the list

2. **Run the migration script** to fix any database issues:
   - Import `database/migration_fix.sql` in phpMyAdmin
   - This will ensure all users have `is_active = TRUE` and `is_admin = FALSE`

3. **Register a new user account**:
   - Go to the registration page
   - Create a new account (don't use the admin code unless you want admin access)
   - Try logging in with the new credentials

4. **Check the backend console** for any error messages when you try to login

### Database Connection Issues
- Make sure MySQL is running
- Check database credentials in `.env`
- Verify the database name is `shareserve`

### CORS Issues
- Ensure backend is running on port 5000
- The frontend proxy is configured in `vite.config.js`

### Port Already in Use
- Backend: Change `PORT` in `.env`
- Frontend: Add `server: { port: 3000 }` to `vite.config.js`

### Module Not Found Errors
- Run `npm install` in both backend and frontend directories
- Delete `node_modules` and `package-lock.json`, then reinstall

## Key Fixes Applied

1. **Database Schema**: Added missing `is_admin` column to users table
2. **Database Schema**: Fixed `price_type` enum typo (`' negotiable'` → `'Negotiable'`)
3. **CreateService**: Integrated with backend API for creating services
4. **Dashboard**: Added API integration for fetching user's services
5. **Dashboard**: Implemented Edit service functionality with modal
6. **Dashboard**: Implemented Delete service functionality with confirmation modal
7. **Search**: Added API integration for fetching services with filters
8. **Error Handling**: Added proper error handling and loading states
9. **Authentication**: Fixed token handling for protected routes

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in backend `.env`
2. Update `FRONTEND_URL` in backend `.env` to your production URL
3. Build the frontend: `npm run build`
4. Use a process manager like PM2 for the backend
5. Use a web server like Nginx for the frontend
6. Use a production MySQL server with proper security

## Support

If you encounter any issues, please check:
1. All dependencies are installed
2. MySQL is running
3. Environment variables are correctly set
4. Both servers are running on the correct ports