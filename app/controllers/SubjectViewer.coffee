BaseController = require('controllers/BaseController')
_ = require('underscore/underscore')

class SubjectViewer extends BaseController
  constructor: ->
    super

  events: 
    'click .next' : 'nextSubject'
    'click .back' : 'prevSubject'

  start: =>
    @count = 0
    @render()

  render: =>
    @filterData()
    subject = @filteredData[@count]
    @publish [ {message: 'selected', item_id: subject?.zooniverse_id} ] 
    @keys = new Array
    @extractKeys subject
    keys = @keys
    @html require('views/subject_viewer')({subject, keys})

  nextSubject: =>
    @count += 1
    if @count >= @filteredData.length
      @count = 0
    @render()

  prevSubject: =>
    @count -= 1
    if @count < 0
      @count = @filteredData.length - 1
    @render()

  process: (message) =>
    switch message.message
      when "selected" then @select message.item_id
      when "filter" then @addFilter message.filter

  select: (itemId) =>
    subject = _.find @filteredData, (datum) ->
      datum.zooniverse_id == itemId
    subjectIndex = _.indexOf @filteredData, subject
    @count = subjectIndex
    @render()
    @publish [ {message: 'selected', item_id: itemId} ]
    
module.exports = SubjectViewer