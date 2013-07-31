// libubret-datasource-spelunker
// libubret 0.2.0
// libubret is distributed under the APL, see COPYING
// This Module Depends on libubret-datasource
(function () {
  "use strict";

  var root = this;
  var U = root.U;

  U.Spelunker = U.DataSource.extend({
    initialize: function() {
      U.Spelunker.__super__.initialize.call(this);
      U.PersistState(this.persistenceOpts, this); 
    },

    persistenceOpts: {
      requiredState: ['search_type', 'ra', 'dec', 'radius', 'limit'],
      optionalState: ['queryId'],
      ajax: {
        crossDomain: true
      },
      idField: 'queryId',
      url: "http://localhost:8080/sky_server/",
      fromJSON: function(response) {
        return {
          ra: response.params.ra,
          dec: response.params.dec,
          limit: response.params.limit,
          radius: response.params.radius,
          queryId: response._id,
          search_type: response['search-type']
        };
      },
      toJSON: function(data) {
        return {
          _id: data.queryId,
          search_type: data.search_type,
          params: {
            ra: data.ra,
            dec: data.dec,
            limit: data.limit,
            radius: data.radius
          }
        };
      }
    },

    defaults: {
      'search_type' : 'area'
    },

    params: {
      ra: {
        label: 'RA',
        input: 'Range',
        required: true,
        validation: [130, 260]
      },
      dec: {
        label: 'Dec',
        input: 'Range',
        required: true,
        validation: [-2, 60]
      },
      limit: {
        label: 'No. of Items',
        input: 'TextBox',
        required: true,
        validation: function(limit) {
          return limit < 350;
        }
      },
      radius: {
        label: 'Radius',
        input: 'TextBox',
        required: true,
        validation: function(radius) {
          return radius < 200;
        }
      },
      queryId: {
        hidden: true,
        required: true
      }
    },

    parse: function(response) {
      return response.data;
    },

    url: function() {
      console.log(this.getState('queryId'));
      return "http://localhost:8080/sky_server/" + this.getState('queryId');
    }
  });

}).call(this);
