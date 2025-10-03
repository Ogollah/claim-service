const pool = require("../config/db");

const ResultModel = {
  async getAllResults() {
    const [rows] = await pool.query('SELECT * FROM result');
    return rows;
  },

  async getResultById(id) {
    const [rows] = await pool.query('SELECT * FROM result WHERE id = ?', [id]);
    return rows[0];
  },

  async createResult(testcase_id, result_status, claim_id, response_id, status_code, message, detail, created_by, updated_by) {
    const [result] = await pool.query(
      'INSERT INTO result (testcase_id, result_status, claim_id, response_id, status_code, message, detail, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [testcase_id, result_status, claim_id, response_id, status_code, message, detail, created_by, updated_by]
    );
    return { id: result.insertId, testcase_id, result_status, claim_id, response_id, status_code, message, detail, created_by, updated_by };
  },

  async updateResult(id, result_status, updated_by) {
    await pool.query(
      'UPDATE result SET result_status = ?, updated_by = ? WHERE id = ?',
      [result_status, updated_by, id]
    );
    return { id, result_status, updated_by };
  },

  async deleteResult(id) {
    await pool.query('DELETE FROM result WHERE id = ?', [id]);
    return { message: 'Deleted successfully' };
  }
};

module.exports = ResultModel;
