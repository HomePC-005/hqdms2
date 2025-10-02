const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all drugs with department info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, dept.name as department_name,
             (SELECT COUNT(*) FROM enrollments e WHERE e.drug_id = d.id AND e.is_active = true) as current_active_patients
      FROM drugs d
      LEFT JOIN departments dept ON d.department_id = dept.id
      ORDER BY dept.name, d.name
    `);
    console.log('Drugs query result:', result.rows.length, 'drugs found');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching drugs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get drug by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT d.*, dept.name as department_name
      FROM drugs d
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drug not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching drug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new drug
router.post('/', async (req, res) => {
  try {
    const { name, department_id, quota_number, price, calculation_method, remarks } = req.body;
    
    const result = await pool.query(`
      INSERT INTO drugs (name, department_id, quota_number, price, calculation_method, remarks)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, department_id, quota_number, price, calculation_method, remarks]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating drug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update drug
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department_id, quota_number, price, calculation_method, remarks } = req.body;
    
    const result = await pool.query(`
      UPDATE drugs 
      SET name = $1, department_id = $2, quota_number = $3, price = $4, 
          calculation_method = $5, remarks = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [name, department_id, quota_number, price, calculation_method, remarks, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drug not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating drug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete drug
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if drug has active enrollments
    const enrollmentCheck = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE drug_id = $1 AND is_active = true',
      [id]
    );
    
    if (parseInt(enrollmentCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete drug with active patient enrollments' 
      });
    }
    
    const result = await pool.query('DELETE FROM drugs WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drug not found' });
    }
    
    res.json({ message: 'Drug deleted successfully' });
  } catch (error) {
    console.error('Error deleting drug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get drug quota status
router.get('/:id/quota-status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        d.name,
        d.quota_number,
        COUNT(e.id) as active_patients,
        (d.quota_number - COUNT(e.id)) as available_slots
      FROM drugs d
      LEFT JOIN enrollments e ON d.id = e.drug_id AND e.is_active = true
      WHERE d.id = $1
      GROUP BY d.id, d.name, d.quota_number
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Drug not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching quota status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
