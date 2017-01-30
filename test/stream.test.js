var _ = require('lodash'),
    Marketo = require('../lib/marketo'),
    Promise = require('bluebird'),
    assert = require('assert');

function getMarketoResult(count, hasNext, opt_isError) {
  var result = {result: _.range(count)};

  if (hasNext) {
    result.nextPageToken = 'some_token';
    result.nextPage = function() {
      return getMarketoResult(count, false);
    };
  }

  if (opt_isError) {
    result.success = false;
    result.errors = [{
      message: 'error',
      code: '605'
    }];
  } else {
    result.success = true;
  }

  if (opt_isError) {
    return Promise.reject(result);
  } else {
    return Promise.resolve(result);
  }
}


describe('Stream', function() {
  it('streams normal result without pagination', function(done) {
    var EXPECTED_COUNT = 10,
        count = 0;

    Marketo.streamify(getMarketoResult(EXPECTED_COUNT, false))
      .on('data', function() {
        ++count;
      })
      .on('end', function() {
        assert.equal(count, EXPECTED_COUNT);
        done();
      });
  });

  it('streams result with pagination', function(done) {
    var PAGE_COUNT = 10,
        count = 0;

    Marketo.streamify(getMarketoResult(PAGE_COUNT, true))
      .on('data', function() {
        ++count;
      })
      .on('end', function() {
        // pagination happens only once, so we expect to have twice
        // as many counts
        assert.equal(count, PAGE_COUNT * 2);
        done();
      });
  });

  it('ends the stream if there is an error', function(done) {
    var count = 0;
    var client = require('./helper/connection');
    client.list.getLeads = function(listId, resumeOptions) {
      console.log('calling mock with ', listId, ' resume ', resumeOptions);
      return getMarketoResult(10, false, false);
    };

    Marketo.streamify(getMarketoResult(10, true, true), client, 5)
      .on('data', function() {
        console.log('we got result');
        assert(false, 'We should not get data on error');
        done();
      })
      .on('error', function(err) {
        assert.equal(err.code, 605);
      })
      .on('end', function() {
        // pagination happens only once, so we expect to have twice
        // as many counts
        assert.equal(count, 0);
        done();
      });
  });
});
