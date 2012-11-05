(function() {
  var Table,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Table = (function() {

    function Table(keys, data, selector) {
      this.keys = keys;
      this.data = data;
      this.selector = selector;
      this.changeData = __bind(this.changeData, this);

      this.selectRow = __bind(this.selectRow, this);

      this.selectColumn = __bind(this.selectColumn, this);

      this.toArray = __bind(this.toArray, this);

      this.createRows = __bind(this.createRows, this);

      this.createHeader = __bind(this.createHeader, this);

      this.selectTable = __bind(this.selectTable, this);

      this.selectTable();
      this.createHeader();
      this.createRows();
    }

    Table.prototype.selectTable = function() {
      this.thead = d3.select("" + this.selector + " thead");
      return this.tbody = d3.select("" + this.selector + " tbody");
    };

    Table.prototype.createHeader = function() {
      var _this = this;
      return this.thead.selectAll("th").data(this.keys).enter().append("th").on('click', function(d, i) {
        return _this.selectColumn(d);
      }).attr('data-key', function(d) {
        return d;
      }).text(function(d) {
        return _this.formatKey(d);
      });
    };

    Table.prototype.createRows = function(sortAttr) {
      var tr,
        _this = this;
      if (sortAttr == null) {
        sortAttr = 'id';
      }
      this.tbody.selectAll('tr').remove();
      tr = this.tbody.selectAll('tr').data(this.data).enter().append('tr').sort(function(a, b) {
        if (a === null || b === null) {
          return 0;
        } else {
          return _this.compare(a[sortAttr], b[sortAttr]);
        }
      }).attr('data-id', function(d) {
        return d.id;
      }).on('click', function(d, i) {
        return _this.selectRow(d);
      });
      return tr.selectAll('td').data(function(d) {
        return _this.toArray(d);
      }).enter().append('td').text(function(d) {
        return d;
      });
    };

    Table.prototype.compare = function(a, b) {
      if (typeof a === 'string') {
        return a.localeCompare(b);
      } else {
        if (a < b) {
          return -1;
        } else {
          if (a > b) {
            return 1;
          } else {
            return 0;
          }
        }
      }
    };

    Table.prototype.toArray = function(data) {
      var key, ret, _i, _len, _ref;
      ret = new Array;
      _ref = this.keys;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        key = _ref[_i];
        ret.push(data[key]);
      }
      return ret;
    };

    Table.prototype.formatKey = function(key) {
      return (key.replace(/_/g, " ")).replace(/(\b[a-z])/g, function(char) {
        return char.toUpperCase();
      });
    };

    Table.prototype.selectColumn = function(key) {
      return this.createRows(key);
    };

    Table.prototype.selectRow = function(datum) {
      if (typeof this.selected !== 'undefined') {
        this.selected.attr('class', '');
      }
      return this.selected = this.tbody.select("[data-id=" + datum.id + "]").attr('class', 'selected');
    };

    Table.prototype.changeData = function(data) {
      this.data = data;
      return this.createRows();
    };

    return Table;

  })();

  if (typeof require === 'function' && typeof module === 'object' && typeof exports === 'object') {
    module.exports = Table;
  } else {
    window.Ubret['Table'] = Table;
  }

}).call(this);