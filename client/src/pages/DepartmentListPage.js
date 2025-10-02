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
  message, 
  Popconfirm,
  Tag,
  Tooltip,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  BankOutlined,
  MedicineBoxOutlined,
  UserOutlined
} from '@ant-design/icons';
import { departmentsAPI } from '../services/api';

const { Title } = Typography;

const DepartmentListPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await departmentsAPI.getAll();
      setDepartments(response.data);
    } catch (error) {
      message.error('Error fetching departments');
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingDepartment(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    form.setFieldsValue(department);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await departmentsAPI.delete(id);
      message.success('Department deleted successfully');
      fetchDepartments();
    } catch (error) {
      message.error('Error deleting department');
      console.error('Delete error:', error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingDepartment) {
        await departmentsAPI.update(editingDepartment.id, values);
        message.success('Department updated successfully');
      } else {
        await departmentsAPI.create(values);
        message.success('Department created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      fetchDepartments();
    } catch (error) {
      message.error(editingDepartment ? 'Error updating department' : 'Error creating department');
      console.error('Submit error:', error);
    }
  };

  const columns = [
    {
      title: 'Department Name',
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <Space>
          <BankOutlined />
          <span style={{ fontWeight: 'bold' }}>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Drug Count',
      dataIndex: 'drug_count',
      key: 'drug_count',
      render: (count) => (
        <Tag color="blue">
          <MedicineBoxOutlined style={{ marginRight: '4px' }} />
          {count || 0} drugs
        </Tag>
      ),
    },
    {
      title: 'Total Enrollments',
      dataIndex: 'total_enrollments',
      key: 'total_enrollments',
      render: (count) => (
        <Tag color="green">
          <UserOutlined style={{ marginRight: '4px' }} />
          {count || 0} patients
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString(),
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
            title="Are you sure you want to delete this department?"
            description="This will also delete all associated drugs and enrollments."
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

  const totalStats = departments.reduce((acc, dept) => {
    acc.totalDrugs += dept.drug_count || 0;
    acc.totalEnrollments += dept.total_enrollments || 0;
    return acc;
  }, { totalDrugs: 0, totalEnrollments: 0 });

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
            <Col>
              <Title level={3} style={{ margin: 0 }}>
                <BankOutlined style={{ marginRight: '8px' }} />
                Department Management
              </Title>
            </Col>
            <Col>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                Add Department
              </Button>
            </Col>
          </Row>

        </div>

        <Table
          columns={columns}
          dataSource={departments}
          rowKey="id"
          loading={loading}
          pagination={{ 
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
            showLessItems: false
          }}
          scroll={{ x: 600 }}
        />
      </Card>

      {/* Add/Edit Department Modal */}
      <Modal
        title={editingDepartment ? 'Edit Department' : 'Add New Department'}
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
            label="Department Name"
            rules={[{ required: true, message: 'Please enter department name' }]}
          >
            <Input placeholder="Enter department name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingDepartment ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentListPage;
