import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  console.log("🔑 Login rendered");
  
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = e => {
    e.preventDefault();

    const normalizedUser = user.trim().toLowerCase();
    const trimmedPass = pass.trim();
    console.log('🔍 Normalized user:', `"${normalizedUser}"`);
    console.log('🔍 Trimmed pass:', `"${trimmedPass}"`);
    console.log('✔️ user match?', normalizedUser === 'racquel');
    console.log('✔️ pass match?', trimmedPass === 'Racquel@2025');

    if (normalizedUser === 'racquel' && trimmedPass === 'Racquel@2025') {
      console.log('✅ Credentials valid, setting auth and redirecting…');
      sessionStorage.setItem('isAuth', 'true');
      console.log('✅ Auth set:', sessionStorage.getItem('isAuth'));
      setError('');
      
      // Use navigate instead of window.location for React Router
      console.log('🚀 Navigating to /bloomberg...');
      navigate('/bloomberg', { replace: true });
      
      // Fallback: Force reload if navigate doesn't work
      setTimeout(() => {
        if (window.location.pathname !== '/bloomberg') {
          console.log('🔄 Fallback: Force reloading page...');
          window.location.reload();
        }
      }, 500);
    } else {
      console.log('❌ Invalid credentials');
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloomberg-primary">
      <div className="max-w-md w-full mx-4">
        <div className="bg-bloomberg-panel border border-bloomberg-border rounded-terminal-lg p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-bloomberg-orange font-bloomberg-sans mb-2">
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
                         font-bloomberg-mono text-terminal-base px-3 py-2 rounded-terminal
                         focus:outline-none focus:border-bloomberg-input-focus focus:ring-1 focus:ring-bloomberg-input-focus
                         transition-colors duration-200"
                placeholder="Enter username"
                value={user}
                onChange={e => {
                  console.log('Typing:', e.target.name, e.target.value);
                  setUser(e.target.value);
                }}
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
                         font-bloomberg-mono text-terminal-base px-3 py-2 rounded-terminal
                         focus:outline-none focus:border-bloomberg-input-focus focus:ring-1 focus:ring-bloomberg-input-focus
                         transition-colors duration-200"
                placeholder="Enter password"
                value={pass}
                onChange={e => {
                  console.log('Typing:', e.target.name, e.target.value);
                  setPass(e.target.value);
                }}
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-bloomberg-button border border-bloomberg-orange text-bloomberg-orange
                       py-3 rounded-terminal font-bloomberg-sans font-bold text-terminal-base
                       hover:bg-bloomberg-orange hover:text-bloomberg-primary
                       transition-all duration-200 transform hover:scale-105"
            >
              ACCESS TERMINAL
            </button>
            
            {error && (
              <div className="bg-bloomberg-status-error/20 border-l-4 border-bloomberg-status-error p-3 rounded-terminal">
                <p className="text-bloomberg-status-error text-terminal-sm font-bloomberg-mono">
                  {error}
                </p>
              </div>
            )}
          </form>
          
          <div className="mt-6 pt-4 border-t border-bloomberg-border-subtle">
            <div className="text-center">
              <p className="text-bloomberg-text-muted text-terminal-xs">
                Demo Credentials
              </p>
              <p className="text-bloomberg-text-secondary text-terminal-sm font-bloomberg-mono mt-1">
                racquel / Racquel@2025
              </p>
              
              {/* Debug button for testing */}
              <button 
                onClick={() => {
                  console.log('🧪 Debug: Setting auth manually');
                  sessionStorage.setItem('isAuth', 'true');
                  console.log('🧪 Debug: Auth set, navigating...');
                  navigate('/bloomberg');
                }}
                className="mt-3 px-3 py-1 bg-bloomberg-secondary border border-bloomberg-border 
                         text-bloomberg-text-muted text-terminal-xs rounded-terminal
                         hover:bg-bloomberg-button hover:text-bloomberg-text-primary transition-colors"
              >
                Debug: Skip Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 