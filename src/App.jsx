import React, { useState, useEffect, createContext, useContext } from 'react';
import { Amplify } from 'aws-amplify';
import { 
  signIn, 
  signOut, 
  getCurrentUser, 
  fetchAuthSession,
  fetchUserAttributes 
} from 'aws-amplify/auth';
import Sidebar from './components/Sidebar';
import PaymentForm from './pages/PaymentForm';
import PaymentRecord from './pages/PaymentRecord';
import './App.css';

// Enhanced logging utility
const logger = {
  info: (message, data) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
  },
  error: (message, error) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },
  warn: (message, data) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
  },
  debug: (message, data) => {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
  }
};

// Configure Amplify
logger.info('Configuring Amplify...');
try {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
        loginWith: {
          email: true,
        },
      }
    }
  });
  logger.info('Amplify configured successfully');
} catch (error) {
  logger.error('Failed to configure Amplify', error);
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Auth Context
const AuthContext = createContext();

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    logger.error('Error Boundary caught error', error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Error Boundary - Component did catch', { error, errorInfo });
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Error Details (click to expand)</summary>
            <p><strong>Error:</strong> {this.state.error && this.state.error.toString()}</p>
            <p><strong>Stack Trace:</strong></p>
            <pre>{this.state.errorInfo.componentStack}</pre>
          </details>
          <button 
            onClick={() => {
              logger.info('Error boundary - Reloading page');
              window.location.reload();
            }}
            style={{ marginTop: '10px', padding: '10px 20px' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Amplify Auth Service
class AmplifyAuthService {
  static async signIn(email, password) {
    logger.info('AmplifyAuthService.signIn - Starting sign in', { email });
    try {
      const result = await signIn({
        username: email,
        password: password,
      });
      logger.info('AmplifyAuthService.signIn - Sign in successful');
      return result;
    } catch (error) {
      logger.error('AmplifyAuthService.signIn - Sign in failed', error);
      throw error;
    }
  }

  static async signOut() {
    logger.info('AmplifyAuthService.signOut - Starting sign out');
    try {
      await signOut();
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
      logger.info('AmplifyAuthService.signOut - Sign out successful');
    } catch (error) {
      logger.error('AmplifyAuthService.signOut - Sign out failed', error);
      throw error;
    }
  }

  static async getCurrentSession() {
    logger.debug('AmplifyAuthService.getCurrentSession - Getting current session');
    try {
      const session = await fetchAuthSession();
      logger.debug('AmplifyAuthService.getCurrentSession - Session retrieved');
      return session;
    } catch (error) {
      logger.error('AmplifyAuthService.getCurrentSession - Failed to get session', error);
      throw error;
    }
  }

  static async getCurrentUser() {
    logger.debug('AmplifyAuthService.getCurrentUser - Getting current user');
    try {
      const user = await getCurrentUser();
      logger.debug('AmplifyAuthService.getCurrentUser - User retrieved', { userId: user.userId });
      return user;
    } catch (error) {
      logger.error('AmplifyAuthService.getCurrentUser - Failed to get current user', error);
      throw error;
    }
  }

  static async getUserAttributes() {
    logger.debug('AmplifyAuthService.getUserAttributes - Getting user attributes');
    try {
      const attributes = await fetchUserAttributes();
      logger.debug('AmplifyAuthService.getUserAttributes - Attributes retrieved');
      return attributes;
    } catch (error) {
      logger.error('AmplifyAuthService.getUserAttributes - Failed to get user attributes', error);
      throw error;
    }
  }

  static async getIdToken() {
    logger.debug('AmplifyAuthService.getIdToken - Getting ID token');
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      logger.debug('AmplifyAuthService.getIdToken - Token retrieved');
      return token;
    } catch (error) {
      logger.error('AmplifyAuthService.getIdToken - Failed to get ID token', error);
      throw error;
    }
  }
}

// Enhanced API Helper Functions
const apiCall = async (endpoint, options = {}) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  logger.info(`API Call [${requestId}] - Starting request`, { 
    endpoint, 
    method: options.method || 'GET'
  });
  
  try {
    let token = localStorage.getItem('authToken');
    
    if (!token) {
      try {
        token = await AmplifyAuthService.getIdToken();
        if (token) {
          localStorage.setItem('authToken', token);
        }
      } catch (sessionError) {
        logger.warn(`API Call [${requestId}] - No valid session found`);
      }
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const fullUrl = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(fullUrl, config);
    
    // If unauthorized, try to refresh token
    if (response.status === 401 && token) {
      try {
        const newToken = await AmplifyAuthService.getIdToken();
        if (newToken) {
          localStorage.setItem('authToken', newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
          const retryResponse = await fetch(fullUrl, config);
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            return retryData;
          }
        }
      } catch (refreshError) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        window.location.reload();
        return;
      }
    }
    
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Server returned invalid JSON response');
    }
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    logger.error(`API Call [${requestId}] - Request error`, error);
    throw error;
  }
};

// Loading Component
const Loading = ({ message = 'Loading...' }) => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>{message}</p>
  </div>
);

