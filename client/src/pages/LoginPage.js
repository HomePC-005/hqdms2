import React, { useState } from 'react';
import { Form, Input, Button, Card, Tabs, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, IdcardOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated()) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const response = await authAPI.login(values);
      if (response.data.success) {
        message.success('Login successful!');
        login(response.data.user, response.data.token);
        navigate('/');
      } else {
        message.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleResetPassword = async (values) => {
    setLoading(true);
    try {
      const response = await authAPI.resetPassword(values);
      if (response.data.success) {
        message.success('Password has been reset! Your new password is the same as your IC Number.');
      } else {
        message.error(response.data.message || 'Failed to reset password');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          border: 'none'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            HQDMS
          </Title>
          <Text type="secondary">
            Hospital Quota Drug Management System
          </Text>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
          <TabPane tab="Login" key="login">
            <Form
              name="login"
              onFinish={handleLogin}
              layout="vertical"
              size="large"
              initialValues={{}}
            >
              <Form.Item
                name="ic_number"
                rules={[
                  { required: true, message: 'Please input your IC Number!' },
                  { pattern: /^\d+$/, message: 'IC Number must contain only numbers (no dashes or special characters)!' }
                ]}
              >
                <Input
                  prefix={<IdcardOutlined />}
                  placeholder="IC Number"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Please input your password!' },
                  { min: 4, message: 'Password must be at least 4 characters!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={{ width: '100%', height: '40px' }}
                >
                  Login
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="Reset Password" key="reset">
            <Form
              name="resetPassword"
              onFinish={handleResetPassword}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="ic_number"
                rules={[
                  { required: true, message: 'Please input your IC Number!' },
                  { pattern: /^\d+$/, message: 'IC Number must contain only numbers (no dashes or special characters)!' }
                ]}
              >
                <Input
                  prefix={<IdcardOutlined />}
                  placeholder="Enter your IC Number"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={{ width: '100%', height: '40px' }}
                >
                  Reset Password
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
            Prescriber Overview is available without login
          </Text>
          <Link 
            to="/prescriber-overview" 
            style={{ fontSize: '14px', fontWeight: '500', color: '#1890ff' }}
          >
            View Quota Prescriber Overview →
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
