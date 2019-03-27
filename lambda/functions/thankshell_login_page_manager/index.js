'use strict';

const getResponse = async () => {
    let AWS = require('aws-sdk');
    let s3 = new AWS.S3();

    let promise = new Promise((resolve, reject) => {
        s3.getObject({Bucket: 'thankshell.com', Key: 'login/index.html'}, (err, response) => {
            if(err) {
                reject(err);
                return;
            }
            resolve(response.Body);
        });
    });

    let xxx = (await promise).toString('base64');
    let response = {
        statusCode: 200,
        headers: {"Content-Type": "text/html"},
        body: "<html><head>I have a pen</head><body>aaaa</body></html>",
//        body: xxx,
    };



    return response;    
}

exports.handler = async(event, context, callback) => {
    context.succeed(await getResponse());
};