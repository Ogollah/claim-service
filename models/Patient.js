const pool = require("../config/db");

class Patient {
    static async create(patient){
        const {cr_id, name, gender, birthdate, national_id, email, system_value} = patient;
        const [result] = await pool.query(
            'INSERT INTO patient(cr_id, name, gender, birthdate, national_id, email, system_value) VALUES(?,?,?,?,?,?,?)', [cr_id, name, gender, birthdate, national_id, email, system_value]
        );
        return result.insertId;
    }

    static async getall(){
        const [rows] = await pool.query(`
            SELECT * FROM patient ORDER BY created_at DESC
            `);
            return rows;
    }
    static async search(search) {
        let query = 'SELECT * FROM patients WHERE 1=1';
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
        const [result] = await pool.query(`DELETE FROM patient WHERE id = ?`, [id]);
        return result.affectedRows;
    }
    static async getByCrID(crId) {
        console.log('this id crid: ', crId);
        
        const [res] = await pool.query('SELECT * FROM patient WHERE cr_id = ?', [crId]);
        return res[0];
    }
    static async update(id, patient) {
        const { cr_id, name, gender, birthdate, national_id, email, system_value } = patient;
        const [result] = await pool.query(
            'UPDATE patient SET cr_id = ?, name = ?, gender = ?, birthdate = ?, national_id = ?, email = ?, system_value = ? WHERE id = ?',
            [cr_id, name, gender, birthdate, national_id, email, system_value, id]
        );
        return result.affectedRows;
    }
}

module.exports = Patient