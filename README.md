# Medical App - Pharmacy Management System

A comprehensive pharmacy management system built with React and Node.js, featuring inventory management, sales tracking, and returns processing.

## Features

- **Inventory Management**: Track products, batches, and stock levels
- **Sales & Billing**: Process transactions with GST calculations
- **Returns Management**: Handle customer and supplier returns with backend integration
- **Purchase Orders**: Manage supplier orders and deliveries
- **Reports & Analytics**: Generate sales and inventory reports
- **User Authentication**: Secure login system

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js, MongoDB
- **Authentication**: JWT tokens
- **Database**: MongoDB with Mongoose

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd React-based-medical-app
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Environment Setup**
   
   Create `backend/.env` file:
   ```env
   MONGODB_URI=mongodb://localhost:27017/medical-app
   JWT_SECRET=your-jwt-secret-key
   PORT=3008
   ```

5. **Start the Application**
   
   **Backend** (Terminal 1):
   ```bash
   cd backend
   npm start
   ```
   
   **Frontend** (Terminal 2):
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3008

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product

### Returns
- `GET /api/returns/search` - Search invoices for returns
- `POST /api/returns/customer` - Process customer return
- `POST /api/returns/supplier` - Process supplier return

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction

## Deployment

### Local Development
1. Follow setup instructions above
2. Use MongoDB local instance
3. Run both frontend and backend locally

### Production Deployment
1. Set up MongoDB Atlas or cloud database
2. Update environment variables
3. Build frontend: `npm run build`
4. Deploy backend to cloud service (Heroku, Railway, etc.)
5. Deploy frontend to Vercel, Netlify, or similar

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

This project is licensed under the MIT License.