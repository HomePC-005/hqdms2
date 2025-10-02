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
  Select,
  Alert,
  Spin,
  Divider,
  Button,
  List,
  Avatar,
  Badge,
  Modal,
  Table,
  Form,
  Input,
  DatePicker,
  Switch,
  InputNumber,
  message,
  Popconfirm
} from 'antd';
import { 
  MedicineBoxOutlined, 
  UserOutlined, 
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  TeamOutlined,
  FileTextOutlined,
  BankOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { departmentsAPI, drugsAPI, enrollmentsAPI, patientsAPI } from '../services/api';
import CustomDateInput from '../components/CustomDateInput';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const SummaryPage = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [drugSearchText, setDrugSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDrugs: 0,
    totalPatients: 0,
    defaultedPatients: 0,
    monthlyExpenditure: 0,
    activeDrugs: 0,
    recentRefills: 0,
    totalQuota: 0,
    quotaUtilization: 0
  });
  const [drugDetailsModalVisible, setDrugDetailsModalVisible] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [drugEnrollments, setDrugEnrollments] = useState([]);
  const [inactiveEnrollments, setInactiveEnrollments] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDepartment !== 'all') {
      fetchDrugsByDepartment(selectedDepartment);
    } else {
      fetchAllDrugs();
    }
  }, [selectedDepartment]);

  const handleRefresh = async () => {
    // Clear all filters and search
    setDrugSearchText('');
    setSelectedDepartment('all');
    // Then fetch data
    await fetchData();
  };

  const fetchData = async () => {
    try {
      const [deptResponse, drugsResponse, enrollmentsResponse] = await Promise.all([
        departmentsAPI.getAll(),
        drugsAPI.getAll(),
        enrollmentsAPI.getAll({ active_only: 'true' })
      ]);
      
      setDepartments(deptResponse.data);
      setDrugs(drugsResponse.data);
      setEnrollments(enrollmentsResponse.data);
      
      // Calculate statistics
      const totalDrugs = drugsResponse.data.length;
      const totalPatients = enrollmentsResponse.data.length;
      const totalQuota = drugsResponse.data.reduce((sum, drug) => sum + (drug.quota_number || 0), 0);
      const quotaUtilization = totalQuota > 0 ? (totalPatients / totalQuota) * 100 : 0;
      const monthlyExpenditure = enrollmentsResponse.data.reduce((sum, enrollment) => {
        return sum + (enrollment.cost_per_year || 0) / 12;
      }, 0);
      
      // Count defaulters (patients with refill date > 6 months ago)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const defaultedPatients = enrollmentsResponse.data.filter(enrollment => {
        if (!enrollment.latest_refill_date || enrollment.spub) return false;
        return new Date(enrollment.latest_refill_date) < sixMonthsAgo;
      }).length;
      
      // Count recent refills (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const recentRefills = enrollmentsResponse.data.filter(enrollment => {
        if (!enrollment.latest_refill_date) return false;
        return new Date(enrollment.latest_refill_date) > yesterday;
      }).length;
      
      setStats({
        totalDrugs,
        totalPatients,
        defaultedPatients,
        monthlyExpenditure,
        activeDrugs: totalDrugs,
        recentRefills,
        totalQuota,
        quotaUtilization
      });
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrugsByDepartment = async (departmentId) => {
    try {
      const response = await drugsAPI.getAll();
      const filteredDrugs = response.data.filter(drug => drug.department_id === parseInt(departmentId));
      setDrugs(filteredDrugs);
    } catch (error) {
      console.error('Error fetching drugs by department:', error);
    }
  };

  const fetchAllDrugs = async () => {
    try {
      const response = await drugsAPI.getAll();
      setDrugs(response.data);
    } catch (error) {
      console.error('Error fetching all drugs:', error);
    }
  };

  const getUtilizationStatus = (activePatients, quota) => {
    const percentage = quota > 0 ? (activePatients / quota) * 100 : 0;
    
    if (percentage >= 100) return { status: 'FULL', color: '#ff4d4f', percentage: Math.round(percentage) };
    if (percentage >= 80) return { status: 'HIGH', color: '#faad14', percentage: Math.round(percentage) };
    if (percentage >= 50) return { status: 'MEDIUM', color: '#1890ff', percentage: Math.round(percentage) };
    return { status: 'LOW', color: '#52c41a', percentage: Math.round(percentage) };
  };

  const getQuotaColor = (activePatients, quota) => {
    const percentage = quota > 0 ? (activePatients / quota) * 100 : 0;
    
    if (percentage >= 100) return '#ff4d4f';
    if (percentage >= 80) return '#faad14';
    if (percentage >= 50) return '#1890ff';
    return '#52c41a';
  };

  const handleDrugClick = async (drug) => {
    setSelectedDrug(drug);
    setDrugDetailsModalVisible(true);
    
    try {
      // Fetch both active and inactive enrollments for this specific drug
      const [activeResponse, inactiveResponse] = await Promise.all([
        enrollmentsAPI.getAll({ 
          drug_id: drug.id, 
          active_only: 'true' 
        }),
        enrollmentsAPI.getAll({ 
          drug_id: drug.id, 
          active_only: 'false' 
        })
      ]);
      setDrugEnrollments(activeResponse.data);
      setInactiveEnrollments(inactiveResponse.data);
    } catch (error) {
      console.error('Error fetching drug enrollments:', error);
      message.error('Error loading drug details');
    }
  };

  const handleEditEnrollment = (enrollment) => {
    setEditingEnrollment(enrollment);
    form.setFieldsValue({
      ...enrollment,
      prescription_start_date: enrollment.prescription_start_date ? dayjs(enrollment.prescription_start_date) : null,
      prescription_end_date: enrollment.prescription_end_date ? dayjs(enrollment.prescription_end_date) : null,
      latest_refill_date: enrollment.latest_refill_date ? dayjs(enrollment.latest_refill_date) : null
    });
    setEditModalVisible(true);
  };

  const handleDeleteEnrollment = async (enrollmentId) => {
    try {
      await enrollmentsAPI.delete(enrollmentId);
      message.success('Enrollment deleted successfully');
      
      // Refresh both active and inactive enrollments
      const [activeResponse, inactiveResponse] = await Promise.all([
        enrollmentsAPI.getAll({ 
          drug_id: selectedDrug.id, 
          active_only: 'true' 
        }),
        enrollmentsAPI.getAll({ 
          drug_id: selectedDrug.id, 
          active_only: 'false' 
        })
      ]);
      setDrugEnrollments(activeResponse.data);
      setInactiveEnrollments(inactiveResponse.data);
      
      // Refresh main data
      await fetchData();
    } catch (error) {
      message.error('Error deleting enrollment');
      console.error('Error:', error);
    }
  };

  const handleUpdateEnrollment = async (values) => {
    try {
      const enrollmentData = {
        ...values,
        prescription_start_date: values.prescription_start_date?.format('YYYY-MM-DD'),
        prescription_end_date: values.prescription_end_date?.format('YYYY-MM-DD'),
        latest_refill_date: values.latest_refill_date?.format('YYYY-MM-DD')
      };

      await enrollmentsAPI.update(editingEnrollment.id, enrollmentData);
      message.success('Enrollment updated successfully');
      
      setEditModalVisible(false);
      
      // Refresh both active and inactive enrollments
      const [activeResponse, inactiveResponse] = await Promise.all([
        enrollmentsAPI.getAll({ 
          drug_id: selectedDrug.id, 
          active_only: 'true' 
        }),
        enrollmentsAPI.getAll({ 
          drug_id: selectedDrug.id, 
          active_only: 'false' 
        })
      ]);
      setDrugEnrollments(activeResponse.data);
      setInactiveEnrollments(inactiveResponse.data);
      
      // Refresh main data
      await fetchData();
    } catch (error) {
      message.error('Error updating enrollment');
      console.error('Error:', error);
    }
  };

  const calculateTotals = () => {
    return drugs.reduce((totals, drug) => {
      totals.totalQuota += drug.quota_number || 0;
      totals.totalActive += drug.current_active_patients || 0;
      totals.totalCost += (drug.current_active_patients || 0) * (drug.price || 0);
      return totals;
    }, { totalQuota: 0, totalActive: 0, totalCost: 0 });
  };

  const totals = calculateTotals();

  // Filter drugs based on search text
  const filteredDrugs = drugs.filter(drug => {
    if (!drugSearchText) return true;
    const searchLower = drugSearchText.toLowerCase();
    return drug.name.toLowerCase().includes(searchLower) || 
           drug.department_name?.toLowerCase().includes(searchLower);
  });

  // Generate recent activity data
  const recentActivity = [
    {
      id: 1,
      type: 'refill',
      title: 'Refill Updated',
      description: `${stats.recentRefills} refills processed today`,
      time: 'Just now',
      icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
    },
    {
      id: 2,
      type: 'defaulter',
      title: 'Defaulters Detected',
      description: `${stats.defaultedPatients} patients require attention`,
      time: 'Updated',
      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
    },
    {
      id: 3,
      type: 'enrollment',
      title: 'Active Enrollments',
      description: `${stats.totalPatients} patients currently enrolled`,
      time: 'Live',
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    },
    {
      id: 4,
      type: 'drug_added',
      title: 'Quota Drugs',
      description: `${stats.totalDrugs} drugs in the system`,
      time: 'Total',
      icon: <MedicineBoxOutlined style={{ color: '#722ed1' }} />,
    }
  ];

  const upcomingTasks = [
    'Review quarterly cost analysis report',
    'Update defaulter patient list',
    'Prepare monthly inventory summary',
    'Check quota utilization reports'
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '16px',
      '@media (min-width: 768px)': {
        padding: '24px'
      }
    }}>
      {/* Welcome Section */}
      <div style={{ marginBottom: '16px' }}>
        <Title level={2} style={{ fontSize: '20px', '@media (min-width: 768px)': { fontSize: '24px' } }}>
          Summary Dashboard
        </Title>
        <Text type="secondary" style={{ fontSize: '14px', '@media (min-width: 768px)': { fontSize: '16px' } }}>
          Summary of quota utilization and status for all drugs.
        </Text>
      </div>

      {/* Department Overview - Moved to top */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card title="Department Overview">
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col xs={24} sm={8}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Filter by Department"
                  value={selectedDepartment}
                  onChange={setSelectedDepartment}
                >
                  <Option value="all">All Departments</Option>
                  {departments.map(dept => (
                    <Option key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={8}>
                <Search
                  placeholder="Search drug name..."
                  value={drugSearchText}
                  onChange={(e) => setDrugSearchText(e.target.value)}
                  style={{ width: '100%' }}
                  prefix={<SearchOutlined />}
                />
              </Col>
              <Col xs={24} sm={1}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={loading}
                  style={{ width: '100%' }}
                >
                  
                </Button>
              </Col>
            </Row>

            {/* Search Results Info */}
            {drugSearchText && (
              <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
                Showing {filteredDrugs.length} of {drugs.length} drugs
                {drugSearchText && ` matching "${drugSearchText}"`}
              </div>
            )}

            {/* Drug Cards */}
            <Row gutter={[16, 16]}>
              {filteredDrugs.map(drug => {
                const utilization = getUtilizationStatus(drug.current_active_patients, drug.quota_number);
                const availableSlots = drug.quota_number - drug.current_active_patients;
                
                return (
                <Col xs={24} sm={24} md={12} lg={12} xl={12} key={drug.id}> {/* Adjusted grid for wider cards */}
                  <Card
                    hoverable
                    style={{
                      width: '100%',
                      borderLeft: `5px solid ${getQuotaColor(drug.current_active_patients, drug.quota_number)}`, // Emphasize status on the left
                      cursor: 'pointer'
                    }}
                    onClick={() => handleDrugClick(drug)}
                    bodyStyle={{ padding: '10px' }} // Slightly reduce padding
                  >
                    <Row align="middle" gutter={16}>
                      {/* ===== LEFT COLUMN: Drug Info ===== */}
                      <Col xs={16} sm={16} md={16} style={{ textAlign: 'left' }}>
                        <MedicineBoxOutlined
                          style={{
                            fontSize: '32px',
                            color: getQuotaColor(drug.current_active_patients, drug.quota_number),
                            marginBottom: '8px'
                          }}
                        />
                        <Title level={5} style={{ margin: 0, fontSize: '14px' }} ellipsis>
                          {drug.name}
                        </Title>
                        <Text type="secondary" style={{ fontSize: '12px' }} ellipsis>
                          {drug.department_name}
                        </Text>
                      </Col>

                      {/* ===== RIGHT COLUMN: Stats & Progress ===== */}
                      <Col xs={8} sm={8} md={8}>
                        {/* Statistics Row */}
                        <Row gutter={8}>
                          <Col span={12}>
                            <Statistic
                              title="Quota"
                              value={drug.quota_number}
                              valueStyle={{ fontSize: '16px' }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title="Active"
                              value={drug.current_active_patients}
                              valueStyle={{ fontSize: '16px' }}
                            />
                          </Col>
                        </Row>
                        
                        {/* Progress Bar */}
                        <div style={{ marginTop: '8px' }}>
                          <Progress
                            percent={utilization.percentage}
                            strokeColor={utilization.color}
                            size="small"
                            format={() => `${drug.current_active_patients}/${drug.quota_number}`}
                          />
                        </div>
                        
                        {/* Available Slots Tag */}
                        <div style={{ marginTop: '8px', textAlign: 'right' }}>
                          <Tag color={utilization.color} style={{ fontSize: '11px' }}>
                            {availableSlots} slots available
                          </Tag>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Key Statistics - Moved to bottom */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Drugs"
              value={stats.totalDrugs}
              prefix={<MedicineBoxOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress
              percent={100}
              size="small"
              status="active"
              showInfo={false}
              style={{ marginTop: '8px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {stats.activeDrugs} active drugs
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Patients"
              value={stats.totalPatients}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress
              percent={Math.round(stats.quotaUtilization)}
              size="small"
              status="active"
              showInfo={false}
              style={{ marginTop: '8px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {stats.totalQuota} total quota slots
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Defaulted Patients"
              value={stats.defaultedPatients}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Progress
              percent={stats.totalPatients > 0 ? Math.round((stats.defaultedPatients / stats.totalPatients) * 100) : 0}
              size="small"
              status="exception"
              showInfo={false}
              style={{ marginTop: '8px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Requires attention
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Monthly Cost"
              value={stats.monthlyExpenditure}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: '#722ed1' }}
              suffix="RM"
            />
            <Progress
              percent={75}
              size="small"
              status="active"
              showInfo={false}
              style={{ marginTop: '8px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Estimated monthly expenditure
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Main Content Row */}
      <Row gutter={[16, 16]}>
        {/* Recent Activity */}
        <Col xs={24} lg={16}>
          <Card
            title="Recent Activity"
            extra={
              <Button type="link" size="small" onClick={() => navigate('/enrollments')}>
                View All
              </Button>
            }
          >
            <List
              itemLayout="horizontal"
              dataSource={recentActivity}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={item.icon} />}
                    title={item.title}
                    description={item.description}
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {item.time}
                  </Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>

      </Row>



      {/* Alerts for Critical Status */}
      {drugs.some(drug => drug.current_active_patients >= drug.quota_number) && (
        <Alert
          message="Quota Full Alert"
          description="Some drugs have reached their quota limit. Consider reviewing patient lists or increasing quotas."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginTop: '24px' }}
        />
      )}

      {drugs.some(drug => drug.current_active_patients >= drug.quota_number * 0.8) && (
        <Alert
          message="High Utilization Alert"
          description="Some drugs are approaching their quota limit (80%+ utilization)."
          type="info"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginTop: '16px' }}
        />
      )}

      {/* System Status - Moved to lowest emphasis */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title="System Status" size="small">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Badge status="success" text="API Online" />
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Badge status="success" text="Database Connected" />
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">Quota Utilization: {Math.round(stats.quotaUtilization)}%</Text>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">Available Slots: {stats.totalQuota - stats.totalPatients}</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Drug Details Modal */}
      <Modal
        title={
          <Space>
            <MedicineBoxOutlined />
            {selectedDrug?.name} - Quota Details
          </Space>
        }
        open={drugDetailsModalVisible}
        onCancel={() => setDrugDetailsModalVisible(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: '1000px' }}
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
                    valueStyle={{ color: '#faad14' }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: '16px' }}>
                <Text strong>Department: </Text>
                <Text>{selectedDrug.department_name}</Text>
                <br />
                <Text strong>Price: </Text>
                <Text>RM {Number(selectedDrug.price).toFixed(2)} per unit</Text>
                <br />
                <Text strong>Calculation Method: </Text>
                <Text>{selectedDrug.calculation_method}</Text>
                {selectedDrug.remarks && (
                  <>
                    <br />
                    <Text strong>Remarks: </Text>
                    <Text>{selectedDrug.remarks}</Text>
                  </>
                )}
              </div>
            </Card>

            {/* Active Enrollments Table */}
            <Card title="Active Patient Enrollments" size="small">
              <Table
                dataSource={drugEnrollments}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                columns={[
                  {
                    title: 'Patient',
                    dataIndex: 'patient_name',
                    key: 'patient_name',
                    render: (text, record) => (
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{text}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {record.ic_number}
                        </Text>
                      </div>
                    ),
                  },
                  {
                    title: 'Dose/Day',
                    dataIndex: 'dose_per_day',
                    key: 'dose_per_day',
                    render: (value) => `${value} mg`,
                  },
                  {
                    title: 'Start Date',
                    dataIndex: 'prescription_start_date',
                    key: 'prescription_start_date',
                    render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
                  },
                  {
                    title: 'Last Refill',
                    dataIndex: 'latest_refill_date',
                    key: 'latest_refill_date',
                    render: (date) => {
                      if (!date) return <Tag color="orange">Never</Tag>;
                      const daysSince = dayjs().diff(dayjs(date), 'day');
                      if (daysSince > 180) return <Tag color="red">{dayjs(date).format('DD/MM/YYYY')}</Tag>;
                      if (daysSince > 90) return <Tag color="orange">{dayjs(date).format('DD/MM/YYYY')}</Tag>;
                      return <Tag color="green">{dayjs(date).format('DD/MM/YYYY')}</Tag>;
                    },
                  },
                  {
                    title: 'Status',
                    key: 'status',
                    render: (_, record) => (
                      <Space direction="vertical" size="small">
                        <Tag color={record.is_active ? 'green' : 'red'}>
                          {record.is_active ? 'Active' : 'Inactive'}
                        </Tag>
                        {record.spub && <Tag color="blue">SPUB</Tag>}
                      </Space>
                    ),
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, record) => (
                      <Space>
                        <Button
                          type="primary"
                          icon={<EditOutlined />}
                          size="small"
                          onClick={() => handleEditEnrollment(record)}
                        />
                        <Popconfirm
                          title="Are you sure you want to delete this enrollment?"
                          onConfirm={() => handleDeleteEnrollment(record.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button
                            type="primary"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                          />
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>

            {/* Inactive Enrollments Table */}
            <Card title="Inactive Patient Enrollments" size="small" style={{ marginTop: '16px' }}>
              <Table
                dataSource={inactiveEnrollments}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                columns={[
                  {
                    title: 'Patient',
                    dataIndex: 'patient_name',
                    key: 'patient_name',
                    render: (text, record) => (
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{text}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {record.ic_number}
                        </Text>
                      </div>
                    ),
                  },
                  {
                    title: 'Dose/Day',
                    dataIndex: 'dose_per_day',
                    key: 'dose_per_day',
                    render: (value) => `${value} mg`,
                  },
                  {
                    title: 'Start Date',
                    dataIndex: 'prescription_start_date',
                    key: 'prescription_start_date',
                    render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
                  },
                  {
                    title: 'Last Refill',
                    dataIndex: 'latest_refill_date',
                    key: 'latest_refill_date',
                    render: (date) => {
                      if (!date) return <Tag color="orange">Never</Tag>;
                      const daysSince = dayjs().diff(dayjs(date), 'day');
                      if (daysSince > 180) return <Tag color="red">{dayjs(date).format('DD/MM/YYYY')}</Tag>;
                      if (daysSince > 90) return <Tag color="orange">{dayjs(date).format('DD/MM/YYYY')}</Tag>;
                      return <Tag color="green">{dayjs(date).format('DD/MM/YYYY')}</Tag>;
                    },
                  },
                  {
                    title: 'Status',
                    key: 'status',
                    render: (_, record) => (
                      <Space direction="vertical" size="small">
                        <Tag color={record.is_active ? 'green' : 'red'}>
                          {record.is_active ? 'Active' : 'Inactive'}
                        </Tag>
                        {record.spub && <Tag color="blue">SPUB</Tag>}
                      </Space>
                    ),
                  },
                  {
                    title: 'Actions',
                    key: 'actions',
                    render: (_, record) => (
                      <Space>
                        <Button
                          type="primary"
                          icon={<EditOutlined />}
                          size="small"
                          onClick={() => handleEditEnrollment(record)}
                        />
                        <Popconfirm
                          title="Are you sure you want to delete this enrollment?"
                          onConfirm={() => handleDeleteEnrollment(record.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Button
                            type="primary"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                          />
                        </Popconfirm>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* Edit Enrollment Modal */}
      <Modal
        title="Edit Enrollment"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateEnrollment}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              name="dose_per_day"
              label="Dose per Day (mg)"
              rules={[{ required: true, message: 'Please enter dose per day' }]}
            >
              <InputNumber
                min={0.1}
                max={1000}
                step={0.1}
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="prescription_start_date"
              label="Start Date"
              rules={[{ required: true, message: 'Please select start date' }]}
            >
              <CustomDateInput style={{ width: '100%' }} placeholder="Select date or enter ddmmyy" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              name="prescription_end_date"
              label="End Date"
            >
              <CustomDateInput style={{ width: '100%' }} placeholder="Select date or enter ddmmyy" />
            </Form.Item>

            <Form.Item
              name="latest_refill_date"
              label="Latest Refill Date"
            >
              <CustomDateInput style={{ width: '100%' }} placeholder="Select date or enter ddmmyy" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              name="spub"
              label="SPUB (Sistem Pembekalan Ubat Bersepadu)"
              valuePropName="checked"
              tooltip="SPUB patients refill at other facilities but retain quota"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="is_active"
              label="Active Status"
              valuePropName="checked"
              tooltip="Inactive enrollments are not counted in quota"
            >
              <Switch />
            </Form.Item>
          </div>

          <Form.Item
            name="remarks"
            label="Remarks"
          >
            <Input.TextArea
              rows={3}
              placeholder="Additional notes about this enrollment..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update Enrollment
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SummaryPage;
