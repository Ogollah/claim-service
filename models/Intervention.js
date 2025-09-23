const pool = require("../config/db");

class Intervention {
    static async create(intervention) {
        const { package_id, code, name, is_complex } = intervention;
        const [result] = await pool.query(
            'INSERT INTO intervention(package_id, code, name, is_complex) VALUES(?,?,?,?)', [package_id, code, name, is_complex]
        );
        const [rows] = await pool.query('SELECT * FROM intervention WHERE id = ?', [result.insertId]);
        return rows[0];
    }

    static async update(id, intervention) {
        const { package_id, code, name, is_complex } = intervention;
        const [result] = await pool.query(
            'UPDATE intervention SET package_id = ?, code = ?, name = ?, is_complex = ? WHERE id = ?', [package_id, code, name, is_complex, id]
        );
        const [rows] = await pool.query('SELECT * FROM intervention WHERE id = ?', [id]);
        return rows[0];
    }

    static async getall() {
        const [rows] = await pool.query(`
            SELECT * FROM intervention ORDER BY created_at DESC
            `);
        return rows;
    }
    static async search(search) {
        let query = 'SELECT * FROM interventions WHERE 1=1';
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
    static async delete(id) {
        const [result] = await pool.query(`DELETE FROM intervention WHERE id = ?`, [id]);
        return result.affectedRows;
    }
    static async getInterventionByPackageId(package_id) {
        const [res] = await pool.query(`SELECT * FROM intervention WHERE package_id = ?`, [package_id]);
        return res;
    }

    static async getInterventionByCode(code) {
        const [res] = await pool.query(`SELECT * FROM intervention WHERE code = ?`, [code]);
        return res;
    }
    static async getInterventionByComplex(is_complex) {
        const [res] = await pool.query(`SELECT * FROM intervention WHERE is_complex = ?`, [is_complex]);
        return res;
    }
}

module.exports = Intervention;