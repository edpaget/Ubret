// libubret-table
// libubret 0.2.0
// libubret is distrubuted under the APL. See COPYING

(function () {
  var root = this;
  var U = root.U;

  U.Table = U.PaginatedTool({
    initialize: function() {
      this.__super__.initialize.call(this);
      this.table = this.d3el.append('table');
      this.header = this.table.append('thead');
      this.body = this.table.append('body');
    },

    drawPage: function(data, page) {
      var keys = data.keys();
      var pageData = data.toArray()[page];

      this.drawHeader(keys);
      this.drawBody(pageData);
      this.drawPageNo(page);
    },

    drawHeader: function(keys) {
      this.header.selectAll('th').remove();

      this.header.selectAll('th')
        .data(keys).enter()
        .append('th')
        .text(function(d) { return d; });
    },

    drawBody: function(keys, data) {
      this.body.selectAll('tr').remove();

      this.header.selectAll('tr')
        .data(
    },

  });
}).call(this);
