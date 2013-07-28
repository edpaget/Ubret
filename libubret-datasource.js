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
   *  hidden: Don't render parameter (optional) defaults to false when input
   *    and render are empty.
   *  render: A function (or reference) to draw the parameter. (optional);
   *  attributes: Additional attributes to add the params dom element. (optional);
   *  access: A domEvent style object (see libubret.js) that returns a value (optional); */

  U.DataSource = U.Tool.extend({
    initialize: function() {
      var required = _.filter(this.params, function(p) { return p.required; });
      var optional = _.filter(this.params, function(p) { return !p.required; });

      this.whenState(required, this.ValidateAndFetch, optional);
      this.render();
    },

    url: function() {
      return '';
    };

    fetch: function (/* args */) {
      var url = _.isFunction(this.url) ? this.url.apply(this, arguments), : this.url;
      $.ajax(_.extend(this.ajaxOpts, { 
        type: 'GET'
        url: url,
        dataType: 'json' 
      })).then(function(data) { _.map(data, this.parse) })
        .then(this.dataReady);
    },

    validateAndFetch: function(/* args */) {
      if _.isEmpty(this.validate())
        this.fetcher.apply(this, arguments);
      else
        this.invalid.apply(this, arguments);
    },

    this.parse: function(datum) {
      return datum; 
    },

    this.dataReady: function(data) {
      this.setData(data);
    },

    validate: function () {
      return _.chain(this.params).reduce(function(m, p, key) {
        var valid;
        if (_.isFunction(p.validation)) {
          valid = p.validation(this.getState(key));
        } else if (p.validation.length === 2) {
          var value = this.getState(key);
          valid = (p.validation[0] < value) && (p.validation[1] > value);
        } else {
          valid = U.exists(p.validation[value]);
        }
      return valid ? m : m.concat([key, (p.message || "Param: " + key + " must be valid.")]);
      }, [], this).object().value();
    },

    renderParam: function(param, key, id) {
      this.$el.appendTo(param.render(param)).effects()
        .data('key', key)
        .attr('id', id);
        .attr(param.attribtues);
    },

    select: function(param, key, id) {
      param.render = function(param) { 
        return _.reduce(params.validation, function(html, value, key) {
          var option = document.createElement('option')
          option.setAttribute('value', key);
          option.textContent(value);

          if (U.exists(this.getState('value')))
            option.setAttribute('selected', 'selected');

          return html.appendChild(option);
        }, document.createElement('select'));
      };
      param.access = this.elemValueToState('select#' id + " option:selected", key);
      return [param, key, id];
    },

    textArea: function(param, key, id ) {
      param.render = function(param) {
        return [document.createElement('textarea'), 
                document.createElement('button')];
      };
      param.access = this.elemValueToState('textarea#' id, key);
      return [param, key, id];
    },

    range: function(param, key, id) {
      _.extend(param.attribtues, {
        type: 'text',
        min: param.validation[0],
        max: param.validation[1],
        value: this.getState('value');
      });

      param.render = function(param) {
        var range = document.createElement(input)
        return range;
      }
      param.access = this.elemValueToState('input#' id, key);
      return [param, key, id];
    },

    textBox: function(param, key, id) {
      _.extend(param.attributes, {
        value: this.getState('key'),
        type: 'text'
      });

      param.render = function(param) {
        var box = document.createElement('input');
        return box
      };

      param.access = this.elemValueToState('input#' id, key);
      return [param, key, id ];
    },

    elemValueToState: function(selector, key) {
      return function() {
        this.setState(key, this.$el.find(selector).val());
      }
    },

    render: function () {
      var dispatch = U.dispatch(function(p) { return p.input }, {
        Select : 'select',
        TextArea: 'textArea'
        TextBox: 'textBox',
        Range: 'range',
        'undefined' : function(param) { return [param, key, id]; }
      }, this);

      _.chain(this.params).map(function(p, key) { return dispatch(p, key, _.uniqueId('param_')); })
        .each(function(param) { this.renderParam.apply(this, param); });

      var fetchButton = document.createElement('button')
      fetchButton.className = 'fetch';
      this.$el.append(fetchButton);

      this.delegateDomEvent('$', function() { 
        _.reduce(_.pluck(this.params, 'access'), function(access) {
          access.call(this);
        }, this);
      }, 'click button.fetch');
    }
  });

}).call(this);
