import { useState, useEffect, type ReactNode } from 'react';

interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

interface AuthResponse {
  clientPrincipal: ClientPrincipal | null;
}

interface AuthenticationWrapperProps {
  children: ReactNode;
}

export default function AuthenticationWrapper({ children }: AuthenticationWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<ClientPrincipal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/.auth/me');
      const data: AuthResponse = await response.json();
      
      if (data.clientPrincipal) {
        setIsAuthenticated(true);
        setUser(data.clientPrincipal);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleLogout = () => {
    window.location.href = '/logout';
  };

  if (isLoading) {
    return (
      <div className="auth-loading">
        <style>{`
          .auth-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
            color: #e6f3ff;
            font-family: 'Orbitron', monospace;
            text-align: center;
          }

          .auth-spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(141, 215, 247, 0.3);
            border-top: 4px solid #8dd7f7;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 2rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .auth-loading-text {
            font-size: 1.2rem;
            color: #8dd7f7;
            text-shadow: 0 0 20px rgba(141, 215, 247, 0.5);
          }
        `}</style>
        <div className="auth-spinner"></div>
        <div className="auth-loading-text">🔐 Checking Authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-required">
        <style>{`
          .auth-required {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
            color: #e6f3ff;
            font-family: 'Orbitron', monospace;
            text-align: center;
            padding: 2rem;
          }

          .auth-container {
            background: rgba(26, 26, 46, 0.8);
            border: 2px solid rgba(141, 215, 247, 0.3);
            border-radius: 20px;
            padding: 3rem;
            backdrop-filter: blur(10px);
            box-shadow: 0 0 30px rgba(141, 215, 247, 0.2);
            max-width: 500px;
          }

          .auth-title {
            font-size: 2.5rem;
            color: #8dd7f7;
            margin-bottom: 1rem;
            text-shadow: 0 0 20px rgba(141, 215, 247, 0.5);
          }

          .auth-subtitle {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            color: rgba(230, 243, 255, 0.9);
          }

          .auth-description {
            margin-bottom: 2rem;
            color: rgba(230, 243, 255, 0.8);
            line-height: 1.6;
          }

          .login-btn {
            background: linear-gradient(45deg, #4a9eff, #8dd7f7);
            border: none;
            padding: 1rem 2rem;
            border-radius: 15px;
            color: #0a0a0f;
            font-weight: 700;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Orbitron', monospace;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .login-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 25px rgba(141, 215, 247, 0.4);
          }

          .security-note {
            margin-top: 2rem;
            padding: 1rem;
            background: rgba(141, 215, 247, 0.1);
            border: 1px solid rgba(141, 215, 247, 0.2);
            border-radius: 10px;
            font-size: 0.9rem;
            color: rgba(230, 243, 255, 0.7);
          }
        `}</style>
        
        <div className="auth-container">
          <div className="auth-title">🔐 Access Restricted</div>
          <div className="auth-subtitle">Organization Login Required</div>
          <div className="auth-description">
            This application is restricted to authorized users only. 
            Please sign in with your organizational account to continue.
          </div>
          <button className="login-btn" onClick={handleLogin}>
            🚀 Sign In with Microsoft
          </button>
          <div className="security-note">
            🛡️ Your session is secured with Azure Entra ID authentication
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, render the app with user context
  return (
    <div className="authenticated-app">
      <div className="user-context" style={{ 
        position: 'absolute', 
        top: '1rem', 
        right: '1rem', 
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'rgba(26, 26, 46, 0.9)',
        padding: '0.5rem 1rem',
        borderRadius: '10px',
        border: '1px solid rgba(141, 215, 247, 0.3)',
        color: '#e6f3ff',
        fontSize: '0.9rem',
        fontFamily: "'Orbitron', monospace"
      }}>
        <span>👤 {user?.userDetails}</span>
        <button 
          onClick={handleLogout}
          style={{
            background: 'rgba(239, 68, 68, 0.8)',
            border: 'none',
            padding: '0.25rem 0.75rem',
            borderRadius: '5px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontFamily: "'Orbitron', monospace"
          }}
        >
          Logout
        </button>
      </div>
      {children}
    </div>
  );
}