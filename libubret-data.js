(function() {
  var root = this;
  var U = root.U;

  U.Data = function(data, omittedKeys) {
    this._data = data;
    this._filters = [];
    this._fields = [];
    this._sortProp = 'uid';
    this._sortOrder = 'a';
    this._projection = ["*"];
    this._perPage = 0;
		this._keys = _.chain(this._data).map(function(i) { 
      return _.keys(_.omit.apply(null, [i].concat(omittedKeys)));
    }).flatten().uniq().value();
  };

  U.Data.prototype.filter = function(fn) {
    var data = U.deepClone(this);
    data._filters.push(fn);
    return data;
  };

	U.Data.prototype.filters = function(fns) {
    var data = U.deepClone(this);
		data._filters = data._filters.concat(fns);
		return data;
	};

  U.Data.prototype.removeFilter = function(fn) {
    var data = U.deepClone(this)
    data._filters = _.without(this._filters, fn);
    return data;
  };

	U.Data.prototype.addFields = function(fields) {
		if (!_.every(fields, _.partial(U.isA, U.Field)))
			throw new Error('All Fields must have a name and a function');
    var data = U.deepClone(this);
		data._fields = data._filters.concat(fields);
		data._keys = _.uniq(data._keys.concat(_.pluck(fields, 'name')));
		return data;
	};

  U.Data.prototype.addField = function(field) {
    if (!U.isA(field, U.Field)) 
      throw new Error("Field must have a name and a function");
    var data = U.deepClone(this);
    data._fields.push(field);
		data._keys = _.uniq(data._keys.concat(field.name));
    return data;
  };

  U.Data.prototype.removeField = function(field) {
    var data = U.deepClone(this);
    data._fields = _.without(this._fields, field);
    return data;
  };

  U.Data.prototype.project = function(/* args */) {
    var data = U.deepClone(this);
    data._projection = Array.prototype.slice.call(arguments, 0);
    return data;
  };

  U.Data.prototype.sort = function(sortProp, order) {
    var data = U.deepClone(this);
    if (!( order === 'a' || order === 'd'))
      throw new Error('Order must be "a" (ascending) or "d" (descending)');
    data._sortProp = sortProp;
    data._sortOrder = order;
    return data;
  };

  U.Data.prototype.paginate = function(perPage) {
    var data = U.deepClone(this);
    data._perPage = perPage;
    return data;
  };

  U.Data.prototype.keys = function() {
    return this._keys;
	};

	U.Data.prototype.data = function() {
		return this._data;
	};

	U.Data.prototype._applyFilters = function(data) {
		return _.reduce(this._filters, function(data, filter) {
			return _.filter(data, function(d) { return filter(d) });
		}, data)
	};

	U.Data.prototype._applySort = function(data) {
		var sorted = _.sortBy(data, function(d) { return d[this._sortProp] }, this);
		if (this._sortOrder === 'd')
			return sorted.reverse();
		else
			return sorted;
	};

	U.Data.prototype._applyPaginate = function(data, take) {
		if (this._perPage === 0)
			return data;
		return _.reduce(data, function(m, d, index) {
			if (m.length === take)
				return m;
			if ((index % this._perPage) === 0)
				m.push([d]);
			else
				m[m.length - 1].push(d);
			return m;
		}, [], this);
	};

	U.Data.prototype._take = function(data, take) {
		if (this._perPage > 0)
			return data;
		else
			return data.slice(0, take);
	};

	U.Data.prototype._applyFields = function(data) { 
		var applyField = function(field, d) {
			d[field.name] = field.fn(d);
			return d;
		};

		return _.reduce(this._fields, function(data, field) {
			return _.map(data, function(datum) {
				if (_.isArray(datum))
					return _.map(datum, _.partial(applyField, field));
				else
					return applyField(field, datum)
			});
		}, data);
	};

	U.Data.prototype._applyProjection = function(data) {
		var applyProjection = function(projection, data) {
			return _.map(data, function(d) {
				return _.pick.apply(null, [d].concat(projection));
			});
		};

		if (this._projection[0] === "*")
			return data;
		else if (this._perPage > 0)
			return _.map(data, _.partial(applyProjection, this._projection));
		else
			return applyProjection(this._projection, data);
	};

  U.Data.prototype.toArray = function(take) {
		return U.pipeline(this,  
			'_applyFilters',
			'_applySort',
			'_applyPaginate',
			'_take',
			'_applyFields',
			'_applyProjection')(this._data, take);
  };

  U.Data.prototype.each = function(fn, take) {
    _.each(this.toArray(take), fn, this);
  };

  /* Data.query accepts a 'query object' with following fields:
   * select: Array of attributes to include. Blank or ["*"] for all
   * where: Array of filtering functions
   * withFields: Array of field objects where {name: field name, func: function to create new field}
   * sort: Object with {prop: 'property to sort on', order: 'a' or 'd' for ascending or descending sort
   * perPage: Number of items per page */

  U.Data.prototype.query = function(q) {
		_.defaults(q, {
			perPage: 0,
			sort: {prop: 'uid', order: 'a'},
			withFields: [],
			where: [],
			select: '*'
		});

    var data = U.deepClone(this);
    return data.project(q.select)
			.sort(q.sort.prop, q.sort.order)
			.addFields(q.withFields)
			.filters(q.where)
			.paginate(q.perPage);
  };

  U.query = function(data, query) {
    return data.query(query).toArray();
  };
  U.Field = {name: 'name', fn: function() {}}
}).call(this);
