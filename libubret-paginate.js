// libubret-paginated
// libubret 0.2.0
// libubret is distrubuted under the APL. See COPYING

(function () {
  var root = this;
  var U = root.U;

  U.PaginatedTool = U.Tool.extend({
    initialize: function() {
      this.whenState(['prepared-data', 'currentPage'], this.pageData);
    },

    pageData: function(data, page) {
      this.drawPage(data.query({
        select: _.result(this, 'defaultProjection')
        perPage: _.result(this, 'perPage'),
        sort: {
          prop: this.getState('sortProp') || 'uid', 
          order: this.getState('sortOrder') || 'd'
        }
      }), page);
    }

    defaultProjection: ['*'],

    perPage: function() {};
  });

  U.PaginatedTool.extend = _.partial(U.extend, U.PaginatedTool);
}).call(this);