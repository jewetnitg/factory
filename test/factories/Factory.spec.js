/**
 * @author rik
 */
import _ from 'lodash';

import FactoryFactory from '../../src/factories/Factory';

// @todo test instanceof (of extended classes as well)
describe(`FactoryFactory`, () => {

  it(`should be a function`, (done) => {
    expect(FactoryFactory).to.be.a('function');
    done();
  });

  describe(`const Factory = FactoryFactory(options)`, () => {

    it(`should return a function`, (done) => {
      const Factory = FactoryFactory();

      expect(Factory).to.be.a('function', 'FactoryFactory should return a function');

      done();
    });

    describe(`Factory(options)`, () => {

      it(`should return an instance of Factory`, (done) => {
        const Factory = FactoryFactory();

        const instance = Factory();

        expect(instance).to.be.an.instanceOf(Factory, 'Instance should be an instance of Factory');

        done();
      });

      // @todo test if it does not override a provided value
      it(`should apply defaults to the options, if provided as an object`, (done) => {
        const someDefaultVariable = 'expected';

        const Factory = FactoryFactory({
          defaults: {
            someDefaultVariable
          }
        });

        const instance = Factory();
        const instanceVariable = instance.options.someDefaultVariable;

        expect(instanceVariable).to.equal(someDefaultVariable, 'Options passed into a Factory should be extended with defaults');

        done();
      });

      it(`should apply defaults to the options, if provided as function`, (done) => {
        const expected = 'expected';
        const expectedOptions = {};

        const Factory = FactoryFactory({
          defaults(actualOptions)  {
            expect(actualOptions).to.equal(expectedOptions, 'Options passed to the defaults function should be the options passed into the factory.');
            return {
              expected
            };
          }
        });

        const instance = Factory(expectedOptions);
        const actual = instance.options.expected;

        expect(actual).to.equal(expected);

        done();
      });

      it(`should call validate if provided as a function and pass it the options`, (done) => {
        const optionsPassedIntoFactory = {};

        const Factory = FactoryFactory({
          validate(validateOptions) {
            expect(validateOptions).to.equal(optionsPassedIntoFactory, 'Options passed to validate should be the options passed to the factory.');
            done();
          }
        });

        Factory(optionsPassedIntoFactory);
      });

      it(`should do type validation if validate is provided as an object, the key being the property and the value being the type`, (done) => {
        const Factory = FactoryFactory({
          validate: {
            'name': 'string'
          }
        });

        const invalidOptionsArray = [
          {
            name: true
          },
          {
            name: ''
          }
        ];

        const validOptions = {
          name: 'a'
        };

        _.each(invalidOptionsArray, invalidOptions => {
          expect(() => {
            Factory(invalidOptions)
          }).to.throw(Error);
        });


        expect(() => {
          Factory(validOptions)
        }).to.not.throw(Error);


        done();
      });

      it(`should required validation if validate is provided as a string, the string referencing the property that is required`, (done) => {
        const Factory = FactoryFactory({
          validate: 'name'
        });

        const invalidOptionsArray = [
          {},
          {
            name: null
          },
          {
            name: undefined
          },
          {
            name: ''
          }
        ];

        const validOptions = {
          name: 'a'
        };
        _.each(invalidOptionsArray, invalidOptions => {
          expect(() => {
            Factory(invalidOptions)
          }).to.throw(Error);
        });

        expect(() => {
          Factory(validOptions)
        }).to.not.throw(Error);

        done();
      });

      it(`should execute validations of all types when provided as an array`, (done) => {
        const validateFn = mockFunction();
        const Factory = FactoryFactory({
          validate: ['name', {'name2': 'number'}, ['name3', validateFn]]
        });

        const invalidOptionsArray = [
          {},
          {
            name: 'a'
          },
          {
            name: 'a',
            name3: 'a'
          },
          {
            name: 'a',
            name2: 3
          },
          {
            name: 'a',
            name2: 'a',
            name3: true
          }
        ];

        const validOptions = {
          name: 'a',
          name2: 3,
          name3: true
        };

        _.each(invalidOptionsArray, (invalidOptions) => {
          expect(() => {
            Factory(invalidOptions)
          }).to.throw(Error);
        });

        expect(() => {
          Factory(validOptions)
        }).to.not.throw(Error);

        verify(validateFn)(validOptions);

        done();
      });

      it(`should use the provided factory to create the instance`, (done) => {
        const expectedInstance = {};
        const expectedOptions = {};

        const Factory = FactoryFactory({
          factory(options) {
            expect(options).to.equal(expectedOptions, 'Options passed to factory should be the options passed to the factory.');
            return expectedInstance;
          }
        });

        const actualInstance = Factory(expectedOptions);
        expect(actualInstance).to.equal(expectedInstance);
        done();
      });

      it(`should create a new instance using itself if no factory is provided`, (done) => {
        const expectedPrototypeValue = {};
        const expectedPropValue = {};
        const prototype = {
          prototypeValue: expectedPrototypeValue
        };
        const props = {
          propValue: {
            value: expectedPropValue
          }
        };

        const Factory = FactoryFactory({
          prototype: prototype,
          props: props
        });

        const instance = Factory();
        const actualPrototypeValue = instance.prototypeValue;
        const actualPropValue = instance.propValue;

        expect(actualPrototypeValue).to.equal(expectedPrototypeValue);
        expect(actualPropValue).to.equal(expectedPropValue);

        done();
      });

      it(`should call initialize when the instance has been created`, (done) => {
        let instance = null;
        let context = null;

        const Factory = FactoryFactory({
          initialize() {
            context = this;
            done();
          }
        });

        instance = Factory();

        expect(context).to.not.be(null);
        expect(context).to.equal(instance);

        done();
      });

      it(`should call the methods in the right order`, (done) => {
        const METHODS = {
          DEFAULTS: 'DEFAULTS',
          VALIDATE: 'VALIDATE',
          FACTORY: 'FACTORY',
          INITIALIZE: 'INITIALIZE',
          PROPS: 'PROPS'
        };
        const EXECUTIONS = 2;
        let execution = 0;
        let actualOrder = [];
        let expectedOrders = [
          [
            METHODS.DEFAULTS,
            METHODS.VALIDATE,
            METHODS.FACTORY,
            METHODS.INITIALIZE
          ],
          // when constructed without a factory
          [
            METHODS.DEFAULTS,
            METHODS.VALIDATE,
            METHODS.PROPS,
            METHODS.INITIALIZE
          ]];
        const baseFactory = {
          defaults() {
            actualOrder.push(METHODS.DEFAULTS);
          },
          validate() {
            actualOrder.push(METHODS.VALIDATE);
          },
          factory: function () {
            actualOrder.push(METHODS.FACTORY);
            return {};
          },
          props() {
            actualOrder.push(METHODS.PROPS);
          },
          initialize() {
            execution++;

            actualOrder.push(METHODS.INITIALIZE);
            expect(actualOrder).to.deep.equal(expectedOrders[execution - 1]);

            if (execution === EXECUTIONS) {
              done();
            }
          }
        };

        FactoryFactory(baseFactory)();

        actualOrder = [];
        delete baseFactory.factory;

        FactoryFactory(baseFactory)();
      });

    });

    describe(`Factory#extend(options)`, () => {

      it(`should be an instance of its super and its own factory`, (done) => {
        const Factory = FactoryFactory();
        const ExtendedFactory = Factory.extend();

        const instance = ExtendedFactory();

        expect(instance).to.be.an.instanceOf(Factory, 'Instance should be an instance of super Factory');

        expect(instance).to.be.an.instanceOf(ExtendedFactory, 'Instance should be an instance of the Factory');

        done();
      });

    });

  });

});