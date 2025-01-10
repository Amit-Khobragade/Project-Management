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

/**
 * Retrieves remainders from the database based on the provided filters.
 * @param {Object} filters - The filters to apply to the query.
 * @param {number} [filters.id] - The ID of the remainder to retrieve.
 * @param {number} [filters.task_id] - The ID of the task to filter by.
 * @param {string} [filters.orderBy='remainder_date'] - The field to order the results by.
 * @param {string} [filters.sort='ASC'] - The sort order for the results (ASC or DESC).
 * @param {number} [filters.limit=50] - The maximum number of remainders to retrieve.
 * @returns {Promise<Array<Object>> | Promise<Object | null>} - An array of remainders or a single remainder.
 */
async function getRemainder(filters = {}) {
  const {
    id,
    task_id,
    orderBy = 'remainder_date',
    sort = 'ASC',
    limit = 50,
  } = filters;

  const conditions = [];
  const params = { limit };

  if (id !== undefined) {
    conditions.push('id = @id');
    params.id = id;
  }
  if (task_id !== undefined) {
    conditions.push('task_id = @task_id');
    params.task_id = task_id;
  }

  const whereClause =
    conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const query = `
    SELECT * FROM remainder 
    ${whereClause}
    ORDER BY ${orderBy} ${sort}
    LIMIT @limit
  `;

  const result = await database.prepare(query).all(params);
  return id ? result[0] || null : result;
}

/**
 * Adds or updates a remainder in the database.
 * @param {Object} remainder - The remainder object to add or update.
 * @param {number} [remainder.id] - The ID of the remainder to update.
 * @param {number} remainder.task_id - The ID of the task associated with the remainder.
 * @param {string} [remainder.remainder_date] - The date of the remainder.
 * @param {string} [remainder.reminder_time] - The time of the remainder.
 * @returns {Object} - The result of the database operation.
 */
function addOrUpdateRemainder({ id, task_id, remainder_date, reminder_time }) {
  if (!task_id) {
    throw new Error('Task ID is required');
  }

  const params = { task_id };
  const setClauses = ['task_id = @task_id'];

  if (remainder_date) {
    params.remainder_date = remainder_date;
    setClauses.push('remainder_date = @remainder_date');
  }

  if (reminder_time) {
    params.reminder_time = reminder_time;
    setClauses.push('reminder_time = @reminder_time');
  }

  const statement = id
    ? `UPDATE remainder SET ${setClauses.join(', ')} WHERE id = @id`
    : `INSERT INTO remainder (${Object.keys(params).join(', ')}) 
       VALUES (${Object.keys(params)
         .map((k) => `@${k}`)
         .join(', ')})`;

  if (id) params.id = id;

  const result = database.prepare(statement).run(params);
  return result;
}

/**
 * Removes a person from the database.
 * @param {number} id - The ID of the person to remove.
 * @returns {Object} - The result of the database operation.
 * @throws {Error} - If the ID is not provided or the person does not exist.
 */
function removePerson(id) {
  if (!id) {
    throw new Error('Person ID is required');
  }

  const person = database.prepare('SELECT * FROM person WHERE id = ?').get(id);
  if (!person) {
    throw new Error('Person not found');
  }

  const result = database.prepare('DELETE FROM person WHERE id = ?').run(id);
  return result;
}

/**
 * Removes a task from the database.
 * @param {number} id - The ID of the task to remove.
 * @returns {Object} - The result of the database operation.
 * @throws {Error} - If the ID is not provided or the task does not exist.
 */
function removeTask(id) {
  if (!id) {
    throw new Error('Task ID is required');
  }

  const task = database.prepare('SELECT * FROM task WHERE id = ?').get(id);
  if (!task) {
    throw new Error('Task not found');
  }

  // First remove any remainders associated with this task
  database.prepare('DELETE FROM remainder WHERE task_id = ?').run(id);

  const result = database.prepare('DELETE FROM task WHERE id = ?').run(id);
  return result;
}

/**
 * Removes a channel from the database.
 * @param {number} id - The ID of the channel to remove.
 * @returns {Object} - The result of the database operation.
 * @throws {Error} - If the ID is not provided or the channel does not exist.
 */
function removeChannel(id) {
  if (!id) {
    throw new Error('Channel ID is required');
  }

  const channel = database
    .prepare('SELECT * FROM channel WHERE id = ?')
    .get(id);
  if (!channel) {
    throw new Error('Channel not found');
  }

  const result = database.prepare('DELETE FROM channel WHERE id = ?').run(id);
  return result;
}

/**
 * Removes a remainder from the database.
 * @param {number} id - The ID of the remainder to remove.
 * @returns {Object} - The result of the database operation.
 * @throws {Error} - If the ID is not provided or the remainder does not exist.
 */
function removeRemainder(id) {
  if (!id) {
    throw new Error('Remainder ID is required');
  }

  const remainder = database
    .prepare('SELECT * FROM remainder WHERE id = ?')
    .get(id);
  if (!remainder) {
    throw new Error('Remainder not found');
  }

  const result = database.prepare('DELETE FROM remainder WHERE id = ?').run(id);
  return result;
}

module.exports = {
  getPersons,
  addOrUpdatePerson,
  getTasks,
  addOrUpdateTask,
  getChannels,
  addOrUpdateChannel,
  getRemainder,
  addOrUpdateRemainder,
  removePerson,
  removeTask,
  removeChannel,
  removeRemainder,
};
