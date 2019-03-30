let Auth = require('thankshell-libs/auth.js');
let AWS = require("aws-sdk");

let deleteUserLink = async(userId, params, data) => {
    let dynamo = new AWS.DynamoDB.DocumentClient();

    let authId = params.type + ':' + data.id;
    let result = await dynamo.delete({
        TableName: 'thankshell_user_links',
        Key:{
            'auth_id': authId,
        },
    }).promise();

    return result;
};

let getHandler = (mainProcess) => {
    return async(event, context, callback) => {
        let statusCode = 200;
        let data;
    
        try {
            let userId = await Auth.getUserId(event.requestContext.authorizer.claims);
            if (userId) {
                statusCode = 200;
                data = await mainProcess(userId, event.pathParameters, JSON.parse(event.body));
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
                'message': err.message,
            };
        } finally {
            return {
                statusCode: statusCode,
                headers: {"Access-Control-Allow-Origin": "*"},
                body: JSON.stringify(data),
            };
        }
    };
};

exports.handler = getHandler(deleteUserLink);