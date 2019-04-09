import subprocess
import json
import requests
import zipfile
import os
import argparse
import shutil

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('name', help='itarget layer name')
    args = parser.parse_args()
    layer_name = args.name
    file_name = layer_name + '.zip'

    shutil.make_archive(layer_name, format='zip', root_dir=layer_name)

    print('Zip file created: ' + layer_name)
    result = json.loads(subprocess.check_output([
        'aws', '--profile', 'thankshell',
        'lambda', 'publish-layer-version',
        '--layer-name', layer_name,
        '--zip-file', 'fileb://' + file_name,
        '--compatible-runtimes', 'nodejs8.10',
    ]))

    os.remove(file_name)
    print("update: "+ layer_name)
    print(json.dumps(result, indent=4))
