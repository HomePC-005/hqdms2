import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Typography, 
  Table, 
  Space, 
  DatePicker, 
  message, 
  Alert,
  Tag,
  Modal,
  Form,
  Dropdown,
  Popconfirm,
  Select,
  Switch,
  InputNumber,
  Row,
  Col
} from 'antd';
import { 
  SearchOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { enrollmentsAPI, patientsAPI, drugsAPI } from '../services/api';
import CustomDateInput from '../components/CustomDateInput';
import CostPerDayInput from '../components/CostPerDayInput';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const RefillUpdatePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [patients, setPatients] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [patientSearchText, setPatientSearchText] = useState('');
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [patientForm] = Form.useForm();
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    if (searchValue) {
      handleSearch(searchValue);
    }
    fetchPatientsAndDrugs();
  }, []);

  const fetchPatientsAndDrugs = async () => {
    try {
      const [patientsRes, drugsRes] = await Promise.all([
        patientsAPI.getAll(),
        drugsAPI.getAll()
      ]);
      setPatients(patientsRes.data);
      setDrugs(drugsRes.data);
    } catch (error) {
      console.error('Error fetching patients and drugs:', error);
    }
  };

  // Global keyboard listener for search
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't capture if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Don't capture special keys
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      
      // Don't capture function keys, arrows, etc.
      if (event.key.length > 1 && !['Backspace', 'Delete', 'Enter', 'Escape'].includes(event.key)) {
        return;
      }
      
      // Handle Escape key to clear input
      if (event.key === 'Escape') {
        event.preventDefault();
        setSearchValue('');
        setHasSearched(false);
        setEnrollments([]);
        return;
      }
      
      // If it's a printable character or backspace/delete
      if (event.key.length === 1 || ['Backspace', 'Delete'].includes(event.key)) {
        event.preventDefault();
        
        if (event.key === 'Backspace' || event.key === 'Delete') {
          // Handle backspace/delete
          setSearchValue(prev => prev.slice(0, -1));
        } else {
          // Handle regular characters
          setSearchValue(prev => prev + event.key);
        }
      }
      
      // Handle Enter key to search
      if (event.key === 'Enter' && searchValue.trim()) {
        handleSearch(searchValue);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchValue]);

  const handleSearch = async (value) => {
    if (!value.trim()) return;
    
    console.log('Searching for:', value.trim());
    setLoading(true);
    setHasSearched(true);
    try {
      const response = await enrollmentsAPI.getAll({ 
        search: value.trim(),
        active_only: 'true'
      });
      console.log('Search results:', response.data);
      setEnrollments(response.data);
      setSearchParams({ search: value.trim() });
    } catch (error) {
      message.error('Error searching for patients');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefillUpdate = (enrollment) => {
    setSelectedEnrollment(enrollment);
    form.setFieldsValue({
      latest_refill_date: dayjs()
    });
    setUpdateModalVisible(true);
  };

  const testDatabase = async () => {
    try {
      const response = await fetch('/api/enrollments/test');
      const data = await response.json();
      console.log('Database test results:', data);
      message.info(`Database: ${data.enrollments} enrollments, ${data.patients} patients, ${data.drugs} drugs`);
      
      if (data.sampleEnrollments) {
        console.log('Sample enrollments:', data.sampleEnrollments);
      }
    } catch (error) {
      console.error('Database test error:', error);
      message.error('Database test failed');
    }
  };

  const fetchEnrollments = async () => {
    try {
      const response = await enrollmentsAPI.getAll({ active_only: 'true' });
      setEnrollments(response.data);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const createSampleEnrollments = async () => {
    try {
      // Get patients and drugs
      const patientsResponse = await fetch('/api/patients');
      const drugsResponse = await fetch('/api/drugs');
      const patients = await patientsResponse.json();
      const drugs = await drugsResponse.json();
      
      console.log('Available patients:', patients);
      console.log('Available drugs:', drugs);
      
      if (patients.length === 0 || drugs.length === 0) {
        message.warning('No patients or drugs available. Please add some first.');
        return;
      }
      
      // Create enrollments for first 2 patients with first 2 drugs
      const enrollments = [];
      for (let i = 0; i < Math.min(2, patients.length); i++) {
        for (let j = 0; j < Math.min(2, drugs.length); j++) {
          const enrollment = {
            drug_id: drugs[j].id,
            patient_id: patients[i].id,
            dose_per_day: 1.0,
            prescription_start_date: '2024-01-01',
            prescription_end_date: '2024-12-31',
            spub: false,
            remarks: 'Sample enrollment for testing'
          };
          enrollments.push(enrollment);
        }
      }
      
      // Create enrollments one by one
      for (const enrollment of enrollments) {
        try {
          await fetch('/api/enrollments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(enrollment)
          });
        } catch (error) {
          console.log('Enrollment might already exist:', error);
        }
      }
      
      message.success(`Created ${enrollments.length} sample enrollments`);
      
      // Refresh the enrollments list
      await fetchEnrollments();
      
    } catch (error) {
      console.error('Error creating sample enrollments:', error);
      message.error('Failed to create sample enrollments');
    }
  };

  const handleUpdateRefill = async (values) => {
    try {
      await enrollmentsAPI.updateRefill(selectedEnrollment.id, {
        latest_refill_date: values.latest_refill_date.format('YYYY-MM-DD')
      });
      
      message.success('Refill date updated successfully!');
      setUpdateModalVisible(false);
      form.resetFields();
      
      // Refresh the search results
      if (searchValue) {
        handleSearch(searchValue);
      }
    } catch (error) {
      message.error('Error updating refill date');
      console.error('Update error:', error);
    }
  };

  const handleEditEnrollment = () => {
    setEditModalVisible(true);
    setUpdateModalVisible(false);
    
    // Calculate duration if both start and end dates exist
    let duration = null;
    if (selectedEnrollment.prescription_start_date && selectedEnrollment.prescription_end_date) {
      const startDate = dayjs(selectedEnrollment.prescription_start_date);
      const endDate = dayjs(selectedEnrollment.prescription_end_date);
      duration = endDate.diff(startDate, 'day');
    }
    
    // Pre-populate the edit form with current enrollment data
    editForm.setFieldsValue({
      ...selectedEnrollment,
      prescription_start_date: selectedEnrollment.prescription_start_date ? dayjs(selectedEnrollment.prescription_start_date) : null,
      prescription_end_date: selectedEnrollment.prescription_end_date ? dayjs(selectedEnrollment.prescription_end_date) : null,
      latest_refill_date: selectedEnrollment.latest_refill_date ? dayjs(selectedEnrollment.latest_refill_date) : null,
      duration: duration
    });
  };

  const handleUpdateEnrollment = async (values) => {
    try {
      const enrollmentData = {
        ...values,
        prescription_start_date: values.prescription_start_date?.format('YYYY-MM-DD'),
        prescription_end_date: values.prescription_end_date?.format('YYYY-MM-DD'),
        latest_refill_date: values.latest_refill_date?.format('YYYY-MM-DD')
      };

      await enrollmentsAPI.update(selectedEnrollment.id, enrollmentData);
      
      message.success('Enrollment updated successfully!');
      setEditModalVisible(false);
      editForm.resetFields();
      
      // Refresh the search results
      if (searchValue) {
        handleSearch(searchValue);
      }
    } catch (error) {
      message.error('Error updating enrollment');
      console.error('Update error:', error);
    }
  };

  const handleDeleteEnrollment = async () => {
    try {
      await enrollmentsAPI.delete(selectedEnrollment.id);
      
      message.success('Enrollment deleted successfully!');
      setUpdateModalVisible(false);
      
      // Refresh the search results
      if (searchValue) {
        handleSearch(searchValue);
      }
    } catch (error) {
      message.error('Error deleting enrollment');
      console.error('Delete error:', error);
    }
  };

  const handleDurationChange = (value) => {
    const startDate = editForm.getFieldValue('prescription_start_date');
    if (startDate && value) {
      const endDate = startDate.add(value, 'day');
      editForm.setFieldsValue({ prescription_end_date: endDate });
    }
  };

  const handleStartDateChange = (date) => {
    const duration = editForm.getFieldValue('duration');
    if (date && duration) {
      const endDate = date.add(duration, 'day');
      editForm.setFieldsValue({ prescription_end_date: endDate });
    }
  };

  const handleEndDateChange = (date) => {
    const startDate = editForm.getFieldValue('prescription_start_date');
    if (startDate && date) {
      const duration = date.diff(startDate, 'day');
      if (duration > 0) {
        editForm.setFieldsValue({ duration: duration });
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
      editForm.setFieldsValue({ patient_id: response.data.id });
      
      // Close the create patient modal
      setShowCreatePatient(false);
      patientForm.resetFields();
      setPatientSearchText('');
    } catch (error) {
      message.error('Error creating patient');
      console.error('Error creating patient:', error);
    }
  };

  const getRefillStatus = (latestRefillDate) => {
    if (!latestRefillDate) return { status: 'never', color: 'red' };
    
    const daysSinceRefill = dayjs().diff(dayjs(latestRefillDate), 'days');
    
    if (daysSinceRefill <= 30) return { status: 'recent', color: 'green' };
    if (daysSinceRefill <= 90) return { status: 'moderate', color: 'orange' };
    if (daysSinceRefill <= 180) return { status: 'overdue', color: 'red' };
    return { status: 'defaulter', color: 'red' };
  };

  const menuItems = [
    {
      key: 'edit',
      label: 'Edit Enrollment',
      icon: <EditOutlined />,
      onClick: handleEditEnrollment
    },
    {
      key: 'delete',
      label: (
        <Popconfirm
          title="Delete Enrollment"
          description="Are you sure you want to delete this enrollment? This action cannot be undone."
          onConfirm={handleDeleteEnrollment}
          okText="Yes, Delete"
          cancelText="Cancel"
          okType="danger"
        >
          <span style={{ color: '#ff4d4f' }}>Delete Enrollment</span>
        </Popconfirm>
      ),
      icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />
    }
  ];

  const columns = [
    {
      title: 'Patient',
      key: 'patient',
      render: (_, record) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.patient_name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.ic_number}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Drug',
      key: 'drug',
      render: (_, record) => (
        <Space>
          <MedicineBoxOutlined />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.drug_name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.department_name}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Dose',
      dataIndex: 'dose_per_day',
      key: 'dose',
      render: (dose) => `${dose}`,
    },
    {
      title: 'Latest Refill',
      dataIndex: 'latest_refill_date',
      key: 'latest_refill',
      render: (date) => {
        if (!date) return <Tag color="red">Never</Tag>;
        
        const refillStatus = getRefillStatus(date);
        const daysSince = dayjs().diff(dayjs(date), 'days');
        
        return (
          <Space direction="vertical" size="small">
            <div>{dayjs(date).format('DD/MM/YYYY')}</div>
            <Tag color={refillStatus.color}>
              {daysSince} days ago
            </Tag>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const refillStatus = getRefillStatus(record.latest_refill_date);
        const daysSince = record.latest_refill_date ? 
          dayjs().diff(dayjs(record.latest_refill_date), 'days') : null;
        
        if (record.spub) {
          return <Tag color="blue">SPUB</Tag>;
        }
        
        if (!record.latest_refill_date) {
          return <Tag color="red">No Refill</Tag>;
        }
        
        if (daysSince > 180) {
          return <Tag color="red">Potential Defaulter</Tag>;
        }
        
        return <Tag color="green">Active</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={3} style={{ marginBottom: '16px' }}>
          <SearchOutlined style={{ marginRight: '8px' }} />
          Quick Refill Update
        </Title>
        <Paragraph style={{ marginBottom: '24px', color: '#666' }}>
          Search for patients by name or IC number to quickly update their refill dates.
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 Tip: You can start typing anywhere on this page to search - no need to click the search bar first!
            <br />
            ⌨️ Keyboard shortcuts: <kbd>Enter</kbd> to search, <kbd>Esc</kbd> to clear
          </Text>
        </Paragraph>
        
        <div style={{ marginBottom: '24px' }}>
          <Search
            placeholder="Enter patient name or IC number... (or type anywhere on this page)"
            enterButton={<SearchOutlined />}
            size="large"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={handleSearch}
            loading={loading}
            style={{ marginBottom: '16px' }}
            className="search-bar search-bar-lg"
          />
        </div>


        {enrollments.length === 0 && hasSearched && !loading && (
          <Alert
            message="No active enrollments found"
            description="Try searching with a different name or IC number."
            type="warning"
            showIcon
          />
        )}

        {enrollments.length > 0 && (
          <div>
            <Table
            columns={columns}
            dataSource={enrollments}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
            onRow={(record) => ({
              onClick: () => handleRefillUpdate(record),
              style: { cursor: 'pointer' }
            })}
          />
          </div>
        )}
      </Card>

      {/* Update Refill Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Update Refill Date</span>
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button 
                type="text" 
                icon={<MoreOutlined />} 
                style={{ border: 'none', boxShadow: 'none' }}
              />
            </Dropdown>
          </div>
        }
        open={updateModalVisible}
        width={500}
        onCancel={() => {
          setUpdateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        closable={false}
      >
        {selectedEnrollment && (
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
                <span>{selectedEnrollment.dose_per_day}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Remarks:</strong> 
                <span>{selectedEnrollment.remarks}</span>
              </div>              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Last Refill:</strong> 
                <span>{selectedEnrollment.latest_refill_date ? dayjs(selectedEnrollment.latest_refill_date).format('DD/MM/YYYY') : 'Never'}</span>
              </div>
            </Space>
          </div>
        )}
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateRefill}
        >
          <Form.Item
            name="latest_refill_date"
            label="Latest Refill Date"
            rules={[{ required: true, message: 'Please select refill date' }]}
          >
            <CustomDateInput 
              style={{ width: '100%' }} 
              placeholder="Select date or enter ddmmyy"
            />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setUpdateModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Update Refill Date
              </Button>
            </Space>
          </Form.Item>
        </Form>
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
                  onChange={handleDurationChange}
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
                onChange={handleStartDateChange}
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
                  onChange={handleEndDateChange}
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
    </div>
  );
};

export default RefillUpdatePage;
