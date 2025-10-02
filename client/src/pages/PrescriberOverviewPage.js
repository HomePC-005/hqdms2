import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  Progress,
  Tag,
  Space,
  Alert,
  Spin,
  Modal,
  Table,
  List,
  Avatar,
  Input
} from 'antd';
import {
  MedicineBoxOutlined,
  UserOutlined,
  BankOutlined,
  ExclamationCircleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { drugsAPI, enrollmentsAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const PrescriberOverviewPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [drugModalVisible, setDrugModalVisible] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [drugEnrollments, setDrugEnrollments] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [drugsResponse, enrollmentsResponse] = await Promise.all([
        drugsAPI.getAll(),
        enrollmentsAPI.getAll()
      ]);

      const drugs = drugsResponse.data;
      const enrollments = enrollmentsResponse.data;

      // Group drugs by department
      const departmentMap = {};
      drugs.forEach(drug => {
        if (!departmentMap[drug.department_id]) {
          departmentMap[drug.department_id] = {
            id: drug.department_id,
            name: drug.department_name,
            drugs: [],
            totalQuota: 0,
            totalActivePatients: 0
          };
        }
        departmentMap[drug.department_id].drugs.push(drug);
        departmentMap[drug.department_id].totalQuota += drug.quota_number || 0;
        departmentMap[drug.department_id].totalActivePatients += drug.current_active_patients || 0;
      });

      const departmentList = Object.values(departmentMap);
      setDepartments(departmentList);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuotaColor = (utilization) => {
    if (utilization >= 90) return '#ff4d4f';
    if (utilization >= 75) return '#faad14';
    return '#52c41a';
  };

  const getDrugQuotaColor = (active, quota) => {
    const utilization = quota > 0 ? (active / quota) * 100 : 0;
    if (utilization >= 90) return '#ff4d4f';
    if (utilization >= 75) return '#faad14';
    return '#52c41a';
  };

  // Filter departments and drugs based on search text
  const filteredDepartments = departments.filter(dept => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    
    // Check if department name matches
    if (dept.name.toLowerCase().includes(searchLower)) return true;
    
    // Check if any drug in this department matches
    return dept.drugs.some(drug => 
      drug.name.toLowerCase().includes(searchLower)
    );
  }).map(dept => ({
    ...dept,
    drugs: searchText ? dept.drugs.filter(drug => 
      drug.name.toLowerCase().includes(searchText.toLowerCase())
    ) : dept.drugs
  })).filter(dept => dept.drugs.length > 0 || !searchText);

  const handleDrugClick = async (drug) => {
    try {
      setSelectedDrug(drug);
      setDrugModalVisible(true);
      
      // Fetch enrollments for this drug
      const response = await enrollmentsAPI.getAll({
        drug_id: drug.id,
        active_only: 'true'
      });
      setDrugEnrollments(response.data);
    } catch (error) {
      console.error('Error fetching drug enrollments:', error);
      setDrugEnrollments([]);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f5f5f5'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ 
        background: '#fff', 
        padding: '24px', 
        borderRadius: '8px', 
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <Title level={2} style={{ margin: 0, textAlign: 'center', color: '#1890ff' }}>
          <BankOutlined style={{ marginRight: '8px' }} />
          Department Overview - Prescriber Access
        </Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: '8px' }}>
          Read-only access to quota drug utilization by department
        </Text>
      </div>

      {/* Search Bar */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Text strong style={{ fontSize: '16px' }}>Quick Search</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Search for departments or drugs to quickly find quota information
          </Text>
        </div>
        <Input
          placeholder="Search departments or drugs..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="large"
          className="search-bar search-bar-lg"
        />
        {searchText && (
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
            Showing {filteredDepartments.length} department(s) with matching results
          </div>
        )}
      </Card>

      {/* Department Overview */}
      <Title level={3}>Department Overview</Title>
      
      <Row gutter={[16, 16]}>
        {filteredDepartments.map(department => (
          <Col xs={24} lg={12} xl={8} key={department.id}>
            <Card
              title={
                <Space>
                  <BankOutlined />
                  {department.name}
                </Space>
              }
              style={{ height: '100%' }}
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Number of Drugs:</Text>
                  <Text strong style={{ color: '#1890ff' }}>{department.drugs.length}</Text>
                </div>
              </Space>

              <div style={{ marginTop: '16px' }}>
                <Text strong>Quota Drugs ({department.drugs.length}):</Text>
                <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {department.drugs.map(drug => (
                    <div 
                      key={drug.id} 
                      onClick={() => handleDrugClick(drug)}
                      className="drug-card-hover"
                      style={{ 
                        padding: '8px', 
                        margin: '4px 0', 
                        background: '#f5f5f5', 
                        borderRadius: '4px',
                        border: '1px solid #d9d9d9',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: '12px' }}>{drug.name}</Text>
                        <Tag color={getDrugQuotaColor(drug.current_active_patients, drug.quota_number)}>
                          {drug.current_active_patients}/{drug.quota_number}
                        </Tag>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <Progress
                          percent={drug.quota_number > 0 ? Math.round((drug.current_active_patients / drug.quota_number) * 100) : 0}
                          strokeColor={getDrugQuotaColor(drug.current_active_patients, drug.quota_number)}
                          size="small"
                          showInfo={false}
                        />
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        Quota: {drug.quota_number} | Active: {drug.current_active_patients} | 
                        Available: {drug.quota_number - drug.current_active_patients}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* No Results Message */}
      {searchText && filteredDepartments.length === 0 && (
        <Card style={{ textAlign: 'center', marginTop: '16px' }}>
          <div style={{ padding: '32px' }}>
            <SearchOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Title level={4} type="secondary">No Results Found</Title>
            <Text type="secondary">
              No departments or drugs match your search for "{searchText}"
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Try searching for a different term or clear the search to see all departments
            </Text>
          </div>
        </Card>
      )}

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '32px', 
        padding: '16px',
        color: '#666',
        fontSize: '12px'
      }}>
        <Alert
          message="Prescriber Access - Read Only"
          description="This view provides read-only access to quota drug utilization. For data modifications, please contact the pharmacy department."
          type="info"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: '16px' }}
        />
        <Alert
          message="Security Notice"
          description="This page has restricted access with no navigation menu to prevent unauthorized modifications to the system."
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        <Text type="secondary">
          Hospital Quota Drug Management System - Prescriber Dashboard
        </Text>
      </div>

      {/* Drug Details Modal */}
      <Modal
        title={
          <Space>
            <MedicineBoxOutlined />
            {selectedDrug?.name} - Drug Details
          </Space>
        }
        open={drugModalVisible}
        onCancel={() => setDrugModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedDrug && (
          <div>
            {/* Drug Information */}
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Total Quota"
                    value={selectedDrug.quota_number}
                    prefix={<MedicineBoxOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Active Patients"
                    value={selectedDrug.current_active_patients}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic
                    title="Available Slots"
                    value={selectedDrug.quota_number - selectedDrug.current_active_patients}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>
              
              <div style={{ marginTop: '16px' }}>
                <Text strong>Quota Utilization: </Text>
                <Progress
                  percent={selectedDrug.quota_number > 0 ? Math.round((selectedDrug.current_active_patients / selectedDrug.quota_number) * 100) : 0}
                  strokeColor={getDrugQuotaColor(selectedDrug.current_active_patients, selectedDrug.quota_number)}
                  format={(percent) => `${percent}%`}
                />
              </div>
            </Card>

            {/* Active Patients List */}
            <Card title="Active Patients" size="small">
              {drugEnrollments.length > 0 ? (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {drugEnrollments.map((enrollment, index) => (
                    <div 
                      key={enrollment.id} 
                      style={{ 
                        padding: '8px 12px', 
                        borderBottom: index < drugEnrollments.length - 1 ? '1px solid #f0f0f0' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Space>
                        <UserOutlined style={{ color: '#1890ff' }} />
                        <Text>{enrollment.patient_name}</Text>
                      </Space>
                      {enrollment.spub && <Tag color="blue" size="small">SPUB</Tag>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  No active patients enrolled for this drug
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PrescriberOverviewPage;
