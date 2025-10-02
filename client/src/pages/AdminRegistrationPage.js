import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined, IdcardOutlined, UserAddOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const { Title, Text } = Typography;

const AdminRegistrationPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const response = await authAPI.register(values);
      if (response.data.success) {
        message.success('User registered successfully!');
        // Reset form
        form.resetFields();
      } else {
        message.error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [form] = Form.useForm();

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
          maxWidth: 500,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          border: 'none'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <UserAddOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            Admin Registration
          </Title>
          <Text type="secondary">
            Register new users for HQDMS
          </Text>
        </div>

        <Alert
          message="Admin Only"
          description="This page is strictly for administrators only."
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Form
          form={form}
          name="adminRegister"
          onFinish={handleRegister}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="name"
            rules={[
              { required: true, message: 'Please input the user\'s name!' },
              { min: 2, message: 'Name must be at least 2 characters!' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Full Name"
            />
          </Form.Item>

          <Form.Item
            name="ic_number"
            rules={[
              { required: true, message: 'Please input the IC Number!' },
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
              { required: true, message: 'Please input a password!' },
              { min: 4, message: 'Password must be at least 4 characters!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm the password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm Password"
            />
          </Form.Item>

          <Form.Item>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{ width: '100%', height: '40px' }}
                icon={<UserAddOutlined />}
              >
                Register User
              </Button>
              <Button
                type="default"
                onClick={() => navigate('/login')}
                style={{ width: '100%', height: '40px' }}
              >
                Back to Login
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            This page is only accessible to administrators
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default AdminRegistrationPage;


