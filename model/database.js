/**
 * This file is protected by the Open Software License (OSL) v. 3.0
 * https://opensource.org/licenses/OSL-3.0
 *
 * This file contains the database connection and initalizes the database tables if they don't exist
 */
const Database = require('better-sqlite3');

const db = new Database('project-tables.db');

// drop all tables only enable for testing
// db.prepare(`DROP TABLE IF EXISTS person`).run();
// db.prepare(`DROP TABLE IF EXISTS task`).run();
// db.prepare(`DROP TABLE IF EXISTS channel`).run();
// db.prepare(`DROP TABLE IF EXISTS remainder`).run();

// creating a person table
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS person (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    task_id INTEGER,
    FOREIGN KEY(task_id) REFERENCES task(id)
  )
`
).run();

// creating a task table
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS task (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    assigned_to INTEGER,
    related_channel INTEGER,
    task_status TEXT,
    start_date TEXT,
    deadline TEXT,
    FOREIGN KEY(assigned_to) REFERENCES person(id),
    FOREIGN KEY(related_channel) REFERENCES channel(id)
  )
`
).run();

// creating a channel table
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS channel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_name TEXT NOT NULL
  )
`
).run();

// creating a remainder table
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS remainder (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    remainder_date TEXT NOT NULL,
    reminder_time TEXT NOT NULL,
    FOREIGN KEY(task_id) REFERENCES task(id)
  )
`
).run();

// Close the database on exit
process.on('exit', (code) => {
  db.close();
});

exports.default = {
  database: db,
};
