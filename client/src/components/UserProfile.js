import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, Avatar, Space, Typography, Modal, message, Button } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined, 
  SettingOutlined, 
  IdcardOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import AdminRegistrationPage from '../pages/AdminRegistrationPage';

const { Text } = Typography;



const UserProfile = () => {
  const { user, logout } = useAuth();
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  
  const navigate = useNavigate();
  
  const handleMenuClick = ({ key }) => {
      navigate(key);
  };

  const handleLogout = () => {
    Modal.confirm({
      title: 'Confirm Logout',
      content: 'Are you sure you want to logout?',
      okText: 'Logout',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        logout();
        message.success('Logged out successfully');
      },
    });
  };

  const handleChangePassword = () => {
    setChangePasswordVisible(true);
  };

  const handleViewProfile = () => {
    setProfileModalVisible(true);
  };

  const handlePasswordChangeSuccess = () => {
    setChangePasswordVisible(false);
  };

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'View Profile',
      onClick: handleViewProfile,
    },
    {
      key: 'changePassword',
      icon: <SettingOutlined />,
      label: 'Change Password',
      onClick: handleChangePassword,
    },
    {
      key: '/regist',
      icon: <UserOutlined />,
      label: 'New Registration',
      onClick: handleMenuClick,    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        placement="bottomRight"
        arrow
        trigger={['click']}
      >
        <Space style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: '6px', transition: 'background-color 0.2s' }} className="user-profile-trigger">
          <Avatar 
            size="small" 
            icon={<UserOutlined />} 
            style={{ backgroundColor: '#1890ff' }}
          />
          <Space direction="vertical" size={0} style={{ lineHeight: '1.2' }}>
            <Text strong style={{ fontSize: '14px', color: '#262626' }}>
              {user?.name || 'User'}
            </Text>

          </Space>
        </Space>
      </Dropdown>

      {/* Profile Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            User Profile
          </Space>
        }
        open={profileModalVisible}
        onCancel={() => setProfileModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setProfileModalVisible(false)}>
            Close
          </Button>
        ]}
        width={500}
      >
        <div style={{ padding: '16px 0' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Avatar 
                size={80} 
                icon={<UserOutlined />} 
                style={{ backgroundColor: '#1890ff', marginBottom: '16px' }}
              />
              <div>
                <Text strong style={{ fontSize: '20px', display: 'block', marginBottom: '8px' }}>
                  {user?.name || 'User'}
                </Text>
                <Text type="secondary" style={{ fontSize: '16px' }}>
                  Jabatan Farmasi,  Hospital Segamat
                </Text>
              </div>
            </div>

            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '6px' }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                    <IdcardOutlined style={{ marginRight: '8px' }} />
                    IC Number
                  </Text>
                  <Text style={{ fontSize: '16px' }}>{user?.ic_number || 'N/A'}</Text>
                </div>
                
                <div>
                  <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                    <UserOutlined style={{ marginRight: '8px' }} />
                    Full Name
                  </Text>
                  <Text style={{ fontSize: '16px' }}>{user?.name || 'N/A'}</Text>
                </div>

                <div>
                  <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                    Member Since
                  </Text>
                  <Text style={{ fontSize: '16px' }}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </Text>
                </div>
              </Space>
            </div>
          </Space>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={changePasswordVisible}
        onCancel={() => setChangePasswordVisible(false)}
        onSuccess={handlePasswordChangeSuccess}
      />
    </>
  );
};

export default UserProfile;
