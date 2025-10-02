const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all departments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.*,
        COUNT(dr.id) as drug_count,
        COUNT(e.id) as total_enrollments
      FROM departments d
      LEFT JOIN drugs dr ON d.id = dr.department_id
      LEFT JOIN enrollments e ON dr.id = e.drug_id AND e.is_active = true
      GROUP BY d.id, d.name, d.created_at, d.updated_at
      ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        d.*,
        COUNT(dr.id) as drug_count,
        COUNT(e.id) as total_enrollments
      FROM departments d
      LEFT JOIN drugs dr ON d.id = dr.department_id
      LEFT JOIN enrollments e ON dr.id = e.drug_id AND e.is_active = true
      WHERE d.id = $1
      GROUP BY d.id, d.name, d.created_at, d.updated_at
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new department
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    // Check if department already exists
    const existingDept = await pool.query(
      'SELECT id FROM departments WHERE name = $1',
      [name]
    );
    
    if (existingDept.rows.length > 0) {
      return res.status(400).json({ error: 'Department already exists' });
    }
    
    const result = await pool.query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING *',
      [name]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update department
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    // Check if department name already exists for different department
    const existingDept = await pool.query(
      'SELECT id FROM departments WHERE name = $1 AND id != $2',
      [name, id]
    );
    
    if (existingDept.rows.length > 0) {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    
    const result = await pool.query(
      'UPDATE departments SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [name, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete department
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if department has drugs
    const drugCheck = await pool.query(
      'SELECT COUNT(*) FROM drugs WHERE department_id = $1',
      [id]
    );
    
    if (parseInt(drugCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete department with associated drugs' 
      });
    }
    
    const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get department summary with quota status
router.get('/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        d.name as department_name,
        COUNT(dr.id) as total_drugs,
        SUM(dr.quota_number) as total_quota,
        COUNT(e.id) as total_active_patients,
        SUM(dr.quota_number) - COUNT(e.id) as available_slots,
        ROUND((COUNT(e.id)::DECIMAL / NULLIF(SUM(dr.quota_number), 0)) * 100, 2) as quota_utilization_percentage
      FROM departments d
      LEFT JOIN drugs dr ON d.id = dr.department_id
      LEFT JOIN enrollments e ON dr.id = e.drug_id AND e.is_active = true
      WHERE d.id = $1
      GROUP BY d.id, d.name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching department summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
