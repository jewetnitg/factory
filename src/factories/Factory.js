import _ from 'lodash';

/**
 * A {@link Factory} factory, creates a {@link Factory}. Options passed in will be made available on the options property on the instance.
 *
 * @param options {Object} Object containing the properties listed below.

 * @property {Function|Object} [defaults] Object or function returning an object containing default for the options passed into the factory.
 * @property {Function|Object|String|Array<Function|Object|String|Array>} [validate] Gets called after defaults are set, allows to validate options passed into the factory, can be a function, a string (representing a required property), a hashmap in the format of {'property': typeOrInstance}, {'name': 'string'} for example, or a mixed array of the previously mentioned.
 * @property {Function} [initialize] This function gets called with the context of the instance once it has been constructed.
 * @property {Function|Object} [props] May be provided as a function or object, the props for Object.create, not used if factory is provided.
 * @property {Function} [factory] If provided the instance will be created using this function, by default instances are created using Object.create.
 * @property {Object} [prototype] The prototype of the 'class'.
 *
 * @class FactoryFactory
 * @returns Factory
 * @example
 * const Factory = FactoryFactory({
 *   defaults(options) {
 *     return {
 *       defaultProperty: 'someValue'
 *     }
 *   },
 *   validate: [
 *     {
 *       // require name to be a string
 *       'name': 'string'
 *     },
 *     function (options) {
 *       if (options.name === 'bob') {
 *         throw new Error("name can't be bob");
 *       }
 *     },
 *     // make age required
 *     'age'
 *   ],
 *   initialize() {
 *     this.someMethod(); // call method on prototype
 *   },
 *   props(options) {
 *     // props passed to Object.create, this method is not called if factory is implemented
 *     return {
 *       someProp: {
 *         value: options.someOtherProp ? 'val1' : 'val2'
 *       }
 *     };
 *   },
 *   factory(options) {
 *     // create the instance manually
 *     return {
 *       options
 *     };
 *   },
 *   prototype: {
 *     someMethod() {
 *       alert(this.options.name); // alerts whatever name was passed into the factory
 *     }
 *   }
 * });
 */
function FactoryFactory(options = {}) {
  runDefaults({
    defaults: FactoryFactory.defaults
  }, options);

  options.prototype = options.prototype || {};
  options.defaults = options.defaults || {};
  options.props = options.props || {};

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

  /**
   * The options passed into the {@link FactoryFactory} when it created this {@link Factory}.
   *
   * @name options
   * @memberof Factory
   * @type {Object}
   */
  Factory.options = options;

  Factory.prototype = options.prototype;

  /**
   * The defaults property passed into the {@link FactoryFactory} for this {@link Factory}, used to set defaults on the options passed into this {@link Factory}.
   *
   * @name defaults
   * @memberof Factory
   * @static
   * @type {Object|Function}
   */
  Factory.defaults = options.defaults;

  /**
   * The validate property passed into the {@link FactoryFactory} for this {@link Factory}, used to validate options passed into this {@link Factory}.
   *
   * @name validate
   * @memberof Factory
   * @static
   * @type {Object|Function}
   */
  Factory.validate = options.validate;

  /**
   * The factory property passed into the {@link FactoryFactory} for this {@link Factory}, if provided, this, instead of Object.create is used to create the instance, and Factory#props will be ignored.
   *
   * @name factory
   * @memberof Factory
   * @static
   * @type {Function}
   */
  Factory.factory = options.factory;

  /**
   * The props property passed into the {@link FactoryFactory} for this {@link Factory}, passed to Object.create as the second (props) argument.
   *
   * @name props
   * @memberof Factory
   * @static
   * @type {Object|Function}
   */
  Factory.props = options.props;

  /**
   * The initialize property passed into the {@link FactoryFactory} for this {@link Factory}, this function is called in the context of the created instance once it has been created.
   *
   * @name initialize
   * @memberof Factory
   * @static
   * @type {Function}
   */
  Factory.initialize = options.initialize;

  /**
   * Creates a new {@link Factory} by extending this {@link Factory}, accepts the same arguments as the {@link FactoryFactory}.
   *
   * @method extend
   * @memberof Factory
   * @param extendOptions {Object} Object to extend this {@link Factory} with.
   *
   * @returns Factory
   * @example
   * const Factory = FactoryFactory();
   * const ExtendedFactory = Factory.extend();
   *
   * const instance = ExtendedFactory();
   *
   * instance instanceof Factory; // true
   * instance instanceof ExtendedFactory; // true
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

/**
 * Default options for all {@link Factory}s, works like the defaults property on a {@link Factory}
 *
 * @name defaults
 * @memberof FactoryFactory
 * @static
 *
 * @type {Object|Function}
 */
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