const express = require('express');
const router = express.Router();
const { queryAll, queryGet } = require('../config/db');

// GET /api/doctors/specialties/all
router.get('/specialties/all', async (req, res) => {
  try {
    const rows = await queryAll('SELECT DISTINCT specialty FROM doctors ORDER BY specialty ASC');
    const specialties = rows.map((r) => r.specialty);
    res.json({ success: true, specialties });
  } catch (error) {
    console.error('Fetch Specialties Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctor specialties.' });
  }
});

// GET /api/doctors (Search, Filter, Sort, Pagination)
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      specialty = '',
      sortBy = 'rating',
      order = 'DESC',
      page = 1,
      limit = 6
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 6;
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search.trim() !== '') {
      whereClause += ' AND (name LIKE ? OR specialty LIKE ? OR clinic_address LIKE ? OR city LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (specialty.trim() !== '' && specialty !== 'All') {
      whereClause += ' AND specialty = ?';
      params.push(specialty.trim());
    }

    // Validate sort parameters to prevent SQL injection
    const allowedSortFields = ['rating', 'fee', 'experience', 'name'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'rating';
    const validOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total records for pagination info
    const countSql = `SELECT COUNT(*) as total FROM doctors ${whereClause}`;
    const countResult = await queryGet(countSql, params);
    const totalRecords = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(totalRecords / limitNum);

    // Fetch paginated & sorted records
    const dataSql = `
      SELECT * FROM doctors
      ${whereClause}
      ORDER BY ${validSortBy} ${validOrder}
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, limitNum, offset];
    const doctors = await queryAll(dataSql, dataParams);

    // Format available_days JSON string to array
    const formattedDoctors = doctors.map((doc) => ({
      ...doc,
      available_days: JSON.parse(doc.available_days || '[]')
    }));

    res.json({
      success: true,
      data: formattedDoctors,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: {
        search,
        specialty,
        sortBy: validSortBy,
        order: validOrder
      }
    });
  } catch (error) {
    console.error('Fetch Doctors Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors list.' });
  }
});

// GET /api/doctors/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await queryGet('SELECT * FROM doctors WHERE id = ?', [id]);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    doctor.available_days = JSON.parse(doctor.available_days || '[]');
    res.json({ success: true, doctor });
  } catch (error) {
    console.error('Fetch Doctor Details Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctor details.' });
  }
});

module.exports = router;
