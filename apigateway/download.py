import subprocess
import json
import requests
import zipfile
import os

if __name__ == '__main__':
    lambda_dir = os.path.dirname(os.path.abspath(__file__))
    rest_apis = json.load(open(lambda_dir + '/rest_apis.json'))

    for api in rest_apis['items']:
        result = subprocess.check_output([
            'aws',
            'apigateway',
            'get-export',
            '--rest-api-id', api['id'],
            '--stage-name', 'develop',
            '--export-type', 'swagger',
            lambda_dir + '/' + api['name'] + '.json',
        ])
