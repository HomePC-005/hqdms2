import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { authAPI } from '../services/api';

const ChangePasswordModal = ({ visible, onCancel, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await authAPI.changePassword(values);
      if (response.data.success) {
        message.success('Password changed successfully!');
        form.resetFields();
        onSuccess();
        onCancel();
      } else {
        message.error(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Change Password"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={400}
      destroyOnHidden={true}
    >
      <Form
        form={form}
        name="changePassword"
        onFinish={handleSubmit}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="currentPassword"
          rules={[
            { required: true, message: 'Please input your current password!' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Current Password"
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          rules={[
            { required: true, message: 'Please input your new password!' },
            { min: 4, message: 'Password must be at least 4 characters!' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="New Password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your new password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match!'));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Confirm New Password"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={handleCancel} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
          >
            Change Password
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
