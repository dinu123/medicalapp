import { User } from '../types';

// In a real application, passwords would be securely hashed.
// For this mock implementation, we are using plain text.

export const users: (User & { password_plaintext: string })[] = [
  {
    id: 'user_admin_01',
    username: 'admin',
    password_plaintext: 'admin123',
    role: 'admin',
    email: 'admin@medistore.com',
  },
  {
    id: 'user_pharma_01',
    username: 'pharmacist',
    password_plaintext: 'pharma123',
    role: 'pharmacist',
    email: 'pharmacist@medistore.com',
  },
  {
    id: 'user_cashier_01',
    username: 'cashier',
    password_plaintext: 'cashier123',
    role: 'cashier',
    email: 'cashier@medistore.com',
  },
];