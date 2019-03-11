import subprocess
import json
import requests
import zipfile
import os


if __name__ == '__main__':
    lambda_dir = os.path.dirname(os.path.abspath(__file__))

    function_names = [
        "thankshell_get_transactions",
        "thankshell_get_user_info",
        "thankshell_create_transaction",
    ]

    for fname in function_names:
        result = json.loads(subprocess.check_output(['aws', 'lambda', 'get-function', '--function-name', fname]))
        response = requests.get(result['Code']['Location'])
        with open('tmp.zip', 'wb') as fp:
            fp.write(response.content)

        with zipfile.ZipFile('tmp.zip') as existing_zip:
            existing_zip.extractall(lambda_dir + '/' + fname)
