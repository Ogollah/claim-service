const pool = require('../config/db');

class COPClaim {
    static async create(claim_id) {
        const [result] = await pool.query(
            'INSERT INTO copclaims(claim_id) VALUES(?)', [claim_id]
        );
        const [rows] = await pool.query('SELECT * FROM copclaims WHERE id = ?', [result.insertId]);
        return rows[0];
    }

    static async getByClaimId(claim_id) {
        const [rows] = await pool.query('SELECT * FROM copclaims WHERE claim_id = ?', [claim_id]);
        return rows;
    }
}

module.exports = COPClaim;