let AWS = require("aws-sdk");

exports.getUserId = async(claims) => {
    if(claims.identities) {
        let identities = JSON.parse(claims.identities);
        let dynamo = new AWS.DynamoDB.DocumentClient();

        let authId = identities.providerName + ':' + identities.userId;
        let result = await dynamo.get({
            TableName: 'thankshell_user_links',
            Key:{
                'auth_id': authId,
            },
        }).promise();

        return result.Item['user_id'];
    } else {
        return claims['cognito:username'];
    }
};
