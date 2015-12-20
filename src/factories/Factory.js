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

  /**
   *
   * @param opts {Object} Options for the factory
   *
   * @class Factory
   */
  function Factory(opts = {}) {
    runDefaults(options, opts);
    runValidate(options, opts);

    const instance = runFactory(options, opts) || Object.create(Factory.prototype, runProps(options, opts));
    instance.options = opts;
    runInitialize(instance, options);

    return instance;
  }

  Factory.options = options;

  Factory.prototype = options.prototype || {};
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
    //noinspection JSUnresolvedFunction
    const extendedOptions = _.merge({}, options, extendOptions);

    //noinspection JSUnusedGlobalSymbols
    extendedOptions.prototype.__proto__ = options.prototype;

    extendedOptions.factory = function (opts = {}) {

      //noinspection JSPotentiallyInvalidConstructorUsage
      const instance = Factory(opts);

      instance.__proto__ = extendedOptions.prototype;

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

function runValidate(options = {}, opts = {}) {
  if (typeof options.validate === 'function') {
    return options.validate(opts);
  } else if (Array.isArray(options.validate)) {

  } else if (typeof options.validate === 'object') {

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