import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_WORKER_URL || '/api';

export default function Login() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const normalizedUser = user.trim().toLowerCase();
    const trimmedPass = pass.trim();

    if (!normalizedUser || !trimmedPass) {
      setError('Please enter username and password');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: normalizedUser,
          password: trimmedPass,
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setError(`Too many login attempts. Try again in ${data.retryAfter} seconds.`);
        setIsLoading(false);
        return;
      }

      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid username or password');
        setIsLoading(false);
        return;
      }

      // Store JWT token
      sessionStorage.setItem('authToken', data.token);
      sessionStorage.setItem('isAuth', 'true');
      sessionStorage.setItem('authUser', normalizedUser);

      // Dispatch custom event to notify App component immediately
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { isAuthenticated: true, token: data.token }
      }));

      navigate('/bloomberg', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloomberg-primary px-4">
      <div className="max-w-md w-full">
        <div className="bg-bloomberg-panel border border-bloomberg-border rounded-terminal-lg p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-bloomberg-orange font-bloomberg-sans mb-2">
              BLOOMBERG WANNABE
            </h1>
            <p className="text-bloomberg-text-muted text-terminal-sm">
              Terminal Access Required
            </p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-bloomberg-text-secondary text-terminal-sm mb-2">
                Username
              </label>
              <input
                name="username"
                type="text"
                autoComplete="off"
                className="w-full bg-bloomberg-input-bg border border-bloomberg-input-border
                         text-bloomberg-text-primary placeholder-bloomberg-input-placeholder
                         font-bloomberg-mono text-base sm:text-terminal-base px-3 py-3 sm:py-2 rounded-terminal
                         focus:outline-none focus:border-bloomberg-input-focus focus:ring-1 focus:ring-bloomberg-input-focus
                         transition-colors duration-200"
                placeholder="Enter username"
                value={user}
                onChange={e => setUser(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-bloomberg-text-secondary text-terminal-sm mb-2">
                Password
              </label>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                className="w-full bg-bloomberg-input-bg border border-bloomberg-input-border
                         text-bloomberg-text-primary placeholder-bloomberg-input-placeholder
                         font-bloomberg-mono text-base sm:text-terminal-base px-3 py-3 sm:py-2 rounded-terminal
                         focus:outline-none focus:border-bloomberg-input-focus focus:ring-1 focus:ring-bloomberg-input-focus
                         transition-colors duration-200"
                placeholder="Enter password"
                value={pass}
                onChange={e => setPass(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-bloomberg-button border border-bloomberg-orange text-bloomberg-orange
                       py-3 rounded-terminal font-bloomberg-sans font-bold text-terminal-base
                       transition-all duration-200 transform
                       ${isLoading
                         ? 'opacity-50 cursor-not-allowed'
                         : 'hover:bg-bloomberg-orange hover:text-bloomberg-primary hover:scale-105'
                       }`}
            >
              {isLoading ? 'AUTHENTICATING...' : 'ACCESS TERMINAL'}
            </button>
            
            {error && (
              <div className="bg-bloomberg-status-error/20 border-l-4 border-bloomberg-status-error p-3 rounded-terminal">
                <p className="text-bloomberg-status-error text-terminal-sm font-bloomberg-mono">
                  {error}
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
} 