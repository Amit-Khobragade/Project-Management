const blessed = require('blessed');

class BaseView {
  static _screen = blessed.screen({
    smartCSR: true,
  });
  constructor() {
    if (this.constructor === BaseView) {
      throw new Error("Abstract classes can't be instantiated.");
    }
  }

  get screen() {
    return this._screen;
  }
}

module.exports = BaseView;
