import React, { useContext } from 'react';
import { AuthContext } from '../App';

const Sidebar = ({ currentPage, setCurrentPage, userRole }) => {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Define navigation items based on role
  const getNavigationItems = () => {
    const items = [];
    
    // All roles can access payment form
    if (userRole === 'agent' || userRole === 'account') {
      items.push({
        id: 'paymentForm',
        label: 'Payment Form',
        icon: '💳',
        description: 'Create new payment'
      });
    }
    
    // Only 'account' role can access payment records
    if (userRole === 'account') {
      items.push({
        id: 'paymentRecord',
        label: 'Payment Records',
        icon: '📋',
        description: 'View payment history'
      });
    }
    
    return items;
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Payment System</h3>
        <div className="user-badge">
          <span className={`role-indicator role-${userRole}`}>{userRole}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navigationItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
                onClick={() => setCurrentPage(item.id)}
                title={item.description}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-details">
            <div className="user-name">{user.fullName}</div>
            <div className="user-email">{user.email}</div>
            <div className="user-department">{user.department}</div>
          </div>
        </div>
        
        <button 
          onClick={handleLogout} 
          className="logout-btn"
          title="Logout"
        >
          <span className="logout-icon">🚪</span>
          Logout
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          width: 280px;
          height: 100vh;
          background: linear-gradient(180deg, #2c3e50 0%, #3498db 100%);
          color: white;
          display: flex;
          flex-direction: column;
          box-shadow: 2px 0 5px rgba(0,0,0,0.1);
          position: fixed;
          left: 0;
          top: 0;
          z-index: 1000;
        }

        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .sidebar-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .user-badge {
          margin-top: 10px;
        }

        .role-indicator {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .role-agent {
          background-color: #27ae60;
          color: white;
        }

        .role-account {
          background-color: #e74c3c;
          color: white;
        }

        .sidebar-nav {
          flex: 1;
          padding: 20px 0;
        }

        .nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .nav-item {
          margin-bottom: 8px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 12px 20px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
        }

        .nav-link:hover {
          background-color: rgba(255,255,255,0.1);
          color: white;
          transform: translateX(5px);
        }

        .nav-link.active {
          background-color: rgba(255,255,255,0.2);
          color: white;
          border-right: 3px solid #f39c12;
        }

        .nav-icon {
          margin-right: 12px;
          font-size: 16px;
        }

        .nav-label {
          font-weight: 500;
        }

        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .user-info {
          margin-bottom: 15px;
        }

        .user-details {
          font-size: 12px;
          color: rgba(255,255,255,0.8);
        }

        .user-name {
          font-weight: 600;
          margin-bottom: 4px;
          color: white;
        }

        .user-email {
          margin-bottom: 2px;
        }

        .user-department {
          font-style: italic;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 10px;
          background-color: rgba(231, 76, 60, 0.2);
          border: 1px solid rgba(231, 76, 60, 0.3);
          color: white;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .logout-btn:hover {
          background-color: rgba(231, 76, 60, 0.4);
          border-color: rgba(231, 76, 60, 0.5);
        }

        .logout-icon {
          margin-right: 8px;
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            height: auto;
            position: relative;
          }
        }
      `}</style>
    </div>
  );
};

export default Sidebar;