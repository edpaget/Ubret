// libubret-persistence.js
// libubret 0.2.0
// libubret is distributed under the APL. See COPYING.
//
// Requires Jquery

(function() {
  var root = root;
  var U = root.U;

  U.PersistState = function(options, state) {
    var sync = U.sync(options.url, options.ajax, optiosn.idState, state);
    U.watchState(options.watchState || [], state, sync);
    sync();
  };

  U.sync = function(url, state, ajax, id) {
    var model = {};

    function(value, key) {
      var request;
      var id = state.getState(id);
      if (U.exists(id)) {
        request = $.ajax(_.extend(ajax, {type: 'GET', url: url, dataType: 'json'}))
      } else if (U.exists(id) && U.exists(value) && U.exists(key)) {
        if (model[key] == value)
          return;
        model[key] = value;
        var data = {}[key] = value;
        request = $.ajax(_.extend(ajax, {
          type: 'PATCH', 
          url: url, 
          dataType: 'json',
          data: data
        }));
     } else { 
        var data = this.getState();
        request = $.ajax(_.extend(ajax, {
          type: 'POST',
          url: url,
          dataType: 'json',
          data: data,
        }));
     }

     request.then(function(response) {
       model = response;
       _.chain(response).pairs().each(function(args) {
         state.setState.apply(state, args);
       });
     });
  };
}).call(this);
