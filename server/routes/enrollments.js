const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Test endpoint to check if there are any enrollments
router.get('/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as total FROM enrollments');
    const patientsResult = await pool.query('SELECT COUNT(*) as total FROM patients');
    const drugsResult = await pool.query('SELECT COUNT(*) as total FROM drugs');
    const patientsList = await pool.query('SELECT name, ic_number FROM patients LIMIT 5');
    const enrollmentsList = await pool.query(`
      SELECT e.*, p.name as patient_name, d.name as drug_name 
      FROM enrollments e 
      JOIN patients p ON e.patient_id = p.id 
      JOIN drugs d ON e.drug_id = d.id 
      LIMIT 5
    `);
    
    res.json({
      enrollments: result.rows[0].total,
      patients: patientsResult.rows[0].total,
      drugs: drugsResult.rows[0].total,
      samplePatients: patientsList.rows,
      sampleEnrollments: enrollmentsList.rows
    });
  } catch (error) {
    console.error('Test query error:', error);
    res.status(500).json({ error: 'Test query failed' });
  }
});

// Cleanup endpoint to delete all enrollments
router.delete('/cleanup', async (req, res) => {
  try {
    console.log('Starting enrollment cleanup...');
    
    // Show current state
    const beforeEnrollments = await pool.query('SELECT COUNT(*) as count FROM enrollments');
    const beforeDefaulters = await pool.query('SELECT COUNT(*) as count FROM defaulters');
    const beforeActive = await pool.query('SELECT COUNT(*) as count FROM enrollments WHERE is_active = true');
    
    console.log('Before cleanup:');
    console.log(`- Enrollments: ${beforeEnrollments.rows[0].count}`);
    console.log(`- Defaulters: ${beforeDefaulters.rows[0].count}`);
    console.log(`- Active Enrollments: ${beforeActive.rows[0].count}`);
    
    // Delete all enrollments
    await pool.query('DELETE FROM enrollments');
    console.log('✓ Deleted all enrollments');
    
    // Delete all defaulters
    await pool.query('DELETE FROM defaulters');
    console.log('✓ Deleted all defaulters');
    
    // Show final state
    const afterEnrollments = await pool.query('SELECT COUNT(*) as count FROM enrollments');
    const afterDefaulters = await pool.query('SELECT COUNT(*) as count FROM defaulters');
    const afterActive = await pool.query('SELECT COUNT(*) as count FROM enrollments WHERE is_active = true');
    
    console.log('After cleanup:');
    console.log(`- Enrollments: ${afterEnrollments.rows[0].count}`);
    console.log(`- Defaulters: ${afterDefaulters.rows[0].count}`);
    console.log(`- Active Enrollments: ${afterActive.rows[0].count}`);
    
    res.json({
      message: 'All enrollments and defaulters have been deleted successfully',
      before: {
        enrollments: beforeEnrollments.rows[0].count,
        defaulters: beforeDefaulters.rows[0].count,
        activeEnrollments: beforeActive.rows[0].count
      },
      after: {
        enrollments: afterEnrollments.rows[0].count,
        defaulters: afterDefaulters.rows[0].count,
        activeEnrollments: afterActive.rows[0].count
      }
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Get all enrollments with patient and drug info
router.get('/', async (req, res) => {
  try {
    const { drug_id, patient_id, active_only, search } = req.query;
    
    console.log('Enrollments API query params:', { drug_id, patient_id, active_only, search });
    
    let query = `
      SELECT 
        e.*,
        p.name as patient_name,
        p.ic_number,
        d.name as drug_name,
        d.department_id,
        dept.name as department_name
      FROM enrollments e
      JOIN patients p ON e.patient_id = p.id
      JOIN drugs d ON e.drug_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (drug_id) {
      paramCount++;
      query += ` AND e.drug_id = $${paramCount}`;
      params.push(drug_id);
    }
    
    if (patient_id) {
      paramCount++;
      query += ` AND e.patient_id = $${paramCount}`;
      params.push(patient_id);
    }
    
    if (active_only === 'true') {
      query += ` AND e.is_active = true`;
    } else if (active_only === 'false') {
      query += ` AND e.is_active = false`;
    }
    
    if (search) {
      paramCount++;
      query += ` AND (p.name ILIKE $${paramCount} OR p.ic_number ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY e.created_at DESC`;
    
    console.log('Final query:', query);
    console.log('Query params:', params);
    
    const result = await pool.query(query, params);
    console.log('Query result count:', result.rows.length);
    
    // If no search term and no results, show some sample data for debugging
    if (!search && result.rows.length === 0) {
      console.log('No enrollments found. Checking if we have patients and drugs...');
      const patientsCheck = await pool.query('SELECT COUNT(*) FROM patients');
      const drugsCheck = await pool.query('SELECT COUNT(*) FROM drugs');
      console.log('Patients in DB:', patientsCheck.rows[0].count);
      console.log('Drugs in DB:', drugsCheck.rows[0].count);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get enrollment by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        e.*,
        p.name as patient_name,
        p.ic_number,
        d.name as drug_name,
        d.department_id,
        dept.name as department_name
      FROM enrollments e
      JOIN patients p ON e.patient_id = p.id
      JOIN drugs d ON e.drug_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE e.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new enrollment
router.post('/', async (req, res) => {
  try {
    const { 
      drug_id, 
      patient_id, 
      dose_per_day, 
      prescription_start_date, 
      prescription_end_date, 
      spub, 
      remarks,
      cost_per_day
    } = req.body;
    
    console.log('Enrollment request:', { drug_id, patient_id, dose_per_day, prescription_start_date });
    
    // Check if quota is available
    const quotaCheck = await pool.query(`
      SELECT 
        d.quota_number,
        COUNT(e.id) as current_enrollments
      FROM drugs d
      LEFT JOIN enrollments e ON d.id = e.drug_id AND e.is_active = true
      WHERE d.id = $1
      GROUP BY d.id, d.quota_number
    `, [drug_id]);
    
    console.log('Quota check result:', quotaCheck.rows);
    
    if (quotaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Drug not found' });
    }
    
    const { quota_number, current_enrollments } = quotaCheck.rows[0];
    
    if (current_enrollments >= quota_number) {
      return res.status(400).json({ 
        error: 'Drug quota is full. Cannot enroll new patient.' 
      });
    }
    
    // Check if patient is already enrolled in this drug
    const existingEnrollment = await pool.query(
      'SELECT id FROM enrollments WHERE drug_id = $1 AND patient_id = $2',
      [drug_id, patient_id]
    );
    
    if (existingEnrollment.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Patient is already enrolled in this drug' 
      });
    }
    
    // Calculate cost per year only from manual cost_per_day input
    let cost_per_year = 0;
    
    if (cost_per_day && cost_per_day > 0) {
      // Use manual cost per day input
      cost_per_year = cost_per_day * 365;
    }
    
    const result = await pool.query(`
      INSERT INTO enrollments (
        drug_id, patient_id, dose_per_day, prescription_start_date, 
        prescription_end_date, spub, remarks, cost_per_year, cost_per_day
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      drug_id, patient_id, dose_per_day, prescription_start_date,
      prescription_end_date, spub, remarks, cost_per_year, cost_per_day || 0
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update enrollment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      dose_per_day, 
      prescription_start_date, 
      prescription_end_date, 
      latest_refill_date, 
      spub, 
      remarks,
      is_active,
      cost_per_day
    } = req.body;
    
    // Recalculate cost per year only from manual cost_per_day input
    let cost_per_year = null;
    if (cost_per_day !== undefined) {
      if (cost_per_day > 0) {
        // Use manual cost per day input
        cost_per_year = cost_per_day * 365;
      } else {
        // Reset to 0 if cost_per_day is 0 or null
        cost_per_year = 0;
      }
    }
    
    const result = await pool.query(`
      UPDATE enrollments 
      SET 
        dose_per_day = COALESCE($1, dose_per_day),
        prescription_start_date = COALESCE($2, prescription_start_date),
        prescription_end_date = COALESCE($3, prescription_end_date),
        latest_refill_date = COALESCE($4, latest_refill_date),
        spub = COALESCE($5, spub),
        remarks = COALESCE($6, remarks),
        cost_per_year = COALESCE($7, cost_per_year),
        is_active = COALESCE($8, is_active),
        cost_per_day = COALESCE($9, cost_per_day),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      dose_per_day, prescription_start_date, prescription_end_date,
      latest_refill_date, spub, remarks, cost_per_year, is_active, cost_per_day, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete enrollment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM enrollments WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    res.json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update refill date (quick update for counter staff)
router.patch('/:id/refill', async (req, res) => {
  try {
    const { id } = req.params;
    const { latest_refill_date } = req.body;
    
    const result = await pool.query(`
      UPDATE enrollments 
      SET latest_refill_date = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND is_active = true
      RETURNING *
    `, [latest_refill_date, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active enrollment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating refill date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate enrollment (remove from active list)
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const result = await pool.query(`
      UPDATE enrollments 
      SET is_active = false, remarks = COALESCE($1, remarks), updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [reason, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error deactivating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get potential defaulters (patients with refill date > 6 months ago)
router.get('/defaulters/potential', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.*,
        p.name as patient_name,
        p.ic_number,
        d.name as drug_name,
        d.department_id,
        dept.name as department_name,
        EXTRACT(DAYS FROM (CURRENT_DATE - e.latest_refill_date)) as days_since_refill
      FROM enrollments e
      JOIN patients p ON e.patient_id = p.id
      JOIN drugs d ON e.drug_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE e.is_active = true 
        AND e.latest_refill_date IS NOT NULL
        AND e.latest_refill_date < CURRENT_DATE - INTERVAL '6 months'
        AND (e.spub = false OR e.spub IS NULL)
      ORDER BY e.latest_refill_date ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching potential defaulters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Move patient to defaulter list
router.post('/:id/move-to-defaulter', async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    
    // Get enrollment details
    const enrollment = await pool.query(`
      SELECT e.*, p.name as patient_name, d.name as drug_name
      FROM enrollments e
      JOIN patients p ON e.patient_id = p.id
      JOIN drugs d ON e.drug_id = d.id
      WHERE e.id = $1
    `, [id]);
    
    if (enrollment.rows.length === 0) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    const enrollmentData = enrollment.rows[0];
    
    // Add to defaulter table
    await pool.query(`
      INSERT INTO defaulters (
        enrollment_id, drug_id, patient_id, last_refill_date, 
        days_since_refill, remarks
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      id,
      enrollmentData.drug_id,
      enrollmentData.patient_id,
      enrollmentData.latest_refill_date,
      Math.floor((new Date() - new Date(enrollmentData.latest_refill_date)) / (1000 * 60 * 60 * 24)),
      remarks || `Moved to defaulter list on ${new Date().toISOString().split('T')[0]}`
    ]);
    
    // Deactivate enrollment
    await pool.query(`
      UPDATE enrollments 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
    
    res.json({ message: 'Patient moved to defaulter list successfully' });
  } catch (error) {
    console.error('Error moving to defaulter list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get yearly cost reports
router.get('/reports/yearly-costs', async (req, res) => {
  try {
    const { year, department_id, drug_id } = req.query;
    const targetYear = year || new Date().getFullYear();
    
    let query = `
      SELECT 
        e.id,
        e.cost_per_day,
        e.cost_per_year,
        e.prescription_start_date,
        e.prescription_end_date,
        e.is_active,
        p.name as patient_name,
        p.ic_number,
        d.name as drug_name,
        dept.name as department_name,
        CASE 
          WHEN e.cost_per_day > 0 AND e.is_active = true THEN e.cost_per_day * 365
          ELSE 0
        END as calculated_yearly_cost
      FROM enrollments e
      JOIN patients p ON e.patient_id = p.id
      JOIN drugs d ON e.drug_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE EXTRACT(YEAR FROM e.prescription_start_date) = $1
    `;
    
    const params = [targetYear];
    let paramCount = 1;
    
    if (department_id) {
      paramCount++;
      query += ` AND d.department_id = $${paramCount}`;
      params.push(department_id);
    }
    
    if (drug_id) {
      paramCount++;
      query += ` AND e.drug_id = $${paramCount}`;
      params.push(drug_id);
    }
    
    query += ` ORDER BY dept.name, d.name, p.name`;
    
    const result = await pool.query(query, params);
    
    // Calculate totals
    const totalCost = result.rows.reduce((sum, row) => sum + parseFloat(row.calculated_yearly_cost || 0), 0);
    const activeEnrollments = result.rows.filter(row => row.is_active).length;
    const totalEnrollments = result.rows.length;
    
    // Group by department (only active enrollments)
    const departmentTotals = result.rows.reduce((acc, row) => {
      if (row.is_active) {
        const deptName = row.department_name || 'Unknown';
        if (!acc[deptName]) {
          acc[deptName] = { total: 0, count: 0 };
        }
        acc[deptName].total += parseFloat(row.calculated_yearly_cost || 0);
        acc[deptName].count += 1;
      }
      return acc;
    }, {});
    
    // Group by drug (only active enrollments)
    const drugTotals = result.rows.reduce((acc, row) => {
      if (row.is_active) {
        const drugName = row.drug_name;
        if (!acc[drugName]) {
          acc[drugName] = { total: 0, count: 0, department: row.department_name };
        }
        acc[drugName].total += parseFloat(row.calculated_yearly_cost || 0);
        acc[drugName].count += 1;
      }
      return acc;
    }, {});
    
    res.json({
      year: targetYear,
      summary: {
        totalCost: totalCost,
        activeEnrollments: activeEnrollments,
        totalEnrollments: totalEnrollments,
        averageCostPerEnrollment: activeEnrollments > 0 ? totalCost / activeEnrollments : 0
      },
      departmentTotals: departmentTotals,
      drugTotals: drugTotals,
      enrollments: result.rows
    });
  } catch (error) {
    console.error('Error fetching yearly cost report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
