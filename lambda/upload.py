import subprocess
import json
import requests
import zipfile
import os


def get_function_names():
    return [d for d in os.listdir('.') if os.path.isdir(d)]

if __name__ == '__main__':
    lambda_dir = os.path.dirname(os.path.abspath(__file__))

    function_names = get_function_names()

    for fname in function_names:
        with zipfile.ZipFile('tmp.zip', 'w') as tmp_zip:
            [tmp_zip.write(fname + '/' + f) for f in os.listdir(fname)]

        data = {
            "FunctionName": fname,
            "ZipFile": 'tmp.zip',
            "DryRun": True,
        }

        result = json.loads(subprocess.check_output([
            'aws', '--profile', 'thankshell',
            'lambda', 'update-function-code',
            '--function-name', fname,
            '--zip-file', 'fileb://tmp.zip',
            '--dry-run',
        ]))

        os.remove('tmp.zip')
        print("update: "+ fname)
