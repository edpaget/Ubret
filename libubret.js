// libubret
// libubret 0.2.0
// libubret is distributed under the APL. See COPYING

(function () {
  "use strict"; 

  var root = this;
  var previousUbret = root.U;
  var $ = this.$;
  var d3 = this.d3;

  var U = {};

  if (typeof exports !== 'undefined')
    module.exports = U;
  else
    root.U = U;

  U.isA = function(object, _interface) {
    return _.difference(_.keys(object), _.keys(_interface)).length === 0;
  };

  U.deepClone = function(obj) {
    if (_.isFunction(obj) || !U.exists(obj) || !_.isObject(obj))
      return obj;
    var tmp = new obj.constructor();
    _.each(obj, function(value, key) {
      if (obj.hasOwnProperty(key))
        tmp[key] = U.deepClone(value);});
    return tmp;
  }

  U.exists = function(/* obj */) {
    var args = Array.prototype.slice.call(arguments);
    return _.every(args, function(obj) {return !(_.isNull(obj) || _.isUndefined(obj));});
  }

  U.identity = function(value) {
    return value;
  };

  U.dispatch = function(dispatchFn, obj, ctx) {
    var dispatchObj = _.map(obj, function(fns, regex) {
      fns = U.fnsFromContext(fns, ctx);
      return [new RegExp(regex), fns];
    });
    return function(value/*, args*/) {
      var args = Array.prototype.slice.call(arguments);
      var dispatchValue = dispatchFn.call(this, value) || 'default';
      _.chain(dispatchObj).filter(function(pair) {
        return !_.isEmpty(pair[0].match(dispatchValue));
      }).each(function(pair) {
        _.each(pair[1], function(fn) { fn.apply(ctx, args); });
      });
    };
  };

  U.pipeline = function(ctx/*, fns */) {
    var fns = Array.prototype.slice.call(arguments, 1);

    return function(seed/*, args */) {
      var args = Array.prototype.slice.call(arguments, 1);
      _.reduce(fns, function(r, fn) { 
        fn = U.fnFromContext(fn, ctx);
        return fn.apply(ctx, [r].concat(args));
      }, seed);
    }
  };

  U.listenTo = function(eventEmitter, event, fn, ctx) {
    return eventEmitter.on(event, fn, ctx);
  };

  U.stopListening = function(eventEmitter, event, fn, ctx) {
    return eventEmitter.off(event, fn, ctx);
  };

  U.createEventEmitter = function(listeners, ctx) {
    return Object.create(U.EventEmitter, {
      ctx: ctx,
      listeners: listeners, 
      _listeners: U.dispatch(U.identity, listeners, ctx)
    });
  };

  U.fnFromContext = function(ctx, fn) {
    if (_.isString(fn))
      fn = ctx[fn]
    if (_.isUndefined(fn))
      throw new Error('Function must be defined');
    return fn;
  };

  U.fnsFromContext = function(ctx, fns) {
    if (_.isArray(fns))
      return fns;
    else if (_.isFunction(fns))
      return [fns];
    else if (_.isString(fns)) {
      fns = fns.split(' ');
      return _.map(fns, _.partial(U.fnFromContext, ctx));
    }
  };

  U.EventEmitter = {
    on: function(event, fns, ctx) {
      fns = U.fnsFromContext(ctx, fns);
      if (this.ctx !== ctx)
        fns = _.map(fns, function(fn) { return _.bind(fn, ctx); });
      if (U.exists(this.listeners[event]))
        this.listeners[event] = this.listeners[event].concat(fns);
      else
        this.listeners[event] = fns;
      this._listeners = U.dispatch(U.identity, this.listeners, this.ctx);
      return this;
    },

    off: function(event, fn, ctx) {
      if (!U.exists(fn))
        this.listeners[event] = [];
      else {
        if (U.exists(ctx))
          fn = _.bind(fn, ctx);
        this.listeners[event] = _.without(this.listeners[event], fn);
      }
      this._listeners = U.dispatch(U.identity, this.listeners, thix.ctx);
      return this;
    },

    trigger: function(/*, args */) {
      var args = Array.prototype.slice.call(arguments);
      this._listeners.apply(null, args);
      return this;
    }
  };

  U.watchState = function(reqStates, statefulObj, fn, optStates) {
    statefulObj.whenState(reqStates, fn, optStates);
  };

  U.State = _.extend({
    setInitialState: function (stateObj) {
      this._state = U.deepClone(stateObj);
    },

    whenState: function(states, cb, optionalState) {
      if (!U.exists(optionalState))
        optionalState = [];
      var allStates = states.concat(optionalState);
      var stateCheck = function(x, key) {
        var check = _.every(states, function(state) {
          return U.exists(this._state[state]);
        }, this);
        if (check) {
          cb.apply(this, _.values(this.getState.apply(this, allStates)).concat(key));
        }
      };

      _.each(allStates, function(state) {
        this.on("state:" + state, stateCheck, this);
      }, this);

      stateCheck.call(this, null, states[0]);
    },

    getState: function(/* state */) {
      var args = Array.prototype.slice.call(arguments);
      if (args.length === 0)
        return U.deepClone(this._state);
      else if (args.length === 1)
        return this._state[args[0]];
      else
        return _.pick.apply(null, [this._state].concat(args));
    },

    setState: function(state, value, trigger) {
      if (!U.exists(trigger))
        trigger = true;
      if (!U.exists(value))
        throw new Error("State Cannot be undefined or null");
      this._state[state] = U.deepClone(value);
      if (trigger) 
        this.trigger("state:" + state, this._state[state], state);
    },

    unsetState: function(state) {
      if (U.exists(this._state[state])) {
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
    var data = U.deepClone(this);
    data._filters.push(fn);
    return data;
  }

  U.Data.prototype.removeFilter = function(fn) {
    var data = U.deepClone(this)
    data._filters = _.without(this._filters, fn);
    return data;
  };

  U.Data.prototype.addField = function(field) {
    if (U.isA(field, U.Field)) {
      var data = U.deepClone(this);
      data._fields.push(field);
      return data;
    } else
      throw new Error("Field must have a name and a function");
  };

  U.Data.prototype.removeField = function(field) {
    var data = U.deepClone(this);
    data._fields = _.without(this._fields, field);
    return data;
  };

  U.Data.prototype.project = function(/* args */) {
    var data = U.deepClone(this);
    data._projection = Array.prototype.slice.call(arguments, 0);
    return data;
  };

  U.Data.prototype.sort = function(sortProp, order) {
    var data = U.deepClone(this);
    if (!( order === 'a' || order === 'd'))
      throw new Error('Order must be "a" (ascending) or "d" (descending)');
    data._sortProp = sortProp;
    data._sortOrder = order;
    return data;
  };

  U.Data.prototype.paginate = function(perPage) {
    var data = U.deepClone(this);
    data._perPage = perPage;
    return data;
  }

  U.Data.prototype.keys = function() {
    return _.chain(this._data).map(function(i) { 
          return _.chain(i).omit('uid', '_id', 'image').keys().value() 
      }).flatten().uniq().value();
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
    var sorted = _.sortBy(withFields, function(d) { 
      return d[this._sortProp] }, this);
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
    var data = U.deepClone(this);
    if (U.exists(query.select)) 
      data = data.project.apply(data, query.select);
    else
      data = data.project.call(data, '*');

    if (U.exists(query.where))
      data._filters = data._filters.concat(query.where);

    if (U.exists(query.withFields) && 
        _.every(query.withFields, function(field) { 
          return U.isA(field, U.Field); }))
      data._fields = data._fields.concat(query.withFields);

    if (U.exists(query.sort))
      data = data.sort(query.sort.prop, query.sort.order);
    
    if (U.exists(query.perPage))
      data = data.paginate(query.perPage);

    return data;
  };

  U.query = function(data, query) {
    return data.query(query).toArray();
  };

  /* Tool accepts an opts object to configure new tools
   * id: the id of the tool's element (optional)
   * data: data in the form of an array of objects (optional)
   * selection: array of selected uids of objects (optional)
   * state: an object of the initial state of the object (optional) */

  U.Tool = function(opts) {
    // Create tool element
    this.id = opts.id || _.uniqueId('tool_');
    this.el = document.createElement('div');
    this.el.id = this.id;
    this.el.className = this.name || '';
    opts.dom = this.dom || opts.dom;

    if (opts.dom === "$") 
      this.$el = $(this.el);
    if (opts.dom === "d3")
      this.d3el = d3.select(this.el)
    if (U.exists(this.$el) && U.exists(this.domEvents))
      this.delegateDomEvents('$');

    // Setup State
    var state = opts.state || {}

    if (U.exists(this.defaults))
      _.defaults(state, this.defaults);
    _.defaults(state, {filters: [], fields: []}),

    this.setInitialState(state);

    if (U.exists(opts.data))
      this.setData(opts.data);
    this.setSelection(opts.selection || []);

    // Initialize State Responders
    this.whenState(['data', 'filters', 'fields'], this.prepareData);
    this.whenState(['prepared-data'], this.updateChildData);

    if (U.exists(this.stateResponders)) 
      this.initializeStateResponders();

    if (U.exists(this.initialize))
      this.initialize();
  };

  _.extend(U.Tool.prototype, U.State);

  U.extend = function(parent, obj) {
    var child;

    if (_.has(obj, 'constructor'))
      child = obj.constructor;
    else
      child = function() {parent.apply(this, arguments);};

    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;
    
    _.extend(child.prototype, obj);

    child.__super__ = parent.prototype;
    return child;
  };

  U.Tool.extend = _.partial(U.extend, U.Tool);

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

  /* this.domEvents is defined as an object where keys are a DOM event 
   * defined as "event-type sizzle-selector", and values are either functions
   * or a string of an object method name; */

  U.Tool.prototype.delegateDomEvent = function(type, fn, selector) {
    if (_.isString(fn)) {
      if (U.exists(this[fn]))
        fn = _.bind(this[fn], this);
      else
        throw new Error(fn + " is not defined.");
    }

    selector = selector.split(' ');
    var event = selector[0];
    selector = _.rest(selector).join(' ');

    if (type === "d3") 
      this.d3el.selectAll(selector).on(event, _.bind(fn, this));
    else if (type === "$")
      this.$el.on(event, selector, _.bind(fn, this));
  };

  U.Tool.prototype.delegateDomEvents = function(type) {
    _.each(this.domEvents, _.partial(this.delegateDomEvent, type), this);
  };

  U.Tool.prototype.prepareData = function(data, filters, fields) {
    this.setState('prepared-data', 
                  data.query({where: filters, withFields: fields}));
  };

  U.Tool.prototype.parentTool = function(tool) {
    if (U.exists(this._parent))
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
    var data = this.getState('prepared-data')
    if (U.exists(data))
      return data.toArray();
    else
      return [];
  };

  U.Tool.prototype.setData = function(data) {
    if (_.isEmpty(data))
      return;
    this.setState('data', new U.Data(data));
  };

  U.Tool.prototype.setSelection = function(selection) {
    this.setState('selection', U.deepClone(selection));
    this.trigger('selection', this.getState('selection'));
  };

  U.Tool.prototype.updateChildData = function() {
    this.trigger('data', this.childData());
  };

}).call(this)
