var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();
var cognito = new AWS.CognitoIdentityServiceProvider({
    apiVersion: '2016-04-18',
    region: 'ap-northeast-1'
});

function responseSuccess(data, callback){
    var response = {
        statusCode: 200,
        headers: {},
        body: JSON.stringify(data)
    };
    callback(null, response);
}

function responseError(errCode, message, callback){
    var response = {
        statusCode: errCode,
        headers: {},
        body: JSON.stringify({"message": message})
    };
    callback(null, response);
}

async function getCarried(account) {
    var maxBlockId = Math.floor((await dynamo.get({
        TableName: 'table_info',
        Key:{
            'name': 'remittance_transactions',
        }
    }).promise()).Item.current_id_sequence / 1000);

    // Get History
    var history = {
        Count: 0,
        Items: []
    };

    for (var blockId=maxBlockId; blockId >= 0; --blockId) {
        var data = await dynamo.query({
            TableName: "remittance_transactions",
            KeyConditionExpression: "block_id = :block",
            FilterExpression: "from_account = :account or to_account = :account",
            ExpressionAttributeValues: {
                ":block": blockId,
                ":account": account
            }
        }).promise();
        history.Items = history.Items.concat(data.Items);
        history.Count += data.Count;
    }

    // Get Carried
    var carried = 0;
    history.Items.forEach(function(data) {
        if(isFinite(data.amount)) {
            if(data.from_account == account) {
                carried -= data.amount;
            }
            else if(data.to_account == account) {
                carried += data.amount;
            }
        }
    }, carried);

    return carried;
}

async function isAdmin(user) {
    let ctrlUser = await cognito.adminListGroupsForUser({
        UserPoolId: poolId,
        Username: user
    }).promise();

    let adminFlag = false;
    ctrlUser.Groups.forEach(value => {
        if (value.GroupName === 'admin') adminFlag = true;
    }, adminFlag);

    return adminFlag;
}
const reservedAccounts = ['sla_bank', '--'];
const poolId = 'ap-northeast-1_WEGpvJz9M';

exports.handler = async(event, context, callback) => {
    try {
        let date = +(new Date());
        let args = JSON.parse(event.body);
        let claims = event.requestContext.authorizer.claims;
        let amount = parseInt(args.amount, 10);
        let comment = args.comment ? args.comment : '';

        if(comment.length > 200) {
            throw new Error("コメントが200文字を超えています");
        }

        // Check send from
        if(args.from_account !== claims['cognito:username']) {
            if(!await isAdmin(claims['cognito:username'])) {
                throw new Error("この取引を発行する権限がありません");
            }
            if(reservedAccounts.indexOf(args.from_account) === -1) {
                let fromUser = await cognito.adminGetUser({
                    UserPoolId: poolId,
                    Username: args.from_account
                }).promise();
        
                if (!fromUser.Enabled) {
                    throw new Error("送金元アカウントが無効です");
                }
            }
        }

        // Check send to
        if(reservedAccounts.indexOf(args.to_account) === -1) {
            let toUser = await cognito.adminGetUser({
                UserPoolId: poolId,
                Username: args.to_account
            }).promise();
            if (!toUser.Enabled) {
                throw new Error("送金先アカウントが無効です");
            }
        }
        if (args.from_account === args.to_account) {
            throw new Error("自分自身に送金しています");
        }

        // Check amount
        if (isNaN(amount) || amount <= 0) {
            throw new Error("illigal amount: " + JSON.stringify(args));
        }

        // check carried
        if (args.from_account !== '--') {
            if (await getCarried(args.from_account) < amount) {
                throw new Error("所持金が不足しています");
            }
        }

        // main process
        let data = await dynamo.update({
            TableName: 'table_info',
            Key:{
                'name': 'remittance_transactions',
            },
            UpdateExpression: "set current_id_sequence = current_id_sequence + :val",
            ExpressionAttributeValues:{
                ":val":1
            },
            ReturnValues:"UPDATED_NEW"
        }).promise();

        await dynamo.put({
            TableName: "remittance_transactions",
            Item: {
                "block_id": Math.floor(data.Attributes.current_id_sequence / 1000),
                "transaction_id": data.Attributes.current_id_sequence,
                "from_account": args.from_account,
                "to_account": args.to_account,
                "type": "selan",
                "amount": amount,
                "timestamp": date,
                "comment": comment
            }
        }).promise();

        responseSuccess("Success", callback);
    } catch(err) {
        responseError(500, err.message, callback);
    }
};

