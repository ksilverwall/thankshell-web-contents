let AWS = require("aws-sdk");

let getAccountInfo = async(event) => {
    let lambda = new AWS.Lambda();

    let response = await lambda.invoke({
        FunctionName: 'thankshell_get_user_info',
        InvocationType: "RequestResponse",
        Payload: JSON.stringify(event)
    }).promise();

    let payload = JSON.parse(response.Payload)
    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return JSON.parse(payload.body);
};

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

exports.handler = async(event, context, callback) => {
    try {
        let user = await getAccountInfo(event);
        let data = await createUserLink(user.name, event.pathParameters, JSON.parse(event.body));

        return {
            statusCode: 200,
            headers: {"Access-Control-Allow-Origin": "*"},
            body: JSON.stringify(data),
        };
    } catch(err) {
        console.log(err);

        return {
            statusCode: 500,
            headers: {"Access-Control-Allow-Origin": "*"},
            body: JSON.stringify({'message': err.message}),
        };
    }
};
