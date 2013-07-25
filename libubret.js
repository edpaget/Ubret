// libubret
// libubret 0.2.0
// libubret is distributed under the APL. See COPYING

(function () {

  var root = this;
  var previousUbret = root.U;

  var U = {};

  if (typeof exports !== 'undefined')
    module.exports = U;
  else
    root.U = U;

  var isA = function(object, interface) {
    return _.difference(_.keys(object), _.keys(interface)).length === 0;
  };

  U.deepClone = function(obj) {
    if (_.isFunction(obj) || !exists(obj) || !_.isObject(obj))
      return obj;
    var tmp = new obj.constructor();
    _.each(obj, function(value, key) {
      if (obj.hasOwnProperty(key))
        tmp[key] = U.deepClone(value);});
    return tmp;
  }

  var exists = function(obj) {
    return !(_.isNull(obj) || _.isUndefined(obj));
  }

  U.listenTo = function(eventEmitter, event, fn, context) {
    eventEmitter.on(event, fn, context);
  };

  U.stopListening = function(eventEmitter/*, args */) {
    var args = Array.slice(arguments, 1);
    eventEmitter.off.apply(eventEmitter, args);
  }

  U.EventEmitter = {
    _listeners: {},

    on: function(event, cb, context) {
      var responder = {func: cb, context: context};
      if (_.isUndefined(this._listeners[event]))
        this._listeners[event] = [responder]
      else
        this._listeners[event] = this._listeners[event].concat([responder])
      },

    off: function(/* args */) {
      var event = arguments[0],
        func = arguments[1],
        context = arguments[2];
      if (_.isUndefined(event))
        return this._listeners = null;
      else if (_.isUndefined(func))
        return this._listeners[event] = null;
      var responder = {func: func, context: context};
      this._listeners[event] = _.without(this._listeners[event], responder);
    },

    trigger: function(event/*, args */) {
      var args = Array.slice(arguments, 1);
      if (_.isNull(this._listeners))
        return;
      _.each(this._listeners[event], function(responder) {
        responder.func.apply(responder.context, args);
      });
    }
  }

  U.State = _.extend({
    state: {},

    setInitialState: function (stateObj) {
      this.state = U.deepClone(stateObj);
    },

    whenState: function(states, cb) {
      var stateCheck = function() {
        var check = _.every(states, function(state) {
          return exists(this.state[state]);
        }, this);
        if (check)
          cb.call(this);
      };

      _.each(states, function(state) {
        this.on("state:" + state, stateCheck, this);
      }, this);
    },

    setState: function(state, value) {
      if (!exists(value))
        throw new Error("State Cannot be undefined or null");
      this.state[state] = U.deepClone(value);
      this.trigger("state:" + state, this.state[state]);
    },

    unsetState: function(state) {
      if (exists(this.state[state])) {
        this.state[state] = null;
        this.trigger("unset:" + state);
      }
    }
  }, U.EventEmitter);

  U.Field = {name: 'name', fn: function() {}}

  U.Data = function(data) {
    this._data = data;
    this._filters = [];
    this._fields = [];
    this._sortProp = 'uid';
    this._sortOrder = 'a';
    this._projection = ["*"];
    this._perPage = 0;
  }

  U.Data.prototype.filter = function(fn) {
    data = U.deepClone(this);
    data._filters.push(fn);
    return data;
  }

  U.Data.prototype.removeFilter = function(fn) {
    data = U.deepClone(this)
    data._filters = _.without(this._filters, fn);
    return data;
  };

  U.Data.prototype.addField = function(field) {
    if (isA(field, U.Field)) {
      data = U.deepClone(this);
      data._fields.push(field);
      return data;
    } else
      throw new Error("Field must have a name and a function");
  };

  U.Data.prototype.removeField = function(field) {
    data = U.deepClone(data);
    data._fields = _.without(this._fields, field);
    return data;
  };

  U.Data.prototype.project = function(/* args */) {
    data = U.deepClone(this);
    data._projection = Array.slice(arguments, 0);
    return data;
  };

  U.Data.prototype.sort = function(sortProp, order) {
    data = U.deepClone(this);
    if (!( order === 'a' || order === 'd'))
      throw new Error('Order must be "a" (ascending) or "d" (descending)');
    data._sortProp = sortProp;
    data._sortOrder = order;
    return data;
  };

  U.Data.prototype.paginate = function(perPage) {
    data = U.deepClone(this);
    data._perPage = perPage;
    return data;
  }

  U.Data.prototype.toArray = function() {
    // Apply Filters First
    var filtered = _.reduce(this._filters, function(target, filter) {
        console.log(target, filter.toString());
        return _.filter(target, filter, this);
      }, this._data, this);

    console.log(filtered);

    // Apply added fields
    var withFields = _.reduce(this._fields, function(target, field) {
        return _.map(target, function(item) {
          item[field.name] = field.fn(item); return item; 
        }, this);
      }, filtered, this); 

    // Sort Data
    var sorted = _.sortBy(withFields, function(d) { d[this._sortProp] }, this);
    if (this._sortOrder === 'd')
      sorted = sorted.reverse();

    if (this._projection[0] === "*")
      var projection = sorted;
    else
      var projection = _.map(sorted, function(item) { 
        var args = [item].concat(this._projection);
        return _.pick.apply(this, args);
      }, this);
    
    if (this._perPage === 0) 
      return projection;
    else
      return _.partitionAll(projection, this._perPage);
  }

  U.Data.prototype.each = function(fn) {
    _.each(this.toArray(), fn, this);
  }

  /* Data.query accepts a 'query object' with following fields:
   * select: Array of attributes to include. Blank or ["*"] for all
   * where: Array of filtering functions
   * withFields: Array of field objects where {name: field name, func: function to create new field}
   * sort: Object with {prop: 'property to sort on', order: 'a' or 'd' for ascending or descending sort
   * perPage: Number of items per page */

  U.Data.prototype.query = function(query) {
    data = U.deepClone(this);
    if (exists(query.select)) 
      data = data.project.apply(data, query.select);
    else
      data = data.project.apply(data, '*');

    if (exists(query.where))
      data._filters = data._filters.concat(query.where);

    if (exists(query.withFields) && 
        _.every(query.withFields, function(field) { 
          return isA(field, U.Field); }))
      data._fields = data._fields.concat(query.withFields);

    if (exists(query.sort))
      data = data.sort(query.sort.prop, query.sort.order);
    
    if (exists(query.perPage))
      data = data.perPage(query.perPage);

    return data;
  };

  U.query = function(data, query) {
    data.query(query).toArray();
  }

  /* Promise that compiles to the Promises/A+ spec */

  U.Promise = function() {
    this._fullfil = [];
    this._reject = [];
    this.state = 'pending';
    this.value = null;
    this.reason = 

    this._onFullfil = function() {
      if (!(this.state === 'fulfilled') || (_.isEmpty(this._fullfil)))
        return;
      thenable = this._fulfill.shift();
      try {
        if func
        value = thenable.func(this.value);
        thenable.child.resolve(value);
      } catch (e) {
        thenable.child.reject(e);
      }
      this._onFullfil();
    }

    this._onReject = function () {
      if (!(this.state === 'rejected') || (_.isEmpty(this._reject)))
        return;
      thenable = this._reject.shift();
      try {
        value = thenable.func(this.reason);
        thenable.child.resolve(value);
      } catch (e) {
        thenable.child.reject(e);
      }
      this._onReject();
    };
  };

  U.Promise.prototype.then = function(resolve, reject) {
    child = new Promise();
    if (_.isFunction(resolve))
      this._fullfil.push({child: child, fn: resolve});
    if (_.isFunction(error))
      this._reject.push({child: child, fn: reject});
    if (!(this.state = 'pending')) {
      if (this.state = 'fulfilled') 
        _.defer(this._onFulfill());
      else
        _.defer(this._onReject());
    }
    return child;
  }

  U.Promise.prototype.fulfill = function(value) {
    if (!_.isNull(this.value))
      throw new Error("Promise is already resolved");
    this.state = 'fulfilled';
    this.value = value;
    this._onFulfill();
  }

  U.Promise.prototype.reject = function(value) {
  }

}).call(this)
