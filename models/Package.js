const pool = require("../config/db");

class Package {
    static async create(package){
        const {} = package;
        const [result] = await pool.query(
            'INSERT INTO package(code, name) VALUES(?,?), [code, name]'
        );
        return result.insertId;
    }

    static async getall(){
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
    static async delete(id){
        const [result] = await pool.query(`DELETE FROM package WHERE id = ?`, [id]);
        return result.affectedRows;
    }
}

module.exports = Package;