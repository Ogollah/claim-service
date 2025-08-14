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

  async createResult(testcase_id, result_status, claim_id, response_id, status_code, message, detail) {
    const [result] = await pool.query(
      'INSERT INTO result (testcase_id, result_status, claim_id, response_id, status_code, message, detail) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testcase_id, result_status, claim_id, response_id, status_code, message, detail]
    );
    return { id: result.insertId, testcase_id, result_status, claim_id, response_id, status_code, message, detail };
  },

  async updateResult(id, result_status) {
    await pool.query(
      'UPDATE result SET result_status = ? WHERE id = ?',
      [result_status, id]
    );
    return { id, result_status };
  },

  async deleteResult(id) {
    await pool.query('DELETE FROM result WHERE id = ?', [id]);
    return { message: 'Deleted successfully' };
  }
};

module.exports = ResultModel;
