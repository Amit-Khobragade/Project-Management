/**
 * This file is protected by the Open Software License (OSL) v. 3.0
 * https://opensource.org/licenses/OSL-3.0
 */
const { database } = require('./database.js').default;

/**
 * Retrieves a list of persons from the database based on the provided parameters.
 * @param {'ASC' | 'DESC'} [sort='ASC'] - The sort order for the results (either ascending or descending).
 * @param {boolean} [filterEmptyTasks=false] - Whether to filter out persons with empty tasks.
 * @param {number | null} [task_id=null] - The ID of the task to filter by, or null for no filter.
 * @param {number} [limit=50] - The maximum number of persons to retrieve.
 * @returns {Promise<Array<Object>>} - An array of persons matching the specified criteria.
 */
async function getPersons(
  sort = 'ASC',
  filterEmptyTasks = false,
  task_id = null,
  limit = 50
) {
  let whereCondition = filterEmptyTasks ? 'WHERE task_id IS NOT NULL ' : '';
  if (task_id) {
    whereCondition = `${filterEmptyTasks ? 'WHERE' : 'AND'} task_id = @taskId`;
  }

  const result = await database
    .prepare(
      'SELECT * FROM person ' +
        whereCondition +
        ' ORDER BY name @sort LIMIT @limit'
    )
    .all({
      task_id,
      sort,
      limit,
    });
  return result;
}

/**
 * Adds or updates a person in the database.
 * @param {Object} person - The person object to add or update.
 * @param {number} [person.id] - The ID of the person to update.
 * @param {string} person.name - The name of the person.
 * @param {number} [person.task_id] - The ID of the task associated with the person.
 * @returns {Object} - The result of the database operation.
 */
function addOrUpdatePerson({ id, name, task_id }) {
  const statement = id
    ? 'UPDATE person SET task_id = @task_id ' +
      (name ? 'name = @name ' : '') +
      'WHERE id = @id'
    : 'INSERT INTO person (name, task_id) VALUES (@name, @task_id)';
  const result = database.prepare(statement).run({
    name,
    task_id,
    id,
  });
  return result;
}

/**
 * Retrieves a list of tasks from the database based on the provided parameters.
 * @param {string} [orderBy='title'] - The field to order the results by (either title, start_date, or deadline).
 * @param {string} [sort='ASC'] - The sort order for the results (either ascending or descending).
 * @param {number} [limit=50] - The maximum number of tasks to retrieve.
 * @returns {Promise<Array<Object>>} - An array of tasks matching the specified criteria.
 */
async function getTasks(orderBy = 'title', sort = 'ASC', limit = 50) {
  const result = await database
    .prepare(`SELECT * FROM task ORDER BY @orderBy @sort LIMIT @limit`)
    .all({
      sort,
      limit,
      orderBy,
    });
  return result;
}

/**
 * Adds or updates a task in the database.
 * @param {Object} task - The task object to add or update.
 * @param {number} [task.id] - The ID of the task to update.
 * @param {string} task.title - The title of the task.
 * @param {number} [task.assigned_to] - The id of the person assigned to the task.
 * @param {number} [task.related_channel] - The id of the channel related to the task.
 * @param {string} [task.task_status] - The status of the task.
 * @param {string} [task.start_date] - The start date of the task.
 * @param {string} [task.deadline] - The due date of the task.
 * @returns {Object} - The result of the database operation.
 */
function addOrUpdateTask({
  id,
  title,
  assigned_to,
  related_channel,
  task_status,
  start_date,
  deadline,
}) {
  let statement = '';
  const params = {
    title,
    assigned_to,
    related_channel,
    task_status,
    start_date,
    deadline,
  };

  if (id) {
    const setClauses = [];
    if (title) setClauses.push('title = @title');
    if (assigned_to) setClauses.push('assigned_to = @assigned_to');
    if (related_channel) setClauses.push('related_channel = @related_channel');
    if (task_status) setClauses.push('task_status = @task_status');
    if (start_date) setClauses.push('start_date = @start_date');
    if (deadline) setClauses.push('deadline = @deadline');

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    statement = `UPDATE task SET ${setClauses.join(', ')} WHERE id = @id`;
    params.id = id; // Add `id` to parameters for the `WHERE` clause
  } else {
    // Handle the `INSERT` query
    statement = `
      INSERT INTO task (title, assigned_to, related_channel, task_status, start_date, deadline)
      VALUES (@title, @assigned_to, @related_channel, @task_status, @start_date, @deadline)
    `;
  }

  const result = database.prepare(statement).run(params);
  return result;
}

module.exports = {
  getPersons,
  addOrUpdatePerson,
  addOrUpdateTask,
  getTasks,
};
