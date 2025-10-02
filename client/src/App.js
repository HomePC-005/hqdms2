import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import { 
  HomeOutlined, 
  DashboardOutlined, 
  UserOutlined, 
  MedicineBoxOutlined, 
  FileTextOutlined,
  SearchOutlined,
  BankOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HeaderWithAuth from './components/HeaderWithAuth';

// Import pages
import HomePage from './pages/HomePage';
import SummaryPage from './pages/SummaryPage';
import PatientListPage from './pages/PatientListPage';
import DrugListPage from './pages/DrugListPage';
import DepartmentListPage from './pages/DepartmentListPage';
import ReportsPage from './pages/ReportsPage';
import RefillUpdatePage from './pages/RefillUpdatePage';
import EnrollmentListPage from './pages/EnrollmentListPage';
import PrescriberOverviewPage from './pages/PrescriberOverviewPage';
import LoginPage from './pages/LoginPage';
import AdminRegistrationPage from './pages/AdminRegistrationPage';

const { Sider, Content } = Layout;
const { Title } = Typography;

// Main App Layout Component
function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: 'Home',
    },
    {
      key: '/refill',
      icon: <SearchOutlined />,
      label: 'Quick Refill',
    },
    {
      key: '/summary',
      icon: <DashboardOutlined />,
      label: 'Summary Dashboard',
    },
        {
      key: '/enrollments',
      icon: <TeamOutlined />,
      label: 'Enrollments',
    },
    {
      key: '/drugs',
      icon: <MedicineBoxOutlined />,
      label: 'Drug List',
    },
    {
      key: '/patients',
      icon: <UserOutlined />,
      label: 'Patient List',
    },
    {
      key: '/departments',
      icon: <BankOutlined />,
      label: 'Departments',
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    {
      key: '/prescriber-overview',
      icon: <BankOutlined />,
      label: 'Prescriber Overview',
    },
  ];

  const handleMenuClick = ({ key }) => {
      navigate(key);
    // Auto-collapse menu only on narrow screens (mobile/tablet)
    if (window.innerWidth < 992) {
      setCollapsed(true);
    }
  };

  // Check if current page should hide sidebar
  const hideSidebar = location.pathname === '/prescriber-overview';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sider - Hidden for prescriber overview */}
      {!hideSidebar && (
        <Sider
        width={250}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={0}
        collapsible
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ 
          padding: collapsed ? '16px 8px' : '24px 16px', 
          textAlign: 'center',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            {collapsed ? 'HQ' : 'HQDMS'}
          </Title>
          {!collapsed && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Hospital Quota Drug Management System
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ 
            border: 'none',
            background: '#fff'
          }}
        />
        </Sider>
      )}
      
      <Layout>
        {/* Header - Hidden for prescriber overview */}
        {!hideSidebar && <HeaderWithAuth />}
        
        <Content style={{ 
          background: hideSidebar ? '#f5f5f5' : '#f5f5f5',
          padding: hideSidebar ? '0' : '16px',
          '@media (min-width: 768px)': {
            padding: hideSidebar ? '0' : '24px'
          }
        }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/regist" element={<AdminRegistrationPage />} />
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/refill" element={<ProtectedRoute><RefillUpdatePage /></ProtectedRoute>} />
            <Route path="/summary" element={<ProtectedRoute><SummaryPage /></ProtectedRoute>} />
            <Route path="/prescriber-overview" element={<PrescriberOverviewPage />} />
            <Route path="/enrollments" element={<ProtectedRoute><EnrollmentListPage /></ProtectedRoute>} />
            <Route path="/patients" element={<ProtectedRoute><PatientListPage /></ProtectedRoute>} />
            <Route path="/drugs" element={<ProtectedRoute><DrugListPage /></ProtectedRoute>} />
            <Route path="/departments" element={<ProtectedRoute><DepartmentListPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

// Main App Component with Authentication
function App() {
  const location = useLocation();
  
  // Show login page without layout
  if (location.pathname === '/login') {
    return <LoginPage />;
  }
  
  // Show admin registration page without layout
  if (location.pathname === '/regist') {
    return <AdminRegistrationPage />;
  }
  
  // Show app layout for all other pages
  return <AppLayout />;
}

// App with AuthProvider wrapper
function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default AppWithAuth;
