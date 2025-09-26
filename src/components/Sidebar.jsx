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
    
    // Payment Records first - full access roles only (not sales)
    if (['account', 'sales_admin', 'management', 'admin'].includes(userRole)) {
      items.push({
        id: 'paymentRecord',
        label: 'Payment Records',
        icon: '📋',
        description: 'View payment history'
      });
    }
    
    // Payment Form second - accessible to all roles
    if (['account', 'sales', 'sales_admin', 'management', 'admin'].includes(userRole)) {
      items.push({
        id: 'paymentForm',
        label: 'Payment Form',
        icon: '💳',
        description: 'Create new payment'
      });
    }
    
    // Admin Users - management and admin only
    if (['management', 'admin'].includes(userRole)) {
      items.push({
        id: 'adminUsers',
        label: 'User Management',
        icon: '👥',
        description: 'Manage system users'
      });
    }
    
    return items;
  };

  const navigationItems = getNavigationItems();

  // Get role display information
  const getRoleInfo = (role) => {
    switch (role) {
      case 'account':
        return { label: 'Account', color: '#28a745', description: 'Accounting Department' };
      case 'sales':
        return { label: 'Sales', color: '#007bff', description: 'Sales Team' };
      case 'sales_admin':
        return { label: 'Sales Admin', color: '#6f42c1', description: 'Sales Administrator' };
      case 'management':
        return { label: 'Management', color: '#fd7e14', description: 'Management Team' };
      case 'admin':
        return { label: 'Admin', color: '#dc3545', description: 'System Administrator' };
      default:
        return { label: role, color: '#6c757d', description: 'User' };
    }
  };

  const roleInfo = getRoleInfo(userRole);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">💰</div>
          <div className="logo-text">
            <h3>Payment System</h3>
            <span className="version">v1.0</span>
          </div>
        </div>
      </div>

      <div className="user-info">
        <div className="user-avatar">
          {user.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="user-details">
          <div className="user-name">{user.fullName}</div>
          <div className="user-role" style={{ color: roleInfo.color }}>
            {roleInfo.label}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">Main</div>
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
                  {currentPage === item.id && <div className="nav-active-indicator"></div>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="profile-item">
            <span className="profile-label">Email:</span>
            <span className="profile-value">{user.email}</span>
          </div>
          <div className="profile-item">
            <span className="profile-label">Department:</span>
            <span className="profile-value">{user.department}</span>
          </div>
        </div>
        
        <button 
          onClick={handleLogout} 
          className="logout-btn"
          title="Sign out"
        >
          <span className="logout-icon">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>

      <style jsx>{`
        .sidebar {
          width: 260px;
          height: 100vh;
          background: #ffffff;
          border-right: 1px solid #e1e5e9;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 1000;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
        }

        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid #e1e5e9;
          background: #f8f9fa;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          font-size: 24px;
          background: #007bff;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-text h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #212529;
          line-height: 1.2;
        }

        .version {
          font-size: 11px;
          color: #6c757d;
          font-weight: 400;
        }

        .user-info {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8f9fa;
          border-bottom: 1px solid #e1e5e9;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 16px;
        }

        .user-details {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-weight: 600;
          color: #212529;
          font-size: 14px;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .user-role {
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 20px 0;
          overflow-y: auto;
        }

        .nav-section {
          margin-bottom: 25px;
        }

        .nav-section-title {
          font-size: 11px;
          font-weight: 600;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          padding: 0 20px;
        }

        .nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .nav-item {
          margin: 0;
        }

        .nav-link {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 12px 20px;
          background: none;
          border: none;
          color: #6c757d;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
          position: relative;
        }

        .nav-link:hover {
          background-color: #f8f9fa;
          color: #007bff;
        }

        .nav-link.active {
          background-color: #e3f2fd;
          color: #007bff;
          font-weight: 500;
          border-right: 3px solid #007bff;
        }

        .nav-link.active .nav-active-indicator {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: #007bff;
        }

        .nav-icon {
          margin-right: 12px;
          font-size: 16px;
          width: 20px;
          text-align: center;
        }

        .nav-label {
          font-weight: 500;
          flex: 1;
        }

        .sidebar-footer {
          padding: 20px;
          border-top: 1px solid #e1e5e9;
          background: #f8f9fa;
        }

        .user-profile {
          margin-bottom: 15px;
        }

        .profile-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 12px;
        }

        .profile-label {
          color: #6c757d;
          font-weight: 500;
        }

        .profile-value {
          color: #212529;
          font-weight: 400;
          text-align: right;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 120px;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 12px;
          background-color: #ffffff;
          border: 1px solid #dee2e6;
          color: #6c757d;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
          font-weight: 500;
          gap: 8px;
        }

        .logout-btn:hover {
          background-color: #f8f9fa;
          border-color: #dc3545;
          color: #dc3545;
        }

        .logout-icon {
          font-size: 16px;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            height: auto;
            position: relative;
            box-shadow: none;
            border-right: none;
            border-bottom: 1px solid #e1e5e9;
          }

          .user-info {
            display: none;
          }

          .sidebar-header {
            padding: 15px 20px;
          }

          .logo {
            justify-content: center;
          }

          .sidebar-nav {
            padding: 15px 0;
          }

          .nav-section-title {
            display: none;
          }

          .nav-list {
            display: flex;
            justify-content: center;
            gap: 10px;
            flex-wrap: wrap;
          }

          .nav-item {
            flex: 1;
            min-width: 120px;
          }

          .nav-link {
            border-radius: 6px;
            margin: 0 5px;
            justify-content: center;
            padding: 12px 8px;
            text-align: center;
            flex-direction: column;
            gap: 4px;
          }

          .nav-link.active {
            border: 1px solid #007bff;
            border-right: 1px solid #007bff;
          }

          .nav-icon {
            margin-right: 0;
            margin-bottom: 4px;
          }

          .nav-label {
            font-size: 11px;
            text-align: center;
          }

          .sidebar-footer {
            padding: 15px 20px;
          }

          .user-profile {
            display: none;
          }
        }

        /* Custom scrollbar */
        .sidebar-nav::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-nav::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-nav::-webkit-scrollbar-thumb {
          background: #dee2e6;
          border-radius: 2px;
        }

        .sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: #adb5bd;
        }

        /* Focus states for accessibility */
        .nav-link:focus {
          outline: 2px solid #007bff;
          outline-offset: -2px;
        }

        .logout-btn:focus {
          outline: 2px solid #007bff;
          outline-offset: -2px;
        }

        /* Animation for active state */
        .nav-link {
          position: relative;
          overflow: hidden;
        }

        .nav-link::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 0;
          background: #007bff;
          transition: width 0.2s ease;
        }

        .nav-link.active::before {
          width: 3px;
        }

        /* Hover effect */
        .nav-link:not(.active):hover {
          transform: translateX(2px);
        }
      `}</style>
    </div>
  );
};

export default Sidebar;