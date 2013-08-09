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

  U.exists = function(/* obj */) {
    var args = Array.prototype.slice.call(arguments);
    return _.every(args, function(obj) {return !(_.isNull(obj) || _.isUndefined(obj));});
  }

  U.deepClone = function(obj) {
    if (_.isFunction(obj) || !U.exists(obj) || !_.isObject(obj))
      return obj;
    var tmp = new obj.constructor();
    _.each(obj, function(value, key) {
      if (obj.hasOwnProperty(key))
        tmp[key] = U.deepClone(value);});
    return tmp;
  }

  U.identity = function(value) {
    return value;
  };

  U.dispatch = function(dispatchFn, obj, ctx) {
    var dispatchObj = _.map(obj, function(fns, regex) {
      fns = U._fnsFromContext(ctx, fns);
      return [new RegExp("^" + regex + "$"), fns];
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
		fns = U._fnsFromContext(ctx, fns);

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

  U.EventEmitter = function(listeners, ctx) {
		this.listeners = listeners || {};
		this.ctx = ctx;
		this._listen();
	};

  U._fnFromContext = function(ctx, fn) {
    if (_.isString(fn))
      fn = ctx[fn]
    if (_.isUndefined(fn))
      throw new Error('Function must be defined');
    return fn;
  };

  U._fnsFromContext = function(ctx, fns) {
    if (_.isArray(fns)) {
      return _.map(fns, _.partial(U._fnFromContext, ctx));
		} else if (_.isString(fns)) {
      fns = fns.split(' ');
      return _.map(fns, _.partial(U._fnFromContext, ctx));
    } else {
			return [fns];
		}
  };

  U.EventEmitter.prototype = {
		_listen: function() {
      this._listeners = U.dispatch(U.identity, this.listeners, this.ctx);
			return this;
		},

    on: function(event, fns, ctx) {
			if (U.exists(ctx))
      	fns = U._fnsFromContext(ctx, fns);
      if (U.exists(ctx) && (this.ctx !== ctx))
        fns = _.map(fns, function(fn) { return _.bind(fn, ctx); });
      if (U.exists(this.listeners[event]))
        this.listeners[event] = this.listeners[event].concat(fns);
      else
        this.listeners[event] = fns;
			return this._listen();
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
			return this._listen();
    },

    trigger: function(/*, args */) {
      var args = Array.prototype.slice.call(arguments);
      this._listeners.apply(null, args);
      return this;
    }
  };

	U.State = function(state, ctx) {
		this.state = state || {};
		U.EventEmitter.call(this, {}, ctx);
	}

  U.watchState = function(statefulObj, state, fns, ctx) {
		fns = U._fnsFromContext(ctx, fns);

		if (_.isArray(state)) {
			var reqState = state;
			var optState = [];
		} else {
			var reqState = state.required;
			var optState = state.optional;
		}
		var allStates = reqState.concat(optState);

		var stateCheck = function(x, key) {
			key = key.replace('state:', '');
			var check = _.every(reqState, function(state) {
				return U.exists(statefulObj.get(state));
			});

			if (check) {
				if (allStates.length === 1)
					var state = [ statefulObj.get.apply(statefulObj, allStates) ];
				else
					var state = statefulObj.get.apply(statefulObj, allStates);
				_.each(fns, function(fn) {
					fn.apply(ctx, state.concat(key));
				});
			}
		};

		_.each(allStates, function(state) {
			U.listenTo(statefulObj, "state:" + state, stateCheck);
		});
  };

  U.State.prototype = {
    get: function(/* state */) {
      var args = Array.prototype.slice.call(arguments);
      if (args.length === 0)
        return this.state;
			var states = _.chain(args)
				.map(this._parseState, this)
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

		_parseState: function(state) {
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

			var finalState = this._parseState(state);
			if (!_.isEqual(finalState[1][finalState[0]], value)) {
				finalState[1][finalState[0]] = value;
        this.trigger("state:" + state, value);
			}
    }
  };

	_.extend(U.State.prototype, U.EventEmitter.prototype);

  U.DomBinding = function(options, state, el) {
    if (U.exists(el)) {
      options.el = el; 
    }

    options.state = state;
    var removeWatch = this.removeWatch;
    var watchDom = this.watchDom;
    var attachDom = this.attachDom;
    var render = _.wrap(options.render, function(fn) {
      var args = Array.prototype.slice.call(arguments, 1);
      removeWatch();
      attachDom(fn.apply(null, args));
      watchDom();
    });

    U.watchState(state, 
                 options.watchState, 
                 render,
                 options);
  };

  U._parseSelector = function(options, eventAttacher) {
    return function(fns, event) {

      var selector = event.split(' ');
      var event = _.first(selector);
      selector = _.rest(selector).join(' ');

      fns = U._fnsFromContext(options, fns);
      _.each(fns, _.partial(eventAttacher, event, selector));
    };
  };

  U.$DomBinding = function(options, state, el) {
    options.$el = U.exists(el) ? $(el) : $(options.el);

    var eventBinder = function(event, selector, fn) {
      options.$el.on(event, selector, fn);
    };

    var dom = {
      watchDom: function() {
        _.each(options.events, U._parseSelector(options, eventBinder));
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
    options.d3el = d3.select(el);
    var eventBinder = function(event, selector, fn) {
      if (U.exists(selector))
        options.d3el.selectAll(selector).on(event, fn);
      else
        options.d3el.on(event, fn);
    };

    var dom = {
      watchDom: function() {
        _.each(options.events, U._parseSelector(options, eventBinder));
      },
      removeWatch: function() {
        options.d3el.on(null);
      },
      attachDom: U.identity
    };

    U.DomBinding.call(dom, options, state, el);
  };

  U.PersistState = function(options, state, url) {
    _.defaults(options, {
      idField: 'id',
      ajax: {},
      watchState: [],
      toJSON: U.identity,
      fromJSON: U.identity
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
      return function(/* args */) {
        var request;
        var key = _.last(Array.prototype.slice.call(arguments));
        var id = state.getState(idField);
        var data = state.getState.apply(state, persistedState);
        
        if (key === idField && U.exists(id)) {
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
