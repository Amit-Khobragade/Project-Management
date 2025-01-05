const Database = require('better-sqlite3');

const db = new Database('project-tables.db');

/**
 * Creates a new column in a table.
 * @param {string} tableName the name of the table
 * @param {string} name the name of the column to create
 * @param {string} type the type of the column to create
 * @returns {Object} A result object from the database
 */
function createColumn(tableName, name, type) {
  return db
    .prepare(`ALTER TABLE @tableName ADD COLUMN @name @type`)
    .run({ tableName, name, type });
}

/**
 * Deletes a column from a table. The column must already exist.
 * @param {string} tableName the name of the table
 * @param {string} name the name of the column to delete
 * @returns {Object} a result object from the database
 */
function deleteColumn(tableName, name) {
  return db
    .prepare(`ALTER TABLE @tableName DROP COLUMN @name`)
    .run({ tableName, name });
}

/**
 * Creates a new table with the given name, if it does not already exist.
 * The table will have an auto-incrementing id column.
 * @param {string} tableName the name of the table to create
 * @returns {Object} a result object from the database
 */
function createNewTable(tableName) {
  return db
    .function(
      `
    CREATE TABLE IF NOT EXISTS @tableName (
      id INTEGER PRIMARY KEY AUTOINCREMENT
    )
  `
    )
    .run({
      tableName,
    });
}

/**
 * Drops a table from the database if it exists.
 * @param {string} tableName - The name of the table to drop.
 * @returns {Object} A result object from the database.
 */

function dropTable(tableName) {
  return db
    .function(
      `
    DROP TABLE IF EXISTS @tableName
  `
    )
    .run({
      tableName,
    });
}

/**
 * Gets an array of all table names in the database, excluding the sqlite_sequence table.
 * @returns {string[]} An array of table names.
 */
function getAllTables() {
  const tables = db
    .prepare(
      `
      SELECT name 
      FROM sqlite_master 
      WHERE type='table'
      `
    )
    .all();
  return tables.filter((table) => table.name !== 'sqlite_sequence');
}

/**
 * Retrieves all data from a table in the database.
 * @param {string} tableName - The name of the table to retrieve data from.
 * @returns {Object[]} An array of objects, each representing a row in the table.
 */
function getTableData(tableName) {
  return db.prepare(`SELECT * FROM @tableName`).all({ tableName });
}

// Close the database on exit
process.on('exit', (code) => {
  db.close();
});

exports.default = {
  createColumn,
  deleteColumn,
  createNewTable,
  dropTable,
  getAllTables,
  getTableData,
};
