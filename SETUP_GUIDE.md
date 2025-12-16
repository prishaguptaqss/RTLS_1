# RTLS User Management Setup Guide

This guide will help you set up and test the complete user management system with backend and frontend connected.

## Prerequisites

- Python 3.9+ installed
- Node.js 16+ and npm installed
- PostgreSQL running (via Docker or locally)

## Backend Setup

### 1. Start PostgreSQL Database

```bash
cd /home/qss/Desktop/RTLS/backend
docker-compose up -d
```

This will start PostgreSQL on port 5433.

### 2. Activate Python Virtual Environment

```bash
cd /home/qss/Desktop/RTLS/backend
source venv/bin/activate
```

### 3. Install Backend Dependencies (if not already installed)

```bash
pip install -r requirements.txt
```

### 4. Run Database Migrations (if needed)

```bash
alembic upgrade head
```

### 5. Start Backend Server

```bash
# From the backend directory
python -m app.main
```

Or alternatively:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
```

The backend will be running at: http://localhost:3000
API documentation available at: http://localhost:3000/docs

## Frontend Setup

### 1. Install Frontend Dependencies (if not already installed)

```bash
cd /home/qss/Desktop/RTLS/frontend
npm install
```

### 2. Start Frontend Development Server

```bash
npm run dev
```

The frontend will be running at: http://localhost:5173

## Testing the User Management System

### 1. Access the Application

Open your browser and go to: http://localhost:5173

### 2. Navigate to Users Page

Click on "Users" in the sidebar navigation.

### 3. Test Create User

1. Click the "+ Add User" button
2. Fill in the form:
   - Name: (Required) e.g., "John Doe"
   - Email: (Optional) e.g., "john@example.com"
   - Role: (Optional) e.g., "Doctor"
   - Status: (Required) Select "Active" or "Inactive"
3. Click "Create User"
4. The new user should appear in the table

### 4. Test Update User

1. Click the edit icon (✏️) next to any user
2. Modify the user details
3. Click "Update User"
4. The user information should be updated in the table

### 5. Test Delete User

1. Click the delete icon (🗑️) next to any user
2. Confirm the deletion in the modal
3. The user should be removed from the table

## API Endpoints

The following API endpoints are available:

- `GET /api/users` - List all users
- `POST /api/users` - Create a new user
- `GET /api/users/{id}` - Get user by ID
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

## User Model Fields

### Required Fields
- **name** (string): Full name of the person
- **status** (enum): User status - "active" or "inactive"

### Optional Fields
- **email** (string): Email address (must be unique if provided)
- **role** (string): Role in the system (e.g., Doctor, Nurse, Patient)

### Auto-generated Fields
- **id** (integer): Primary key, auto-incremented
- **created_at** (datetime): Timestamp when user was created

## Troubleshooting

### Backend Issues

**Error: Connection refused**
- Make sure PostgreSQL is running: `docker-compose ps`
- Check if the database port 5433 is accessible

**Error: Module not found**
- Activate virtual environment: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

**Error: Database connection failed**
- Check `.env` file configuration
- Verify DATABASE_URL in backend/.env matches docker-compose.yml settings

### Frontend Issues

**Error: Network Error / Failed to fetch**
- Verify backend is running on http://localhost:3000
- Check CORS settings in backend allow http://localhost:5173
- Verify `.env` file in frontend directory has correct API URL

**Error: Module not found**
- Install dependencies: `npm install`
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

## Next Steps

After completing user management, you can implement similar CRUD operations for:

1. **Buildings** - Manage building information
2. **Floors** - Manage floors within buildings
3. **Rooms** - Manage rooms within floors

The pattern will be similar:
- API endpoints already exist in the backend
- Frontend service functions already exist in `services/api.js`
- Create pages similar to Users.jsx with table view and modals
- Add appropriate form fields based on the data model

## Quick Start Commands

```bash
# Terminal 1 - Backend
cd /home/qss/Desktop/RTLS/backend
docker-compose up -d
source venv/bin/activate
python -m app.main

# Terminal 2 - Frontend
cd /home/qss/Desktop/RTLS/frontend
npm run dev
```

Then open http://localhost:5173 in your browser.
