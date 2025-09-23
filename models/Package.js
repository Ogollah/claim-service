const pool = require("../config/db");

class Package {
    static async create(shaPackage) {
        const { code, name } = shaPackage;
        const [result] = await pool.query(
            'INSERT INTO package(code, name) VALUES(?,?)', [code, name]
        );
        const [rows] = await pool.query('SELECT * FROM package WHERE id = ?', [result.insertId]);
        return rows[0];
    }

    static async getall() {
        const [rows] = await pool.query(`
            SELECT * FROM package ORDER BY created_at DESC
            `);
        return rows;
    }
    static async search(search) {
        let query = 'SELECT * FROM packages WHERE 1=1';
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
        await pool.query(`DELETE FROM intervention WHERE package_id = ?`, [id]);
        const [result] = await pool.query(`DELETE FROM package WHERE id = ?`, [id]);
        return result.affectedRows;
    }
    // static async delete(id) {
    //     const [result] = await pool.query(`DELETE FROM package WHERE id = ?`, [id]);
    //     return result.affectedRows;
    // }
    static async getPackageByPreauthFlag(is_preauth) {
        const [res] = await pool.query(`SELECT * FROM package WHERE is_preauth = ?`, [is_preauth]);
        console.log('response:', res, is_preauth);
        return res;
    }
    static async updatePreauthFlag(id, is_preauth) {
        const [result] = await pool.query(`UPDATE package SET is_preauth = ? WHERE id = ?`, [is_preauth, id]);
        return result.affectedRows;
    }
    static async updatePackage(id, shaPackage) {
        const { code, name } = shaPackage;
        const [result] = await pool.query(`UPDATE package SET name = ?, code = ? WHERE id = ?`, [name, code, id]);
        const [rows] = await pool.query('SELECT * FROM package WHERE id = ?', [id]);
        return rows[0];
    }
}

module.exports = Package;