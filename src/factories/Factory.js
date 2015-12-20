import _ from 'lodash';

/**
 * A {@link Factory} factory, creates a {@link Factory}.
 *
 * @param options {Object} Object containing the properties listed below

 * @property {Function|Object} [defaults] Object or function returning an object containing default for the options passed into the factory
 * @property {Function|Object} [validate] Gets called after defaults are set,
 * @property {Function} [initialize]
 * @property {Function|Object} [props]
 * @property {Function} [factory]
 * @property {Object} [prototype]
 *
 * @class FactoryFactory
 * @returns Factory
 */
function FactoryFactory(options = {}) {
  runDefaults({
    defaults: FactoryFactory.defaults
  }, options);

  options.prototype = options.prototype || {};

  /**
   *
   * @param opts {Object} Options for the factory
   *
   * @class Factory
   */
  function Factory(opts = {}) {
    runDefaults(options, opts);
    runValidate(options.validate, opts);

    const instance = runFactory(options, opts) || Object.create(Factory.prototype, runProps(options, opts));
    instance.options = opts;
    runInitialize(instance, options);

    return instance;
  }

  Factory.options = options;
  Factory.prototype = options.prototype;
  Factory.defaults = options.defaults || {};
  Factory.factory = options.factory;
  Factory.props = options.props || {};
  Factory.initialize = options.initialize;
  Factory.validate = options.validate;

  /**
   * @memberof Factory
   * @param extendOptions
   */
  Factory.extend = function (extendOptions = {}) {
    extendOptions.prototype = extendOptions.prototype || {};

    //noinspection JSUnresolvedFunction
    const extendedOptions = _.merge({
      prototype: {}
    }, options, extendOptions);

    Object.setPrototypeOf(extendedOptions.prototype, options.prototype);

    extendedOptions.prototype.__proto__ = options.prototype;

    extendedOptions.factory = function (opts = {}) {

      //noinspection JSPotentiallyInvalidConstructorUsage
      const instance = Factory(opts);

      Object.setPrototypeOf(instance, extendedOptions.prototype);

      return instance;
    };

    //noinspection JSPotentiallyInvalidConstructorUsage
    return FactoryFactory(extendedOptions);
  };

  return Factory;
}

FactoryFactory.defaults = {};

function runDefaults(options = {}, opts = {}) {
  let defaults = {};

  if (typeof options.defaults === 'function') {
    defaults = options.defaults(opts);
  } else if (!Array.isArray(options.defaults) && typeof options.defaults === 'object') {
    defaults = options.defaults;
  }

  _.defaults(opts, defaults);
}

function runValidate(validate = {}, opts = {}) {
  if (typeof validate === 'function') {
    return validate(opts);
  } else if (Array.isArray(validate)) {
    _.each(validate, (val) => {
      runValidate(val, opts);
    });
  } else if (typeof validate === 'object') {
    _.each(validate, (type, key) => {
      const value = opts[key];

      if (typeof value === 'undefined' || value === null) {
        throw new Error(`Can't construct, ${key} was not provided.`);
      }

      if (typeof value !== type && (typeof type !== 'function' || value instanceof type)) {
        throw new Error(`Can't construct, ${key} was the wrong type.`);
      } else if (type === 'string' && !value) {
        throw new Error(`Can't construct, ${key} was not provided.`);
      }

    });
  } else if (typeof validate === 'string') {
    const value = opts[validate];
    const message = `Can't construct, ${validate} property not provided`;
    let valid = true;

    if (typeof value === 'undefined' || value === null) {
      valid = false;
    }

    if (typeof value === 'string') {
      if (!value) {
        valid = false;
      }
    }
    if (!valid) {
      throw new Error(message);
    }
  }

  return false;
}


function runFactory(options = {}, opts = {}) {
  if (typeof options.factory === 'function') {
    return options.factory(opts);
  }

  return false;
}

function runProps(options = {}, opts = {}) {
  if (options.props) {
    if (typeof options.props === 'function') {
      return options.props(opts);
    } else if (!Array.isArray(options.props) && typeof options.props === 'object') {
      return options.props;
    }
  }

  return false;
}

function runInitialize(instance = {}, options = {}) {
  if (typeof options.initialize === 'function') {
    return options.initialize.call(instance);
  }

  return false;
}

export default FactoryFactory;