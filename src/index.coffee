Ubret = {}

Ubret.BaseUrl = if location?.port < 1024
  "http://ubret.s3.amazonaws.com/ubret_library/"
else 
  "http://localhost:3001/"

Ubret.Dependencies = 
  "underscore":
    symbol: "_"
    source: "vendor/underscore.js"
  "lazy" :
    symbol: "Lazy"
    source: "vendor/lazy.js"
  "Backbone":
    symbol: "Backbone"
    source: "vendor/backbone.js"
    deps: ["underscore"]
  "d3": 
    source: "vendor/d3.js"
  "d3.units":
    source: "vendor/d3.units.js"
    deps: ["d3"]
  "Leaflet": 
    symbol: "L"
    source: "vendor/leaflet.js"
  "fits":
    source: "vendor/fits.js"
  "Events" : 
    source: "lib/ubret/events.js"
    deps: ["underscore"]
  "Data" :
    source: "lib/ubret/data.js"
    deps: ["underscore", "lazy"]
  "Tool" :
    source: "lib/ubret/tool.js"
    deps: ["Events", "Data", "d3.units", "d3"]
  "BaseTool": 
    source: "lib/ubret/base_tool.js"
    deps: ["Events", "underscore", "d3.units"] 
  "Sequential":
    source: "lib/ubret/sequential.js"
    deps: ["Paginated"]
  "Paginated" :
    source: "lib/ubret/paginated.js"
    deps: ["underscore"]
  "Promise" :
    source: "lib/ubret/promise.js"
    deps: ["underscore"]
  "Ajax":
    source: "lib/ubret/xhr.js"
    deps: ["Promise"]
  "Graph" :
    source: "lib/ubret/graph.js"
    deps: ["BaseTool"]
  "Histogram" :
    source: "lib/ubret/histogram.js"
    deps: ["Graph"]
  "Scatterplot" :
    source: "lib/ubret/scatterplot.js"
    deps: ["Graph"]
  "SubjectViewer" :
    source: "lib/ubret/subject_viewer.js"
    deps: ["MultiImageView", "BaseTool", "Sequential"]
  "Mapper" :
    source: "lib/ubret/map.js"
    deps: ["BaseTool", "Leaflet"]
  "Statistics" :
    source: "lib/ubret/statistics.js"
    deps: ["BaseTool"]
  "Table" :
    source: "lib/ubret/table.js"
    deps: ["Tool", "Paginated"]
  "Spectra" :
    source: "lib/ubret/spectra.js"
    deps: ["Sequential", "Graph", "Ajax"]
  "SpacewarpViewer":
    source: "lib/ubret/sw_viewer.js"
    deps: ["Backbone", "BaseTool", "Sequential", "fits"]
  "ImageGallery":
    source: "lib/ubret/image_gallery.js"
    deps: ["MultiImageView", "Sequential", "BaseTool"]
  "MultiImageView":
    source: "lib/ubret/multi_image_view.js"
  "BarGraph":
    source: "lib/ubret/bar_graph.js"
    deps: ["Graph"]
  "GalaxyProbabilities":
    source: "lib/ubret/gal_probs.js"
  "GalaxyImages":
    source: "lib/ubret/galaxy_images.js"
  "ColorMagnitudeChart":
    source: "lib/ubret/color_magnitude_chart.js"
    deps: ["Scatterplot", "GalaxyProbabilities", "GalaxyImages"]
  "ImagePlayer":
    source: "lib/ubret/image_player.js"
    deps: ["BaseTool", "MultiImageView"]

loadScript = (source, cb=null) ->
  script = document.createElement 'script'
  script.onload = cb
  src = "#{Ubret.BaseUrl}#{source}"
  src = src + "?t=#{new Date().getTime()}" if parseInt(location.port) isnt 80
  script.src = src
  document.getElementsByTagName('head')[0].appendChild script

Ubret.Loader = (tools, cb) ->
  tools = Ubret.DependencyResolver tools

  isScriptLoaded = (script) ->
    return false unless window?
    return (window[script]? or window.Ubret[script]?)
    
  loadScripts = ->
    if tools.length is 0 
      cb()
      return
    callback = loadScripts
    tool = tools.pop()
    unless (isScriptLoaded tool) or (isScriptLoaded Ubret.Dependencies[tool]?.symbol)
      source = Ubret.Dependencies[tool].source
      loadScript source, callback
    else
      loadScripts()

  loadScripts()

Ubret.ToolsetLoader = (toolset, cb) ->
  loadScript("sets/#{toolset}.js", cb)

Ubret.DependencyResolver = (tools) ->
  unique = (array) ->
    flattened = []
    flattened = flattened.concat.apply(flattened, array)
    uniqueArray = new Array
    for item in flattened.reverse()
      continue unless item? or item is 'undefined'
      unless item in uniqueArray
        uniqueArray.push item 
    uniqueArray.reverse()

  findDeps = (deps, accum) ->
    dependencies = []
    dependencies.push Ubret.Dependencies[dep].deps for dep in deps when Ubret.Dependencies[dep]?
    if dependencies.length is 0
      return unique accum
    else
      return findDeps((unique dependencies), accum.concat(dependencies))

  tools.concat findDeps(tools, [])

Ubret.Reset = ->
  keepers = 
    "Dependencies" : Ubret.Dependencies
    "DependencyResolver" : Ubret.DependencyResolver
    "Loader" : Ubret.Loader
    "ToolsetLoader" : Ubret.ToolsetLoader
    "BaseUrl" : Ubret.BaseUrl
    "Reset" : Ubret.Reset
  delete window.Ubret
  window.Ubret = keepers

window?.Ubret = Ubret
module?.exports = Ubret
