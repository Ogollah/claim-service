const pool = require("../config/db");

class TestCase {
    static async create(testcase){
        const {intervention_id, name, description, code, test_config} = testcase;
        console.log(testcase);
        
        const [result] = await pool.query(
            'INSERT INTO testcase(intervention_id, name, description, code, test_config) VALUES(?,?,?,?,?)', [intervention_id, name, description, code, JSON.stringify(test_config)]
        );
        return result.insertId;
    }

    static async getall(){
        const [rows] = await pool.query(`
            SELECT * FROM testcase ORDER BY created_at DESC
            `);
            return rows;
    }
    static async search(search) {
        let query = 'SELECT * FROM testcase WHERE 1=1';
        const params = [];

        if (search.cr_id) {
            query += ' AND cr_id LIKE ?';
            params.push(`%${search.cr_id}%`);
        }
        
        if (search.gender) {
            query += ' AND gender = ?';
            params.push(search.gender);
        }
        query += ' LIMIT 100';
        
        const [rows] = await pool.query(query, params);
        return rows;
    }
    static async delete(id){
        const [result] = await pool.query(`DELETE FROM testcase WHERE id = ?`, [id]);
        return result.affectedRows;
    }
    static async getTestCaseByCode(code) {
        const [result] = await pool.query(`SELECT * FROM testcase WHERE code = ?`, [code]);
        return result;
    }
    static async updateTestConfig(id, newTestConfig) {
        const [result] = await pool.query(
            'UPDATE testcase SET test_config = ? WHERE id = ?',
            [JSON.stringify(newTestConfig), id]
        );
        return result.affectedRows;
    }
}

module.exports = TestCase;