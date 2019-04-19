import subprocess
import json
import requests
import zipfile
import os

if __name__ == '__main__':
    lambda_dir = os.path.dirname(os.path.abspath(__file__))

    api_id = '4y7p03ggql'
    rest_api = json.loads(subprocess.check_output([
        'aws',
        'apigateway',
        'get-rest-api',
        '--rest-api-id', api_id,
    ]))

    with open(lambda_dir + '/rest_api.json', 'w') as f:
        f.write(json.dumps(rest_api, indent=4) + "\n")

    result = subprocess.check_output([
        'aws',
        'apigateway',
        'get-export',
        '--rest-api-id', api_id,
        '--stage-name', 'develop',
        '--export-type', 'swagger',
        lambda_dir + '/export.json',
    ])

    resources = json.loads(subprocess.check_output([
        'aws',
        'apigateway',
        'get-resources',
        '--rest-api-id', api_id,
    ]))

    with open(lambda_dir + '/resources.json', 'w') as f:
        f.write(json.dumps(resources, indent=4) + "\n")

    data = {}
    for r in resources['items']:
        if 'resourceMethods' not in r:
            continue

        data[r['id']] = {}
        for m in r['resourceMethods'].keys():
            method = json.loads(subprocess.check_output([
                'aws',
                'apigateway',
                'get-method',
                '--rest-api-id', api_id,
                '--resource-id', r['id'],
                '--http-method', m,
            ]))
            data[r['id']][m] = method

    with open(lambda_dir + '/methods.json', 'w') as f:
        f.write(json.dumps(data, indent=4) + "\n")
