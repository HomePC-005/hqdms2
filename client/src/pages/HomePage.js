import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Typography, 
  Row, 
  Col, 
  Statistic, 
  Alert,
  Space,
  Divider
} from 'antd';
import { 
  SearchOutlined, 
  MedicineBoxOutlined, 
  UserOutlined, 
  FileTextOutlined,
  DashboardOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { reportsAPI } from '../services/api';

const { Title, Paragraph } = Typography;
const { Search } = Input;

const HomePage = () => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await reportsAPI.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    if (value.trim()) {
      navigate(`/refill?search=${encodeURIComponent(value.trim())}`);
    }
  };

  const quickActions = [
    {
      title: 'Quick Refill Update',
      description: 'Update patient refill dates quickly',
      icon: <SearchOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
      action: () => navigate('/refill'),
      color: '#1890ff'
    },
    {
      title: 'Summary Dashboard',
      description: 'View quota utilization and status',
      icon: <DashboardOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
      action: () => navigate('/summary'),
      color: '#52c41a'
    },
    {
      title: 'Patient Management',
      description: 'Manage patient enrollments',
      icon: <UserOutlined style={{ fontSize: '24px', color: '#faad14' }} />,
      action: () => navigate('/patients'),
      color: '#faad14'
    },
    {
      title: 'Drug Management',
      description: 'Manage quota drugs and settings',
      icon: <MedicineBoxOutlined style={{ fontSize: '24px', color: '#f5222d' }} />,
      action: () => navigate('/drugs'),
      color: '#f5222d'
    },
    {
      title: 'Reports & Analytics',
      description: 'Generate reports and export data',
      icon: <FileTextOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
      action: () => navigate('/reports'),
      color: '#722ed1'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Welcome Section */}
      <div className="search-container">
        <Title level={2} className="search-title">
          Quota Drug Management System Hospital Segamat
        </Title>
        <Paragraph style={{ textAlign: 'center', fontSize: '16px', color: '#666', marginBottom: '32px' }}>
        © Jabatan Farmasi Hospital Segamat 2025
        </Paragraph>
        
        <Search
          placeholder="Search by patient name or IC number for quick refill update..."
          enterButton={<SearchOutlined />}
          size="large"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSearch={handleSearch}
          className="search-bar search-bar-lg"
          style={{ maxWidth: '600px', margin: '0 auto' }}
        />
      </div>

      {/* Dashboard Stats */}
      {dashboardData && (
        <Card style={{ marginBottom: '24px' }}>
          <Title level={4} style={{ marginBottom: '16px' }}>
            <ClockCircleOutlined style={{ marginRight: '8px' }} />
            System Overview
          </Title>
          <Row gutter={16}>
            <Col xs={12} sm={6}>
              <Statistic
                title="Total Departments"
                value={dashboardData.total_departments}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Quota Drugs"
                value={dashboardData.total_drugs}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Active Enrollments"
                value={dashboardData.active_enrollments}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Potential Defaulters"
                value={dashboardData.potential_defaulters}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Today's Summary */}
      {dashboardData && (
        <Card style={{ marginBottom: '24px' }}>
          <Title level={4} style={{ marginBottom: '16px' }}>
            <ClockCircleOutlined style={{ marginRight: '8px' }} />
            Today's Summary
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic
                title="Refills Processed"
                value={dashboardData.recent_refills || 0}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Active Enrollments"
                value={dashboardData.active_enrollments || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Alerts Generated"
                value={dashboardData.potential_defaulters > 0 ? 1 : 0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Col>
          </Row>
          
          <Divider />
          
          <div>
            <Paragraph type="secondary">
              System Performance: All services running normally. 
              Next quarterly report due in 15 days.
            </Paragraph>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card title="Quick Actions" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={index}>
              <Card
                hoverable
                onClick={action.action}
                style={{ 
                  textAlign: 'center',
                  border: `2px solid ${action.color}20`,
                  borderRadius: '8px'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  {action.icon}
                  <div>
                    <Title level={5} style={{ margin: 0, color: action.color }}>
                      {action.title}
                    </Title>
                    <Paragraph style={{ margin: '8px 0 0 0', color: '#666', fontSize: '12px' }}>
                      {action.description}
                    </Paragraph>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* System Information */}
      <Card>
        <Title level={4}>System Features</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Alert
              message="Quota Management"
              description="Track drug quotas and patient allocations across departments"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Alert
              message="Compliance Tracking"
              description="Monitor patient refill dates and detect non-compliant patients"
              type="warning"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          </Col>
          <Col xs={24} md={12}>
            <Alert
              message="Cost Analysis"
              description="Generate quarterly reports and cost projections"
              type="success"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Alert
              message="Quick Updates"
              description="Fast refill date updates for busy counter staff"
              type="error"
              showIcon
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default HomePage;
