// libubret
// libubret 0.2.0
// libubret is distributed under the APL. See COPYING

(function () {

  var root = this;
  var previousUbret = root.U;
  var $ = this.$;
  var d3 = this.d3;

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
    on: function(event, cb, context) {
      if (!exists(this._listeners))
        this._listeners = {};
      var responder = {func: cb, context: context};
      if (_.isUndefined(this._listeners[event]))
        this._listeners[event] = [responder]
      else
        this._listeners[event] = this._listeners[event].concat([responder])
      },

    off: function(/* args */) {
      if (!exists(this._listeners))
        return;
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
      if (!exists(this._listeners))
        return;
      var args = Array.slice(arguments, 1);
      if (_.isNull(this._listeners))
        return;
      _.each(this._listeners[event], function(responder) {
        responder.func.apply(responder.context, args);
      });
    }
  }

  U.State = _.extend({
    setInitialState: function (stateObj) {
      this._state = U.deepClone(stateObj);
    },

    whenState: function(states, cb) {
      var stateCheck = function() {
        var check = _.every(states, function(state) {
          return exists(this._state[state]);
        }, this);
        if (check) {
          cb.apply(this, _.values(
            _.pick.apply(null, [this._state].concat(states))));
        }
      };

      _.each(states, function(state) {
        this.on("state:" + state, stateCheck, this);
      }, this);
    },

    getState: function(state) {
      if (!exists(state))
        return U.deepClone(this._state);
      return this._state[state];
    },

    setState: function(state, value) {
      if (!exists(value))
        throw new Error("State Cannot be undefined or null");
      this._state[state] = U.deepClone(value);
      this.trigger("state:" + state, this._state[state]);
    },

    unsetState: function(state) {
      if (exists(this._state[state])) {
        this._state[state] = null;
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
        return _.filter(target, filter, this);
      }, this._data, this);

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
      data = data.project.call(data, '*');

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
  };

  U.Tool = function(opts) {
    // Create tool element
    this.id = opts.id || _.uniqueId('tool_');
    this.el = document.createElement('div');
    this.el.id = this.id;
    this.el.className = this.name || '';

    if (exists($)) 
      this.$el = $(this.el);
    if (exists(d3))
      this.d3el = d3.select(this.el)
    if ((exists(this.d3el) || exists(this.$el)) && exists(this.domResponders))
      this.initializeDomResponders();

    // Initialize State Responders
    this.whenState(['data', 'filters', 'fields'], this.prepareData);
    this.whenState(['prepared-data'], this.updateChildData);

    if (exists(this.stateResponders)) 
      this.initializeStateResponders();

    // Setup State
    var state = opts.state || {}

    if (exists(this.defaults))
      _.defaults(state, this.defaults);
    _.defaults(state, {filters: [], fields: []}),

    this.setInitialState(state);
    this.setData(opts.data || []);
    this.setSelection(opts.selection || []);

    if (exists(this.initialize))
      this.initialize();
  };

  _.extend(U.Tool.prototype, U.State);

  U.Tool.extend = function(obj) {
    var child;

    if (_.has(obj, 'constructor'))
      child = obj.constructor;
    else
      child = function() {U.Tool.apply(this, arguments);};

    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = U.Tool.prototype;
    child.prototype = new Surrogate;
    
    _.extend(child.prototype, obj);

    child.__super__ = U.Tool.prototype;
    return child;
  };

  /* State Responders are defined as an Array of Responder Objects,
   * which have the following property defined
   *    whenState: String of states 
   *    respond: A single function or function reference, or an Array 
   *      of functions or function references, or a String of 
   *      names of object methods. */

  U.Tool.prototype.initializeStateResponders = function() {
    _.each(this.stateResponders, this._initStateResponder, this);
  };

  U.Tool.prototype._initStateResponder = function(responder) {
    var respond = responder.responder;
    var state = _.partial(this.whenState, responder.whenState.split(' '));

    if (_.isFunction(respond))
      return state(respond);
    else if (_.isString(respond))
      respond = _.map(respond.split(' '), function(method) {
        if (!_.isFunction(this[method]))
          throw new Error(method + " is not defined");
        return this[method];}, this);
    _.each(respond, state, this);
  };

  /* this.domResponders is defined as an object where keys are a DOM event 
   * defined as "event-type sizzle-selector", and values are either functions
   * or a string of an object method name; */

  U.Tool.prototype.initializeDomResponders = function() {
    _.each(this.domResponders, function(fn, selector) {
      if (_.isString(fn)) {
        if (exists(this[fn]))
          fn = this[fn];
        else
          throw new Error(fn + " is not defined.");
      }

      selector = selector.split(' ');
      var event = selector[0];
      selector = _.rest(selector).join(' ');

      if (exists(this.d3el))
        d3el.select(selector).on(event, fn);
      else 
        $el.on(event, selector, fn);
    }, this);
  };

  U.Tool.prototype.prepareData = function(data, filters, fields) {
    this.setState('prepared-data', 
                  data.query({where: filters, withFields: fields}));
  };

  U.Tool.prototype.parentTool = function(tool) {
    if (exists(this._parent))
      this.removeParent();
    this._parent = tool;
   
    this.setInitialState(_.extend(this.getState(), {
      data: this._parent.childData(),
      selection: this._parent.getState('selection')
    }));

    U.listenTo(this._parent, 'data', this.setData, this);
    U.listenTo(this._parent, 'selection', this.setSelection, this);
  };

  U.Tool.prototype.childData = function() {
    return this.getState('prepared-data').toArray() || [];
  };

  U.Tool.prototype.setData = function(data) {
    this.setState('data', new U.Data(U.deepClone(data)));
  };

  U.Tool.prototype.setSelection = function(selection) {
    this.setState('selection', U.deepClone(selection));
    this.trigger('selection', this.getState('selection'));
  };

  U.Tool.prototype.updateChildData = function() {
    this.trigger('data', this.childData());
  };

}).call(this)
