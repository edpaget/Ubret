(function() {

  /* Tool accepts an opts object to configure new tools
   * id: the id of the tool's element (optional)
   * data: data in the form of an array of objects (optional)
   * selection: array of selected uids of objects (optional)
   * state: an object of the initial state of the object (optional) */


  U.Tool = function(opts) {
    // Create tool element
    this.id = opts.id || _.uniqueId('tool_');
    this.el = document.createElement('div');
    this.el.id = this.id;
    this.el.className = this.name || '';
    opts.dom = this.dom || opts.dom;

    if (opts.dom === "$") 
      this.$el = $(this.el);
    if (opts.dom === "d3")
      this.d3el = d3.select(this.el)
    if (U.exists(this.$el) && U.exists(this.domEvents))
      this.delegateDomEvents('$');

    // Setup State
    var state = opts.state || {}

    if (U.exists(this.defaults))
      _.defaults(state, this.defaults);
    _.defaults(state, {filters: [], fields: []}),

		this.state = U.createState(state, this);

    if (U.exists(opts.data))
      this.setData(opts.data);
    this.setSelection(opts.selection || []);

    // Initialize State Responders
    U.watchState(this.state, ['data', 'filters', 'fields'], this.prepareData, this);
    U.watchState(this.state, ['prepared-data'], this.updateChildData, this);

    if (U.exists(this.stateResponders)) 
      this.initializeStateResponders();

    if (U.exists(this.initialize))
      this.initialize();
  };

  U.extend = function(parent, obj) {
    var child;

    if (_.has(obj, 'constructor'))
      child = obj.constructor;
    else
      child = function() {parent.apply(this, arguments);};

    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;
    
    _.extend(child.prototype, obj);

    child.__super__ = parent.prototype;
    return child;
  };

  U.Tool.extend = _.partial(U.extend, U.Tool);

  /* State Responders are defined as an Array of Responder Objects,
   * which have the following property defined
   *    whenState: String of states 
   *    responder: A single function or function reference, or an Array 
   *      of functions or function references, or a String of 
   *      names of object methods. */

  U.Tool.prototype.initializeStateResponders = function() {
    _.each(this.stateResponders, this._initStateResponder, this);
  };

  U.Tool.prototype._initStateResponder = function(r) {
    U.watchState(this.state, r.whenState.split(' '), r.responder, this);
  };

  /* this.domEvents is defined as an object where keys are a DOM event 
   * defined as "event-type sizzle-selector", and values are either functions
   * or a string of an object method name; */

  U.Tool.prototype.delegateDomEvent = function(type, fn, selector) {
    if (_.isString(fn)) {
      if (U.exists(this[fn]))
        fn = _.bind(this[fn], this);
      else
        throw new Error(fn + " is not defined.");
    }

    selector = selector.split(' ');
    var event = selector[0];
    selector = _.rest(selector).join(' ');

    if (type === "d3") 
      this.d3el.selectAll(selector).on(event, _.bind(fn, this));
    else if (type === "$")
      this.$el.on(event, selector, _.bind(fn, this));
  };

  U.Tool.prototype.delegateDomEvents = function(type) {
    _.each(this.domEvents, _.partial(this.delegateDomEvent, type), this);
  };

  U.Tool.prototype.prepareData = function(data, filters, fields) {
    this.state.set('prepared-data', 
                  	data.query({where: filters, withFields: fields}));
  };

  U.Tool.prototype.parentTool = function(tool) {
    if (U.exists(this._parent))
      this.removeParent();
    this._parent = tool;
   
    this.setData(this._parent.childData());
    this.setSelection(this._parent.state.get('selection'));

    U.listenTo(this._parent.state, 'data', this.setData, this);
    U.listenTo(this._parent.state, 'selection', this.setSelection, this);
  };

  U.Tool.prototype.childData = function() {
    var data = this.state.get('prepared-data');
		console.log(this, this.state);
    if (U.exists(data))
      return data.toArray();
    else
      return [];
  };

  U.Tool.prototype.setData = function(data) {
		console.log(this, data);
    if (_.isEmpty(data))
      return;
    this.state.set('data', new U.Data(data));
  };

  U.Tool.prototype.setSelection = function(selection) {
    this.state.set('selection', U.deepClone(selection));
    this.state.trigger('selection', this.state.get('selection'));
  };

  U.Tool.prototype.updateChildData = function() {
    this.state.trigger('data', this.childData());
  };
}).call(this);
