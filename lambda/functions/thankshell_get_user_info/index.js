let Thankshell = require('./auth.js');
let AWS = require("aws-sdk");

exports.handler = async (event, context, callback) => {
    return {
        statusCode: 200,
        headers: {"Access-Control-Allow-Origin": "*"},
        body: JSON.stringify({
            'code': 'SUCCESS',
            'name': await Thankshell.getUserId(event.requestContext.authorizer.claims),
        }),
    };
};
