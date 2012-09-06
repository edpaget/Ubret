BaseController = require("./BaseController")
_ = require ("underscore/underscore")

class Table extends BaseController
  elements: 
    'input[name="filter"]' : 'filter'

  events: 
    'click .subject' : 'selection'
    'click .delete'  : 'removeColumn'
    submit: 'onSubmit'

  constructor: ->
    super

  name: "Table"

  start: =>
    @render()
  
  render: =>
    @keys = new Array
    @extractKeys @data[0]
    @filterData()
    @html require('views/table')(@)
    

  selection: (e) =>
    @selected.removeClass('selected') if @selected
    @selected = @el.find(e.currentTarget)
    @selected.addClass('selected')
    @publish([ { message: "selected", item_id: @selected.attr('data-id') } ])

  process: (message) =>
    switch message.message
      when "selected" then @select message.item_id
      when "filter" then @addFilter message.filter

  select: (itemId) =>
    @selected.removeClass('selected') if @selected
    @selected = @el.find("tr.subject[data-id='#{itemId}']")
    @selected.addClass('selected')
    @publish([ {message: "selected", item_id: itemId} ])

  removeColumn: (e) =>
    target = $(e.currentTarget)
    index = target.closest('th').prevAll('th').length
    target.parents('table').find('tr').each ->
      $(@).find("td:eq(#{index}), th:eq(#{index})").remove()

  onSubmit: (e) =>
    e.preventDefault()
    @addFilter @parseFilter @filter.val()

  parseFilter: (string) =>
    tokens = string.split " "
    filter = @processFilterArray tokens
    filter = "return" + filter.join " "
    filterFunc = new Function( "item", filter )
    return filterFunc

  processFilterArray: (tokens, filters=[]) =>
    nextOr = _.indexOf tokens, "or"
    nextAnd = _.indexOf tokens, "and"
    if ((nextOr < nextAnd) or (nextAnd == -1)) and (nextOr != -1)
      predicate = tokens.splice(0, nextOr)
      filters.push @parsePredicate predicate
      filters.push "||"
    else if ((nextAnd < nextOr) or (nextOr == -1)) and (nextAnd != -1)
      predicate = tokens.splice(0, nextAnd)
      filters.push @parsePredicate predicate
      filters.push "&&"
    else
      predicate = tokens 
      filters.push @parsePredicate predicate
    unless predicate == tokens
      @processFilterArray tokens.splice(1), filters 
    else
      return filters

  parsePredicate: (predicate) ->
    field = _.first predicate
    limiter = _.last predicate
    comparison = _.find predicate, (item) ->
      item in ['equal', 'equals', 'greater', 'less', 'not', '=', '>', '<', '!=']

    switch comparison
      when 'equal' then operator = '=='
      when 'equals' then operator = '=='
      when 'greater' then operator = '>'
      when 'less' then operator = '<'
      when 'not' then operator = '!='
      when '=' then operator = '=='
      else operator = comparison

    return "(item['#{@uglifyKey(field)}'] #{operator} #{parseFloat(limiter)})"

module.exports = Table