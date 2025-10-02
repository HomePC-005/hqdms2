import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Typography, 
  Space, 
  Input, 
  Modal, 
  Form, 
  message, 
  Popconfirm,
  Tag,
  Tooltip,
  Row,
  Col,
  Select,
  InputNumber
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined,
  MedicineBoxOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { patientsAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const PatientListPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [form] = Form.useForm();
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async (search = '') => {
    setLoading(true);
    try {
      const patientsResponse = await patientsAPI.getAll(search);
      setPatients(patientsResponse.data);
    } catch (error) {
      message.error('Error fetching patients');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    fetchPatients(value);
  };

  const handleAdd = () => {
    setEditingPatient(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    form.setFieldsValue(patient);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await patientsAPI.delete(id);
      message.success('Patient deleted successfully');
      fetchPatients(searchValue);
    } catch (error) {
      message.error('Error deleting patient');
      console.error('Delete error:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingPatient) {
        await patientsAPI.update(editingPatient.id, values);
        message.success('Patient updated successfully');
      } else {
        await patientsAPI.create(values);
        message.success('Patient created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchPatients(searchValue);
    } catch (error) {
      message.error(editingPatient ? 'Error updating patient' : 'Error creating patient');
      console.error('Submit error:', error);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontWeight: 'bold' }}>{name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{record.ic_number}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'IC Number',
      dataIndex: 'ic_number',
      key: 'ic_number',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this patient?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
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
                <UserOutlined style={{ marginRight: '8px' }} />
                Patient Management
              </Title>
            </Col>
            <Col xs={24} sm={12} style={{ textAlign: 'right', marginTop: '8px', '@media (min-width: 768px)': { marginTop: '0' } }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAdd}
                className="btn-primary btn-md"
              >
                Add Patient
              </Button>
            </Col>
          </Row>


          <Search
            placeholder="Search patients by name or IC number..."
            enterButton={<SearchOutlined />}
            size="large"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={handleSearch}
            className="search-bar search-bar-lg"
            style={{ marginBottom: '16px' }}
          />
        </div>

        <Table
          columns={columns}
          dataSource={patients}
          rowKey="id"
          loading={loading}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} patients`,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
            showLessItems: false
          }}
          scroll={{ x: 600 }}
        />
      </Card>

      {/* Add/Edit Patient Modal */}
      <Modal
        title={editingPatient ? 'Edit Patient' : 'Add New Patient'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Patient Name"
            rules={[{ required: true, message: 'Please enter patient name' }]}
            normalize={(value) => value ? value.toUpperCase() : value}
          >
            <Input placeholder="Enter patient name" />
          </Form.Item>

          <Form.Item
            name="ic_number"
            label="IC Number / Passport / Other ID"
            rules={[{ required: true, message: 'Please enter patient identifier' }]}
          >
            <Input placeholder="Enter IC number, passport, or other identifier" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingPatient ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default PatientListPage;
