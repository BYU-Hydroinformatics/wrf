/*****************************************************************************
 * FILE:    WRF MAIN.JS
 * DATE:    9 JUNE 2017
 * AUTHOR: Sarva Pulla
 * COPYRIGHT: (c) Brigham Young University 2017
 * LICENSE: BSD 2-Clause
 *****************************************************************************/

/*****************************************************************************
 *                      LIBRARY WRAPPER
 *****************************************************************************/

var WRF_PACKAGE = (function() {
    // Wrap the library in a package function
    "use strict"; // And enable strict mode for this library

    /************************************************************************
     *                      MODULE LEVEL / GLOBAL VARIABLES
     *************************************************************************/
    var animationDelay,
        cbar,
        current_layer,
        element,
        shpSource, //Source for the layer storing the uploaded shapefile
        shpLayer,   //Layer for the uplaoded shapefile
        layers, //List of all the map layers
        map,    //map object
        popup,
        sliderInterval,
        slider_max,
        var_info,
        wms_layer,
        wms_source;


    /************************************************************************
     *                    PRIVATE FUNCTION DECLARATIONS
     *************************************************************************/
    var animate,
        add_wms,
        addDefaultBehaviorToAjax, //Adding a csrf token to every ajax request
        $btnUpload,
        cbar_str,
        checkCsrfSafe, //Check if the CSRF is good
        clear_coords, //Clear the hidden point,polygon and shapefile input boxes.
        getCookie, //Get the CSRF cookie
        get_plot, //Generate the timeseries plot from the ajax request
        $get_plot,
        gen_color_bar,
        init_events, //Initiate the map move events
        init_jquery_var, //Initiate the jquqery variables
        init_map,   //Initiate the map object
        init_slider,
        $modalUpload,
        prepare_files, //Prepare the uploaded files to be sent as an ajax post request
        upload_file, //Add the uploaded files to the map
        update_color_bar,
        update_wms;


    /************************************************************************
     *                    PRIVATE FUNCTION IMPLEMENTATIONS
     *************************************************************************/
    //Initizalizing the jquery variables
    init_jquery_var=function(){
        $get_plot = $('#get-plot');
        $modalUpload = $("#modalUpload");
        $btnUpload = $("#btn-add-shp");
        var $layers_element = $('#layers');
        slider_max = $layers_element.attr('data-slider-max');
        var_info = $layers_element.attr('data-var-info');
        var_info = JSON.parse(var_info);

        cbar = $layers_element.attr('data-color-bar');
        cbar = JSON.parse(cbar);
        animationDelay  = 1000;
        sliderInterval = {};
    };

    gen_color_bar = function(){
        var cv  = document.getElementById('cv'),
            ctx = cv.getContext('2d');
        var var_option = $("#vars").find('option:selected').val();
        var cur_variable;
        var_info.forEach(function(element){
            if(element["name"] == var_option) {
                cur_variable = element;
            }
        });
        cbar.forEach(function(color,i){
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.fillRect(i*35,0,35,20);
            ctx.fillText(cur_variable["interval"][i],i*35,30);
        });

    };

    update_color_bar = function(){
        var cv  = document.getElementById('cv'),
            ctx = cv.getContext('2d');
        ctx.clearRect(0,0,cv.width,cv.height);
        var var_option = $("#vars").find('option:selected').val();
        var cur_variable;
        var_info.forEach(function(element){
            if(element["name"] == var_option) {
                cur_variable = element;
            }
        });
        cbar.forEach(function(color,i){
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.fillRect(i*35,0,35,20);
            ctx.fillText(cur_variable["interval"][i],i*35,30);
        });
    };
    animate = function(){
        var sliderVal = $("#slider").slider("value");

        sliderInterval = setInterval(function() {
            sliderVal += 1;
            $("#slider").slider("value", sliderVal);
            if (sliderVal===slider_max - 1) sliderVal=0;
        }, animationDelay);
    };

    $(".btn-run").on("click", animate);
    //Set the slider value to the current value to start the animation at the );
    $(".btn-stop").on("click", function() {
        //Call clearInterval to stop the animation.
        clearInterval(sliderInterval);
    });

    $(".btn-increase").on("click", function() {
        clearInterval(sliderInterval);

        if(animationDelay > 250){

            animationDelay = animationDelay - 250;
            $("#speed").val((1/(animationDelay/1000)).toFixed(2));
            animate();
        }

    });

    $(".btn-decrease").on("click", function() {
        clearInterval(sliderInterval);
        animationDelay = animationDelay + 250;
        $("#speed").val((1/(animationDelay/1000)).toFixed(2));
        animate();
    });
    //Initialize any relevant events. This one make sures that the map is adjusted based on the window size.
    init_events = function() {
        (function () {
            var target, observer, config;
            // select the target node
            target = $('#app-content-wrapper')[0];

            observer = new MutationObserver(function () {
                window.setTimeout(function () {
                    map.updateSize();
                }, 350);
            });
            $(window).on('resize', function () {
                map.updateSize();
            });

            config = {attributes: true};

            observer.observe(target, config);
        }());

        map.on("singleclick",function(evt){

            $(element).popover('destroy');


            if (map.getTargetElement().style.cursor == "pointer" && $("#types").find('option:selected').val()=="None") {
                var clickCoord = evt.coordinate;
                popup.setPosition(clickCoord);
                var view = map.getView();
                var viewResolution = view.getResolution();

                var wms_url = current_layer.getSource().getGetFeatureInfoUrl(evt.coordinate, viewResolution, view.getProjection(), {'INFO_FORMAT': 'application/json'}); //Get the wms url for the clicked point
                if (wms_url) {
                    //Retrieving the details for clicked point via the url
                    $.ajax({
                        type: "GET",
                        url: wms_url,
                        dataType: 'json',
                        success: function (result) {
                            var value = parseFloat(result["features"][0]["properties"]["GRAY_INDEX"]);
                            value = value.toFixed(2);
                            $(element).popover({
                                'placement': 'top',
                                'html': true,
                                //Dynamically Generating the popup content
                                'content':'Value: '+value
                            });

                            $(element).popover('show');
                            $(element).next().css('cursor', 'text');


                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            console.log(Error);
                        }
                    });
                }
            }
        });

        map.on('pointermove', function(evt) {
            if (evt.dragging) {
                return;
            }
            var pixel = map.getEventPixel(evt.originalEvent);
            var hit = map.forEachLayerAtPixel(pixel, function(layer) {
                if (layer != layers[0]&& layer != layers[1] && layer != layers[2] && layer != layers[4]){
                    current_layer = layer;
                    return true;}
            });
            map.getTargetElement().style.cursor = hit ? 'pointer' : '';
        });
    };

    //This function is critical as it will ensure that only one of three inputs has value
    clear_coords = function(){
        $("#poly-lat-lon").val('');
        $("#point-lat-lon").val('');
        $("#shp-lat-lon").val('');
    };

    //Creating the map object
    init_map = function(){
        var projection = ol.proj.get('EPSG:3857');
        var baseLayer = new ol.layer.Tile({
            source: new ol.source.BingMaps({
                key: '5TC0yID7CYaqv3nVQLKe~xWVt4aXWMJq2Ed72cO4xsA~ApdeyQwHyH_btMjQS1NJ7OHKY8BK-W-EMQMrIavoQUMYXeZIQOUURnKGBOC7UCt4',
                imagerySet: 'AerialWithLabels' // Options 'Aerial', 'AerialWithLabels', 'Road'
            })
        });

        //Creating an empty source and empty layer for displaying the shpefile object
        shpSource = new ol.source.Vector();
        shpLayer = new ol.layer.Vector({
            source: shpSource
        });

        //Creating an empty source and empty layer for storing the drawn features
        var source = new ol.source.Vector({
            wrapX: false
        });
        var vector_layer = new ol.layer.Vector({
            name: 'my_vectorlayer',
            source: source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                })
            })
        });
        var fullScreenControl = new ol.control.FullScreen();
        var view = new ol.View({
            center: [9500000, 2735000],
            projection: projection,
            zoom: 4
        });
        wms_source = new ol.source.ImageWMS();

        wms_layer = new ol.layer.Image({
            source: wms_source
        });
        layers = [baseLayer,vector_layer,shpLayer,wms_layer];
        map = new ol.Map({
            target: document.getElementById("map"),
            layers: layers,
            view: view
        });
        map.addControl(new ol.control.ZoomSlider());
        map.addControl(fullScreenControl);
        map.crossOrigin = 'anonymous';

        element = document.getElementById('popup');

        popup = new ol.Overlay({
            element: element,
            positioning: 'bottom-center',
            stopEvent: true
        });

        map.addOverlay(popup);

        //Code for adding interaction for drawing on the map
        var lastFeature, draw, featureType;

        //Clear the last feature before adding a new feature to the map
        var removeLastFeature = function () {
            if (lastFeature) source.removeFeature(lastFeature);
        };

        //Add interaction to the map based on the selected interaction type
        var addInteraction = function (geomtype) {
            var typeSelect = document.getElementById('types');
            var value = typeSelect.value;
            $('#data').val('');
            if (value !== 'None') {
                if (draw)
                    map.removeInteraction(draw);

                draw = new ol.interaction.Draw({
                    source: source,
                    type: geomtype
                });


                map.addInteraction(draw);
            }
            if (featureType === 'Point' || featureType === 'Polygon') {

                draw.on('drawend', function (e) {
                    lastFeature = e.feature;

                });

                draw.on('drawstart', function (e) {
                    source.clear();
                });

            }


        };

        vector_layer.getSource().on('addfeature', function(event){
            //Extracting the point/polygon values from the drawn feature
            var feature_json = saveData();
            var parsed_feature = JSON.parse(feature_json);
            var feature_type = parsed_feature["features"][0]["geometry"]["type"];
            if (feature_type == 'Point'){
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"];
                var proj_coords = ol.proj.transform(coords, 'EPSG:3857','EPSG:4326');
                $("#point-lat-lon").val(proj_coords);

            } else if (feature_type == 'Polygon'){
                var coords = parsed_feature["features"][0]["geometry"]["coordinates"][0];
                proj_coords = [];
                coords.forEach(function (coord) {
                    var transformed = ol.proj.transform(coord,'EPSG:3857','EPSG:4326');
                    proj_coords.push('['+transformed+']');
                });
                var json_object = '{"type":"Polygon","coordinates":[['+proj_coords+']]}';
                $("#poly-lat-lon").val(json_object);
            }
        });
        function saveData() {
            // get the format the user has chosen
            var data_type = 'GeoJSON',
                // define a format the data shall be converted to
                format = new ol.format[data_type](),
                // this will be the data in the chosen format
                data;
            try {
                // convert the data of the vector_layer into the chosen format
                data = format.writeFeatures(vector_layer.getSource().getFeatures());
            } catch (e) {
                // at time of creation there is an error in the GPX format (18.7.2014)
                $('#data').val(e.name + ": " + e.message);
                return;
            }
            // $('#data').val(JSON.stringify(data, null, 4));
            return data;

        }

        //Retrieve the relevant modal or tool based on the map interaction item
        $('#types').change(function (e) {
            featureType = $(this).find('option:selected').val();
            if(featureType == 'None'){
                $('#data').val('');
                clear_coords();
                map.removeInteraction(draw);
                vector_layer.getSource().clear();
                shpLayer.getSource().clear();
            }else if(featureType == 'Upload')
            {
                clear_coords();
                vector_layer.getSource().clear();
                shpLayer.getSource().clear();
                map.removeInteraction(draw);
                $modalUpload.modal('show');
            }else if(featureType == 'Point')
            {
                clear_coords();
                shpLayer.getSource().clear();
                addInteraction(featureType);
            }else if(featureType == 'Polygon'){
                clear_coords();
                shpLayer.getSource().clear();
                addInteraction(featureType);
            }
        }).change();
        init_events();

    };


    get_plot = function(){
        if($("#poly-lat-lon").val() == "" && $("#point-lat-lon").val() == "" && $("#shp-lat-lon").val() == ""){
            $('.warning').html('<b>No feature selected. Please create a feature using the map interaction dropdown. Plot cannot be generated without a feature.</b>');
            return false;
        }else{
            $('.warning').html('');
        }
        var datastring = $get_plot.serialize();
        $.ajax({
            type:"POST",
            url:'/apps/wrf-viewer/get-plot/',
            dataType:'HTML',
            data:datastring,
            success:function(result){
                var json_response = JSON.parse(result);
                if(json_response.status === 'success'){

                    $('#plotter').highcharts({
                        chart: {
                            type:'area',
                            zoomType: 'x'
                        },
                        title: {
                            text: json_response.var_name + " values at " +json_response.location,
                            style: {
                                fontSize: '11px'
                            }
                        },
                        xAxis: {
                            type: 'datetime',
                            labels: {
                                format: '{value:%d %b %Y}',
                                rotation: 45,
                                align: 'left'
                            },
                            title: {
                                text: 'Date'
                            }
                        },
                        yAxis: {
                            title: {
                                text: json_response.var_unit
                            }

                        },
                        exporting: {
                            enabled: true
                        },
                        series: [{
                            data:json_response.values,
                            name: json_response.variable
                        }]

                    });

                }
            }
        });
    };

    $("#btn-get-plot").on('click',get_plot);

    upload_file = function(){
        var files = $("#shp-upload-input")[0].files;
        var data;

        $modalUpload.modal('hide');
        data = prepare_files(files);

        $.ajax({
            url: '/apps/wrf-viewer/upload-shp/',
            type: 'POST',
            data: data,
            dataType: 'json',
            processData: false,
            contentType: false,
            error: function (status) {

            }, success: function (response) {
                var extents = response.bounds;
                shpSource = new ol.source.Vector({
                    features: (new ol.format.GeoJSON()).readFeatures(response.geo_json)
                });
                shpLayer = new ol.layer.Vector({
                    name:'shp_layer',
                    extent:[extents[0],extents[1],extents[2],extents[3]],
                    source: shpSource,
                    style:new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: 'blue',
                            lineDash: [4],
                            width: 3
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(0, 0, 255, 0.1)'
                        })
                    })
                });
                map.addLayer(shpLayer);


                map.getView().fit(shpLayer.getExtent(), map.getSize());
                map.updateSize();
                map.render();

                var min = ol.proj.transform([extents[0],extents[1]],'EPSG:3857','EPSG:4326');
                var max = ol.proj.transform([extents[2],extents[3]],'EPSG:3857','EPSG:4326');
                var proj_coords = min.concat(max);
                $("#shp-lat-lon").val(proj_coords);

            }
        });


    };

    $("#btn-add-shp").on('click',upload_file);

    prepare_files = function (files) {
        var data = new FormData();

        Object.keys(files).forEach(function (file) {
            data.append('files', files[file]);
        });

        return data;
    };

    addDefaultBehaviorToAjax = function () {
        // Add CSRF token to appropriate ajax requests
        $.ajaxSetup({
            beforeSend: function (xhr, settings) {
                if (!checkCsrfSafe(settings.type) && !this.crossDomain) {
                    xhr.setRequestHeader("X-CSRFToken", getCookie("csrftoken"));
                }
            }
        });
    };

    checkCsrfSafe = function (method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    };

    getCookie = function (name) {
        var cookie;
        var cookies;
        var cookieValue = null;
        var i;

        if (document.cookie && document.cookie !== '') {
            cookies = document.cookie.split(';');
            for (i = 0; i < cookies.length; i += 1) {
                cookie = $.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    init_slider = function() {

        $("#slider").slider({
            value: 1,
            min: 0,
            max: 71,
            step: 1, //Assigning the slider step based on the depths that were retrieved in the controller
            animate: "fast",
            slide: function (event, ui) {
                var date_text = $("#select_date option")[ui.value].text;
                $( "#wrf-date" ).val(date_text); //Get the value from the slider
                var date_value = $("#select_date option")[ui.value].value;

            }
        });
    };

    cbar_str = function(){
        var sld_color_string = '';
        var var_option = $("#vars").find('option:selected').val();
        var cur_variable;
        var_info.forEach(function(element){
            if(element["name"] == var_option) {
                cur_variable = element;
            }
        });
        cbar.forEach(function(color,i){
            if (i != 19 ){
                var color_map_entry = '<ColorMapEntry color="'+color+'" quantity="'+cur_variable["interval"][i]+'" label="label'+i+'" opacity="0.7"/>';
                sld_color_string += color_map_entry;
            }else{
                 var color_map_entry = '<ColorMapEntry color="#000000" quantity="'+cur_variable["interval"][i]+'" label="label'+i+'" opacity="0.0"/>';
                 sld_color_string+color_map_entry;
            }
        });

        return sld_color_string


    };


    add_wms = function(){
        // gs_layer_list.forEach(function(item){
        map.removeLayer(wms_layer);
        var color_str = cbar_str();
        var store_name = $("#select_date").find('option:selected').index();
        var layer_var = store_name+"-"+$("#vars").find('option:selected').val();

        var layer_name = 'wrf:'+layer_var;
        var sld_string = '<StyledLayerDescriptor version="1.0.0"><NamedLayer><Name>'+layer_name+'</Name><UserStyle><FeatureTypeStyle><Rule>\
        <RasterSymbolizer> \
        <ColorMap>\
        <ColorMapEntry color="#000000" quantity="-9999" label="nodata" opacity="0.0" />'+
            color_str
            +'<ColorMapEntry color="#000000" quantity="9999" label="nodata" opacity="0.0" /></ColorMap>\
        </RasterSymbolizer>\
        </Rule>\
        </FeatureTypeStyle>\
        </UserStyle>\
        </NamedLayer>\
        </StyledLayerDescriptor>';

        wms_source = new ol.source.ImageWMS({
            url: 'http://tethys.byu.edu:8181/geoserver/wms',
            params: {'LAYERS':layer_name,'SLD_BODY':sld_string},
            serverType: 'geoserver',
            crossOrigin: 'Anonymous'
        });

        wms_layer = new ol.layer.Image({
            source: wms_source
        });

        map.addLayer(wms_layer);
    };

    update_wms = function(date_idx){
        var color_str = cbar_str();
        var var_option = $("#vars").find('option:selected').val();
        var layer_name = 'wrf:'+date_idx+'-'+var_option;

        var sld_string = '<StyledLayerDescriptor version="1.0.0"><NamedLayer><Name>'+layer_name+'</Name><UserStyle><FeatureTypeStyle><Rule>\
        <RasterSymbolizer> \
        <ColorMap> \
        <ColorMapEntry color="#000000" quantity="-9999" label="nodata" opacity="0.0" />'+
            color_str
            +' <ColorMapEntry color="#000000" quantity="9999" label="nodata" opacity="0.0" /></ColorMap>\
        </RasterSymbolizer>\
        </Rule>\
        </FeatureTypeStyle>\
        </UserStyle>\
        </NamedLayer>\
        </StyledLayerDescriptor>';

        wms_source.updateParams({'LAYERS':layer_name,'SLD_BODY':sld_string});

    };

    /************************************************************************
     *                        DEFINE PUBLIC INTERFACE
     *************************************************************************/


    /************************************************************************
     *                  INITIALIZATION / CONSTRUCTOR
     *************************************************************************/

    $(function() {
        init_jquery_var();
        addDefaultBehaviorToAjax();
        init_map();
        init_slider();
        gen_color_bar();

        $("#speed").val((1/(animationDelay/1000)).toFixed(2));

        $("#select_date").change(function(){
            add_wms();
            var selected_option = $(this).find('option:selected').index();
            $("#slider").slider("value", selected_option);
        }).change();

        $("#vars").change(function(){
            clearInterval(sliderInterval);
            update_color_bar();
            var val = $("#slider").slider("value");
            var date_value = $("#select_date option")[val].value;
            update_wms(val);
        });

        $("#slider").on("slidechange", function(event, ui) {
            var date_text = $("#select_date option")[ui.value].text;
            $( "#wrf-date" ).val(date_text); //Get the value from the slider
            update_wms(ui.value);

        });

    });



}()); // End of package wrapper
// NOTE: that the call operator (open-closed parenthesis) is used to invoke the library wrapper
// function immediately after being parsed.