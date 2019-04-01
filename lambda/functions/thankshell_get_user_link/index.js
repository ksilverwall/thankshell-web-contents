let Auth = require('thankshell-libs/auth.js');
let AWS = require("aws-sdk");

let getUserConnection = async(account, pathParameter, data) => {
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

exports.handler = Auth.getHandler(getUserConnection);
