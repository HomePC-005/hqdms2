const express = require('express');
const pool = require('../config/database');
const XLSX = require('xlsx');
const router = express.Router();

// Get quarterly cost analysis report
router.get('/cost-analysis', async (req, res) => {
  try {
    const { quarter, year, department_id } = req.query;
    
    let whereClause = 'WHERE e.is_active = true';
    const params = [];
    let paramCount = 0;
    
    if (quarter && year) {
      const quarterStart = getQuarterStartDate(quarter, year);
      const quarterEnd = getQuarterEndDate(quarter, year);
      paramCount += 2;
      whereClause += ` AND e.prescription_start_date <= $${paramCount} AND e.prescription_start_date >= $${paramCount - 1}`;
      params.push(quarterEnd, quarterStart);
    }
    
    if (department_id) {
      paramCount++;
      whereClause += ` AND d.department_id = $${paramCount}`;
      params.push(department_id);
    }
    
    const result = await pool.query(`
      SELECT 
        dept.name as department_name,
        d.name as drug_name,
        COUNT(e.id) as patient_count,
        SUM(CASE 
          WHEN e.cost_per_day > 0 AND e.is_active = true THEN e.cost_per_day * 365
          ELSE 0
        END) as total_annual_cost,
        AVG(CASE 
          WHEN e.cost_per_day > 0 AND e.is_active = true THEN e.cost_per_day * 365
          ELSE 0
        END) as avg_cost_per_patient,
        d.price as unit_price,
        d.calculation_method
      FROM enrollments e
      JOIN drugs d ON e.drug_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      ${whereClause}
      GROUP BY dept.name, d.id, d.name, d.price, d.calculation_method
      ORDER BY dept.name, total_annual_cost DESC
    `, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating cost analysis report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get quota utilization report
router.get('/quota-utilization', async (req, res) => {
  try {
    const { department_id } = req.query;
    
    let whereClause = '';
    const params = [];
    
    if (department_id) {
      whereClause = 'WHERE d.department_id = $1';
      params.push(department_id);
    }
    
    const result = await pool.query(`
      SELECT 
        dept.name as department_name,
        d.name as drug_name,
        d.quota_number,
        COUNT(e.id) as active_patients,
        d.quota_number - COUNT(e.id) as available_slots,
        ROUND((COUNT(e.id)::DECIMAL / NULLIF(d.quota_number, 0)) * 100, 2) as utilization_percentage,
        CASE 
          WHEN COUNT(e.id) >= d.quota_number THEN 'FULL'
          WHEN COUNT(e.id) >= d.quota_number * 0.8 THEN 'HIGH'
          WHEN COUNT(e.id) >= d.quota_number * 0.5 THEN 'MEDIUM'
          ELSE 'LOW'
        END as status
      FROM drugs d
      LEFT JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN enrollments e ON d.id = e.drug_id AND e.is_active = true
      ${whereClause}
      GROUP BY dept.name, d.id, d.name, d.quota_number
      ORDER BY dept.name, utilization_percentage DESC
    `, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating quota utilization report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get defaulter report
router.get('/defaulters', async (req, res) => {
  try {
    const { department_id, days_threshold } = req.query;
    const threshold = days_threshold || 180; // 6 months default
    
    let whereClause = 'WHERE e.is_active = true AND e.latest_refill_date IS NOT NULL';
    const params = [];
    let paramCount = 0;
    
    if (department_id) {
      paramCount++;
      whereClause += ` AND d.department_id = $${paramCount}`;
      params.push(department_id);
    }
    
    whereClause += ` AND e.latest_refill_date < CURRENT_DATE - INTERVAL '${threshold} days'`;
    
    const result = await pool.query(`
      SELECT 
        dept.name as department_name,
        d.name as drug_name,
        p.name as patient_name,
        p.ic_number,
        e.prescription_start_date,
        e.latest_refill_date,
        (CURRENT_DATE - e.latest_refill_date) as days_since_refill,
        e.spub,
        e.remarks
      FROM enrollments e
      JOIN drugs d ON e.drug_id = d.id
      JOIN patients p ON e.patient_id = p.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      ${whereClause}
      AND (e.spub = false OR e.spub IS NULL)
      ORDER BY dept.name, d.name, (CURRENT_DATE - e.latest_refill_date) DESC
    `, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error generating defaulter report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export all data to Excel
router.get('/export/excel', async (req, res) => {
  try {
    const { report_type } = req.query;
    
    let data = [];
    let filename = 'hqdms_export';
    
    switch (report_type) {
      case 'cost_analysis':
        const costData = await pool.query(`
          SELECT 
            dept.name as "Department",
            d.name as "Drug Name",
            COUNT(e.id) as "Patient Count",
            SUM(CASE 
              WHEN e.cost_per_day > 0 AND e.is_active = true THEN e.cost_per_day * 365
              ELSE 0
            END) as "Total Annual Cost",
            AVG(CASE 
              WHEN e.cost_per_day > 0 AND e.is_active = true THEN e.cost_per_day * 365
              ELSE 0
            END) as "Avg Cost per Patient",
            d.price as "Unit Price",
            d.calculation_method as "Calculation Method"
          FROM enrollments e
          JOIN drugs d ON e.drug_id = d.id
          LEFT JOIN departments dept ON d.department_id = dept.id
          WHERE e.is_active = true
          GROUP BY dept.name, d.id, d.name, d.price, d.calculation_method
          ORDER BY dept.name, SUM(CASE 
            WHEN e.cost_per_day > 0 AND e.is_active = true THEN e.cost_per_day * 365
            ELSE 0
          END) DESC
        `);
        data = costData.rows;
        filename = 'cost_analysis_report';
        break;
        
      case 'quota_utilization':
        const quotaData = await pool.query(`
          SELECT 
            dept.name as "Department",
            d.name as "Drug Name",
            d.quota_number as "Quota",
            COUNT(e.id) as "Active Patients",
            d.quota_number - COUNT(e.id) as "Available Slots",
            ROUND((COUNT(e.id)::DECIMAL / NULLIF(d.quota_number, 0)) * 100, 2) as "Utilization %"
          FROM drugs d
          LEFT JOIN departments dept ON d.department_id = dept.id
          LEFT JOIN enrollments e ON d.id = e.drug_id AND e.is_active = true
          GROUP BY dept.name, d.id, d.name, d.quota_number
          ORDER BY dept.name, ROUND((COUNT(e.id)::DECIMAL / NULLIF(d.quota_number, 0)) * 100, 2) DESC
        `);
        data = quotaData.rows;
        filename = 'quota_utilization_report';
        break;
        
      case 'defaulters':
        const defaultersData = await pool.query(`
          SELECT 
            dept.name as "Department",
            d.name as "Drug Name",
            p.name as "Patient Name",
            p.ic_number as "IC Number",
            e.prescription_start_date as "Start Date",
            e.latest_refill_date as "Latest Refill",
            (CURRENT_DATE - e.latest_refill_date) as "Days Since Refill",
            e.spub as "SPUB",
            e.remarks as "Remarks"
          FROM enrollments e
          JOIN drugs d ON e.drug_id = d.id
          JOIN patients p ON e.patient_id = p.id
          LEFT JOIN departments dept ON d.department_id = dept.id
          WHERE e.is_active = true 
            AND e.latest_refill_date IS NOT NULL
            AND e.latest_refill_date < CURRENT_DATE - INTERVAL '180 days'
            AND (e.spub = false OR e.spub IS NULL)
          ORDER BY dept.name, d.name, (CURRENT_DATE - e.latest_refill_date) DESC
        `);
        data = defaultersData.rows;
        filename = 'defaulters_report';
        break;
        
      case 'all_enrollments':
        const enrollmentData = await pool.query(`
          SELECT 
            dept.name as "Department",
            d.name as "Drug Name",
            p.name as "Patient Name",
            p.ic_number as "IC Number",
            e.dose_per_day as "Dose per Day",
            e.prescription_start_date as "Start Date",
            e.prescription_end_date as "End Date",
            e.latest_refill_date as "Latest Refill",
            e.cost_per_year as "Annual Cost",
            e.spub as "SPUB",
            e.remarks as "Remarks"
          FROM enrollments e
          JOIN drugs d ON e.drug_id = d.id
          JOIN patients p ON e.patient_id = p.id
          LEFT JOIN departments dept ON d.department_id = dept.id
          ORDER BY dept.name, d.name, p.name
        `);
        data = enrollmentData.rows;
        filename = 'all_enrollments';
        break;
        
      default:
        // Export all data
        const allData = await pool.query(`
          SELECT 
            dept.name as "Department",
            d.name as "Drug Name",
            p.name as "Patient Name",
            p.ic_number as "IC Number",
            e.dose_per_day as "Dose per Day",
            e.prescription_start_date as "Start Date",
            e.prescription_end_date as "End Date",
            e.latest_refill_date as "Latest Refill",
            e.cost_per_year as "Annual Cost",
            e.spub as "SPUB",
            e.is_active as "Active",
            e.remarks as "Remarks"
          FROM enrollments e
          JOIN drugs d ON e.drug_id = d.id
          JOIN patients p ON e.patient_id = p.id
          LEFT JOIN departments dept ON d.department_id = dept.id
          ORDER BY dept.name, d.name, p.name
        `);
        data = allData.rows;
        filename = 'complete_data_export';
    }
    
    // Create Excel workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.xlsx"`);
    
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM departments) as total_departments,
        (SELECT COUNT(*) FROM drugs) as total_drugs,
        (SELECT COUNT(*) FROM patients) as total_patients,
        (SELECT COUNT(*) FROM enrollments WHERE is_active = true) as active_enrollments,
        (SELECT COUNT(*) FROM enrollments WHERE is_active = false) as inactive_enrollments,
        (SELECT SUM(quota_number) FROM drugs) as total_quota,
        (SELECT SUM(cost_per_year) FROM enrollments WHERE is_active = true) as total_annual_cost,
        (SELECT COUNT(*) FROM enrollments 
         WHERE is_active = true 
         AND latest_refill_date < CURRENT_DATE - INTERVAL '6 months'
         AND (spub = false OR spub IS NULL)) as potential_defaulters
    `);
    
    res.json(summary.rows[0]);
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function getQuarterStartDate(quarter, year) {
  const q = parseInt(quarter);
  const y = parseInt(year);
  const month = (q - 1) * 3;
  return new Date(y, month, 1).toISOString().split('T')[0];
}

function getQuarterEndDate(quarter, year) {
  const q = parseInt(quarter);
  const y = parseInt(year);
  const month = q * 3;
  const lastDay = new Date(y, month, 0).getDate();
  return new Date(y, month - 1, lastDay).toISOString().split('T')[0];
}

module.exports = router;
