const query = require('../db/db-connection');
const { multipleColumnSet } = require('../utils/common.utils');

const getCurrentTimestamp = () => {
    return Math.floor(Date.now() / 1000);
}

const DONE_STATUS = 20;
const ACTIVE_STATUS = 10;
const DELETED_STATUS = 0;

class NoteModel {
    tableName = 'user_notes';

    findOne = async (params) => {
        const { columnSet, values } = multipleColumnSet(params)

        const sql = `SELECT * FROM ${this.tableName}
        WHERE ${columnSet}`;

        const result = await query(sql, [...values]);

        // return back the first row
        return result[0];
    }

    find = async (user_id, status) => {
        const sql = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND status = ?`;

        const result = await query(sql, [user_id, status]);

        return result;
    }

    create = async ({user_id, name, text}) => {
        const sql = `INSERT INTO ${this.tableName}
        (user_id, name, text, status, created_at, updated_at) VALUES (?,?,?,?,?,?)`;

        const result = await query(sql, [user_id, name, text, ACTIVE_STATUS, getCurrentTimestamp(), getCurrentTimestamp()]);
        const affectedRows = result ? result.affectedRows : 0;

        return affectedRows;
    }

    update = async (params, id) => {
        const { columnSet, values } = multipleColumnSet(params)
        const sql = `UPDATE user_notes SET ${columnSet} WHERE id = ?`;

        const result = await query(sql, [...values, id]);

        return result;
    }

    // delete = async (id) => {
    //     const sql = `DELETE FROM ${this.tableName}
    //     WHERE id = ?`;
    //     const result = await query(sql, [id]);
    //     const affectedRows = result ? result.affectedRows : 0;

    //     return affectedRows;
    // }
}

module.exports = new NoteModel;
