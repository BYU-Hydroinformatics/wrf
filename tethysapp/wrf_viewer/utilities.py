# import subprocess
# from PIL import Image
# import gdal
import numpy as np #Need this for parsing the arrays
from netCDF4 import Dataset #Need this parsing the netcdf file
import os,os.path
import gdal
import ogr
import osr
from datetime import datetime, timedelta
import json
import time, calendar
import functools
import fiona #Important Module: Need this for reading the uploaded shapefile
import geojson #Need this for working with geojson objects
import pyproj #Need this to reproject the wrf cetcdf file
import shapely.geometry #Need this to find the bounds of a given geometry
import shapely.ops
import os, tempfile, shutil
from colour import Color

#Function for getting the mean value of a variable over given bounds. This works for getting the mean values of the polygon and the shapefile.
def get_mean(bounds,variable,directory):

    #Initializing an empty json object. This object will have contain the results.
    graph_json= {}

    #Before you specify the file directory be sure to download and unzip all the wrf files onto the server machine. Change the name of the file directory as you see fit.
    file_dir = os.path.join(directory,'')

    #Defining minx,miny,max,maxy
    miny = float(bounds[1])
    minx = float(bounds[0])
    maxx = float(bounds[2])
    maxy = float(bounds[3])

    ts_plot = []

    #Looping through the files in the directory. Each file is a timestep.
    for file in os.listdir(file_dir):
        nc_fid = Dataset(file_dir + file, 'r')  #Reading the netCDF file
        lats = nc_fid.variables['XLAT'][0, :, :]    #Defining the latitutde array
        lons = nc_fid.variables['XLONG'][0, :, :]   #Defining the longitude array
        field = nc_fid.variables[variable][0, :, :] #Defining the variable array
        abslat = np.abs(lats - miny)    #Finding the absolute lat for minx
        abslon = np.abs(lons - minx)    #Finding the absolute lon for miny
        abslat2 = np.abs(lats - maxy)   #Finding the absolute lat for maxx
        abslon2= np.abs(lons - maxx)    #Finding the absolute lat for mixy

        #Finding the index of the minx,miny
        c = np.maximum(abslon, abslat)
        minx_idx, miny_idx = np.where(c == np.min(c))

        #Finding the index of maxx,maxy
        d = np.maximum(abslon2, abslat2)
        maxx_idx, maxy_idx = np.where(d == np.min(d))

        #Finding all the values that fall within the bounds of the indexes
        values = field[minx_idx[0]:maxx_idx[0],miny_idx[0]:maxy_idx[0]]

        #Averaging all the values
        var_val = np.mean(values)

        #Finding the time in UTC seconds from the file name
        file_ls = file.split('_')
        day = file_ls[2].split('-')
        timing = file_ls[3].split(':')

        date_string = datetime(int(day[0]), int(day[1]), int(day[2]), int(timing[0]), int(timing[1]), int(timing[2]))
        time_stamp = calendar.timegm(date_string.utctimetuple()) * 1000
        #Adding each timestep and tis corresponding value to an empty list
        ts_plot.append([time_stamp, float(var_val)])
        ts_plot.sort()

    #Returning the list with the timeseries values and the bounds so that they can be displayed on the graph.
    graph_json["values"] = ts_plot
    graph_json["bounds"] = [round(minx,2),round(miny,2),round(maxx,2),round(maxy,2)]
    graph_json = json.dumps(graph_json)
    return graph_json

