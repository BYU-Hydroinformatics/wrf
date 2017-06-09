from django.http import JsonResponse
from utilities import *
import json

WRF_DIRECTORY = "/wrf/"
def api_get_var_list(request):
    '''
    Return a JSON object that contains the list of all the available variables. Needs to be changed to be more dynamic.
    '''
    json_obj = {}
    if request.method == 'GET':

        variable_options = [('Total Accumulated Precipitation(mm)', 'TACC_PRECIP'),
                            ('Total Rainfall Accumulation(mm)', 'TACC_RAIN'),
                            ('Total Snow/Ice Accumulation(mm)', 'TACC_SNICE'),
                            ('Maximum Composite reflectivity(dbz)', 'REFC_MAX'),
                            ('Maximum 10 M wind speed(m s-1)', 'S10_MAX'),
                            ('Maximum Column Integrated Graupel(kg m-2)', 'GCOLMAX'),
                            ('1 to 6km Maximum Updraft Helicity(m2 s-2)', 'UDHELI16_MAX'),
                            ('Period Maximum Rainfall Rate (mm s-1)', 'MAX_RRATE'),
                            ('Period Maximum Snow + Graupel Precipitation Rate(mm s-1)', 'MAX_SFRATE'),
                            ('Mean Shelter Temperature(K)', 'T02_MEAN')]

        json_obj = {"variable_options":variable_options}

    return  JsonResponse(json_obj)

def api_get_available_dates(request):
    '''
    Return a JSON object that contains the list of all the available dates. Needs to be changed to be more dynamic.
    '''

    json_obj = {}

    if request.method == 'GET':
        date_options = get_times()
        dates = []
        for date in date_options:
            dates.append(date[0])

        json_obj = {"date_options":dates}

    return JsonResponse(json_obj)

def api_get_point_values(request):
    '''
        Return a JSON object that contains the list of all the values for a given point.
    '''
    json_obj = {}

    if request.method == 'GET':
        json_obj = {}

        latitude = None
        longitude = None
        variable = None

        #Check if the parameters exist, if they do, define them
        if request.GET.get('latitude'):
            latitude = request.GET['latitude']
        if request.GET.get('longitude'):
            longitude = request.GET['longitude']
        if request.GET.get('variable'):
            variable = request.GET['variable']

        coords = str(longitude)+','+str(latitude) #Creating the coordinates string so that it can be passed into the get_ts_plot function. See utilities.py

        try:
            graph = get_ts_plot(variable,coords,WRF_DIRECTORY)
            graph = json.loads(graph)
            json_obj = graph

            return JsonResponse(json_obj) #Return the json object with a list of the time and corresponding values

        except:
            json_obj ={"Error":"Error Processing Request"} #Show an error if there are any problems executing the script.

            return JsonResponse(json_obj)

    return JsonResponse(json_obj)

def api_get_polygon_values(request):
    '''
        Return a JSON object that contains the list of all the values for a given bounds.
    '''
    json_obj = {}

    # Check if the parameters exist, if they do, define them
    if request.method == 'GET':
        json_obj = {}

        minx = None
        miny = None
        maxx = None
        maxy = None
        variable = None

        if request.GET.get('minx'):
            minx = request.GET['minx']
        if request.GET.get('miny'):
            miny = request.GET['miny']
        if request.GET.get('maxx'):
            maxx = request.GET['maxx']
        if request.GET.get('maxy'):
            maxy = request.GET['maxy']
        if request.GET.get('variable'):
            variable = request.GET['variable']

        bounds = [minx,miny,maxx,maxy] #Creating the bounds list, so that it can be passed into the get_mean function. See utilities.py

        try:
            graph = get_mean(bounds,variable,WRF_DIRECTORY)
            graph = json.loads(graph)
            json_obj = graph
            return JsonResponse(json_obj) #Return the json object with a list of the time and corresponding values

        except:
            json_obj = {"Error": "Error Processing Request"}

            return JsonResponse(json_obj) #Throw an error for any exceptions

    return JsonResponse(json_obj)