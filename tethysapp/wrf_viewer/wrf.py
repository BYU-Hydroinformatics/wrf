from netCDF4 import Dataset
import os,os.path
import numpy as np
import shapefile as sf
import os, tempfile, shutil,sys
import gdal,gdalconst
import ogr
import osr
import requests
from datetime import datetime, timedelta
import sys
import subprocess
import fiona
import shapely.geometry
import rtree
import math
import csv, random, string

#Upload GeoTiffs to geoserver
def upload_tiff(dir,geoserver_rest_url,workspace,variable):

    headers = {
        'Content-type': 'image/tiff',
    }
    counter = 0
    for file in sorted(os.listdir(dir)):
        print "Adding layer "+str(counter)
        store_name = str(counter)+"-"+variable
        counter += 1
        data = open(dir+file,'rb').read()
        request_url = '{0}/workspaces/{1}/coveragestores/{2}/file.geotiff'.format(geoserver_rest_url, workspace,
                                                                                  store_name)  # Creating the rest url

        requests.put(request_url, headers=headers, data=data,
                     auth=('admin', 'geoserver'))