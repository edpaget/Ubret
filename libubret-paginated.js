// libubret-paginated
// libubret 0.2.0
// libubret is distrubuted under the APL. See COPYING

(function () {
  var root = this;
  var U = root.U;

  U.PaginatedTool = U.Tool.extend({

    defaults: {
      sortProp: 'uid',
      sortOrder: 'a',
      currentPage: 0
    },

    initialize: function() {
      this.whenState(['prepared-data', 'currentPage', 'selection', 'sortProp', 'sortOrder'], this.pageData);
    },

    pageData: function(data, page, selection, sortProp, sortOrder) {
      this.drawPage(data.query({
        select: _.result(this, 'defaultProjection'),
        perPage: _.result(this, 'perPage'),
        sort: {
          prop: sortProp,
          order: sortOrder
        }
      }), page, selection);
    },

    defaultProjection: ['*'],

    perPage: function() {}
  });

  U.PaginatedTool.extend = _.partial(U.extend, U.PaginatedTool);
}).call(this);