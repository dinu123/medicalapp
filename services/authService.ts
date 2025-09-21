import { users } from '../data/users';
import { User } from '../types';

export const login = async (username: string, password: string): Promise<User | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const userRecord = users.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.password_plaintext === password
  );

  if (userRecord) {
    // Return a user object without the password
    const { password_plaintext, ...user } = userRecord;
    return user;
  }

  return null;
};
