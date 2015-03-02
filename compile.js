(function () {
  'use strict';

  var format = require('util').format,
      ejs = require('elastic.js');

  module.exports = compile;

  function compile (node, assert, filter) {
    if (!(node.type in generators)) {
      throw new Error('Invalid node type');
    }

    return generators[node.type](node, assert || 'must', filter);
  }

  function identity (node) {
    return node.arguments[0];
  }

  var generators = {
    NUMBER: function (node) {
      var value = identity(node);
      return value.indexOf('.') < 0 ? parseInt(value, 10) : parseFloat(value);
    },
    STRING: identity,
    SYMBOL: identity,

    '-': function (node) {
      return - identity(node);
    },
    '&&': function (node, assert, filter) {
      filter = filter || ejs.BoolFilter();
      node.arguments.forEach(function (arg) {
        compile(arg, 'must', filter);
      });
      return filter;
    },
    '||': function (node, assert, filter) {
      filter = filter || ejs.BoolFilter();
      node.arguments.forEach(function (arg) {
        compile(arg, 'should', filter);
      });
      return filter;
    },
    IN: function (node) {
      // FIXME: Supported by ES? Remove?
      var value = compile(node.arguments[0]);
      var field = compile(node.arguments[1]);
      var _in = {};
      _in[field] = {
        $in: [value]
      };
      return _in;
    },
    '!': function (node, assert, filter) {
      return setFilter(filter, assert)(ejs.MissingFilter(compile(node.arguments[0])));
    },
    '==': function (node, assert, filter) {
      var comp = extractComparison(node);
      return setFilter(filter, assert)(ejs.QueryFilter(
          ejs.QueryStringQuery(format('%s:("%s")', compile(comp.symbol), compile(comp.value)))
        ));
    },
    '!=': function (node, assert, filter) {
      var comp = extractComparison(node);
      return setFilter(filter, assert, true)(ejs.QueryFilter(
          ejs.QueryStringQuery(format('%s:("%s")', compile(comp.symbol), compile(comp.value)))
        ));
    },
    MATCH: function (node, assert, filter) {
      var comp = extractComparison(node);
      return setFilter(filter, assert)(ejs.RegexpFilter(compile(comp.symbol), compile(comp.value)));
    },
    '<': function (node, assert, filter) {
      var comp = extractComparison(node);
      return setFilter(filter, assert)(ejs.RangeFilter(compile(comp.symbol)).lt(compile(comp.value)));
    },
    '<=': function (node, assert, filter) {
      var comp = extractComparison(node);
      return setFilter(filter, assert)(ejs.RangeFilter(compile(comp.symbol)).lte(compile(comp.value)));
    },
    '>': function (node, assert, filter) {
      var comp = extractComparison(node);
      return setFilter(filter, assert)(ejs.RangeFilter(compile(comp.symbol)).gt(compile(comp.value)));
    },
    '>=': function (node, assert, filter) {
      var comp = extractComparison(node);
      return setFilter(filter, assert)(ejs.RangeFilter(compile(comp.symbol)).gte(compile(comp.value)));
    },
    EXPRESSION: function (node, assert, parent) {
      var filter = ejs.BoolFilter();
      node.arguments.forEach(function (arg) {
        return compile(arg, assert, filter);
      });
      parent[assert](filter);

      return parent;
    }
  };

  function setFilter (parent, assert, reverse) {
    var filter = parent || ejs.BoolFilter();
    // HACK: ES does not support should_not
    if (assert === 'should' && reverse) {
      var mustNot = ejs.BoolFilter();
      filter.should(mustNot);
      return mustNot.mustNot.bind(mustNot);
    }
    return filter[assert + (reverse ? 'Not' : '')].bind(filter);
  }

  function extractComparison (node) {
    var symbol = null;
    var value = null;
    node.arguments.forEach(function (arg) {
      if (arg.type === 'SYMBOL') {
        if (symbol) {
          throw new Error('You can only specify one symbol in a comparison.');
        }
        symbol = arg;
      } else {
        if (value) {
          throw new Error('You can only specify one value in a comparison.');
        }
        value = arg;
      }
    });

    if (! (symbol && value)) {
      throw new Error('Invalid comparison, could not find both symbol and value.');
    }

    return {
      symbol: symbol,
      value: value
    };
  }
})();
