var AWS = require("aws-sdk");
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

function responseError(errCode, data, callback){
    var response = {
        statusCode: errCode,
        headers: {},
        body: JSON.stringify({"message": data.message, "name": data.name})
    };
    callback(null, response);
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
        let account = event.pathParameters.account;

        if(!event.requestContext) {
            throw new Error("ログインしてください");
        }

        let claims = event.requestContext.authorizer.claims;
        let adminMode = account === 'sla_bank';

        if (!account) {
            throw new Error("アカウントの取得に失敗しました");
        }

        if(adminMode) {
            if(!await isAdmin(claims['cognito:username'])) {
                throw new Error("アクセス権限がありません");
            }

            if(reservedAccounts.indexOf(account) === -1) {
                let fromUser = await cognito.adminGetUser({
                    UserPoolId: poolId,
                    Username: account
                }).promise();
        
                if (!fromUser.Enabled) {
                    throw new Error("アカウントが無効です");
                }
            }
        }

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

        for (let blockId=maxBlockId; blockId >= 0; --blockId) {
            let params;
            if(adminMode) {
                params = {
                    TableName: "remittance_transactions",
                    KeyConditionExpression: "block_id = :block",
                    ExpressionAttributeValues: {
                        ":block": blockId
                    }
                };
            } else {
                params = {
                    TableName: "remittance_transactions",
                    KeyConditionExpression: "block_id = :block",
                    FilterExpression: "from_account = :account or to_account = :account",
                    ExpressionAttributeValues: {
                        ":block": blockId,
                        ":account": account
                    }
                };
            }

            var data = await dynamo.query(params).promise();
            history.Items = history.Items.concat(data.Items);
            history.Count += data.Count;
        }

        let retData = {
            history: history,
            carried: 0
        };

        if(adminMode) {
            retData.bank = {
                published: 0,
                currency: 0,
                account: {}
            };
        }

        const publishAccount = "--";
        history.Items.forEach((item) => {
            if(isFinite(item.amount)) {
                if(item.from_account == account) {
                    retData.carried -= item.amount;
                }
                if(item.to_account == account) {
                    retData.carried += item.amount;
                }

                if(adminMode) {
                    switch(item.from_account) {
                        case 'sla_bank':
                            break;
                        case publishAccount:
                            retData.bank.published += item.amount;
                            break;
                        default:
                            if(!retData.bank.account[item.from_account]) {
                                retData.bank.account[item.from_account] = 0;
                            }
                            retData.bank.account[item.from_account] -= item.amount;
                            break;
                    }

                    switch(item.to_account) {
                        case 'sla_bank':
                            break;
                        case publishAccount:
                            retData.bank.published -= item.amount;
                            break;
                        default:
                            if(!retData.bank.account[item.to_account]) {
                                retData.bank.account[item.to_account] = 0;
                            }
                            retData.bank.account[item.to_account] += item.amount;
                            break;
                    }
                }
            }
        });
        responseSuccess(retData, callback);
    } catch(err) {
        responseError(500, err, callback);
    }
};
