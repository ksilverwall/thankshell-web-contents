let Auth = require('thankshell-libs/auth.js');
let AWS = require("aws-sdk");

let getUserConnection = async(account, data) => {
    let dynamo = new AWS.DynamoDB.DocumentClient();

    let result = await dynamo.query({
        TableName: 'thankshell_user_links',
        IndexName: 'user_id_index',
        KeyConditionExpression: "user_id = :value",
        ExpressionAttributeValues: {
            ":value": account
        },
    }).promise();

    return result.Items;
};

let getHandler = mainProcess => {
    return async(event, context, callback) => {
        let statusCode;
        let data;

        try {
            let userId = await Auth.getUserId(event.requestContext.authorizer.claims);
            if (userId) {
                statusCode = 200;
                data = await mainProcess(userId, JSON.parse(event.body));
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
}

exports.handler = getHandler(getUserConnection);