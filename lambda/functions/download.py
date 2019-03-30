import subprocess
import json
import requests
import os
import shutil


def get_functions():
    result = json.loads(subprocess.check_output(['aws', '--profile', 'thankshell', 'lambda', 'list-functions']))

    info = []
    for f in result['Functions']:
        if f['FunctionName'].startswith('thankshell'):
            info.append({key: value for key, value in f.items() if key in ['FunctionName', 'Layers']})

    return info

if __name__ == '__main__':
    lambda_dir = os.path.dirname(os.path.abspath(__file__))

    functions = get_functions()
    json.dump(functions, open('functions.json', 'w'), indent=2)

    for f_info in functions:
        print("downloading: " + f_info['FunctionName'])
        fname = f_info['FunctionName']
        result = json.loads(subprocess.check_output(['aws', '--profile', 'thankshell', 'lambda', 'get-function', '--function-name', fname]))
        response = requests.get(result['Code']['Location'])
        with open('tmp.zip', 'wb') as fp:
            fp.write(response.content)

        shutil.unpack_archive('tmp.zip', fname)

        os.remove('tmp.zip')
