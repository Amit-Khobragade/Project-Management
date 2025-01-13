/**
 * This file is protected by the Open Software License (OSL) v. 3.0
 * https://opensource.org/licenses/OSL-3.0
 */

const model = require('../model/model.js');

/**
 * Controller class for managing person-related operations with chainable methods
 * @class PersonController
 */
class PersonController {
  /** @private {string} Sort direction for person listing */
  _sort = 'ASC';

  /** @private {number} Index of the currently selected person */
  _selectedPerson = 0;

  /** @private {Array<Object>} Array containing person records */
  _personTable = [];

  /** @private {Promise<void>} Tracks pending operations */
  _pendingOperation = Promise.resolve();

  /**
   * @private {Object} Filter settings for person queries
   * @property {number|null} taskId - Filter by specific task ID
   * @property {boolean} filterEmptyTasks - Whether to filter out persons with no tasks
   */
  _filters = {
    taskId: null,
    filterEmptyTasks: false,
  };

  /**
   * Creates an instance of PersonController and initializes the person table
   * @constructor
   * @returns {PersonController} The PersonController instance
   */
  constructor() {
    this._pendingOperation = this.refresh();
    return this;
  }

  /**
   * Queues an operation to be executed after previous operations complete
   * @private
   * @param {Function} operation - Async operation to queue
   * @returns {PersonController} The PersonController instance for chaining
   */
  _queueOperation(operation) {
    this._pendingOperation = this._pendingOperation.then(operation);
    return this;
  }

  /**
   * Waits for all pending operations to complete
   * @async
   * @returns {Promise<PersonController>} The PersonController instance
   */
  async ready() {
    await this._pendingOperation;
    return this;
  }

  /**
   * Refreshes the person table with current filters and sort settings
   * @async
   * @returns {Promise<PersonController>} The PersonController instance
   */
  async refresh() {
    this._personTable = await model.getPersonDetailsTable({
      sort: this._sort,
      filterEmptyTasks: this._filters.filterEmptyTasks,
      taskId: this._filters.taskId,
    });
    return this;
  }

  /**
   * Adds a new person to the database
   * @param {Object} person - Person object to add
   * @param {string} person.name - Name of the person
   * @param {string} [person.email] - Email of the person
   * @param {string} [person.role] - Role of the person
   * @param {string} [person.department] - Department of the person
   * @returns {PersonController} The PersonController instance
   */
  addPerson(person) {
    return this._queueOperation(async () => {
      await model.addOrUpdatePerson(person);
      await this.refresh();
    });
  }

  /**
   * Updates an existing person in the database
   * @param {Object} person - Person object with updates
   * @param {number} person.id - ID of the person to update
   * @param {string} [person.name] - Updated name of the person
   * @param {string} [person.email] - Updated email of the person
   * @param {string} [person.role] - Updated role of the person
   * @param {string} [person.department] - Updated department of the person
   * @returns {PersonController} The PersonController instance
   */
  updatePerson(person) {
    return this._queueOperation(async () => {
      await model.addOrUpdatePerson(person);
      await this.refresh();
    });
  }

  /**
   * Updates the currently selected person
   * @param {Object} updates - Partial person object with updated fields
   * @returns {PersonController} The PersonController instance
   */
  updateCurrentPerson(updates) {
    const currentPerson = this._personTable[this._selectedPerson];
    return this._queueOperation(async () => {
      await model.addOrUpdatePerson({ ...currentPerson, ...updates });
      await this.refresh();
    });
  }

  /**
   * Removes a person from the database by ID
   * @param {number} personId - ID of the person to remove
   * @returns {PersonController} The PersonController instance
   */
  removePerson(personId) {
    return this._queueOperation(async () => {
      await model.removePerson(personId);
      await this.refresh();
    });
  }

  /**
   * Removes the currently selected person
   * @returns {PersonController} The PersonController instance
   */
  removeSelectedPerson() {
    const currentPerson = this._personTable[this._selectedPerson];
    return this.removePerson(currentPerson.id);
  }

  /**
   * Increments the selected person index, wraps around to 0 if at end
   * @returns {PersonController} The PersonController instance
   */
  incrementSelectedPerson() {
    if (this._selectedPerson < this._personTable.length - 1) {
      this._selectedPerson++;
    } else {
      this._selectedPerson = 0;
    }
    return this;
  }

  /**
   * Decrements the selected person index, wraps around to end if at 0
   * @returns {PersonController} The PersonController instance
   */
  decrementSelectedPerson() {
    if (this._selectedPerson > 0) {
      this._selectedPerson--;
    } else {
      this._selectedPerson = this._personTable.length - 1;
    }
    return this;
  }

  /**
   * Adds new filters to the existing filter set
   * @param {Object} filter - Filter object to merge with existing filters
   * @param {number} [filter.taskId] - Filter by specific task ID
   * @param {boolean} [filter.filterEmptyTasks] - Whether to filter out persons with no tasks
   * @returns {PersonController} The PersonController instance
   */
  addFilter(filter) {
    this._filters = { ...this._filters, ...filter };
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Sets the sort direction for the person table
   * @param {'ASC'|'DESC'} sort - Sort direction ('ASC' or 'DESC')
   * @returns {PersonController} The PersonController instance
   */
  addSort(sort) {
    this._sort = sort;
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Gets the currently selected person
   * @returns {Object|null} The currently selected person or null if none selected
   */
  getSelectedPerson() {
    return this._personTable[this._selectedPerson] || null;
  }

  /**
   * Gets the current person table
   * @returns {Array<Object>} Array of person records
   */
  getPersonTable() {
    return this._personTable;
  }

  /**
   * Resets all filters to their default values
   * @returns {PersonController} The PersonController instance
   */
  resetFilters() {
    this._filters = {
      taskId: null,
      filterEmptyTasks: false,
    };
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Resets the sort order to default (ASC)
   * @returns {PersonController} The PersonController instance
   */
  resetSort() {
    this._sort = 'ASC';
    return this._queueOperation(() => this.refresh());
  }
}

module.exports = PersonController;
