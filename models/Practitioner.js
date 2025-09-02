const pool = require("../config/db");

class Practitioner {
    static async create(practitioner) {
        const { pu_id, name, gender, phone, address, national_id, email, status, slade_code, reg_number } = practitioner;
        const [result] = await pool.query(
            'INSERT INTO practitioner(pu_id, name, gender, phone, address, national_id, email, status, slade_code, reg_number) VALUES(?,?,?,?,?,?,?,?,?,?)', [pu_id, name, gender, phone, address, national_id, email, status, slade_code, reg_number]
        );
        return result.insertId;
    }

    static async update(id, practitioner) {
        const { pu_id, name, gender, phone, address, national_id, email, status, slade_code, reg_number } = practitioner;
        const [result] = await pool.query(
            'UPDATE practitioner SET pu_id = ?, name = ?, gender = ?, phone = ?, address = ?, national_id = ?, email = ?, status = ?, slade_code = ?, reg_number = ? WHERE pu_id = ?',
            [pu_id, name, gender, phone, address, national_id, email, status, slade_code, reg_number, id]
        );
        return result.affectedRows;
    }

    static async getall() {
        const [rows] = await pool.query(`
            SELECT * FROM practitioner ORDER BY created_at DESC
            `);
        return rows;
    }
    static async search(search) {
        let query = 'SELECT * FROM practitioner WHERE 1=1';
        const params = [];

        if (search.cr_id) {
            query += ' AND pu_id LIKE ?';
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
        const [result] = await pool.query(`DELETE FROM practitioner WHERE id = ?`, [id]);
        return result.affectedRows;
    }
    static async getPractitionerByPuID(pu_id) {
        const [rows] = await pool.query(`SELECT * FROM practitioner WHERE pu_id = ?`, [pu_id]);
        return rows[0]
    }
}

module.exports = Practitioner;