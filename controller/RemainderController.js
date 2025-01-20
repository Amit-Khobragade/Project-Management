/**
 * This file is protected by the Open Software License (OSL) v. 3.0
 * https://opensource.org/licenses/OSL-3.0
 */

const model = require('../model/model.js');

/**
 * Controller class for managing remainder-related operations with chainable methods
 * @class RemainderController
 */
class RemainderController {
  /** @private {string} Sort direction for remainder listing */
  _sort = 'ASC';

  /** @private {number} Index of the currently selected remainder */
  _selectedRemainder = 0;

  /** @private {Array<Object>} Array containing remainder records */
  _remainderTable = [];

  /** @private {Promise<void>} Tracks pending operations */
  _pendingOperation = Promise.resolve();

  /** 
   * @private {Object} Filter settings for remainder queries
   * @property {number|null} taskId - Filter by specific task ID
   */
  _filters = {
    taskId: null
  };

  /**
   * Creates an instance of RemainderController and initializes the remainder table
   * @constructor
   * @returns {RemainderController} The RemainderController instance
   */
  constructor() {
    this._pendingOperation = this.refresh();
    return this;
  }

  /**
   * Queues an operation to be executed after previous operations complete
   * @private
   * @param {Function} operation - Async operation to queue
   * @returns {RemainderController} The RemainderController instance for chaining
   */
  _queueOperation(operation) {
    this._pendingOperation = this._pendingOperation.then(operation);
    return this;
  }

  /**
   * Waits for all pending operations to complete
   * @async
   * @returns {Promise<RemainderController>} The RemainderController instance
   */
  async ready() {
    await this._pendingOperation;
    return this;
  }

  /**
   * Refreshes the remainder table with current filters and sort settings
   * @async
   * @returns {Promise<RemainderController>} The RemainderController instance
   */
  async refresh() {
    this._remainderTable = await model.getRemainder({
      sort: this._sort,
      task_id: this._filters.taskId
    });
    return this;
  }

  /**
   * Adds a new remainder to the database
   * @param {Object} remainder - Remainder object to add
   * @param {number} remainder.task_id - ID of the task to set remainder for
   * @param {string} [remainder.remainder_date] - Date of the remainder
   * @param {string} [remainder.reminder_time] - Time of the remainder
   * @returns {RemainderController} The RemainderController instance
   */
  addRemainder(remainder) {
    return this._queueOperation(async () => {
      await model.addOrUpdateRemainder(remainder);
      await this.refresh();
    });
  }

  /**
   * Updates an existing remainder in the database
   * @param {Object} remainder - Remainder object with updates
   * @param {number} remainder.id - ID of the remainder to update
   * @param {number} [remainder.task_id] - Updated task ID
   * @param {string} [remainder.remainder_date] - Updated date of the remainder
   * @param {string} [remainder.reminder_time] - Updated time of the remainder
   * @returns {RemainderController} The RemainderController instance
   */
  updateRemainder(remainder) {
    return this._queueOperation(async () => {
      await model.addOrUpdateRemainder(remainder);
      await this.refresh();
    });
  }

  /**
   * Updates the currently selected remainder
   * @param {Object} updates - Partial remainder object with updated fields
   * @returns {RemainderController} The RemainderController instance
   */
  updateCurrentRemainder(updates) {
    const currentRemainder = this._remainderTable[this._selectedRemainder];
    return this._queueOperation(async () => {
      await model.addOrUpdateRemainder({ ...currentRemainder, ...updates });
      await this.refresh();
    });
  }

  /**
   * Removes a remainder from the database by ID
   * @param {number} remainderId - ID of the remainder to remove
   * @returns {RemainderController} The RemainderController instance
   */
  removeRemainder(remainderId) {
    return this._queueOperation(async () => {
      await model.removeRemainder(remainderId);
      await this.refresh();
    });
  }

  /**
   * Removes the currently selected remainder
   * @returns {RemainderController} The RemainderController instance
   */
  removeSelectedRemainder() {
    const currentRemainder = this._remainderTable[this._selectedRemainder];
    return this.removeRemainder(currentRemainder.id);
  }

  /**
   * Increments the selected remainder index, wraps around to 0 if at end
   * @returns {RemainderController} The RemainderController instance
   */
  incrementSelectedRemainder() {
    if (this._selectedRemainder < this._remainderTable.length - 1) {
      this._selectedRemainder++;
    } else {
      this._selectedRemainder = 0;
    }
    return this;
  }

  /**
   * Decrements the selected remainder index, wraps around to end if at 0
   * @returns {RemainderController} The RemainderController instance
   */
  decrementSelectedRemainder() {
    if (this._selectedRemainder > 0) {
      this._selectedRemainder--;
    } else {
      this._selectedRemainder = this._remainderTable.length - 1;
    }
    return this;
  }

  /**
   * Gets the currently selected remainder
   * @returns {Object|null} The currently selected remainder or null if none selected
   */
  getSelectedRemainder() {
    return this._remainderTable[this._selectedRemainder] || null;
  }

  /**
   * Gets the current remainder table
   * @returns {Array<Object>} Array of remainder records
   */
  getRemainderTable() {
    return this._remainderTable;
  }

  /**
   * Adds new filters to the existing filter set
   * @param {Object} filter - Filter object to merge with existing filters
   * @param {number} [filter.taskId] - Filter by specific task ID
   * @returns {RemainderController} The RemainderController instance
   */
  addFilter(filter) {
    this._filters = { ...this._filters, ...filter };
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Sets the sort direction for the remainder table
   * @param {'ASC'|'DESC'} sort - Sort direction ('ASC' or 'DESC')
   * @returns {RemainderController} The RemainderController instance
   */
  addSort(sort) {
    this._sort = sort;
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Resets all filters to their default values
   * @returns {RemainderController} The RemainderController instance
   */
  resetFilters() {
    this._filters = {
      taskId: null
    };
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Resets the sort order to default (ASC)
   * @returns {RemainderController} The RemainderController instance
   */
  resetSort() {
    this._sort = 'ASC';
    return this._queueOperation(() => this.refresh());
  }
}

module.exports = RemainderController;