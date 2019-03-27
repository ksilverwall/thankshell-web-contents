let AWS = require("aws-sdk");

let getUserId = async(identities) => {
    let dynamo = new AWS.DynamoDB.DocumentClient();

    let authId = identities.providerName + ':' + identities.userId;
    let result = await dynamo.get({
        TableName: 'thankshell_user_links',
        Key:{
            'auth_id': authId,
        },
    }).promise();

    return result.Item;
};

let getUserData = async(claims) => {
    let data;
    if(claims.identities) {
        // Facebook
        let parent = await getUserId(JSON.parse(claims.identities));
        if (parent) {
            data = {
                'code': 'SUCCESS',
                'name': parent['user_id'],
            };
        } else {
            data = {
                'code': 'NO_PARENT',
                'xxx': claims.identities,
            };
        }
    } else {
        data = {
            'code': 'SUCCESS',
            'name': claims['cognito:username'],
        };
    }

    return data;
};

exports.handler = async (event, context, callback) => {
    let claims = event.requestContext.authorizer.claims;

    let data = await getUserData(claims);

    return {
        statusCode: 200,
        headers: {"Access-Control-Allow-Origin": "*"},
        body: JSON.stringify(data),
    };
};
