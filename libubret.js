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
      console.log(arguments, dispatchObj);
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
      this.changed = [state];
			if (_.isObject(state)) {
        this.chang
				_.each(state, function(value, state) {
					this.set(state, value);
				}, this);
			}	

      if (!U.exists(value))
        throw new Error("State Cannot be undefined or null");

			var finalState = this.parseState(state);
			if (!_.isEqual(finalState[1][finalState[0]], value)) {
				finalState[1][finalState[0]] = value;
        this.trigger("state:" + state, value);
			}
    }
  };

  U.Field = {name: 'name', fn: function() {}}

  U.Data = function(data, omittedKeys) {
    this._data = data;
    this._filters = [];
    this._fields = [];
    this._sortProp = 'uid';
    this._sortOrder = 'a';
    this._projection = ["*"];
    this._perPage = 0;
		this._keys = _.chain(this._data).map(function(i) { 
      return _.keys(_.omit.apply(null, [i].concat(omittedKeys)));
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

  var root = this;
  var U = root.U;

  U.DomBinding = function(options, state, el) {
    if (!U.exists(el)) {
      options.el = el; 
    }

    options.state = state;
    var removeDom = this.removeDom;
    var watchDom = this.watchDom;
    var attachDom = this.attachDom;
    var render = _.wrap(options.render, function(fn) {
      removeDom();
      attachDom(fn());
      watchDom();
    });

    U.watchState(state, 
                 options.watchState, 
                 render,
                 options);
  };

  U._parseSelector = function(eventAttacher) {
    return function(fns, event) {

      selector = event.split(' ');
      event = _.first(selector);
      selector = _.rest(selector).join(' ');

      fns = U.fnsFromContext(options, fns);
      _.each(fns, _.partial(eventAttacher, event, selector));
    };
  };

  U.$DomBinding = function(options, state, el) {
    options.$el = U.exists(el) ? $(el) : $(options.el);

    eventBinder = function(event, selector, fn) {
      options.$el.on(event, selector, fn);
    };

    dom = {
      watchDom: function() {
        _.each(options.events, U._parseSelector(eventBinder));
      },
      removeWatch: function() {
        options.$el.off();
      },
      attachDom: function(htmlLike) {
        options.$el.html(htmlLike);
      }
    };
    U.DomBinding.call(dom, options, state, el);
  };

  U.d3DomBinding = function(options, state, el) {
    options.d3el = d3(el);
    eventBinder = function(event, selector, fn) {
      if (U.exists(selector))
        options.d3el.selectAll(selector).on(event, fn);
      else
        options.d3el.on(event, fn);
    };

    dom = {
      watchDom: function() {
        _.each(options.events, U._parseSelector(eventBinder));
      },
      removeWatch: function() {
        options.d3el.off();
      },
      attachDom: U.identity
    };

    U.DomBinding.call(dom, options, state, el);
  }

  U.PersistState = function(options, state) {
    _.defaults(options, {
      idField: 'id',
      ajax: {},
      watchState: [],
      toJSON: function(state) {
        return state;
      },
      fromJSON: function(response) {
        return response;
      }
    });
    var sync = U.sync(options.requiredState.concat(options.optionalState),
                      options.url, 
                      options.ajax, 
                      options.idField, 
                      options.toJSON, 
                      options.fromJSON)(state);
    U.watchState(options.requiredState, state, sync, options.optionalState);
    sync(options.idField);
  };

  U.sync = function(persistedState, url, ajax, idField, toJSON, fromJSON) {
    return function(state) {
      var model = {};

      return function(/* args */) {
        var request;
        var key = _.last(Array.prototype.slice.call(arguments));
        var id = state.getState(idField);
        var data = state.getState.apply(state, persistedState);
        
        if (U.exists(key) && (model[key] === data[key])) {
          return;
        } else if (key === idField && U.exists(id)) {
          model[key] = id;
          request = $.ajax(_.defaults(ajax, {
            type: 'GET', 
            url: url + id, 
            dataType: 'json'}));
        } else if (U.exists(id, key)) {
          model[key] = data[key];
          request = $.ajax(_.defaults(ajax, {
            type: 'PUT', 
            url: url, 
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify(toJSON(data))}));
        } else { 
          model = data;
          request = $.ajax(_.defaults(ajax, {
            type: 'POST',
            url: url,
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify(toJSON(data))}));
        }

        return request.then(fromJSON).then(function(response) {
          _.chain(response).pairs().each(function(args) {
            if (_.contains(persistedState, args[0])) {
              if (model[args[0]] === args[1]) {
                state.setState.apply(state, args.concat(false));
              } else {
                model[args[0]] = args[1];
                state.setState.apply(state, args);
              }
           }
         })});
      }
    }
  };
}).call(this);
