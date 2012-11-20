
BaseTool = window.Ubret.BaseTool or require('./base_tool')

class Scatterplot extends BaseTool

  template:
    """
    <div id="<%- selector %>">
      <svg></svg>
    </div>
    """

  tooltip:
    """
    <div class="tooltip">
      <ul>
        <li><label><%- xAxis %>:</label><span><%- xAxisVal %></span></li>
        <li><label><%- yAxis %>:</label><span><%- yAxisVal %></span></li>
      </ul>
    </div>
    """

  constructor: ->
    super
    compiled = _.template @template, {selector: @selector}
    @el.html compiled
    
    @height = @el.height() or @height
    @width = @el.width() or @width
    @margin = @margin or { top: 17, right: 40, bottom: 55, left: 75 } 
    @color = @color or 'teal'
    @selectionColor = @selectionColor or 'orange'

    @xFormat = @xFormat or d3.format(',.02f')
    @yFormat = @yFormat or d3.format(',.02f')

  displayTooltip: (d, i) =>
    xAxis = @formatKey(@xAxisKey)
    yAxis = @formatKey(@yAxisKey)
    xAxisVal = @xFormat(d[@xAxisKey])
    yAxisVal = @yFormat(d[@yAxisKey])

    top = d3.event.pageY - 50
    left = d3.event.pageX + 10

    tooltip = _.template @tooltip, { xAxis: xAxis, yAxis: yAxis, xAxisVal: xAxisVal, yAxisVal: yAxisVal }
    @el.append tooltip
    @el.find('.tooltip').offset({top: top, left: left})

  removeTooltip: (d, i) =>
    @el.find('.tooltip').remove()

  select: (itemId) =>
    _.indexOf @filteredData itemId

  dataToCoordinates: (d) =>
    coordinate = {x: d[@xAxisKey], y: d[@yAxisKey], classification: d['classification']}
    if @selectedData? and d in @selectedData
      coordinate['color'] = @selectionColor
    else
      coordinate['color'] = @color
    return coordinate

  createGraph: =>
    return unless @xAxisKey? and @yAxisKey?
    
    @el.find('svg').empty()

    @graphWidth = @width - @margin.left - @margin.right
    @graphHeight = @height - @margin.top - @margin.bottom

    @svg = d3.select("#{@selector} svg")
      .attr('width', @width)
      .attr('height', @height)
      .append('g')
        .attr('transform', "translate(#{@margin.left}, #{@margin.top})")

    data = @drawAxes()
    @drawPoints(data, @color)

  drawAxes: =>
    data = @dimensions[@xAxisKey].top(Infinity)
    data = _.map(data, (d) => _.pick(d, @xAxisKey, @yAxisKey))

    # Build in a buffer so the points aren't right on the axes
    xDomain = @bufferAxes(d3.extent(data, (d) => d[@xAxisKey]))
    yDomain = @bufferAxes(d3.extent(data, (d) => d[@yAxisKey]))

    @x = d3.scale.linear()
      .domain(xDomain)
      .range([0, @graphWidth])
    
    xAxis = d3.svg.axis()
      .scale(@x)
      .orient('bottom')
      .tickFormat(@xFormat)
      .tickValues(@calculateTicks(@x))
    
    @svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', "translate(0, #{@graphHeight})")
      .call(xAxis)
    
    @svg.append('text')
      .attr('class', 'x label')
      .attr('text-anchor', 'middle')
      .attr('x', @graphWidth / 2)
      .attr('y', @graphHeight + 40)
      .text(@formatKey(@xAxisKey))
    
    @y = d3.scale.linear()
      .domain(yDomain)
      .range([@graphHeight, 0])

    yAxis = d3.svg.axis()
      .scale(@y)
      .orient('left')
      .tickFormat(@yFormat)
      .tickValues(@calculateTicks(@y))

    @svg.append('g')
      .attr('class', 'y axis')
      .attr('transform', 'translate(0, 0)')
      .call(yAxis)

    @svg.append('text')
      .attr('class', 'y label')
      .attr('text-anchor', 'middle')
      .attr('y', -60)
      .attr('x', -(@graphHeight / 2))
      .attr('transform', "rotate(-90)")
      .text(@formatKey(@yAxisKey))

    return data

  drawPoints: (data) =>
    point = @svg.selectAll('.point')
      .data(data)
      .enter().append('g')
      .attr('class', 'point')
      .attr('transform', (d) =>
        if not d[@xAxisKey]? or not d[@yAxisKey]?
          return
        else
          "translate(#{@x(d[@xAxisKey])}, #{@y(d[@yAxisKey])})")
      .on('mouseover', @displayTooltip)
      .on('mouseout', @removeTooltip)

    point.append('circle')
      .attr('r', 3)
      .attr('id', (d) -> d.x)
      .attr('fill', (d) -> d.color)

  bufferAxes: (domain) ->
    for border, i in domain
      if border > 0
        border = border - (border * 0.15)
      else
        border = border + (border * 0.15)

  calculateTicks: (axis) =>
    min = _.first axis.domain()
    max = _.last axis.domain()

    ticks = [min, max]
    numTicks = Math.floor(@graphWidth/50)
    tickWidth = (max - min) / numTicks
    
    tick = min + tickWidth

    while tick < max
      ticks.push tick
      tick = tick + tickWidth
    return ticks

  setXVar: (variable) =>
    @xAxisKey = variable
    @createGraph()

  setYVar: (variable) =>
    @yAxisKey = variable
    @createGraph()

  start: =>
    @createGraph()


if typeof require is 'function' and typeof module is 'object' and typeof exports is 'object'
  module.exports = Scatterplot
else
  window.Ubret['Scatterplot'] = Scatterplot