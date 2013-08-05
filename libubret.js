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
      fns = U.fnsFromContext(ctx, fns);
      return [new RegExp(regex), fns];
    });
    return function(value/*, args*/) {
      var args = Array.prototype.slice.call(arguments, 1);
      var dispatchValue = dispatchFn.call(this, value) || 'default';
      _.chain(dispatchObj).filter(function(pair) {
        return !_.isEmpty(dispatchValue.match(pair[0]));
      }).each(function(pair) {
        _.each(pair[1], function(fn) { fn.apply(ctx, args.concat(value)); });
      });
    };
  };

  U.pipeline = function(ctx/*, fns */) {
    var fns = Array.prototype.slice.call(arguments, 1);
		fns = U.fnsFromContext(ctx, fns);

    return function(seed/*, args */) {
      var args = Array.prototype.slice.call(arguments, 1);
      return _.reduce(fns, function(r, fn) { 
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
      ctx: { value: ctx },
      listeners: { 
				value: listeners || {},
				writable: true
			},
      _listeners: { 
				value: U.dispatch(U.identity, listeners, ctx),
				writable: true
		 	}
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
    if (_.isArray(fns)) {
      return _.map(fns, _.partial(U.fnFromContext, ctx));
		} else if (_.isString(fns)) {
      fns = fns.split(' ');
      return _.map(fns, _.partial(U.fnFromContext, ctx));
    } else {
			return [fns];
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
			if (!U.exists(event))
				this.listeners = {};
			else if (!U.exists(fn))
        this.listeners[event] = [];
      else {
        if (U.exists(ctx))
          fn = _.bind(fn, ctx);
        this.listeners[event] = _.without(this.listeners[event], fn);
      }
      this._listeners = U.dispatch(U.identity, this.listeners, this.ctx);
      return this;
    },

    trigger: function(/*, args */) {
      var args = Array.prototype.slice.call(arguments);
      this._listeners.apply(null, args);
      return this;
    }
  };

	U.createState = function(state, ctx) {
		return Object.create(_.extend({}, U.State, U.EventEmitter), {
			state: { 
				value: state || {},
				writable: true
			},
      ctx: { value: ctx },
      listeners: { 
				value: {},
				writable: true
			},
      _listeners: { 
				value: U.dispatch(U.identity, {}, ctx),
				writable: true
		 	}
    });
	};

  U.watchState = function(statefulObj, state, fns, ctx) {
		fns = U.fnsFromContext(ctx, fns);

		if (_.isArray(state)) {
			var reqState = state;
			var optState = [];
		} else {
			var reqState = state.required;
			var optState = state.optional;
		}
		var allStates = reqState.concat(optState);

		var stateCheck = function(x, key) {
			var check = _.every(reqState, function(state) {
				return U.exists(statefulObj.get(state));
			});

			if (check) {
				if (allStates.length === 1)
					var state = [ U.State.get.apply(statefulObj, allStates) ];
				else
					var state = U.State.get.apply(statefulObj, allStates);
				_.each(fns, function(fn) {
					fn.apply(ctx, state.concat(key));
				});
			}
		};

		_.each(allStates, function(state) {
			U.listenTo(statefulObj, "state:" + state, stateCheck);
		});
  };

  U.State = {
    get: function(/* state */) {
      var args = Array.prototype.slice.call(arguments);
      if (args.length === 0)
        return this.state;
			var states = _.chain(args)
				.map(this.parseState, this)
				.map(function(pair) {
					if (pair[0] === '*')
						return U.deepClone(pair[1]);
					else
						return U.deepClone(pair[1][pair[0]]); })
				.value();
			if (args.length === 1)
				return states[0];
			return states
    },

		parseState: function(state) {
			var toAccessor = function(accessor) {
				var arrayMatch = accessor.match(/\[[0-9]+\]/);
				if (!_.isNull(arrayMatch))
					return parseInt(arrayMatch[0]);
				else
					return accessor;
			};
			var state = state.split('.');
			var finalAccessor = toAccessor(state.pop());
			var stateObj = _.reduce(state, function(m, accessor) {
				return m[toAccessor(accessor)];
			}, this.state);
			return [finalAccessor, stateObj];
		},

    set: function(state, value) {
			if (_.isObject(state)) {
				_.each(state, function(value, state) {
					this.set(state, value);
				}, this);
			}	

      if (!U.exists(value))
        throw new Error("State Cannot be undefined or null");

			var finalState = this.parseState(state);
			if (!_.isEqual(finalState[1][finalState[0]], value)) {
				finalState[1][finalState[0]] = value;
				this.triggerStates(state);
			}
    },

		triggerStates: function(state) {
			var states = state.split('.')
			_.reduce(states, function(m, state, index) {
				if (index === 0)
					var event = state;
				else
					var event = m + "." + state;
				this.trigger("state:" + event, this.get(event));
				return event;
			}, "", this);
		}
  };

  U.Field = {name: 'name', fn: function() {}}

  U.Data = function(data) {
    this._data = data;
    this._filters = [];
    this._fields = [];
    this._sortProp = 'uid';
    this._sortOrder = 'a';
    this._projection = ["*"];
    this._perPage = 0;
		this._keys = _.chain(this._data).map(function(i) { 
      return _.chain(i).omit('uid', '_id', 'image').keys().value() 
    }).flatten().uniq().value();
  };

  U.Data.prototype.filter = function(fn) {
    var data = U.deepClone(this);
    data._filters.push(fn);
    return data;
  };

	U.Data.prototype.filters = function(fns) {
    var data = U.deepClone(this);
		data._filters = data._filters.concat(fns);
		return data;
	};

  U.Data.prototype.removeFilter = function(fn) {
    var data = U.deepClone(this)
    data._filters = _.without(this._filters, fn);
    return data;
  };

	U.Data.prototype.addFields = function(fields) {
		if (!_.every(fields, _.partial(U.isA, U.Field)))
			throw new Error('All Fields must have a name and a function');
    var data = U.deepClone(this);
		data._fields = data._filters.concat(fields);
		data._keys = _.uniq(data._keys.concat(_.pluck(fields, 'name')));
		return data;
	};

  U.Data.prototype.addField = function(field) {
    if (!U.isA(field, U.Field)) 
      throw new Error("Field must have a name and a function");
    var data = U.deepClone(this);
    data._fields.push(field);
		data._keys = _.uniq(data._keys.concat(field.name));
    return data;
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
  };

  U.Data.prototype.keys = function() {
    return this._keys;
	};

	U.Data.prototype.data = function() {
		return this._data;
	};

	U.Data.prototype._applyFilters = function(data) {
		return _.reduce(this._filters, function(data, filter) {
			return _.filter(data, function(d) { return filter(d) });
		}, data)
	};

	U.Data.prototype._applySort = function(data) {
		var sorted = _.sortBy(data, function(d) { return d[this._sortProp] }, this);
		if (this._sortOrder === 'd')
			return sorted.reverse();
		else
			return sorted;
	};

	U.Data.prototype._applyPaginate = function(data, take) {
		if (this._perPage === 0)
			return data;
		return _.reduce(data, function(m, d, index) {
			if (m.length === take)
				return m;
			if ((index % this._perPage) === 0)
				m.push([d]);
			else
				m[m.length - 1].push(d);
			return m;
		}, [], this);
	};

	U.Data.prototype._take = function(data, take) {
		if (this._perPage > 0)
			return data;
		else
			return data.slice(0, take);
	};

	U.Data.prototype._applyFields = function(data) { 
		var applyField = function(field, d) {
			d[field.name] = field.fn(d);
			return d;
		};

		return _.reduce(this._fields, function(data, field) {
			return _.map(data, function(datum) {
				if (_.isArray(datum))
					return _.map(datum, _.partial(applyField, field));
				else
					return applyField(field, datum)
			});
		}, data);
	};

	U.Data.prototype._applyProjection = function(data) {
		var applyProjection = function(projection, data) {
			return _.map(data, function(d) {
				return _.pick.apply(null, [d].concat(projection));
			});
		};

		if (this._projection[0] === "*")
			return data;
		else if (this._perPage > 0)
			return _.map(data, _.partial(applyProjection, this._projection));
		else
			return applyProjection(this._projection, data);
	};

  U.Data.prototype.toArray = function(take) {
		return U.pipeline(this,  
			'_applyFilters',
			'_applySort',
			'_applyPaginate',
			'_take',
			'_applyFields',
			'_applyProjection')(this._data, take);
  };

  U.Data.prototype.each = function(fn, take) {
    _.each(this.toArray(take), fn, this);
  };

  /* Data.query accepts a 'query object' with following fields:
   * select: Array of attributes to include. Blank or ["*"] for all
   * where: Array of filtering functions
   * withFields: Array of field objects where {name: field name, func: function to create new field}
   * sort: Object with {prop: 'property to sort on', order: 'a' or 'd' for ascending or descending sort
   * perPage: Number of items per page */

  U.Data.prototype.query = function(q) {
		_.defaults(q, {
			perPage: 0,
			sort: {prop: 'uid', order: 'a'},
			withFields: [],
			where: [],
			select: '*'
		});

    var data = U.deepClone(this);
    return data.project(q.select)
			.sort(q.sort.prop, q.sort.order)
			.addFields(q.withFields)
			.filters(q.where)
			.paginate(q.perPage);
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

		this.state = U.createState(state, this);

    if (U.exists(opts.data))
      this.setData(opts.data);
    this.setSelection(opts.selection || []);

    // Initialize State Responders
    U.watchState(this.state, ['data', 'filters', 'fields'], this.prepareData, this);
    U.watchState(this.state, ['prepared-data'], this.updateChildData, this);

    if (U.exists(this.stateResponders)) 
      this.initializeStateResponders();

    if (U.exists(this.initialize))
      this.initialize();
  };

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
   *    responder: A single function or function reference, or an Array 
   *      of functions or function references, or a String of 
   *      names of object methods. */

  U.Tool.prototype.initializeStateResponders = function() {
    _.each(this.stateResponders, this._initStateResponder, this);
  };

  U.Tool.prototype._initStateResponder = function(r) {
    U.watchState(this.state, r.whenState.split(' '), r.responder, this);
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
    this.state.set('prepared-data', 
                  	data.query({where: filters, withFields: fields}));
  };

  U.Tool.prototype.parentTool = function(tool) {
    if (U.exists(this._parent))
      this.removeParent();
    this._parent = tool;
   
    this.setData(this._parent.childData());
    this.setSelection(this._parent.state.get('selection'));

    U.listenTo(this._parent.state, 'data', this.setData, this);
    U.listenTo(this._parent.state, 'selection', this.setSelection, this);
  };

  U.Tool.prototype.childData = function() {
    var data = this.state.get('prepared-data');
		console.log(this, this.state);
    if (U.exists(data))
      return data.toArray();
    else
      return [];
  };

  U.Tool.prototype.setData = function(data) {
		console.log(this, data);
    if (_.isEmpty(data))
      return;
    this.state.set('data', new U.Data(data));
  };

  U.Tool.prototype.setSelection = function(selection) {
    this.state.set('selection', U.deepClone(selection));
    this.state.trigger('selection', this.state.get('selection'));
  };

  U.Tool.prototype.updateChildData = function() {
    this.state.trigger('data', this.childData());
  };

}).call(this)
