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
 * Retrieves a list of tasks from the database based on the provided filters.
 * @param {Object} filters - The filters to apply to the query.
 * @param {number} [filters.id] - The ID of the task to retrieve.
 * @param {number} [filters.assignedTo] - The ID of the person assigned to the task.
 * @param {number} [filters.relatedChannel] - The ID of the related channel.
 * @param {string} [filters.taskStatus] - The status of the task.
 * @param {string} [filters.orderBy='title'] - The field to order the results by.
 * @param {string} [filters.sort='ASC'] - The sort order for the results (ASC or DESC).
 * @param {number} [filters.limit=50] - The maximum number of tasks to retrieve.
 * @returns {Promise<Array<Object>> | Promise<Object | null>} - An array of tasks or a single task.
 */
async function getTasks(filters = {}) {
  const {
    id,
    assignedTo,
    relatedChannel,
    taskStatus,
    orderBy = 'title',
    sort = 'ASC',
    limit = 50,
  } = filters;

  const conditions = [];
  const params = {};

  if (id !== undefined) {
    conditions.push('id = @id');
    params.id = id;
  }
  if (assignedTo !== undefined) {
    conditions.push('assigned_to = @assignedTo');
    params.assignedTo = assignedTo;
  }
  if (relatedChannel !== undefined) {
    conditions.push('related_channel = @relatedChannel');
    params.relatedChannel = relatedChannel;
  }
  if (taskStatus !== undefined) {
    conditions.push('task_status = @taskStatus');
    params.taskStatus = taskStatus;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';
  const query = `
    SELECT * FROM task
    ${whereClause}
    ORDER BY ${orderBy} ${sort}
    LIMIT @limit
  `;

  params.limit = limit;

  const result =
    id !== undefined
      ? await database.prepare(query).get(params) // Return single task for ID filter
      : await database.prepare(query).all(params); // Return list of tasks for other filters

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

/**
 * Retrieves channels from the database based on the provided filters.
 * @param {Object} filters - The filters to apply to the query.
 * @param {number} [filters.id] - The ID of the channel to retrieve.
 * @param {string} [filters.orderBy='channel_name'] - The field to order the results by.
 * @param {string} [filters.sort='ASC'] - The sort order for the results (ASC or DESC).
 * @param {number} [filters.limit=50] - The maximum number of channels to retrieve.
 * @returns {Promise<Array<Object>> | Promise<Object | null>} - An array of channels or a single channel.
 */
async function getChannels(filters = {}) {
  const { id, orderBy = 'channel_name', sort = 'ASC', limit = 50 } = filters;

  const conditions = [];
  const params = {};

  if (id !== undefined) {
    conditions.push('id = @id');
    params.id = id;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';
  const query = `
    SELECT * FROM channel
    ${whereClause}
    ORDER BY ${orderBy} ${sort}
    LIMIT @limit
  `;

  params.limit = limit;

  const result =
    id !== undefined
      ? await database.prepare(query).get(params) // Return single channel for ID filter
      : await database.prepare(query).all(params); // Return list of channels for other filters

  return result;
}

/**
 * Adds or updates a channel in the database.
 * @param {Object} channel - The channel object to add or update.
 * @param {number} [channel.id] - The ID of the channel to update.
 * @param {string} channel.channel_name - The name of the channel.
 * @returns {Object} - The result of the database operation.
 */
function addOrUpdateChannel({ id, channel_name }) {
  let statement = '';
  const params = {
    channel_name,
  };

  if (id) {
    statement = `UPDATE channel SET channel_name = @channel_name WHERE id = @id`;
    params.id = id;
  } else {
    statement = `INSERT INTO channel (channel_name) VALUES (@channel_name)`;
  }

  const result = database.prepare(statement).run(params);
  return result;
}

module.exports = {
  getPersons,
  addOrUpdatePerson,
  addOrUpdateTask,
  getTasks,
  getChannels,
  addOrUpdateChannel,
};
