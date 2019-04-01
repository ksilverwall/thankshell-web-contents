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

exports.handler = Auth.getHandler(deleteUserLink);