#Function for getting the value of a variable at a given point.
def get_ts_plot(variable,pt_coords,directory):

    # Initializing an empty json object. This object will have contain the results.
    graph_json = {}

    #Empty list to store the timeseries values
    ts_plot = []

    # Before you specify the file directory be sure to download and unzip all the wrf files onto the server machine. Change the name of the file directory as you see fit.
    file_dir = os.path.join(directory, '')
    #Defining the lat and lon from the coords string
    coords = pt_coords.split(',')
    stn_lat = float(coords[1])
    stn_lon = float(coords[0])

    #Looping through each timestep
    for file in os.listdir(file_dir):
        nc_fid = Dataset(file_dir + file, 'r') #Reading the netCDF file
        lats = nc_fid.variables['XLAT'][0,:,:]  #Defining the latitude array
        lons = nc_fid.variables['XLONG'][0,:,:] #Defining the longitude array
        field = nc_fid.variables[variable][0,:,:]   #Defning the variable array
        abslat = np.abs(lats - stn_lat) #Finding the absolute latitude
        abslon = np.abs(lons - stn_lon) #Finding the absolute longitude

        #Thanks to Brian Baylock. See http://kbkb-wx-python.blogspot.com/2016/08/find-nearest-latitude-and-longitude.html
        #Finding the index of the latitude and longitude
        c = np.maximum(abslon, abslat)
        x, y = np.where(c == np.min(c))


        #Getting the value based on the index
        var_val = field[x[0], y[0]]

        #Getting the value of the timestep and converting it into UTC seconds
        file_ls = file.split('_')
        day = file_ls[2].split('-')
        timing = file_ls[3].split(':')
        # file_dt = datetime.strptime(file_ls[2]+' '+file_ls[3], "%Y-%m-%d %H:%M:%S")
        date_string = datetime(int(day[0]),int(day[1]),int(day[2]),int(timing[0]),int(timing[1]),int(timing[2]))
        time_stamp = calendar.timegm(date_string.utctimetuple()) * 1000
        # ts_plot.append([datetime(int(day[0]),int(day[1]),int(day[2]),int(timing[0]),int(timing[1])),var_val])
        #Adding the timestep and its corresponding value to an empty list
        ts_plot.append([time_stamp,float(var_val)])
        ts_plot.sort()

    # Returning the list with the timeseries values and the point so that they can be displayed on the graph.
    graph_json["values"] = ts_plot
    graph_json["point"] = [round(stn_lat,2),round(stn_lon,2)]
    graph_json = json.dumps(graph_json)
    return graph_json

#Conver the shapefiles into a geojson object
def convert_shp(files):

    #Initizalizing an empty geojson string.
    geojson_string = ''

    try:
        #Storing the uploaded files in a temporary directory
        temp_dir = tempfile.mkdtemp()
        for f in files:
            f_name = f.name
            f_path = os.path.join(temp_dir,f_name)

            with open(f_path,'wb') as f_local:
                f_local.write(f.read())

        #Getting a list of files within the temporary directory
        for file in os.listdir(temp_dir):
            #Reading the shapefile only
            if file.endswith(".shp"):
                f_path = os.path.join(temp_dir,file)
                omit = ['SHAPE_AREA', 'SHAPE_LEN']

                #Reading the shapefile with fiona and reprojecting it
                with fiona.open(f_path) as source:
                    project = functools.partial(pyproj.transform,
                                                pyproj.Proj(**source.crs),
                                                pyproj.Proj(init='epsg:3857'))
                    features = []
                    for f in source:
                        shape = shapely.geometry.shape(f['geometry']) #Getting the shape of the shapefile
                        projected_shape = shapely.ops.transform(project, shape) #Transforming the shapefile

                        # Remove the properties we don't want
                        props = f['properties']  # props is a reference
                        for k in omit:
                            if k in props:
                                del props[k]

                        feature = geojson.Feature(id=f['id'],
                                                  geometry=projected_shape,
                                                  properties=props) #Creating a geojson feature by extracting properties through the fiona and shapely.geometry module
                        features.append(feature)
                    fc = geojson.FeatureCollection(features)

                    geojson_string = geojson.dumps(fc) #Creating the geojson string


    except:
        return 'error'
    finally:
        #Delete the temporary directory once the geojson string is created
        if temp_dir is not None:
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)

    return geojson_string

def get_times():
    start_date = '2017-03-09 18:00:00'

    dates = []
    dates.append((start_date,start_date))
    for i in range(1,73):
        the_time = datetime.strptime(start_date, "%Y-%m-%d %H:%M:%S")
        the_time += timedelta(hours=i)
        dates.append((the_time.strftime("%Y-%m-%d %H:%M:%S"),the_time.strftime("%Y-%m-%d %H:%M:%S")))

    return dates

def get_range(directory,var_list,breaks):
    dir_path = os.path.join(directory, '')

    red = Color("red")
    colors = list(red.range_to(Color("blue"), breaks))
    cbar = [c.hex for c in colors]

    var_metadata = []
    for var_name in var_list:
        var_json = {}
        var_min = []
        var_max = []
        for file in sorted(os.listdir(dir_path)):
            nc_fid = Dataset(dir_path + file, 'r')
            field = nc_fid.variables[var_name][0,:,:]
            # for timestep, v in enumerate(time):
            #     current_timestep = nc_fid.variables[var_name][timestep, :, :]
            var_min.append(field.min())
            var_max.append(field.max())

        dif = float(max(var_max)) - float(min(var_min))
        # print max(var_max),min(var_min), float(dif/breaks)
        interval = (np.arange(min(var_min), max(var_max),float(dif/breaks)))
        var_json["min"] = round(float(min(var_min)),1)
        var_json["max"] = round(float(max(var_max)),1)
        var_json["interval"] = [round(x,1) for x in interval.tolist()]
        var_json["name"] = var_name
        var_metadata.append(var_json)

    return var_metadata, cbar