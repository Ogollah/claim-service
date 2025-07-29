const pool = require("../config/db");

class Practitioner {
    static async create(practitioner){
        const {pu_id, name, gender, phone, address, national_id, email, status} = practitioner;
        const [result] = await pool.query(
            'INSERT INTO practitioner(pu_id, name, gender, phone, address, national_id, email, status) VALUES(?,?,?,?,?,?,?,?)', [pu_id, name, gender, phone, address, national_id, email, status]
        );
        return result.insertId;
    }

    static async getall(){
        const [rows] = await pool.query(`
            SELECT * FROM practitioner ORDER BY created_at DESC
            `);
            return rows;
    }
    static async search(search) {
        let query = 'SELECT * FROM practitioners WHERE 1=1';
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
        const [result] = await pool.query(`DELETE FROM practitioner WHERE id = ?`, [id]);
        return result.affectedRows;
    }
}

module.exports = Practitioner;