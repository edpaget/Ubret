// libubret-persistence.js
// libubret 0.2.0
// libubret is distributed under the APL. See COPYING.
//
// Requires Jquery

(function() {
  var root = this;
  var U = root.U;

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
