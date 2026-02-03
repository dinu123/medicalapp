# Medical App Backend

Node.js backend for the React-based Medical App with MongoDB integration.

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Install MongoDB locally or use MongoDB Atlas

3. Configure environment variables in `.env`:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/medical-app
   JWT_SECRET=your-secret-key-here
   NODE_ENV=development
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PUT /api/products/:id/batch/:batchId/stock` - Update batch stock

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get transaction by ID
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `GET /api/transactions/analytics/summary` - Get sales analytics

### Purchases
- `GET /api/purchases` - Get all purchases
- `GET /api/purchases/:id` - Get purchase by ID
- `POST /api/purchases` - Create purchase
- `PUT /api/purchases/:id` - Update purchase

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `GET /api/suppliers/:id` - Get supplier by ID
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `POST /api/customers/find-or-create` - Find or create customer

## Authentication

All API endpoints (except auth routes) require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Database Schema

The backend uses MongoDB with Mongoose ODM. Key models:
- User (authentication)
- Product (with batches)
- Transaction (sales)
- Purchase (inventory)
- Supplier
- Customer