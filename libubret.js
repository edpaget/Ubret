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

  U.isA = function(object, interface) {
    _.difference(_.keys(object), _.keys(interface)).length === 0;
  };

  U.listenTo = function(eventEmitter, event, fn, context) {
    eventEmitter.on(event, fn, context);
  };

  U.stopListening = function(eventEmitter/*, args */) {
    var args = Array.slice(arguments, 1);
    eventEmitter.off.apply(eventEmitter, args);
  }

  U.EventEmitter = {
    on: function(event, cb, context) {
      var responder = {func: cb, context: context};
      if (_.isUndefined(this._listeners))
        this._listeners = {}
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

  U.StateMachine = _.extend({
    initStateMachine: function(states) {
      this._stateMachine = [];
      _.each(states, function(func, state) {
        this.on("fsm:" + state, func, this);
      }, this);
    },

    setState: function(state) {
      this._stateMachine = _.uniq(this._stateMachine.concat([state]));
      this.trigger("fsm:" + this._stateMachine.join(' '));
    },

    unsetState: function(state) {
      this._stateMachine = _.without(this._stateMachine, state);
      this.trigger("fsm:unset:" + state);
      this.trigger("fsm:" + this._stateMachine.join(' '));
    } 
  }, U.EventEmitter);
}).call(this)
