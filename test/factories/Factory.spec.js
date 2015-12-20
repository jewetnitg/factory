/**
 * @author rik
 */
import Factory from '../../src/factories/Factory';

describe(`Factory`, () => {

  it(`should be a function`, (done) => {
    expect(Factory).to.be.a('function');
    done();
  });

});