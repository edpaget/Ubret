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

    domEvents: {
      'click tr' : 'selectRow',
      'click th' : 'sortColumn'
    },

    selectRow: function(d) {
      if (d3.event.ctrlKey) {
        var selection = this.getState('selection')
        if (_.contains(selection, d.uid))
          this.setSelection(_.without(selection, d.uid));
        else
          this.setSelection(selection.concat([d.uid]));
      } else {
        this.setSelection([d.uid]);
      }
    },

    sortColumn: function(d) {
      if (this.getState('sortProp') == d) {
        if (this.getState('sortOrder') == 'a')
          this.setState('sortOrder', 'd');
        else
          this.setState('sortOrder', 'a');
      } else  {
        this.setState('sortProp', d);
      }
    },

    drawPage: function(data, page, selection) {
      var keys = data.keys();
      var pages = data.toArray();

      if (page >= pages.length)
        page = page % pages.length;
      else if (page < 0)
        page = 0;

      this.drawHeader(keys);
      this.drawBody(pages[page], selection);
      this.drawPageNo(page, pages.length);

      if (!U.exists(this.$el))
        this.delegateDomEvents('d3');
    },

    drawHeader: function(keys) {
      this.header.selectAll('th').remove();

      this.header.selectAll('th')
        .data(keys).enter()
        .append('th')
        .text(_.bind(function(d) { 
          if (this.getState('sortProp') === d)
            (this.getState('sortOrder') === 'a') ? 
              d = (d + ' ▲') : d = (d +' ▼' );
          return d; }, this));
    },

    drawBody: function(data, selection) {
      this.body.selectAll('tr').remove();

      tr = this.body.selectAll('tr')
        .data(data).enter()
        .append('tr')
        .attr('class', function (d) {
          if (_.contains(selection, d.uid))
            return 'selected';
          else
            return '';});

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

    perPage: function() {
      return Math.floor((this.getState('height') - 90) / 27);
    }

  });
}).call(this);
