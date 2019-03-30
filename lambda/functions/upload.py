import subprocess
import json
import requests
import zipfile
import os
import shutil
import hashlib

def get_function_list():
    return json.load(open('functions.json'))


def get_function_names():
    return [ f['FunctionName'] for f in json.load(open('functions.json')) ]


def upload_file(file_name, function_name):
    result = json.loads(subprocess.check_output([
        'aws', '--profile', 'thankshell',
        'lambda', 'update-function-code',
        '--function-name', function_name,
        '--zip-file', 'fileb://' + file_name,
    ]))

    return result["CodeSha256"]


if __name__ == '__main__':
    lambda_dir = os.path.dirname(os.path.abspath(__file__))

    function_list = get_function_list()

    for function_info in function_list:
        function_name = function_info['FunctionName']
        file_name = function_name + '.zip'

        shutil.make_archive(function_name, format='zip', root_dir=function_name)

        os.remove(file_name)
        print("update: {}".format(function_name))
