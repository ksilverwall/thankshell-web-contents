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
    fname = args.name

    shutil.make_archive(fname, format='zip', root_dir=fname)

    print('Zip file created: ' + fname)
    #result = json.loads(subprocess.check_output([
    #    'aws', '--profile', 'thankshell',
    #    'lambda', 'update-function-code',
    #    '--function-name', fname,
    #    '--zip-file', 'fileb://tmp.zip',
    #]))

    #os.remove('tmp.zip')
    #print("update: "+ fname)
