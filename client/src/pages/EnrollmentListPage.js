import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  InputNumber,
  message,
  Popconfirm,
  Space,
  Card,
  Typography,
  Divider,
  Tag,
  Tooltip,
  Row,
  Col,
  Alert,
  Dropdown
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  CalendarOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { enrollmentsAPI, patientsAPI, drugsAPI, departmentsAPI } from '../services/api';
import CustomDateInput from '../components/CustomDateInput';
import CostPerDayInput from '../components/CostPerDayInput';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const EnrollmentListPage = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDrug, setSelectedDrug] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [patientForm] = Form.useForm();
  const [refillModalVisible, setRefillModalVisible] = useState(false);
  const [refillForm] = Form.useForm();
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+Enter to submit form when modal is open
      if (modalVisible && event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        form.submit();
      }
      if (refillModalVisible && event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        refillForm.submit();
      }
      // Escape to close modals
      if (modalVisible && event.key === 'Escape') {
        setModalVisible(false);
      }
      if (showCreatePatient && event.key === 'Escape') {
        setShowCreatePatient(false);
      }
      if (refillModalVisible && event.key === 'Escape') {
        setRefillModalVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalVisible, showCreatePatient, refillModalVisible, form, refillForm]);

  // Auto-refresh when component becomes visible (user navigates to this page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const now = Date.now();
        // Only refresh if it's been more than 2 seconds since last fetch
        if (now - lastFetchTime > 2000) {
          console.log('Page became visible, refreshing enrollment data...');
          fetchData(); // Auto-refresh
        }
      }
    };

    const handleFocus = () => {
      const now = Date.now();
      // Only refresh if it's been more than 2 seconds since last fetch
      if (now - lastFetchTime > 2000) {
        console.log('Window focused, refreshing enrollment data...');
        fetchData(); // Auto-refresh
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [lastFetchTime]);

  // Scroll detection for floating button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowFloatingButton(scrollTop > 200); // Show floating button after scrolling 200px
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleRefresh = async () => {
    // Clear all filters and search
    setSearchText('');
    setSelectedDepartment('all');
    setSelectedDrug('all');
    setSelectedStatus('all');
    // Then fetch data
    await fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching enrollment data...');
      const [enrollmentsRes, patientsRes, drugsRes, departmentsRes] = await Promise.all([
        enrollmentsAPI.getAll(),
        patientsAPI.getAll(),
        drugsAPI.getAll(),
        departmentsAPI.getAll() 
      ]);
      
      console.log('Enrollments fetched:', enrollmentsRes.data.length);
      console.log('Sample enrollment:', enrollmentsRes.data[0]);
      
      setEnrollments(enrollmentsRes.data);
      setPatients(patientsRes.data);
      setDrugs(drugsRes.data);
      setDepartments(departmentsRes.data);
      
      // Update last fetch time
      setLastFetchTime(Date.now());
      
      // Notifications removed as requested
    } catch (error) {
      message.error('Error fetching data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingEnrollment(null);
    form.resetFields();
    form.setFieldsValue({
      prescription_start_date: dayjs(),
      spub: false,
      is_active: true
    });
    setModalVisible(true);
  };

  const handleEdit = (enrollment) => {
    setEditingEnrollment(enrollment);
    
    // Calculate duration if both start and end dates exist
    let duration = null;
    if (enrollment.prescription_start_date && enrollment.prescription_end_date) {
      const startDate = dayjs(enrollment.prescription_start_date);
      const endDate = dayjs(enrollment.prescription_end_date);
      duration = endDate.diff(startDate, 'day');
    }
    
    form.setFieldsValue({
      ...enrollment,
      prescription_start_date: enrollment.prescription_start_date ? dayjs(enrollment.prescription_start_date) : null,
      prescription_end_date: enrollment.prescription_end_date ? dayjs(enrollment.prescription_end_date) : null,
      latest_refill_date: enrollment.latest_refill_date ? dayjs(enrollment.latest_refill_date) : null,
      duration: duration
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await enrollmentsAPI.delete(id);
      message.success('Enrollment deleted successfully');
      fetchData(); // Refresh after delete
    } catch (error) {
      message.error('Error deleting enrollment');
      console.error('Error:', error);
    }
  };

  const handleRefillUpdate = async (values) => {
    try {
      const refillData = {
        latest_refill_date: values.refill_date?.format('YYYY-MM-DD')
      };
      
      await enrollmentsAPI.updateRefill(selectedEnrollment.id, refillData);
      message.success('Refill date updated successfully');
      setRefillModalVisible(false);
      refillForm.resetFields();
      fetchData(); // Refresh the data
    } catch (error) {
      message.error('Error updating refill date');
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const enrollmentData = {
        ...values,
        prescription_start_date: values.prescription_start_date?.format('YYYY-MM-DD'),
        prescription_end_date: values.prescription_end_date?.format('YYYY-MM-DD'),
        latest_refill_date: values.latest_refill_date?.format('YYYY-MM-DD')
      };

      if (editingEnrollment) {
        await enrollmentsAPI.update(editingEnrollment.id, enrollmentData);
        message.success('Enrollment updated successfully');
      } else {
        await enrollmentsAPI.create(enrollmentData);
        message.success('Enrollment created successfully');
      }

      setModalVisible(false);
      fetchData(); // Refresh after save
    } catch (error) {
      message.error('Error saving enrollment');
      console.error('Error:', error);
    }
  };


  // Add this new handler function to your component
const handleFormValuesChange = (changedValues, allValues) => {
  const formValues = form.getFieldsValue();

  // Logic for when duration or start date changes to update the end date
  if (changedValues.hasOwnProperty('duration') || changedValues.hasOwnProperty('prescription_start_date')) {
    const { duration, prescription_start_date } = formValues;
    if (duration && prescription_start_date) {
      const endDate = dayjs(prescription_start_date).add(duration, 'day');
      form.setFieldsValue({ prescription_end_date: endDate });
    }
  }

  // Logic for when end date changes to update the duration
  if (changedValues.hasOwnProperty('prescription_end_date')) {
    const { prescription_start_date, prescription_end_date } = formValues;
    if (prescription_start_date && prescription_end_date) {
      const duration = dayjs(prescription_end_date).diff(dayjs(prescription_start_date), 'day');
      // Ensure duration is not negative
      if (duration >= 0) {
        form.setFieldsValue({ duration: duration });
      }
    }
  }
};

  const handleRowClick = (record) => {
    setSelectedEnrollment(record);
    setActionModalVisible(true);
  };

  const handleCreatePatient = async (values) => {
    try {
      const response = await patientsAPI.create(values);
      message.success('Patient created successfully');
      
      // Refresh patients list
      const patientsResponse = await patientsAPI.getAll();
      setPatients(patientsResponse.data);
      
      // Set the newly created patient as selected
      form.setFieldsValue({ patient_id: response.data.id });
      
      // Close the create patient modal
      setShowCreatePatient(false);
      patientForm.resetFields();
      setPatientSearchText('');
    } catch (error) {
      message.error('Error creating patient');
      console.error('Error creating patient:', error);
    }
  };

  const filteredEnrollments = enrollments.filter(enrollment => {
    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = (
        enrollment.patient_name?.toLowerCase().includes(searchLower) ||
        enrollment.ic_number?.toLowerCase().includes(searchLower) ||
        enrollment.drug_name?.toLowerCase().includes(searchLower) ||
        enrollment.department_name?.toLowerCase().includes(searchLower)
      );
      if (!matchesSearch) return false;
    }

    // Department filter
    if (selectedDepartment !== 'all' && enrollment.department_id !== parseInt(selectedDepartment)) {
      return false;
    }

    // Drug filter
    if (selectedDrug !== 'all' && enrollment.drug_id !== parseInt(selectedDrug)) {
      return false;
    }

    // Status filter
    if (selectedStatus === 'active' && !enrollment.is_active) return false;
    if (selectedStatus === 'potential_defaulter') {
      if (!enrollment.is_active) return false; // Only active enrollments can be potential defaulters
      if (enrollment.spub) return false; // SPUB patients are not considered defaulters
      if (!enrollment.latest_refill_date) return false; // Must have a refill date
      const daysSinceRefill = dayjs().diff(dayjs(enrollment.latest_refill_date), 'day');
      if (daysSinceRefill <= 180) return false; // Not a potential defaulter if refilled within 6 months
    }

    return true;
  });

  const columns = [
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
      sorter: (a, b) => a.patient_name.localeCompare(b.patient_name),
    },
    {
      title: 'Drug',
      dataIndex: 'drug_name',
      key: 'drug_name',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.department_name}
          </Text>
        </div>
      ),
      sorter: (a, b) => a.drug_name.localeCompare(b.drug_name),
    },
    {
      title: 'Dose',
      dataIndex: 'dose_per_day',
      key: 'dose_per_day',
      render: (value) => value || '-',
      sorter: (a, b) => (a.dose_per_day || '').localeCompare(b.dose_per_day || ''),
    },
    {
      title: 'Cost/Day',
      dataIndex: 'cost_per_day',
      key: 'cost_per_day',
      render: (value) => value ? `RM ${parseFloat(value).toFixed(2)}` : '-',
      sorter: (a, b) => (a.cost_per_day || 0) - (b.cost_per_day || 0),
    },
    {
      title: 'Start Date',
      dataIndex: 'prescription_start_date',
      key: 'prescription_start_date',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
      sorter: (a, b) => new Date(a.prescription_start_date) - new Date(b.prescription_start_date),
    },
    {
      title: 'End Date',
      dataIndex: 'prescription_end_date',
      key: 'prescription_end_date',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
      sorter: (a, b) => new Date(a.prescription_end_date) - new Date(b.prescription_end_date),
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
      sorter: (a, b) => new Date(a.latest_refill_date || 0) - new Date(b.latest_refill_date || 0),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const isPotentialDefaulter = record.is_active && 
          !record.spub && 
          record.latest_refill_date && 
          dayjs().diff(dayjs(record.latest_refill_date), 'day') > 180;
        
        return (
          <Space direction="vertical" size="small">
            <Tag color={record.is_active ? 'green' : 'red'}>
              {record.is_active ? 'Active' : 'Inactive'}
            </Tag>
            {record.spub && <Tag color="blue">SPUB</Tag>}
            {isPotentialDefaulter && (
              <Tag color="orange">Potential Defaulter</Tag>
            )}
          </Space>
        );
      },
      filters: [
        { text: 'Active', value: true },
        { text: 'Inactive', value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
    },
  ];

  return (
    <div style={{ 
      padding: '16px',
      '@media (min-width: 768px)': {
        padding: '24px'
      }
    }}>
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Title level={2} style={{ fontSize: '20px', '@media (min-width: 768px)': { fontSize: '24px' } }}>
            Enrollment Management
          </Title>
          <Text type="secondary" style={{ fontSize: '14px', '@media (min-width: 768px)': { fontSize: '16px' } }}>
            Manage patient enrollments to quota drugs. Track prescriptions, refill dates, and patient status.
          </Text>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} justify="space-between" align="middle">
            <Col xs={24} sm={16} md={12}>
              <Input
                placeholder="Search enrollments..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-bar search-bar-md"
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
                size="small"
              />

            </Col>
            <Col xs={24} sm={8} md={12} style={{ textAlign: 'right' }}>
              <Space wrap>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={loading}
                  type="default"
                  size="small"
                  className="btn-md"
                >
                  
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                  className="btn-primary btn-md"
                >
                  Add Enrollment
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Filter Dropdowns */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Filter by Department"
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                size="medium"
              >
                <Option value="all">All Departments</Option>
                {departments.map(dept => (
                  <Option key={dept.id} value={dept.id}>
                    {dept.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Filter by Drug"
                value={selectedDrug}
                onChange={setSelectedDrug}
                size="medium"
                showSearch
                filterOption={(input, option) => {
                  if (option.value === 'all') return true;
                  const drug = drugs.find(d => d.id.toString() === option.value);
                  if (drug) {
                    const searchText = `${drug.name} ${drug.department_name || ''}`.toLowerCase();
                    return searchText.indexOf(input.toLowerCase()) >= 0;
                  }
                  return false;
                }}
              >
                <Option value="all">All Drugs</Option>
                {drugs
                  .filter(drug => selectedDepartment === 'all' || drug.department_id === parseInt(selectedDepartment))
                  .map(drug => (
                    <Option key={drug.id} value={drug.id.toString()}>
                      {drug.name} ({drug.department_name})
                    </Option>
                  ))}
              </Select>
            </Col>
            <Col xs={24} sm={8}>
              <Select
                style={{ width: '100%' }}
                placeholder="Filter by Status"
                value={selectedStatus}
                onChange={setSelectedStatus}
                size="medium"
              >
                <Option value="all">All Enrollments</Option>
                <Option value="active">Active</Option>
                <Option value="potential_defaulter">Potential Defaulter</Option>
              </Select>
            </Col>
          </Row>
        </div>



        <Table
          columns={columns}
          dataSource={filteredEnrollments}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' }
          })}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} enrollments`,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
            showLessItems: false
          }}
          scroll={{ x: 1200 }}
        />

        <Modal
          title={editingEnrollment ? 'Edit Enrollment' : 'Add New Enrollment'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={700}
          centered
          destroyOnClose
          afterOpenChange={(open) => {
            if (open) {
              // Auto-focus on patient select when modal opens
              setTimeout(() => {
                const patientSelect = document.querySelector('.ant-select-selector');
                if (patientSelect) {
                  patientSelect.focus();
                }
              }, 100);
            }
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            onValuesChange={handleFormValuesChange}
            size="small"
          >
            {/* Row 1: Patient and Drug Selection */}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="patient_id"
                  label="Patient"
                  rules={[{ required: true, message: 'Please select a patient' }]}
                  style={{ marginBottom: '12px' }}
                >
                  <Select
                    placeholder="Search patient..."
                    showSearch
                    value={patientSearchText ? undefined : form.getFieldValue('patient_id')}
                    onSearch={(value) => setPatientSearchText(value)}
                    filterOption={(input, option) => {
                      if (option.value === 'create_new') return true;
                      const patient = patients.find(p => p.id === option.value);
                      if (patient) {
                        const searchText = `${patient.name} ${patient.ic_number}`.toLowerCase();
                        return searchText.indexOf(input.toLowerCase()) >= 0;
                      }
                      return false;
                    }}
                    notFoundContent={
                      patientSearchText ? (
                        <div style={{ textAlign: 'center', padding: '8px' }}>
                          <div style={{ marginBottom: '8px', fontSize: '12px' }}>No patient found</div>
                          <Button 
                            type="primary" 
                            size="small"
                            onClick={() => setShowCreatePatient(true)}
                          >
                            Create New Patient
                          </Button>
                        </div>
                      ) : null
                    }
                  >
                    {patients.map(patient => (
                      <Option key={patient.id} value={patient.id}>
                        {patient.name} ({patient.ic_number})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="drug_id"
                  label="Drug"
                  rules={[{ required: true, message: 'Please select a drug' }]}
                  style={{ marginBottom: '12px' }}
                >
                  <Select
                    placeholder="Search drug..."
                    showSearch
                    filterOption={(input, option) => {
                      const drug = drugs.find(d => d.id === option.value);
                      if (drug) {
                        const searchText = `${drug.name} ${drug.department_name || ''}`.toLowerCase();
                        return searchText.indexOf(input.toLowerCase()) >= 0;
                      }
                      return false;
                    }}
                  >
                    {drugs.map(drug => (
                      <Option key={drug.id} value={drug.id}>
                        {drug.name} ({drug.department_name})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Row 2: Dose, Duration, Start Date */}
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item
                  name="dose_per_day"
                  label="Dose"
                  style={{ marginBottom: '12px' }}
                >
                  <Input
                    style={{ width: '100%' }}
                    placeholder="e.g. 10 mg tds"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="duration"
                  label="Duration (days)"
                  tooltip="Auto-calculates end date"
                  style={{ marginBottom: '12px' }}
                >
                  <InputNumber
                    min={1}
                    max={3650}
                    style={{ width: '100%' }}
                    placeholder="e.g. 30"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="prescription_start_date"
                  label="Start Date"
                  rules={[{ required: true, message: 'Required' }]}
                  style={{ marginBottom: '12px' }}
                >
                <CustomDateInput
                  style={{ width: '100%' }}
                  placeholder="Enter ddmmyy or select date"
                />
                </Form.Item>
              </Col>
            </Row>

            {/* Row 3: End Date, Refill Date, Switches */}
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item
                  name="prescription_end_date"
                  label="End Date"
                  tooltip="PS End Date or TCA Klinik Pakar"
                  style={{ marginBottom: '12px' }}
                >
                  <CustomDateInput
                    style={{ width: '100%' }}
                    placeholder="Enter ddmmyy or select date"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="latest_refill_date"
                  label="Last Refill"
                  style={{ marginBottom: '12px' }}
                >
                  <CustomDateInput
                    style={{ width: '100%' }}
                    placeholder="enter ddmmyy"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                  <Form.Item
                    name="spub"
                    label="SPUB"
                    valuePropName="checked"
                    tooltip="Refills at other facilities"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch size="small" />
                  </Form.Item>
                  <Form.Item
                    name="is_active"
                    label="Active"
                    valuePropName="checked"
                    tooltip="Counts toward quota"
                    style={{ marginBottom: 0 }}
                  >
                    <Switch size="small" defaultChecked />
                  </Form.Item>
                </div>
              </Col>
            </Row>

            {/* Row 4: Cost per day and Remarks */}
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item
                  name="cost_per_day"
                  label="Cost per Day"
                tooltip={(() => {
                  const selectedDrug = drugs.find(d => d.id === form.getFieldValue('drug_id'));
                  if (selectedDrug) {
                    return `Drug: ${selectedDrug.name}\nPrice: RM ${parseFloat(selectedDrug.price).toFixed(2)}`;
                  }
                  return "Enter the daily cost for this enrollment.";
                })()}
                  style={{ marginBottom: '16px' }}
                >
                  <CostPerDayInput
                    drugInfo={drugs.find(d => d.id === form.getFieldValue('drug_id'))}
                    placeholder="e.g. 5.50 or 0.5*2*3"
                  />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item
                  name="remarks"
                  label="Remarks"
                  style={{ marginBottom: '16px' }}
                >
                  <Input.TextArea
                    rows={2}
                    placeholder="Started by Dr Aaron s/t Dr Johan Siow, SPUB to KK Kuala Nerus"
                    style={{ resize: 'none' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Row 5: Action Buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingTop: '8px',
              borderTop: '1px solid #f0f0f0'
            }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Press <kbd style={{ 
                  background: '#f5f5f5', 
                  padding: '2px 4px', 
                  borderRadius: '3px',
                  fontSize: '11px'
                }}>Ctrl+Enter</kbd> to save
              </div>
              <Space>
                <Button onClick={() => setModalVisible(false)}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingEnrollment ? 'Update' : 'Create'} Enrollment
                </Button>
              </Space>
            </div>
          </Form>
        </Modal>

        {/* Action Modal */}
        <Modal
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>Enrollment Actions</span>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'edit',
                      label: 'Edit Enrollment',
                      icon: <EditOutlined />,
                      onClick: () => {
                        setActionModalVisible(false);
                        handleEdit(selectedEnrollment);
                      }
                    },
                    {
                      key: 'delete',
                      label: 'Delete Enrollment',
                      icon: <DeleteOutlined />,
                      danger: true,
                      onClick: () => {
                        setActionModalVisible(false);
                        handleDelete(selectedEnrollment.id);
                      }
                    }
                  ]
                }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Tooltip title="More Actions">
                  <Button
                    type="text"
                    icon={<MoreOutlined />}
                    style={{
                      height: '32px',
                      width: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      boxShadow: 'none'
                    }}
                  />
                </Tooltip>
              </Dropdown>
            </div>
          }
          open={actionModalVisible}
          onCancel={() => setActionModalVisible(false)}
          footer={null}
          width={600}
          closable={false}
        >
          {selectedEnrollment && (
            <div>
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f5f5f5', borderRadius: '6px' }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Patient:</strong> 
                    <span>{selectedEnrollment.patient_name} ({selectedEnrollment.ic_number})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Drug:</strong> 
                    <span>{selectedEnrollment.drug_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Department:</strong> 
                    <span>{selectedEnrollment.department_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Dose:</strong> 
                    <span>{selectedEnrollment.dose_per_day || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Cost per Day:</strong> 
                    <span>{selectedEnrollment.cost_per_day ? `RM ${parseFloat(selectedEnrollment.cost_per_day).toFixed(2)}` : '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Status:</strong> 
                    <Space direction="vertical" size="small">
                      <Tag color={selectedEnrollment.is_active ? 'green' : 'red'}>
                        {selectedEnrollment.is_active ? 'Active' : 'Inactive'}
                      </Tag>
                      {selectedEnrollment.spub && <Tag color="blue">SPUB</Tag>}
                      {selectedEnrollment.is_active && 
                        !selectedEnrollment.spub && 
                        selectedEnrollment.latest_refill_date && 
                        dayjs().diff(dayjs(selectedEnrollment.latest_refill_date), 'day') > 180 && (
                        <Tag color="orange">Potential Defaulter</Tag>
                      )}
                    </Space>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Last Refill:</strong> 
                    <span>{selectedEnrollment.latest_refill_date ? dayjs(selectedEnrollment.latest_refill_date).format('DD/MM/YYYY') : 'Never'}</span>
                  </div>
                  {selectedEnrollment.latest_refill_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>Days Since Refill:</strong> 
                      <span style={{ 
                        color: dayjs().diff(dayjs(selectedEnrollment.latest_refill_date), 'day') > 180 ? '#ff4d4f' : '#52c41a',
                        fontWeight: 'bold'
                      }}>
                        {dayjs().diff(dayjs(selectedEnrollment.latest_refill_date), 'day')} days
                      </span>
                    </div>
                  )}
                </Space>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                {/* Update Refill Date - Prominent Button */}
                <Button
                  type="primary"
                  icon={<CalendarOutlined />}
                  onClick={() => {
                    setActionModalVisible(false);
                    setRefillModalVisible(true);
                    refillForm.setFieldsValue({
                      refill_date: dayjs()
                    });
                  }}
                  style={{
                    height: '40px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    padding: '0 24px'
                  }}
                >
                  Update Refill Date
                </Button>
              </div>
            </div>
        )}
      </Modal>

      {/* Refill Update Modal */}
      <Modal
        title="Update Refill Date"
        open={refillModalVisible}
        onCancel={() => {
          setRefillModalVisible(false);
          refillForm.resetFields();
        }}
        footer={null}
        width={400}
        centered
        destroyOnClose
      >
        {selectedEnrollment && (
          <div>
            <div style={{ marginBottom: '16px', padding: '12px', background: '#f0f8ff', borderRadius: '6px' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div><strong>Patient:</strong> {selectedEnrollment.patient_name}</div>
                <div><strong>Drug:</strong> {selectedEnrollment.drug_name}</div>
                <div><strong>Last Refill Date:</strong> {selectedEnrollment.latest_refill_date ? dayjs(selectedEnrollment.latest_refill_date).format('DD/MM/YYYY') : 'Never'}</div>
              </Space>
            </div>
            
            <Form
              form={refillForm}
              layout="vertical"
              onFinish={handleRefillUpdate}
              size="small"
            >
              <Form.Item
                name="refill_date"
                label="New Refill Date"
                rules={[{ required: true, message: 'Please select a refill date' }]}
                style={{ marginBottom: '20px' }}
              >
                <CustomDateInput
                  style={{ width: '100%' }}
                  placeholder="Select refill date or enter ddmmyy"
                  autoFocus
                />
              </Form.Item>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: '8px',
                borderTop: '1px solid #f0f0f0'
              }}>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Press <kbd style={{ 
                    background: '#f5f5f5', 
                    padding: '2px 4px', 
                    borderRadius: '3px',
                    fontSize: '11px'
                  }}>Enter</kbd> to update
                </div>
                <Space>
                  <Button onClick={() => {
                    setRefillModalVisible(false);
                    refillForm.resetFields();
                  }}>
                    Cancel
                  </Button>
                  <Button type="primary" htmlType="submit">
                    Update Refill Date
                  </Button>
                </Space>
              </div>
            </Form>
          </div>
        )}
      </Modal>

      {/* Create Patient Modal */}
      <Modal
        title="Create New Patient"
        open={showCreatePatient}
        onCancel={() => {
          setShowCreatePatient(false);
          patientForm.resetFields();
          setPatientSearchText('');
        }}
        footer={null}
        width={400}
        centered
        destroyOnClose
        afterOpenChange={(open) => {
          if (open) {
            setTimeout(() => {
              const nameInput = document.querySelector('input[placeholder="Enter patient name"]');
              if (nameInput) {
                nameInput.focus();
              }
            }, 100);
          }
        }}
      >
        <Form
          form={patientForm}
          layout="vertical"
          onFinish={handleCreatePatient}
          size="small"
        >
          <Form.Item
            name="name"
            label="Patient Name"
            rules={[{ required: true, message: 'Please enter patient name' }]}
            normalize={(value) => value ? value.toUpperCase() : value}
            style={{ marginBottom: '16px' }}
          >
            <Input 
              placeholder="Enter patient name" 
              autoFocus
              onPressEnter={() => {
                const icInput = document.querySelector('input[placeholder="Enter IC number, passport, or other identifier"]');
                if (icInput) icInput.focus();
              }}
            />
          </Form.Item>

          <Form.Item
            name="ic_number"
            label="IC Number / Passport / Other ID"
            rules={[{ required: true, message: 'Please enter patient identifier' }]}
            style={{ marginBottom: '20px' }}
          >
            <Input 
              placeholder="Enter IC number, passport, or other identifier"
              onPressEnter={() => patientForm.submit()}
            />
          </Form.Item>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingTop: '8px',
            borderTop: '1px solid #f0f0f0'
          }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Press <kbd style={{ 
                background: '#f5f5f5', 
                padding: '2px 4px', 
                borderRadius: '3px',
                fontSize: '11px'
              }}>Enter</kbd> to create
            </div>
            <Space>
              <Button onClick={() => {
                setShowCreatePatient(false);
                patientForm.resetFields();
                setPatientSearchText('');
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Patient
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Floating Add Button */}
      {showFloatingButton && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            animation: 'fadeInUp 0.3s ease-out'
          }}
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            className="btn-primary"
            style={{
              height: '56px',
              width: '56px',
              borderRadius: '50%',
              fontSize: '20px',
              fontWeight: 'bold',
              boxShadow: '0 6px 16px rgba(24, 144, 255, 0.4)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.transition = 'transform 0.2s ease';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      </Card>
    </div>
  );
};

export default EnrollmentListPage;
