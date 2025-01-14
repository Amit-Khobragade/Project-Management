/**
 * This file is protected by the Open Software License (OSL) v. 3.0
 * https://opensource.org/licenses/OSL-3.0
 */

const model = require('../model/model.js');

/**
 * Controller class for managing channel-related operations with chainable methods
 * @class ChannelController
 */
class ChannelController {
  /** @private {string} Sort direction for channel listing */
  _sort = 'ASC';

  /** @private {Array<Object>} Array containing channel records */
  _channelTable = [];

  /** @private {Promise<void>} Tracks pending operations */
  _pendingOperation = Promise.resolve();

  /** @private {Object} Filters for channel listing */
  _filters = {};

  /**
   * Creates an instance of ChannelController and initializes the channel table
   * @constructor
   * @returns {ChannelController} The ChannelController instance
   */
  constructor() {
    this._pendingOperation = this.refresh();
    return this;
  }

  /**
   * Queues an operation to be executed after previous operations complete
   * @private
   * @param {Function} operation - Async operation to queue
   * @returns {ChannelController} The ChannelController instance for chaining
   */
  _queueOperation(operation) {
    this._pendingOperation = this._pendingOperation.then(operation);
    return this;
  }

  /**
   * Waits for all pending operations to complete
   * @async
   * @returns {Promise<ChannelController>} The ChannelController instance
   */
  async ready() {
    await this._pendingOperation;
    return this;
  }

  /**
   * Refreshes the channel table with current filters and sort settings
   * @async
   * @returns {Promise<ChannelController>} The ChannelController instance
   */
  async refresh() {
    this._channelTable = await model.getChannelDetailsTable({
      sort: this._sort,
      limit: 50,
      ...this._filters,
    });
    return this;
  }

  /**
   * Adds a new channel to the database
   * @param {Object} channel - Channel object to add
   * @param {string} channel.channel_name - Name of the channel
   * @returns {ChannelController} The ChannelController instance
   */
  addChannel(channel) {
    return this._queueOperation(async () => {
      await model.addOrUpdateChannel(channel);
      await this.refresh();
    });
  }

  /**
   * Updates an existing channel in the database
   * @param {Object} channel - Channel object with updates
   * @param {number} channel.id - ID of the channel to update
   * @param {string} [channel.channel_name] - Updated name of the channel
   * @returns {ChannelController} The ChannelController instance
   */
  updateChannel(channel) {
    return this._queueOperation(async () => {
      await model.addOrUpdateChannel(channel);
      await this.refresh();
    });
  }

  /**
   * Removes a channel from the database by its ID
   * @param {number} channelId - ID of the channel to remove
   * @returns {ChannelController} The ChannelController instance
   */
  removeChannel(channelId) {
    return this._queueOperation(async () => {
      await model.removeChannel(channelId);
      await this.refresh();
    });
  }

  /**
   * Sets the sort direction for the channel table
   * @param {'ASC'|'DESC'} sort - Sort direction ('ASC' or 'DESC')
   * @returns {ChannelController} The ChannelController instance
   */
  setSort(sort) {
    this._sort = sort;
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Resets all filters and sort settings to default values
   * @returns {ChannelController} The ChannelController instance
   */
  resetFilters() {
    this._sort = 'ASC';
    this._filters = {};
    return this._queueOperation(() => this.refresh());
  }

  /**
   * Gets the current channel table
   * @returns {Array<Object>} Array of channel records
   */
  getChannelTable() {
    return this._channelTable;
  }
}

module.exports = ChannelController;
