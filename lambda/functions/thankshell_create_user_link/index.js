let Auth = require('thankshell-libs/auth.js');
let AWS = require("aws-sdk");

let createUserLink = async(userId, params, data) => {
    let dynamo = new AWS.DynamoDB.DocumentClient();

    let authId = params.type + ':' + data.id;
    let result = await dynamo.update({
        TableName: 'thankshell_user_links',
        Key:{
            'auth_id': authId,
        },
        UpdateExpression: 'SET user_id = :value',
        ExpressionAttributeValues: {
            ':value': userId,
        },
    }).promise();

    return result;
};

exports.handler = Auth.getHandler(createUserLink);