// Error Message Component
const ErrorMessage = ({ message, onRetry }) => (
  <div className="error-container">
    <div className="error-message">
      <h3>Error</h3>
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-primary" style={{ marginTop: '10px' }}>
          Retry
        </button>
      )}
    </div>
  </div>
);

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const currentUser = await AmplifyAuthService.getCurrentUser();
      const token = await AmplifyAuthService.getIdToken();
      
      if (token) {
        localStorage.setItem('authToken', token);
        
        // Get user profile from database
        const profileResponse = await apiCall('/user/profile');
        if (profileResponse.success) {
          const userInfo = profileResponse.data;
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
          setUser(userInfo);
        } else {
          throw new Error('Failed to load user profile');
        }
      } else {
        throw new Error('No token available');
      }
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const signInResult = await AmplifyAuthService.signIn(email, password);
      
      if (signInResult.isSignedIn) {
        const token = await AmplifyAuthService.getIdToken();
        
        if (token) {
          localStorage.setItem('authToken', token);
          
          // Get user profile from database after successful login
          const profileResponse = await apiCall('/user/profile');
          if (profileResponse.success) {
            const userInfo = profileResponse.data;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            setUser(userInfo);
            return userInfo;
          } else {
            throw new Error('Failed to load user profile');
          }
        } else {
          throw new Error('No token received');
        }
      } else {
        throw new Error('Sign in not completed');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AmplifyAuthService.signOut();
      setUser(null);
    } catch (error) {
      setUser(null);
    }
  };

  if (loading) {
    return <Loading message="Checking authentication..." />;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, checkAuthState, apiCall }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  const { login } = useContext(AuthContext);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(credentials.email, credentials.password);
    } catch (err) {
      let errorMessage = 'Login failed. Please try again.';
      
      switch (err.name || err.code) {
        case 'UserNotConfirmedException':
          errorMessage = 'Please confirm your email address before signing in.';
          break;
        case 'NotAuthorizedException':
          errorMessage = 'Invalid email or password.';
          break;
        case 'UserNotFoundException':
          errorMessage = 'User not found. Please check your email address.';
          break;
        default:
          if (err.message) {
            errorMessage = err.message;
          }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Login to Payment Management</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={credentials.email}
              onChange={(e) => setCredentials({...credentials, email: e.target.value})}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              required
              disabled={loading}
            />
          </div>
          {error && (
            <div className="error-text">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [currentPage, setCurrentPage] = useState('paymentForm');

  // Set default page based on user role
  useEffect(() => {
    if (user.role === 'agent') {
      setCurrentPage('paymentForm');
    } else if (user.role === 'account') {
      setCurrentPage('paymentRecord'); // Changed default to payment records for account role
    }
  }, [user.role]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'paymentForm':
        return <PaymentForm />;
      case 'paymentRecord':
        return <PaymentRecord />;
      default:
        return <PaymentForm />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="dashboard">
        <div className="dashboard-layout">
          <Sidebar 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage}
            userRole={user.role}
          />
          <div className="main-content">
            <div className="content-header">
              <h2>Payment Management System</h2>
              <div className="user-info">
                Welcome, {user.fullName} ({user.role})
              </div>
            </div>
            <div className="content-body">
              {renderCurrentPage()}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          display: flex;
          min-height: 100vh;
          background-color: #f8f9fa;
        }

        .dashboard-layout {
          display: flex;
          width: 100%;
        }

        .main-content {
          margin-left: 280px; /* Account for fixed sidebar width */
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .content-header {
          background: white;
          padding: 20px 30px;
          border-bottom: 1px solid #e1e8ed;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .content-header h2 {
          margin: 0;
          color: #2c3e50;
          font-size: 24px;
          font-weight: 600;
        }

        .user-info {
          color: #7f8c8d;
          font-size: 14px;
          font-weight: 500;
        }

        .content-body {
          flex: 1;
          padding: 0;
          overflow-x: hidden;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .main-content {
            margin-left: 0;
          }
          
          .content-header {
            padding: 15px 20px;
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
          
          .content-header h2 {
            font-size: 20px;
          }
        }

        /* Loading and error styles */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: #7f8c8d;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
        }

        .error-message {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #e74c3c;
          text-align: center;
        }

        .error-message h3 {
          color: #e74c3c;
          margin: 0 0 15px 0;
        }

        .btn {
          background-color: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: background-color 0.2s;
        }

        .btn:hover {
          background-color: #2980b9;
        }

        /* Login page styles */
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .login-form {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 400px;
        }

        .login-form h2 {
          text-align: center;
          margin: 0 0 30px 0;
          color: #2c3e50;
          font-size: 24px;
          font-weight: 600;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #2c3e50;
          font-weight: 600;
          font-size: 14px;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3498db;
        }

        .form-group input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        .error-text {
          color: #e74c3c;
          font-size: 14px;
          margin: 15px 0;
          padding: 10px;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 6px;
        }

        .btn-primary {
          width: 100%;
          background-color: #3498db;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 10px;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2980b9;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Error Boundary styles */
        .error-boundary {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 40px;
          text-align: center;
          background-color: #f8f9fa;
        }

        .error-boundary h2 {
          color: #e74c3c;
          margin-bottom: 20px;
        }

        .error-boundary details {
          margin: 20px 0;
          padding: 15px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e1e8ed;
          text-align: left;
          max-width: 600px;
        }

        .error-boundary button {
          background-color: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
      `}</style>
    </ErrorBoundary>
  );
};

// Main App Component
const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="app">
          <AuthContext.Consumer>
            {({ user }) => {
              return user ? <Dashboard /> : <Login />;
            }}
          </AuthContext.Consumer>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
export { AuthContext };