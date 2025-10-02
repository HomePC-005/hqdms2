import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Typography, 
  Space, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  message, 
  Popconfirm,
  Tag,
  Tooltip,
  Row,
  Col,
  Statistic,
  Divider,
  DatePicker,
  Switch
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  MedicineBoxOutlined,
  DollarOutlined,
  UserOutlined,
  UserAddOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { drugsAPI, departmentsAPI, patientsAPI, enrollmentsAPI } from '../services/api';
import CustomDateInput from '../components/CustomDateInput';
import CostPerDayInput from '../components/CostPerDayInput';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const DrugListPage = () => {
  const [drugs, setDrugs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDrug, setEditingDrug] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [deptForm] = Form.useForm();
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [enrollForm] = Form.useForm();
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [duration, setDuration] = useState(0);
  const [drugDetailsModalVisible, setDrugDetailsModalVisible] = useState(false);
  const [drugEnrollments, setDrugEnrollments] = useState([]);
  const [inactiveEnrollments, setInactiveEnrollments] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [editForm] = Form.useForm();
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [patientForm] = Form.useForm();
  const [filteredDrugs, setFilteredDrugs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    // Clear all filters and search
    setSearchText('');
    setSelectedDepartment('all');
    // Then fetch data
    await fetchData();
  };

  // Update filtered drugs when drugs, searchText, or selectedDepartment changes
  useEffect(() => {
    const filtered = drugs.filter(drug => {
      // Text search filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesSearch = (
          drug.name?.toLowerCase().includes(searchLower) ||
          drug.department_name?.toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return false;
      }
      
      // Department filter
      if (selectedDepartment !== 'all') {
        return drug.department_id === selectedDepartment;
      }
      
      return true;
    });
    setFilteredDrugs(filtered);
  }, [drugs, searchText, selectedDepartment]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+Enter to submit forms when modals are open
      if (enrollModalVisible && event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        enrollForm.submit();
      }
      if (editModalVisible && event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        editForm.submit();
      }
      // Escape to close modals
      if (enrollModalVisible && event.key === 'Escape') {
        setEnrollModalVisible(false);
      }
      if (editModalVisible && event.key === 'Escape') {
        setEditModalVisible(false);
      }
      if (showCreatePatient && event.key === 'Escape') {
        setShowCreatePatient(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enrollModalVisible, editModalVisible, showCreatePatient, enrollForm, editForm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [drugsResponse, deptResponse, patientsResponse] = await Promise.all([
        drugsAPI.getAll(),
        departmentsAPI.getAll(),
        patientsAPI.getAll()
      ]);
      setDrugs(drugsResponse.data);
      setDepartments(deptResponse.data);
      setPatients(patientsResponse.data);
    } catch (error) {
      message.error('Error fetching data');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDrug(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (drug) => {
    setEditingDrug(drug);
    form.setFieldsValue(drug);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await drugsAPI.delete(id);
      message.success('Drug deleted successfully');
      fetchData();
    } catch (error) {
      message.error('Error deleting drug');
      console.error('Delete error:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingDrug) {
        await drugsAPI.update(editingDrug.id, values);
        message.success('Drug updated successfully');
      } else {
        await drugsAPI.create(values);
        message.success('Drug created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error(editingDrug ? 'Error updating drug' : 'Error creating drug');
      console.error('Submit error:', error);
    }
  };

  const handleCreateDepartment = async (values) => {
    try {
      const response = await departmentsAPI.create(values);
      setDepartments(prev => [...prev, response.data]);
      setDeptModalVisible(false);
      deptForm.resetFields();
      message.success('Department created successfully');
      
      // Auto-select the new department in the drug form
      form.setFieldsValue({ department_id: response.data.id });
    } catch (error) {
      message.error('Error creating department');
      console.error('Department creation error:', error);
    }
  };

  const handleEnrollPatient = (drug) => {
    setSelectedDrug(drug);
    enrollForm.resetFields();
    enrollForm.setFieldsValue({
      drug_id: drug.id,
      prescription_start_date: dayjs()
    });
    setEnrollModalVisible(true);
  };

  const handleDurationChange = (value) => {
    setDuration(value);
    const startDate = enrollForm.getFieldValue('prescription_start_date');
    if (startDate && value) {
      const endDate = startDate.add(value, 'day');
      enrollForm.setFieldsValue({
        prescription_end_date: endDate
      });
    }
  };

  const handleStartDateChange = (date) => {
    if (date && duration) {
      const endDate = date.add(duration, 'day');
      enrollForm.setFieldsValue({
        prescription_end_date: endDate
      });
    }
  };

  const handleEnrollSubmit = async (values) => {
    try {
      console.log('Enrollment form values:', values);
      console.log('Selected drug:', selectedDrug);
      
      // Format dates properly
      const enrollmentData = {
        ...values,
        drug_id: selectedDrug?.id || values.drug_id,
        prescription_start_date: values.prescription_start_date?.format('YYYY-MM-DD'),
        prescription_end_date: values.prescription_end_date?.format('YYYY-MM-DD'),
        latest_refill_date: values.latest_refill_date?.format('YYYY-MM-DD')
      };
      
      console.log('Sending enrollment data:', enrollmentData);
      
      await enrollmentsAPI.create(enrollmentData);
      message.success('Patient enrolled successfully');
      setEnrollModalVisible(false);
      enrollForm.resetFields();
      setDuration(0);
      fetchData(); // Refresh the data to update quota counts
      
      // Refresh drug enrollments in the modal if it's open
      if (drugDetailsModalVisible && selectedDrug) {
        await refreshDrugEnrollments();
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      
      // Check if it's a duplicate enrollment error
      if (error.error?.includes('already enrolled') || 
          error.error?.includes('duplicate') ||
          error.response?.status === 400) {
        message.error('Patient is already enrolled in this drug (maybe inactive)');
      } else {
        message.error('Error enrolling patient');
      }
    }
  };

  const handleCreatePatient = async (values) => {
    try {
      const response = await patientsAPI.create(values);
      message.success('Patient created successfully');
      
      // Refresh patients list
      const patientsResponse = await patientsAPI.getAll();
      setPatients(patientsResponse.data);
      
      // Set the newly created patient as selected
      enrollForm.setFieldsValue({ patient_id: response.data.id });
      
      // Close the create patient modal
      setShowCreatePatient(false);
      patientForm.resetFields();
      setPatientSearchText('');
    } catch (error) {
      message.error('Error creating patient');
      console.error('Error creating patient:', error);
    }
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

  const refreshDrugEnrollments = async () => {
    if (selectedDrug) {
      try {
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
        
        // Update the selectedDrug with the new active patient count
        setSelectedDrug(prev => ({
          ...prev,
          current_active_patients: activeResponse.data.length
        }));
        
        console.log('Drug enrollments refreshed - Active:', activeResponse.data.length, 'Inactive:', inactiveResponse.data.length);
      } catch (error) {
        console.error('Error refreshing drug enrollments:', error);
      }
    }
  };

  const handleEditEnrollment = (enrollment) => {
    setEditingEnrollment(enrollment);
    editForm.setFieldsValue({
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
      
      // Refresh drug enrollments
      await refreshDrugEnrollments();
      
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
      
      // Refresh drug enrollments
      await refreshDrugEnrollments();
      
      // Refresh main data
      await fetchData();
    } catch (error) {
      message.error('Error updating enrollment');
      console.error('Error:', error);
    }
  };

  const getUtilizationColor = (active, quota) => {
    const percentage = quota > 0 ? (active / quota) * 100 : 0;
    if (percentage >= 100) return 'red';
    if (percentage >= 80) return 'orange';
    if (percentage >= 50) return 'blue';
    return 'green';
  };

  const columns = [
    {
      title: 'Drug Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <Space>
          <MedicineBoxOutlined />
          <div>
            <div style={{ fontWeight: 'bold' }}>{name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.department_name}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
      sorter: (a, b) => a.department_name.localeCompare(b.department_name),
    },
    {
      title: 'Quota',
      dataIndex: 'quota_number',
      key: 'quota_number',
      sorter: (a, b) => a.quota_number - b.quota_number,
      render: (quota) => <Tag color="blue">{quota}</Tag>,
    },
    {
      title: 'Active Patients',
      dataIndex: 'current_active_patients',
      key: 'current_active_patients',
      sorter: (a, b) => a.current_active_patients - b.current_active_patients,
      render: (active, record) => (
        <Space>
          <UserOutlined />
          <span>{active}</span>
          <Tag color={getUtilizationColor(active, record.quota_number)}>
            {record.quota_number > 0 ? Math.round((active / record.quota_number) * 100) : 0}%
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Available Slots',
      key: 'available_slots',
      sorter: (a, b) => (a.quota_number - a.current_active_patients) - (b.quota_number - b.current_active_patients),
      render: (_, record) => {
        const available = record.quota_number - record.current_active_patients;
        return (
          <Tag color={available > 0 ? 'green' : 'red'}>
            {available}
          </Tag>
        );
      },
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      sorter: (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),
      render: (price) => (
        <Space>
          <DollarOutlined />
          <span>RM {price ? Number(price).toFixed(2) : '0.00'}</span>
        </Space>
      ),
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (remarks) => remarks || '-',
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
          <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
            <Col xs={24} sm={12}>
              <Title level={3} style={{ margin: 0, fontSize: '18px', '@media (min-width: 768px)': { fontSize: '24px' } }}>
                <MedicineBoxOutlined style={{ marginRight: '8px' }} />
                Drug Management
              </Title>
            </Col>
            <Col xs={24} sm={12} style={{ textAlign: 'right', marginTop: '8px', '@media (min-width: 768px)': { marginTop: '0' } }}>
              <Space wrap>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={loading}
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
                  Add Drug
                </Button>
              </Space>
            </Col>
          </Row>

        </div>

        {/* Search and Filter Bar */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={16}>
              <Input
                placeholder="Search drugs by name or department..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-bar search-bar-md"
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
                size="small"
              />
            </Col>
            <Col xs={24} sm={8}>
              <Select
                placeholder="Filter by department"
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                style={{ width: '100%' }}
                size="medium"
                allowClear
              >
                <Option value="all">All Departments</Option>
                {departments.map(dept => (
                  <Option key={dept.id} value={dept.id}>
                    {dept.name}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={filteredDrugs}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} drugs`,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
            showLessItems: false
          }}
          scroll={{ x: 1000 }}
          onRow={(record) => ({
            onClick: () => handleDrugClick(record),
            style: { cursor: 'pointer' }
          })}
        />
      </Card>

      {/* Add/Edit Drug Modal */}
      <Modal
        title={editingDrug ? 'Edit Drug' : 'Add New Drug'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Drug Name"
            rules={[{ required: true, message: 'Please enter drug name' }]}
          >
            <Input placeholder="Enter drug name" />
          </Form.Item>

          <Form.Item
            name="department_id"
            label="Department"
            rules={[{ required: true, message: 'Please select department' }]}
          >
            <Select 
              placeholder="Select department"
              popupRender={menu => (
                <div>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={() => setDeptModalVisible(true)}
                    style={{ width: '100%' }}
                  >
                    Create New Department
                  </Button>
                </div>
              )}
            >
              {departments.map(dept => (
                <Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quota_number"
                label="Quota Number"
                rules={[{ required: true, message: 'Please enter quota number' }]}
              >
                <InputNumber 
                  min={0} 
                  style={{ width: '100%' }} 
                  placeholder="Enter quota number"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="price"
                label="Price per SKU (RM)"
                rules={[{ required: false, message: 'Please enter price' }]}
              >
                <InputNumber 
                  min={0} 
                  step={0.01}
                  style={{ width: '100%' }} 
                  placeholder="Enter price"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="calculation_method"
            label="SKU for Price Calculation"
            rules={[{ required: false, message: 'Please select calculation method' }]}
          >
            <Select placeholder="Select calculation method">
              <Option value="daily">Daily</Option>
              <Option value="weekly">Weekly</Option>
              <Option value="monthly">Monthly</Option>
              <Option value="twice_yearly">Twice Yearly</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="remarks"
            label="Remarks"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Enter any remarks or notes"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingDrug ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Department Modal */}
      <Modal
        title="Create New Department"
        open={deptModalVisible}
        onCancel={() => {
          setDeptModalVisible(false);
          deptForm.resetFields();
        }}
        footer={null}
        width={400}
      >
        <Form
          form={deptForm}
          layout="vertical"
          onFinish={handleCreateDepartment}
        >
          <Form.Item
            name="name"
            label="Department Name"
            rules={[{ required: true, message: 'Please enter department name' }]}
          >
            <Input placeholder="Enter department name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setDeptModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Create Department
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Enroll Patient Modal */}
      <Modal
        title={`Enroll Patient to ${selectedDrug?.name || 'Drug'}`}
        open={enrollModalVisible}
        onCancel={() => {
          setEnrollModalVisible(false);
          enrollForm.resetFields();
          setPatientSearchText('');
        }}
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
        {selectedDrug && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            background: '#f0f8ff', 
            borderRadius: '6px',
            border: '1px solid #d6e4ff'
          }}>
            <Row gutter={16}>
              <Col span={12}>
                <div><strong>Drug:</strong> {selectedDrug.name}</div>
                <div><strong>Department:</strong> {selectedDrug.department_name}</div>
              </Col>
              <Col span={12}>
                <div><strong>Available Slots:</strong> {selectedDrug.quota_number - selectedDrug.current_active_patients}</div>
                <div><strong>Price:</strong> RM {Number(selectedDrug.price).toFixed(2)} per unit</div>
              </Col>
            </Row>
          </div>
        )}
        
        <Form
          form={enrollForm}
          layout="vertical"
          onFinish={handleEnrollSubmit}
          size="small"
        >
          <Form.Item name="drug_id" style={{ display: 'none' }}>
            <Input type="hidden" />
          </Form.Item>
          
          {/* Row 1: Patient Selection */}
          <Form.Item
            name="patient_id"
            label="Patient"
            rules={[{ required: true, message: 'Please select a patient' }]}
            style={{ marginBottom: '12px' }}
          >
            <Select
              placeholder="Search patient..."
              showSearch
              value={patientSearchText ? undefined : enrollForm.getFieldValue('patient_id')}
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
                  onChange={handleDurationChange}
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
                  onChange={handleStartDateChange}
                  placeholder="Select date or enter ddmmyy"
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
                style={{ marginBottom: '12px' }}
                tooltip="PS End Date or TCA Klinik Pakar"
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
                  if (selectedDrug) {
                    return `Drug: ${selectedDrug.name}\n Price: RM ${parseFloat(selectedDrug.price).toFixed(2)}\n`;
                  }
                  return "Cost per day";
                })()}
                style={{ marginBottom: '16px' }}
              >
                  <CostPerDayInput
                    onChange={(value) => {
                      if (editModalVisible) {
                        editForm.setFieldsValue({ cost_per_day: value });
                      } else {
                        enrollForm.setFieldsValue({ cost_per_day: value });
                      }
                    }}
                    drugInfo={selectedDrug}
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
                  placeholder="Started by Dr Vicknesh s/t Dr Johan, SPUB to Hosp Kota Tinggi"
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
              <Button onClick={() => {
                setEnrollModalVisible(false);
                enrollForm.resetFields();
                setPatientSearchText('');
              }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Enroll Patient
              </Button>
            </Space>
          </div>
        </Form>
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
                <Text strong>Remarks: </Text>
                <Text>{selectedDrug.remarks || '-'}</Text>
              </div>
            </Card>

            {/* Action Buttons */}
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Space>
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={() => handleEnrollPatient(selectedDrug)}
                  disabled={(selectedDrug.quota_number - selectedDrug.current_active_patients) <= 0}
                >
                  Enroll Patient
                </Button>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(selectedDrug)}
                >
                  Edit Drug
                </Button>
                <Popconfirm
                  title="Are you sure you want to delete this drug?"
                  description="This will also remove all associated patient enrollments."
                  onConfirm={() => {
                    handleDelete(selectedDrug.id);
                    setDrugDetailsModalVisible(false);
                  }}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                  >
                    Delete Drug
                  </Button>
                </Popconfirm>
              </Space>
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
                    title: 'Dose',
                    dataIndex: 'dose_per_day',
                    key: 'dose_per_day',
                    render: (value) => value || '-',
                  },
                  {
                    title: 'Cost/Day',
                    dataIndex: 'cost_per_day',
                    key: 'cost_per_day',
                    render: (value) => value ? `RM ${parseFloat(value).toFixed(2)}` : '-',
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
                    title: 'Dose',
                    dataIndex: 'dose_per_day',
                    key: 'dose_per_day',
                    render: (value) => value || '-',
                  },
                  {
                    title: 'Cost/Day',
                    dataIndex: 'cost_per_day',
                    key: 'cost_per_day',
                    render: (value) => value ? `RM ${parseFloat(value).toFixed(2)}` : '-',
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
        width={700}
        centered
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateEnrollment}
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
                  value={patientSearchText ? undefined : editForm.getFieldValue('patient_id')}
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
                  <Switch size="small" />
                </Form.Item>
              </div>
            </Col>
          </Row>

          {/* Row 4: Cost per day and Remarks */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="cost_per_day"
                label="Cost per Day (Optional)"
                tooltip={(() => {
                  const selectedDrug = drugs.find(d => d.id === editForm.getFieldValue('drug_id'));
                  if (selectedDrug) {
                    return `Drug: ${selectedDrug.name}\nPrice: RM ${parseFloat(selectedDrug.price).toFixed(2)}`;
                  }
                  return "Enter the daily cost for this enrollment.";
                })()}
                style={{ marginBottom: '16px' }}
              >
                <CostPerDayInput
                  onChange={(value) => editForm.setFieldsValue({ cost_per_day: value })}
                  drugInfo={drugs.find(d => d.id === editForm.getFieldValue('drug_id'))}
                  placeholder="e.g. 5.50 or 0.5*2*3"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="remarks"
                label="Remarks (Optional)"
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
              <Button onClick={() => setEditModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update Enrollment
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DrugListPage;
