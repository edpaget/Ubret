// libubret-datasource
// libubret 0.2.0
// libubret is distrubted under the APL, see COPYING
// This module depends on jQuery. 

(function () {
  "use strict";

  var root = this;
  var U = root.U;
  var $ = root.$;

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
      var paramName = function(p) { return p[0]; };
      var paramPairs = _.chain(this.params).pairs();
      var required = paramPairs.filter(function(p) { return p[1].required; })
        .map(paramName).value();

      var optional = paramPairs.filter(function(p) { return !p[1].required; })
        .map(paramName).value();

      this.whenState(required, this.validateAndFetch, optional);
      this.render();
    },

    url: function() {
      return '';
    },

    fetch: function (/* args */) {
      var url = _.isFunction(this.url) ? this.url.apply(this, arguments) : 
        this.url;
      $.ajax(_.extend(this.ajaxOpts, { 
        type: 'GET',
        url: url,
        dataType: 'json' 
      })).then(_.bind(this.preParse, this)).then(_.bind(this.dataReady, this));
    },

    preParse: function (response) {
      if (_.isArray(response))
        return _.map(data, this.parse);
      else
        return this.parse(response);
    },

    validateAndFetch: function(/* args */) {
      var validation = this.validate();
      if (_.isEmpty(validation))
        this.fetch.apply(this, arguments);
      else
        this.invalid.call(this, validation);
    },

    parse: function(datum) {
      return datum; 
    },

    dataReady: function(data) {
      this.setData(data);
    },

    validate: function () {
      return _.chain(this.params).reduce(function(m, p, key) {
        var valid;
        if (!U.exists(p.validation)) {
          valid = true;
        } else if (_.isFunction(p.validation)) {
          valid = p.validation(this.getState(key));
        } else if (p.validation.length === 2) {
          var value = this.getState(key);
          valid = (p.validation[0] <= value) && (p.validation[1] >= value);
        } else if (_.isObject(p.validation)) {
          valid = U.exists(p.validation[value]);
        }
      return valid ? m : m.concat([key, (p.message || "Param: " + key + " must be valid.")]);
      }, [], this).object().value();
    },

    renderParam: function(param, key, id) {
      if (param.hidden)
        return;
      if (!U.exists(param.render))
        throw new Error('No Render Fn Specified for Param');

      var label = $(document.createElement('label'))
        .text(param.label);

      $(param.render(param))
        .data('key', key)
        .attr('id', id)
        .attr(param.attributes)
        .appendTo(label);

      label.appendTo(this.$el);
    },

    select: function(param, key, id) {
      param.render = function(param) { 
        return _.reduce(params.validation, function(html, value, key) {
          var option = document.createElement('option');
          option.setAttribute('value', key);
          option.textContent(value);

          if (U.exists(this.getState('value')))
            option.setAttribute('selected', 'selected');

          return html.appendChild(option);
        }, document.createElement('select'));
      };
      var selector = 'select#' + id + " option:selected";
      param.access = this.elemValue(selector, key);
      return [param, key, id];
    },

    textArea: function(param, key, id ) {
      param.render = function(param) {
        return [document.createElement('textarea'), 
                document.createElement('button')];
      };
      param.access = this.elemValue('textarea#' + id, key);
      return [param, key, id];
    },

    range: function(param, key, id) {
      _.extend(param.attributes, {
        type: 'range',
        min: param.validation[0],
        max: param.validation[1],
        value: this.getState('value')
      });

      param.render = function(param) {
        var range = document.createElement('input');
        return range;
      };
      param.access = this.elemValue('input#' + id, key);
      return [param, key, id];
    },

    textBox: function(param, key, id) {
      _.extend(param.attributes, {
        value: this.getState('key'),
        type: 'text'
      });

      param.render = function(param) {
        var box = document.createElement('input');
        return box;
      };

      param.access = this.elemValue('input#' + id, key);
      return [param, key, id ];
    },

    elemValue: function(selector, key) {
      return function() {
        return [key, this.$el.find(selector).val()];
      };
    },

    render: function () {
      var dispatch = U.dispatch(function(p) { return p.input; }, {
        Select : 'select',
        TextArea: 'textArea',
        TextBox: 'textBox',
        Range: 'range',
        default: function(param, key, id) { return [param, key, id]; }
      }, this);

      _.chain(this.params).pairs().map(function(param) {
        return [param[0], _.defaults(param[1], {attributes: {}})];
      }).map(function(param) { 
        return dispatch(param[1], param[0], _.uniqueId('param_')); 
      }).each(function(param) { 
        this.renderParam.apply(this, param); 
      }, this);

      var fetchButton = document.createElement('button');
      fetchButton.className = 'fetch';
      fetchButton.textContent = 'Fetch';
      this.$el.append(fetchButton);

      this.delegateDomEvent('$', function() { 
        _.chain(this.params).pluck('access').compact()
          .map(function(access) {
            return access.call(this);
          }, this).each(function(pair) {
            this.setState(pair[0], pair[1]);
          }, this);
      }, 'click button.fetch');
    }
  });

  U.DataSource.extend = _.partial(U.extend, U.DataSource);

}).call(this);
