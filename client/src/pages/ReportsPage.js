import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Row, 
  Col, 
  Button, 
  Select, 
  DatePicker, 
  Table, 
  Statistic, 
  Space, 
  message,
  Tabs,
  Alert,
  Spin
} from 'antd';
import { 
  FileTextOutlined, 
  DownloadOutlined, 
  DollarOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  WarningOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { reportsAPI, departmentsAPI, enrollmentsAPI } from '../services/api';
import CustomDateInput from '../components/CustomDateInput';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
// Removed TabPane import as we'll use items prop instead

const ReportsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState([dayjs().startOf('year'), dayjs().endOf('year')]);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [yearlyCostData, setYearlyCostData] = useState(null);

  useEffect(() => {
    fetchDepartments();
    fetchDashboardData();
  }, []);

  // Helper function to set default date ranges
  const setDefaultDateRange = (range) => {
    switch (range) {
      case 'current_year':
        setSelectedDateRange([dayjs().startOf('year'), dayjs().endOf('year')]);
        break;
      case 'last_30_days':
        setSelectedDateRange([dayjs().subtract(30, 'days'), dayjs()]);
        break;
      case 'last_3_months':
        setSelectedDateRange([dayjs().subtract(3, 'months'), dayjs()]);
        break;
      case 'last_6_months':
        setSelectedDateRange([dayjs().subtract(6, 'months'), dayjs()]);
        break;
      default:
        break;
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll();
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await reportsAPI.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchCostAnalysis = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: selectedDateRange[0]?.format('YYYY-MM-DD'),
        end_date: selectedDateRange[1]?.format('YYYY-MM-DD'),
        department_id: selectedDepartment !== 'all' ? selectedDepartment : undefined
      };
      const response = await reportsAPI.getCostAnalysis(params);
      setReportData(prev => ({ ...prev, costAnalysis: response.data }));
    } catch (error) {
      message.error('Error fetching cost analysis report');
      console.error('Cost analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotaUtilization = async () => {
    setLoading(true);
    try {
      const params = selectedDepartment !== 'all' ? { department_id: selectedDepartment } : {};
      const response = await reportsAPI.getQuotaUtilization(params);
      setReportData(prev => ({ ...prev, quotaUtilization: response.data }));
    } catch (error) {
      message.error('Error fetching quota utilization report');
      console.error('Quota utilization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaulters = async () => {
    setLoading(true);
    try {
      const params = selectedDepartment !== 'all' ? { department_id: selectedDepartment } : {};
      const response = await reportsAPI.getDefaulters(params);
      setReportData(prev => ({ ...prev, defaulters: response.data }));
    } catch (error) {
      message.error('Error fetching defaulter report');
      console.error('Defaulters error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchYearlyCosts = async () => {
    setLoading(true);
    try {
      const params = {
        year: selectedYear,
        department_id: selectedDepartment !== 'all' ? selectedDepartment : undefined
      };
      const response = await enrollmentsAPI.getYearlyCosts(params);
      setYearlyCostData(response.data);
    } catch (error) {
      message.error('Error fetching yearly cost report');
      console.error('Yearly costs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (reportType) => {
    try {
      const params = {
        report_type: reportType,
        start_date: selectedDateRange[0]?.format('YYYY-MM-DD'),
        end_date: selectedDateRange[1]?.format('YYYY-MM-DD'),
        year: selectedYear,
        department_id: selectedDepartment !== 'all' ? selectedDepartment : undefined
      };
      
      const response = await reportsAPI.exportExcel(params);
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Report exported successfully');
    } catch (error) {
      message.error('Error exporting report');
      console.error('Export error:', error);
    }
  };

  const costAnalysisColumns = [
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
    },
    {
      title: 'Drug Name',
      dataIndex: 'drug_name',
      key: 'drug_name',
    },
    {
      title: 'Patient Count',
      dataIndex: 'patient_count',
      key: 'patient_count',
    },
    {
      title: 'Total Annual Cost',
      dataIndex: 'total_annual_cost',
      key: 'total_annual_cost',
      render: (value) => `RM ${value ? Number(value).toFixed(2) : '0.00'}`,
    },
    {
      title: 'Avg Cost per Patient',
      dataIndex: 'avg_cost_per_patient',
      key: 'avg_cost_per_patient',
      render: (value) => `RM ${value ? Number(value).toFixed(2) : '0.00'}`,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (value) => `RM ${value ? Number(value).toFixed(2) : '0.00'}`,
    },
  ];

  const quotaUtilizationColumns = [
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
    },
    {
      title: 'Drug Name',
      dataIndex: 'drug_name',
      key: 'drug_name',
    },
    {
      title: 'Quota',
      dataIndex: 'quota_number',
      key: 'quota_number',
    },
    {
      title: 'Active Patients',
      dataIndex: 'active_patients',
      key: 'active_patients',
    },
    {
      title: 'Available Slots',
      dataIndex: 'available_slots',
      key: 'available_slots',
    },
    {
      title: 'Utilization %',
      dataIndex: 'utilization_percentage',
      key: 'utilization_percentage',
      render: (value) => `${value || 0}%`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = {
          'FULL': 'red',
          'HIGH': 'orange',
          'MEDIUM': 'blue',
          'LOW': 'green'
        }[status] || 'default';
        return <span style={{ color }}>{status}</span>;
      },
    },
  ];

  const defaultersColumns = [
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
    },
    {
      title: 'Drug Name',
      dataIndex: 'drug_name',
      key: 'drug_name',
    },
    {
      title: 'Patient Name',
      dataIndex: 'patient_name',
      key: 'patient_name',
    },
    {
      title: 'IC Number',
      dataIndex: 'ic_number',
      key: 'ic_number',
    },
    {
      title: 'Last Refill',
      dataIndex: 'latest_refill_date',
      key: 'latest_refill_date',
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : 'Never',
    },
    {
      title: 'Days Since Refill',
      dataIndex: 'days_since_refill',
      key: 'days_since_refill',
      render: (days) => <span style={{ color: days > 180 ? 'red' : 'orange' }}>{days}</span>,
    },
    {
      title: 'SPUB',
      dataIndex: 'spub',
      key: 'spub',
      render: (spub) => spub ? 'Yes' : 'No',
    },
  ];

  const yearlyCostColumns = [
    {
      title: 'Patient Name',
      dataIndex: 'patient_name',
      key: 'patient_name',
    },
    {
      title: 'IC Number',
      dataIndex: 'ic_number',
      key: 'ic_number',
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
    },
    {
      title: 'Drug Name',
      dataIndex: 'drug_name',
      key: 'drug_name',
    },
    {
      title: 'Cost per Day',
      dataIndex: 'cost_per_day',
      key: 'cost_per_day',
      render: (value) => value ? `RM ${parseFloat(value).toFixed(2)}` : '-',
    },
    {
      title: 'Yearly Cost',
      dataIndex: 'calculated_yearly_cost',
      key: 'calculated_yearly_cost',
      render: (value) => `RM ${parseFloat(value || 0).toFixed(2)}`,
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
        <span style={{ color: isActive ? 'green' : 'red' }}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ marginBottom: '16px' }}>
          <FileTextOutlined style={{ marginRight: '8px' }} />
          Reports & Analytics
        </Title>
        
        <Row gutter={16} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={8} md={6}>
            <Select
              style={{ width: '100%' }}
              placeholder="Select Department"
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
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              style={{ width: '100%' }}
              value={selectedDateRange}
              onChange={setSelectedDateRange}
              placeholder={['Start Date', 'End Date']}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <DatePicker
              picker="year"
              style={{ width: '100%' }}
              value={dayjs().year(selectedYear)}
              onChange={(date) => setSelectedYear(date.year())}
              placeholder="Select Year for Yearly Reports"
            />
          </Col>
        </Row>

        {/* Quick Date Range Presets */}
        <Row gutter={8} style={{ marginBottom: '24px' }}>
          <Col>
            <Text type="secondary" style={{ marginRight: '8px' }}>Quick ranges:</Text>
          </Col>
          <Col>
            <Button size="small" onClick={() => setDefaultDateRange('last_30_days')}>
              Last 30 Days
            </Button>
          </Col>
          <Col>
            <Button size="small" onClick={() => setDefaultDateRange('last_3_months')}>
              Last 3 Months
            </Button>
          </Col>
          <Col>
            <Button size="small" onClick={() => setDefaultDateRange('last_6_months')}>
              Last 6 Months
            </Button>
          </Col>
          <Col>
            <Button size="small" onClick={() => setDefaultDateRange('current_year')}>
              Current Year
            </Button>
          </Col>
        </Row>

        {dashboardData && (
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col xs={12} sm={6}>
              <Statistic
                title="Total Departments"
                value={dashboardData.total_departments}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Total Drugs"
                value={dashboardData.total_drugs}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Active Enrollments"
                value={dashboardData.active_enrollments}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="Potential Defaulters"
                value={dashboardData.potential_defaulters}
                valueStyle={{ color: '#f5222d' }}
              />
            </Col>
          </Row>
        )}
      </Card>

      <Tabs 
        defaultActiveKey="cost-analysis"
        items={[
          {
            key: 'cost-analysis',
            label: 'Cost Analysis',
            children: (
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
              <Col>
                <Title level={4} style={{ margin: 0 }}>
                  <DollarOutlined style={{ marginRight: '8px' }} />
                  Cost Analysis Report
                </Title>
                <Text type="secondary">
                  Shows cost breakdown by department and drug for active enrollments with manual cost per day input
                </Text>
              </Col>
              <Col>
                <Space>
                  <Button onClick={fetchCostAnalysis} loading={loading}>
                    Generate Report
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('cost_analysis')}
                  >
                    Export Excel
                  </Button>
                </Space>
              </Col>
            </Row>

            {reportData.costAnalysis && (
              <>
                <Alert
                  message="Active Enrollments with Manual Cost Input Only"
                  description="This report shows only active enrollments that have manual 'Cost per Day' values entered. Enrollments without manual cost input are excluded from calculations."
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                <Table
                  columns={costAnalysisColumns}
                  dataSource={reportData.costAnalysis}
                  rowKey={(record, index) => `${record.department_name}-${record.drug_name}-${index}`}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 800 }}
                />
              </>
            )}
          </Card>
            )
          },
          {
            key: 'quota-utilization',
            label: 'Quota Utilization',
            children: (
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
              <Col>
                <Title level={4} style={{ margin: 0 }}>
                  <BarChartOutlined style={{ marginRight: '8px' }} />
                  Quota Utilization Report
                </Title>
              </Col>
              <Col>
                <Space>
                  <Button onClick={fetchQuotaUtilization} loading={loading}>
                    Generate Report
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('quota_utilization')}
                  >
                    Export Excel
                  </Button>
                </Space>
              </Col>
            </Row>

            {reportData.quotaUtilization && (
              <Table
                columns={quotaUtilizationColumns}
                dataSource={reportData.quotaUtilization}
                rowKey={(record, index) => `${record.department_name}-${record.drug_name}-${index}`}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
              />
            )}
          </Card>
            )
          },
          {
            key: 'defaulters',
            label: 'Defaulters',
            children: (
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
              <Col>
                <Title level={4} style={{ margin: 0 }}>
                  <WarningOutlined style={{ marginRight: '8px' }} />
                  Defaulter Report
                </Title>
                <Text type="secondary">
                  Shows patients who haven't had a refill for more than 6 months (excluding SPUB patients)
                </Text>
              </Col>
              <Col>
                <Space>
                  <Button onClick={fetchDefaulters} loading={loading}>
                    Generate Report
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('defaulters')}
                  >
                    Export Excel
                  </Button>
                </Space>
              </Col>
            </Row>

            {reportData.defaulters && (
              <>
                <Alert
                  message={`Found ${reportData.defaulters.length} potential defaulters`}
                  description="Patients with no refill for more than 6 months (excluding SPUB patients)"
                  type="warning"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                <Table
                  columns={defaultersColumns}
                  dataSource={reportData.defaulters}
                  rowKey={(record, index) => `${record.patient_name}-${record.drug_name}-${index}`}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 800 }}
                />
              </>
            )}
          </Card>
            )
          },
          {
            key: 'yearly-costs',
            label: 'Yearly Cost Report',
            children: (
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
              <Col>
                <Title level={4} style={{ margin: 0 }}>
                  <DollarOutlined style={{ marginRight: '8px' }} />
                  Yearly Cost Report ({selectedYear})
                </Title>
              </Col>
              <Col>
                <Space>
                  <Button onClick={fetchYearlyCosts} loading={loading}>
                    Generate Report
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('yearly_costs')}
                  >
                    Export Excel
                  </Button>
                </Space>
              </Col>
            </Row>

            {yearlyCostData && (
              <>
                {/* Summary Statistics */}
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                  <Col xs={12} sm={6}>
                    <Statistic
                      title="Total Yearly Cost (Active Only)"
                      value={yearlyCostData.summary.totalCost}
                      precision={2}
                      prefix="RM"
                      valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic
                      title="Total Enrollments"
                      value={yearlyCostData.summary.totalEnrollments}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic
                      title="Active Enrollments"
                      value={yearlyCostData.summary.activeEnrollments}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic
                      title="Avg Cost per Active Enrollment"
                      value={yearlyCostData.summary.averageCostPerEnrollment}
                      precision={2}
                      prefix="RM"
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                </Row>

                {/* Department Totals */}
                <Card size="small" style={{ marginBottom: '16px' }}>
                  <Title level={5}>Department Totals (Active Enrollments Only)</Title>
                  <Row gutter={16}>
                    {Object.entries(yearlyCostData.departmentTotals).map(([dept, data]) => (
                      <Col xs={12} sm={8} md={6} key={dept}>
                        <Statistic
                          title={dept}
                          value={data.total}
                          precision={2}
                          prefix="RM"
                          valueStyle={{ fontSize: '16px' }}
                        />
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {data.count} enrollments
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Card>

                {/* Help Message */}
                {yearlyCostData.summary.totalCost === 0 && (
                  <Alert
                    message="No Manual Costs Entered"
                    description="To see cost data in this report, please enter 'Cost per Day' values in the enrollment forms. Only active enrollments with manual cost per day input will be included in cost calculations."
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                )}
                
                {/* Information about active enrollments only */}
                <Alert
                  message="Active Enrollments Only"
                  description="This report includes only active enrollments in all cost calculations. Inactive enrollments are excluded from totals and averages."
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />

                {/* Detailed Table */}
                <Table
                  columns={yearlyCostColumns}
                  dataSource={yearlyCostData.enrollments}
                  rowKey={(record, index) => `${record.patient_name}-${record.drug_name}-${index}`}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1000 }}
                />
              </>
            )}
          </Card>
            )
          },
          {
            key: 'export-all',
            label: 'Export All Data',
            children: (
          <Card>
            <Title level={4} style={{ marginBottom: '16px' }}>
              <DownloadOutlined style={{ marginRight: '8px' }} />
              Export All Data
            </Title>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Button 
                  block
                  size="large"
                  onClick={() => handleExport('all_enrollments')}
                  icon={<UserOutlined />}
                >
                  Export All Enrollments
                </Button>
              </Col>
              <Col xs={24} sm={8}>
                <Button 
                  block
                  size="large"
                  onClick={() => handleExport('cost_analysis')}
                  icon={<DollarOutlined />}
                >
                  Export Cost Analysis
                </Button>
              </Col>
              <Col xs={24} sm={8}>
                <Button 
                  block
                  size="large"
                  onClick={() => handleExport('quota_utilization')}
                  icon={<MedicineBoxOutlined />}
                >
                  Export Quota Utilization
                </Button>
              </Col>
            </Row>
          </Card>
            )
          }
        ]}
      />
    </div>
  );
};

export default ReportsPage;
