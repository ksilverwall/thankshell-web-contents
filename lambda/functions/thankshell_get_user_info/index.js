let Auth = require('thankshell-libs/auth.js');
let AWS = require("aws-sdk");

let getUsetInfo = async(userId) => {
    return {
        'code': 'SUCCESS',
        'name': userId,
    };
};

let getHandler = mainProcess => {
    return async (event, context, callback) => {
        let statusCode;
        let data;

        try {
            let userId = await Auth.getUserId(event.requestContext.authorizer.claims);
            if (userId) {
                statusCode = 200;
                data = await mainProcess(userId);
            } else {
                statusCode = 403;
                data = {
                    "message": "user id not found",
                };
            }
        } catch(err) {
            console.log(err);
            statusCode = 500;
            data = {
                "message": err.message,
            };
        }

        return {
            statusCode: statusCode,
            headers: {"Access-Control-Allow-Origin": "*"},
            body: JSON.stringify(data),
        };
    };
};

exports.handler = getHandler(getUsetInfo);