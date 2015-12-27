import events from 'events';
import _ from 'lodash';

// @todo refactor
// @todo test
function eventsMixin(dst = {}) {
  const eventEmitter = new events.EventEmitter();
  Object.assign(dst, {
    on(event, callback) {
      eventEmitter.on(event, callback);
    },
    trigger(event, data) {
      eventEmitter.emit(event, data);
    },
    once(event, callback) {
      const cb = (data) => {
        callback(data);
        this.off(event, cb);
      };
      this.on(event, cb);
    },
    off(event, callback) {
      if (callback) {
        eventEmitter.removeListener(event, callback);
      } else {
        eventEmitter.removeAllListeners(event);
      }
    }
  });
}

/**
 * A {@link Factory} factory, creates a {@link Factory}. Options passed in will be made available on the options property on the instance.
 *
 * In the case of using this module without browserify this function will be available on window.FactoryFactory.
 *
 * @todo add support for mixins
 * @todo refactor private functions to Factory.validate(factoryOptions, instanceOptions) etc.
 * @param factoryOptions {Object} Object containing the properties listed below.

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
function FactoryFactory(factoryOptions = {}) {
  runDefaults({
    defaults: FactoryFactory.defaults
  }, factoryOptions);

  factoryOptions.prototype = factoryOptions.prototype || {};
  factoryOptions.defaults = factoryOptions.defaults || {};
  factoryOptions.props = factoryOptions.props || {};

  if (factoryOptions.events) {
    eventsMixin(factoryOptions.prototype);
  }

  /**
   *
   * @param instanceOptions {Object} Options for the factory
   *
   * @class Factory
   */
  function Factory(instanceOptions = {}) {
    runDefaults(Factory, instanceOptions);
    runValidate(Factory.validate, instanceOptions);

    const instance = runFactory(Factory, instanceOptions) || Object.create(Factory.prototype, runProps(Factory, instanceOptions));
    instance.constructor = Factory;
    instance.options = instanceOptions;
    runInitialize(instance, Factory);

    return instance;
  }


  /**
   * The options passed into the {@link FactoryFactory} when it created this {@link Factory}.
   *
   * @name options
   * @memberof Factory
   * @type {Object}
   */
  Factory.options = factoryOptions;

  Factory.prototype = factoryOptions.prototype;

  /**
   * @todo apply hacky fix obj = {['m' + '3']: function () {}} // (C) console.log(obj.m3.name); // m3
   * @todo document
   * @todo test
   */
  //Factory.name = options.name || Factory.name;

  /**
   * The defaults property passed into the {@link FactoryFactory} for this {@link Factory}, used to set defaults on the options passed into this {@link Factory}.
   *
   * @name defaults
   * @memberof Factory
   * @static
   * @type {Object|Function}
   */
  Factory.defaults = factoryOptions.defaults;

  /**
   * The validate property passed into the {@link FactoryFactory} for this {@link Factory}, used to validate options passed into this {@link Factory}.
   *
   * @name validate
   * @memberof Factory
   * @static
   * @type {Object|Function}
   */
  Factory.validate = factoryOptions.validate;

  /**
   * The factory property passed into the {@link FactoryFactory} for this {@link Factory}, if provided, this, instead of Object.create is used to create the instance, and Factory#props will be ignored.
   *
   * @name factory
   * @memberof Factory
   * @static
   * @type {Function}
   */
  Factory.factory = factoryOptions.factory;

  /**
   * The props property passed into the {@link FactoryFactory} for this {@link Factory}, passed to Object.create as the second (props) argument.
   *
   * @name props
   * @memberof Factory
   * @static
   * @type {Object|Function}
   */
  Factory.props = factoryOptions.props;

  /**
   * The initialize property passed into the {@link FactoryFactory} for this {@link Factory}, this function is called in the context of the created instance once it has been created.
   *
   * @name initialize
   * @memberof Factory
   * @static
   * @type {Function}
   */
  Factory.initialize = factoryOptions.initialize;

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
    }, factoryOptions, extendOptions);

    Object.setPrototypeOf(extendedOptions.prototype, factoryOptions.prototype);

    extendedOptions.factory = function (opts = {}) {

      //noinspection JSPotentiallyInvalidConstructorUsage
      const instance = Factory(opts);

      Object.setPrototypeOf(instance, extendedOptions.prototype);
      Object.assign(instance, extendOptions.prototype);

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

function runDefaults(Factory = {}, opts = {}) {
  let defaults = {};

  if (typeof Factory.defaults === 'function') {
    defaults = Factory.defaults(opts);
  } else if (!Array.isArray(Factory.defaults) && typeof Factory.defaults === 'object') {
    defaults = Factory.defaults;
  }

  _.defaults(opts, defaults);
}

function runValidate(Factory = {}, opts = {}) {
  if (typeof Factory === 'function') {
    return Factory(opts);
  } else if (Array.isArray(Factory)) {
    _.each(Factory, (val) => {
      runValidate(val, opts);
    });
  } else if (typeof Factory === 'object') {
    _.each(Factory, (type, key) => {
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
  } else if (typeof Factory === 'string') {
    const value = opts[Factory];
    const message = `Can't construct, ${Factory} property not provided`;
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


function runFactory(Factory = {}, opts = {}) {
  if (typeof Factory.factory === 'function') {
    return Factory.factory(opts);
  }

  return false;
}

function runProps(Factory = {}, opts = {}) {
  if (Factory.props) {
    if (typeof Factory.props === 'function') {
      return Factory.props(opts);
    } else if (!Array.isArray(Factory.props) && typeof Factory.props === 'object') {
      return Factory.props;
    }
  }

  return false;
}

function runInitialize(instance = {}, Factory = {}) {
  if (typeof Factory.initialize === 'function') {
    return Factory.initialize.call(instance);
  }

  return false;
}

export default FactoryFactory;