from tethys_sdk.base import TethysAppBase, url_map_maker


class WrfObservationsExplorer(TethysAppBase):
    """
    Tethys app class for WRF Observations Explorer.
    """

    name = 'HIWAT Forecast Explorer'
    index = 'wrf_viewer:home'
    icon = 'wrf_viewer/images/logo.png'
    package = 'wrf_viewer'
    root_url = 'wrf-viewer'
    color = '#004de6'
    description = 'View HIWAT Forecast Data'
    tags = 'SERVIR'
    enable_feedback = False
    feedback_emails = []

        
    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (UrlMap(name='home',
                           url='wrf-viewer',
                           controller='wrf_viewer.controllers.home'),
                    UrlMap(name='api',
                           url='wrf-viewer/api',
                           controller='wrf_viewer.controllers.api'), #API Documentation
                    UrlMap(name='get-plot',
                           url='wrf-viewer/get-plot',
                           controller='wrf_viewer.controllers.get_plot'),# Get Plot controller (See controllers.py). Gets triggered when you click submit button on the homepage.
                    UrlMap(name='upload-shp',
                           url='wrf-viewer/upload-shp',
                           controller='wrf_viewer.controllers_ajax.upload_shp'),# Upload Shapefile Controller (See controllers_ajax.py). Gets triggered when you click upload shapefile.
                    UrlMap(name='api_get_var_list',
                           url='wrf-viewer/api/GetVariableList',
                           controller='wrf_viewer.api.api_get_var_list'),  # Get Variables API call. See api.py.
                    UrlMap(name='api_get_available_dates',
                           url='wrf-viewer/api/GetAvailableDates',
                           controller='wrf_viewer.api.api_get_available_dates'),  # Get Available Dates API call. See api.py
                    UrlMap(name='api_get_point_values',
                           url='wrf-viewer/api/GetPointValues',
                           controller='wrf_viewer.api.api_get_point_values'),  # Get values for a point API call. See api.py
                    UrlMap(name='api_get_polygon_values',
                           url='wrf-viewer/api/GetPolygonValues',
                           controller='wrf_viewer.api.api_get_polygon_values'),# Get values for polyon bounds API call. See api.py
                    )

        return url_maps