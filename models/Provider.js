const pool = require("../config/db");

class Provider {
    static async create(provider){
        const {f_id, name, level, slade_code, status} = provider;
        const [result] = await pool.query(
            'INSERT INTO provider(f_id, name, level, slade_code, status) VALUES(?,?,?,?,?)', [f_id, name, level, slade_code, status]
        );
        return result.insertId;
    }

    static async getall(){
        const [rows] = await pool.query(`
            SELECT * FROM provider ORDER BY created_at DESC
            `);
            return rows;
    }
    static async search(search) {
        let query = 'SELECT * FROM providers WHERE 1=1';
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
        const [result] = await pool.query(`DELETE FROM provider WHERE id = ?`, [id]);
        return result.affectedRows;
    }
    static async getProviderByFID(f_id) {
        const [rows] = await pool.query(`SELECT * FROM provider WHERE f_id = ?`, [f_id]);
        return rows[0];
    }
}

module.exports = Provider;