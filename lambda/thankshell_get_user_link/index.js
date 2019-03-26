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

let getUserConnection = async(account, data) => {
    let dynamo = new AWS.DynamoDB.DocumentClient();

    let result = await dynamo.get({
        TableName: 'thankshell_user_connections',
        Key:{
            'user_id': account,
        },
    }).promise();

    result = await dynamo.query({
        TableName: 'thankshell_user_links',
        IndexName: 'user_id_index',
        KeyConditionExpression: "user_id = :value",
        ExpressionAttributeValues: {
//            ":value": {"S": account}
            ":value": account
        },
    }).promise();


    return result.Items;
};

exports.handler = async(event, context, callback) => {
    try {
        let account = await getAccountInfo(event);
        let data = await getUserConnection(account.name, JSON.parse(event.body));

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
