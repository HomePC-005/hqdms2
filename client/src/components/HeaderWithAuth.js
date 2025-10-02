import React from 'react';
import { Layout, Typography, Space } from 'antd';
import { useLocation } from 'react-router-dom';
import UserProfile from './UserProfile';

const { Header } = Layout;
const { Title } = Typography;

const HeaderWithAuth = () => {
  const location = useLocation();

  return (
    <Header style={{ 
      background: '#fff', 
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }}>
      <Space>
        <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
          {location.pathname === '/' && 'Home'}
          {location.pathname === '/refill' && 'Quick Refill'}
          {location.pathname === '/summary' && 'Dashboard'}
          {location.pathname === '/prescriber-overview' && 'Department Overview'}
          {location.pathname === '/enrollments' && 'Enrollments'}
          {location.pathname === '/patients' && 'Patients'}
          {location.pathname === '/drugs' && 'Drugs'}
          {location.pathname === '/departments' && 'Departments'}
          {location.pathname === '/reports' && 'Reports'}
        </Title>
      </Space>
      
      <Space>
        <div style={{ color: '#666', fontSize: '12px', marginRight: '16px' }}>
          <span style={{ '@media (min-width: 768px)': { display: 'inline' } }}>
            Quota Drug Management
          </span>
        </div>
        <UserProfile />
      </Space>
    </Header>
  );
};

export default HeaderWithAuth;
