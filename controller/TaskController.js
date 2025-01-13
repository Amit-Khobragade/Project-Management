/**
 * This file is protected by the Open Software License (OSL) v. 3.0
 * https://opensource.org/licenses/OSL-3.0
 */

const model = require('../model/model.js');

/**
 * Controller class for managing task-related operations with chainable methods
 * @class TaskController
 */
class TaskController {
  /** @private {string} Sort direction for task listing */
  _sort = 'ASC';

  /** @private {Array<Object>} Array containing task records */
  _taskTable = [];

  /** @private {Promise<void>} Tracks pending operations */
  _pendingOperation = Promise.resolve();

  /**
   * @private {Object} Filter settings for task queries
   * @property {number|null} assignedTo - Filter by assigned person ID
   * @property {string|null} relatedChannel - Filter by related channel
   * @property {string|null} taskStatus - Filter by task status
   */
  _filters = {
    assignedTo: null,
    relatedChannel: null,
    taskStatus: null,
  };

  /**
   * Creates an instance of TaskController and initializes the task table
   * @constructor
   * @returns {TaskController} The TaskController instance
   */
  constructor() {
    this._pendingOperation = this.refresh();
    return this;
  }

  /**
   * Refreshes the task table with current filters and sort settings
   * @async
   * @returns {Promise<TaskController>} The TaskController instance
   */
  async refresh() {
    this._taskTable = await model.getTaskDetailsTable({
      sort: this._sort,
      sortBy: 'title',
      limit: 50,
      ...this._filters,
    });
    return this;
  }

  /**
   * Queues an operation to be executed after previous operations complete
   * @private
   * @param {Function} operation - Async operation to queue
   * @returns {TaskController} The TaskController instance for chaining
   */
  _queueOperation(operation) {
    this._pendingOperation = this._pendingOperation.then(operation);
    return this;
  }

  /**
   * Waits for all pending operations to complete
   * @async
   * @returns {Promise<TaskController>} The TaskController instance
   */
  async ready() {
    await this._pendingOperation;
    return this;
  }

  /**
   * Adds a new task or updates an existing one in the database
   * @param {Object} task - Task object to add or update
   * @param {string} task.title - Title of the task
   * @param {string} [task.description] - Description of the task
   * @param {number} [task.assignedTo] - ID of the person assigned to the task
   * @param {string} [task.status] - Current status of the task
   * @param {string} [task.relatedChannel] - Channel related to the task
   * @returns {TaskController} The TaskController instance
   */
  addTask(task) {
    return this._queueOperation(async () => {
      await model.addOrUpdateTask(task);
      await this.refresh();
    });
  }

  /**
   * Updates an existing task in the database
   * @param {number} taskId - ID of the task to update
   * @param {Object} updates - Object containing the fields to update
   * @param {string} [updates.title] - Updated title of the task
   * @param {string} [updates.description] - Updated description of the task
   * @param {number} [updates.assignedTo] - Updated ID of the person assigned to the task
   * @param {string} [updates.status] - Updated status of the task
   * @param {string} [updates.relatedChannel] - Updated channel related to the task
   * @returns {TaskController} The TaskController instance
   */
  updateTask(taskId, updates) {
    return this._queueOperation(async () => {
      await model.addOrUpdateTask({ id: taskId, ...updates });
      await this.refresh();
    });
  }

  /**
   * Removes a task from the database by its ID
   * @param {number} taskId - The ID of the task to remove
   * @returns {TaskController} The TaskController instance
   */
  removeTask(taskId) {
    return this._queueOperation(async () => {
      await model.removeTask(taskId);
      await this.refresh();
    });
  }

  /**
   * Adds new filters to the existing filter set
   * @param {Object} filter - Filter object to merge with existing filters
   * @param {number} [filter.assignedTo] - Filter by assigned person ID
   * @param {string} [filter.relatedChannel] - Filter by related channel
   * @param {string} [filter.taskStatus] - Filter by task status
   * @param {number} [filter.id] - Filter by specific task ID
   * @returns {TaskController} The TaskController instance
   */
  addFilter(filter) {
    this._filters = { ...this._filters, ...filter };
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Sets the sort direction for the task table
   * @param {'ASC'|'DESC'} sort - Sort direction ('ASC' or 'DESC')
   * @returns {TaskController} The TaskController instance
   */
  addSort(sort) {
    this._sort = sort;
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Gets the current task table
   * @returns {Array<Object>} Array of task records
   */
  getTaskTable() {
    return this._taskTable;
  }

  /**
   * Marks a task as complete by updating its status to 'Completed'
   * @param {number} taskId - ID of the task to mark as complete
   * @returns {TaskController} The TaskController instance
   */
  markTaskComplete(taskId) {
    return this.updateTask(taskId, { taskStatus: 'Completed' });
  }

  /**
   * Retrieves detailed task information with additional formatting and filtering options
   * @async
   * @param {Object} options - Options for filtering and sorting
   * @param {'ASC'|'DESC'} [options.sort='ASC'] - Sort direction for the task list
   * @param {number} [options.limit=50] - Maximum number of tasks to retrieve
   * @returns {Promise<Array<Object>>} Array of detailed task information
   */
  async getTaskDetailsTable(options = {}) {
    await this._pendingOperation;
    return await model.getTaskDetailsTable(options);
  }

  /**
   * Resets all filters to their default values
   * @returns {TaskController} The TaskController instance
   */
  resetFilters() {
    this._filters = {
      assignedTo: null,
      relatedChannel: null,
      taskStatus: null,
      id: null,
    };
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Resets the sort order to default (ASC)
   * @returns {TaskController} The TaskController instance
   */
  resetSort() {
    this._sort = 'ASC';
    return this._queueOperation(() => this.refresh());
  }

  /**
   * delete all completed tasks
   * @returns {TaskController} The TaskController instance
   */
  deleteCompletedTasks() {
    return this._queueOperation(() => model.deleteCompletedTasks());
  }
}

module.exports = TaskController;
