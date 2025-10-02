const express = require('express');
const pool = require('../config/database');
const router = express.Router();

// Get all patients
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM patients ORDER BY name';
    let params = [];
    
    if (search) {
      query = `
        SELECT * FROM patients 
        WHERE name ILIKE $1 OR ic_number ILIKE $1 
        ORDER BY name
      `;
      params = [`%${search}%`];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new patient
router.post('/', async (req, res) => {
  try {
    const { name, ic_number } = req.body;
    
    // Check if IC number already exists
    const existingPatient = await pool.query(
      'SELECT id FROM patients WHERE ic_number = $1',
      [ic_number]
    );
    
    if (existingPatient.rows.length > 0) {
      return res.status(400).json({ error: 'Patient with this IC number already exists' });
    }
    
    const result = await pool.query(
      'INSERT INTO patients (name, ic_number) VALUES ($1, $2) RETURNING *',
      [name, ic_number]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update patient
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ic_number } = req.body;
    
    // Check if IC number already exists for different patient
    const existingPatient = await pool.query(
      'SELECT id FROM patients WHERE ic_number = $1 AND id != $2',
      [ic_number, id]
    );
    
    if (existingPatient.rows.length > 0) {
      return res.status(400).json({ error: 'IC number already exists for another patient' });
    }
    
    const result = await pool.query(
      'UPDATE patients SET name = $1, ic_number = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, ic_number, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if patient has active enrollments
    const enrollmentCheck = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE patient_id = $1 AND is_active = true',
      [id]
    );
    
    if (parseInt(enrollmentCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete patient with active drug enrollments' 
      });
    }
    
    const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient enrollments
router.get('/:id/enrollments', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        e.*,
        d.name as drug_name,
        dept.name as department_name
      FROM enrollments e
      JOIN drugs d ON e.drug_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE e.patient_id = $1
      ORDER BY e.created_at DESC
    `, [id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching patient enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
