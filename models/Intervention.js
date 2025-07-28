const pool = require("../config/db");

class Intervention {
    static async create(intervention){
        const {} = intervention;
        const [result] = await pool.query(
            'INSERT INTO intervention(code, name) VALUES(?,?), [code, name]'
        );
        return result.insertId;
    }

    static async getall(){
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
    static async delete(id){
        const [result] = await pool.query(`DELETE FROM intervention WHERE id = ?`, [id]);
        return result.affectedRows;
    }
}

module.exports = Intervention;