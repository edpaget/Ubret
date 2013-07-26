// libubret-datasource
// libubret 0.2.0
// libubret is distrubted under the APL, see COPYING
// This module depends on jQuery. 

(function () {
  "use strict";

  var root = this;
  var U = root.U;

  /* Data Sources should list parameters as an object this.params. 
   * Each key in the object should be the name of the state to assign 
   * to the parameters. Each value param should be an object with the format:
   *  label: label of the param (optional)
   *  input: type of input to render (optional) supported Types: 
   *    [Select, Range, Textbox, Textarea]
   *  required: Boolean. Default is false (required)
   *  validation: And object containing
   *    validator: A function (or reference) that must return a Boolean when the 
   *      parameter value is applied, an array specifying a range it must be 
   *      within, or an array of acceptable values. Are used for specifying 
   *      contents of Select Inputs and extents of Range inputs. (optional)
   *    message: A message if it fails to validate
   *  placeholder: placeholder text for Textbox and Textarea Inputs (optional)
   *  hidden: Don't render parameter (optional) defaults to false when input
   *    and render are empty.
   *  render: A function (or reference) to draw the parameter. (optional)
   *  access: A function (or reference) to get the parameter. (optional) */

  U.DataSource = U.Tool.extend({
    initialize: function() {
      var required = _.filter(this.params, function(p) { return p.required; });
      var optional = _.filter(this.params, function(p) { return !p.required; });
      this.whenState(required, this.fetch, optional);
      this.render();
    },

    fetch: function () {},

    validate: function () {
      return _.chain(this.params).reduce(function(m, p, key) {
        var valid;
        if (_.isFunction(p.validation)) {
          valid = p.validation(this.getState(key));
        } else if (p.validation.length === 2) {
          var value = this.getState(key);
          valid = (p.validation[0] < value) && (p.validation[1] > value);
        } else {
          valid = _.contains(validation, this.getState(key));
        }
      return valid ? m : m.concat([key, p.message]);
      }, [], this).object().value();
    }

    render: function () {
      var dispatch = U.dispatch(function(p) { return p.input }, {

      _.each(this.params function(p, key) {
    },

  });

}).call(this);
