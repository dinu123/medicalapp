import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { UserIcon as LoginIcon } from './Icons';
import { register } from '../services/authService';

const Login: React.FC = () => {
  const { login } = useContext(AppContext);
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('pharmacist');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isRegister) {
        const user = await register(username, password, role, email);
        if (user) {
          const loginUser = await login(username, password);
          if (!loginUser) {
            setError('Registration successful but login failed.');
          }
        } else {
          setError('Registration failed. Username may already exist.');
        }
      } else {
        const user = await login(username, password);
        if (!user) {
          setError('Invalid username or password.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-xl shadow-lg border border-border">
        <div className="text-center">
            <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-brand-blue rounded-lg mr-4"></div>
                <h1 className="text-3xl font-bold text-foreground">MediStore</h1>
            </div>
            <p className="text-muted-foreground">{isRegister ? 'Create new account' : 'Please sign in to continue'}</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="text-sm font-medium leading-none text-muted-foreground"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none text-muted-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              autoComplete="current-password"
            />
          </div>
          {isRegister && (
            <>
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium leading-none text-muted-foreground">Role</label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="pharmacist">Pharmacist</option>
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium leading-none text-muted-foreground">Email (Optional)</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </>
          )}
          {error && (
            <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md text-center">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isRegister ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-primary hover:underline"
          >
            {isRegister ? 'Already have an account? Sign in' : 'Need an account? Create one'}
          </button>
        </div>
         <div className="text-center text-xs text-muted-foreground mt-4">
            <p>Create account with any username/password</p>
            <p>Or use existing: admin / 123456</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
