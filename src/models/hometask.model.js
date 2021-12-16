const query = require('../db/db-connection');
const { multipleColumnSet } = require('../utils/common.utils');

const getCurrentTimestamp = () => {
    return Math.floor(Date.now() / 1000);
}

const DONE_STATUS = 20;
const ACTIVE_STATUS = 10;
const DELETED_STATUS = 0;

class HomeTaskModel {
    tableName = 'hometask';

    findOne = async (params) => {
        const { columnSet, values } = multipleColumnSet(params)

        const sql = `SELECT * FROM ${this.tableName}
        WHERE ${columnSet}`;

        const result = await query(sql, [...values]);

        // return back the first row
        return result[0];
    }

    find = async (status) => {
        const sql = `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY updated_at DESC`;

        const result = await query(sql, [status]);

        return result;
    }

    create = async ({user_id, name, text, deadline_at}) => {
        const sql = `INSERT INTO ${this.tableName}
        (user_id, name, text, status, created_at, updated_at, deadline_at) VALUES (?,?,?,?,?,?,?)`;

        const result = await query(sql, [user_id, name, text, ACTIVE_STATUS, getCurrentTimestamp(), getCurrentTimestamp(), deadline_at]);
        const affectedRows = result ? result : 0;

        return affectedRows;
    }

    update = async (params, id) => {
        const { columnSet, values } = multipleColumnSet(params)
        const sql = `UPDATE hometask SET ${columnSet} WHERE id = ?`;

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

module.exports = new HomeTaskModel;
