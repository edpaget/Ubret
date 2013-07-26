// libubret-table
// libubret 0.2.0
// libubret is distrubuted under the APL. See COPYING

(function () {
  var root = this;
  var U = root.U;

  U.Table = U.PaginatedTool.extend({
    initialize: function() {
      U.Table.__super__.initialize.call(this);
      this.table = this.d3el.append('table');
      this.header = this.table.append('thead');
      this.body = this.table.append('tbody');
    },

    drawPage: function(data, page) {
      var keys = data.keys();
      var pages = data.toArray();

      this.drawHeader(keys);
      this.drawBody(pages[page]);
      this.drawPageNo(page, pages.length);
    },

    drawHeader: function(keys) {
      this.header.selectAll('th').remove();

      this.header.selectAll('th')
        .data(keys).enter()
        .append('th')
        .text(function(d) { return d; });
    },

    drawBody: function(data) {
      console.log(data);
      this.body.selectAll('tr').remove();

      tr = this.body.selectAll('tr')
        .data(data).enter()
        .append('tr')
        .attr('data-id', function (d) { return d.uid; })
        .attr('class', _.bind(function (d) {
          if (_.contains(this.getState('selection'), d.uid))
            return 'selected';
          else
            return '';}, this));

      tr.selectAll('td')
        .data(function(d) { return _.chain(d).omit('uid').values().value(); })
        .enter().append('td')
        .text(function(d) { return d; });
    },

    drawPageNo: function(page, total) {
      this.d3el.selectAll('p').remove()
      this.d3el.append('p')
        .attr('class', 'pages')
        .text("Page: " + (page + 1) + " of " + total)
    },

    perPage: 5

  });
}).call(this);
