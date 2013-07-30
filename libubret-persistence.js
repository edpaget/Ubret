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
    var sync = U.sync(options.watchState, 
                      options.url, 
                      options.ajax, 
                      options.idField, 
                      options.toJSON, 
                      options.fromJSON)(state)
    U.watchState(options.watchState, state, sync);
    sync();
  };

  U.sync = function(persistedState, url, ajax, idField, toJSON, fromJSON) {
    return function(state) {
      var model = {};

      return function(value, key) {
        var request;
        var id = state.getState(idField);
        var data = state.getState(persistedState);

        if (U.exists(id)) {
          console.log('here');
          request = $.ajax(_.extend(ajax, {type: 'GET', url: url + id, dataType: 'json'}))
        } else if (U.exists(id) && U.exists(value) && U.exists(key)) {
          if (model[key] == value)
            return;
          model[key] = value;
          request = $.ajax(_.extend(ajax, {
            type: 'PUT', 
            url: url, 
            dataType: 'json',
            data: toJSON(data)
          }));
       } else { 
          var data = state.getState();
          model = data;
          request = $.ajax(_.extend(ajax, {
            type: 'POST',
            url: url,
            dataType: 'json',
            data: toJSON(data)
          }));
       }

       return request.then(fromJSON).then(function(response) {
         model = response;
         _.chain(response).pairs().each(function(args) {
          if (_.contains(persistedState, args[0]))
            state.setState.apply(state, args);
         });
       });
      }
    }
  };
}).call(this);
