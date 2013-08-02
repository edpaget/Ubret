// libubret-chart
// libubret 0.2.0
// libubret is distributed under the APL. See COPYING

(function() {
  "use strict"; 

  var root = this;
  var U = this.U;

  U.SVGAxis = function(opts, svg) {
    return function(scale, label, dimension) {
      opts.dimension = dimension;
      opts.label = label;

      var axis = d3.svg.axis().scale(scale).orient(opts.orient);

      var translate = _.result(opts, 'position').join(', ');

      svg.append('g')
        .attr('class', opts.name + ' axis')
        .attr('transform', "translate(" + translate + ")")
        .call(axis)
          .append('text')
          .attr('class', opts.name + ' label')
          .attr('text-anchor', opts.labelAnchor)
          .attr('x', _.result(opts, 'labelX'))
          .attr('y', _.result(opts, 'labelY'))
          .text(label);
    };
  }

  U.SVGYAxis = _.partial(U.SVGAxis, {
    position: [0, 0],
    scale: 'linear', 
    orient: 'left',
    labelX: function() { return this.dimension / 2; },
    labelY: 50,
    labelAnchor: 'middle',
    name: 'y'
  });

  U.SVGXAxis = _.partial(U.SVGAxis, {
    position: function() { return [0, this.dimension]; },
    scale: 'linear',
    orient: 'bottom',
    labelX: function() { return this.dimension / 2; },
    labelY: 50,
    labelAnchor: 'middle',
    name: 'x'
  });

  U.Chart = U.Tool.extend({
    initialize: function() {
      this.whenState(['prepared-data'], this.graphData, ['axis1', 'axis2']);
      this.whenState(['graph-data', 'axis1', 'axis2', 'height', 'width'], 
                     this.drawGraph, 
                     ['selection']);
    },
  });

  U.Chart.extend = _.partial(U.extend, U.Chart);

  U.SVGChart = U.Chart.extend({
    initialize: function() {
      this.svg = this.d3el.append('svg')
      this.axis1 = U.SVGXAxis(this.svg);
      this.axis2 = U.SVGYAxis(this.svg);

      this.whenState(['x-scale', 'axis1', 'width'], this.drawAxis1);
      this.whenState(['y-scale', 'axis2', 'height'], this.drawAxis2);
      this.whenState(['graph-data', 'height', 'width'], this.setScales);
      this.whenState(['height', 'width'], this.resizeSVG);

      U.SVGChart.__super__.initialize.call(this);
    },

    setScales: function(data, height, width) {
      var x = _.pluck(data, this.getState('axis1'));
      var y = _.pluck(data, this.getState('axis2'));

      this.setState('x-scale', d3.scale.linear()
                                .range([0, width])
                                .domain(d3.extent(x)));
      this.setState('y-scale', d3.scale.linear()
                                .range([height, 0])
                                .domain(d3.extent(y)));
    },

    drawAxis1: function(scale, label, dimension) {
      this.axis1(scale, label, dimension);
    },

    drawAxis2: function(scale, label, dimension) {
      this.axis2(scale, label, dimension);
    },

    resizeSVG: function(height, width) {
      this.svg.attr('height', height).attr('width', width);
    },

    dom: 'd3'
  });

  U.SVGScatterPlot = U.extend(U.SVGChart, {
    graphData: function(data, axis1, axis2) {
      this.setState('graph-data', 
                    data.project('uid', axis1, axis2).toArray());
    },

    drawGraph: function(data, x, y, height, width, selection) {
      console.log(this.getState('x-scale', 'y-scale'));
    }
  });

}).call(this);
