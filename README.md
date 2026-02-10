# Finance Tracker Backend

A full-featured **REST API** for shared expense tracking (roommates/friends), built with **Node.js**, **Express**, **MongoDB**, **JWT authentication**, **Cloudinary** for image uploads, and **Socket.io** (real-time ready).

Live Demo: https://finance-tracker-backend-wy1h.onrender.com/

## Features

- User authentication (register, login, refresh token, logout)
- User profile management + avatar upload (Cloudinary)
- Group creation & member management (add/remove/leave/delete)
- Expense tracking with multiple split types (equal, exact, percentage)
- Settlements (record payments, link to specific expenses)
- Group balances (who owes whom)
- Dashboard totals (personal + per-group + overall summary)
- Pagination, search, and population for expenses
- Persistent image uploads via Cloudinary
- Rate limiting on auth routes
- Global error handling

## Tech Stack

- Backend: Node.js + Express
- Database: MongoDB (Atlas)
- Auth: JWT (access + refresh tokens)
- File Uploads: Multer + Cloudinary
- Real-time (ready): Socket.io
- Deployment: Render.com
- Security: Rate limiting, secure env vars

## API Endpoints

All protected routes require:

### Authentication

- **Register**  
  POST `/api/auth/register`  
  Body: `{ "username", "email", "password" }`

- **Login**  
  POST `/api/auth/login`  
  Body: `{ "email", "password" }`

- **Refresh Token**  
  POST `/api/auth/refresh`  
  Body: `{ "refreshToken" }`

- **Logout**  
  POST `/api/auth/logout` (protected)

### Users (Protected)

- **Get current user**  
  GET `/api/users/me`

- **Update profile (username + avatar)**  
  PATCH `/api/users/me` (form-data: `username`, `avatar` file)

### Groups (Protected)

- **Create group**  
  POST `/api/groups`  
  Body: `{ "name", "description", "currency": "INR|USD|..." }`

- **Get my groups**  
  GET `/api/groups/my-groups`

- **Get group by ID**  
  GET `/api/groups/:id`

- **Add member**  
  POST `/api/groups/:groupId/members`  
  Body: `{ "userId" }`

- **Remove member**  
  DELETE `/api/groups/:groupId/members/:userId`

- **Leave group**  
  POST `/api/groups/:groupId/leave`

- **Delete group** (creator only)  
  DELETE `/api/groups/:groupId`

### Expenses (Protected)

- **Create expense**  
  POST `/api/expenses`  
  Body: `{ "description", "amount", "groupId"?, "category"?, "splitType": "equal|exact|percentage", ... }`

- **List expenses in group**  
  GET `/api/expenses/group/:groupId?page=1&limit=10&search=keyword`

- **Update expense**  
  PATCH `/api/expenses/:expenseId`

- **Delete expense**  
  DELETE `/api/expenses/:expenseId`

- **Get group balances**  
  GET `/api/expenses/balances/:groupId`

- **Dashboard totals**  
  GET `/api/expenses/dashboard`

### Settlements (Protected)

- **Create settlement**  
  POST `/api/settlements`  
  Body: `{ "groupId", "toUserId", "amount", "description"?, "expenseId"? }`

- **Get settlements in group**  
  GET `/api/settlements/group/:groupId`

## Environment Variables (for local or Render)

Create `.env` file with:

PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/finance-tracker?...
ACCESS_TOKEN_SECRET=your-very-long-secret
REFRESH_TOKEN_SECRET=another-very-long-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NODE_ENV=development   # or production on Render


## Deployment (Render.com)

1. Push to GitHub
2. Create new Web Service on Render → connect GitHub repo
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variables (from your `.env`)
6. Deploy → wait for Live status

Free tier sleeps after inactivity (first request may take 30–60s).

## Local Development

```bash
npm install
npm run dev

Open http://localhost:5000/
Postman Collection
(Export your Postman collection as JSON and upload to repo)

## License 
MIT License – see the [LICENSE](LICENSE) file for details.


