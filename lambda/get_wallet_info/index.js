var AWS = require("aws-sdk");
var dynamo = new AWS.DynamoDB.DocumentClient();
var cognito = new AWS.CognitoIdentityServiceProvider({
    apiVersion: '2016-04-18',
    region: 'ap-northeast-1'
});

const poolId = 'ap-northeast-1_WEGpvJz9M';
const publishAccount = "--";
const reservedAccounts = ['sla_bank', publishAccount];

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

async function getHistory(account, adminMode) {
    let history = {
        Count: 0,
        Items: []
    };

    let maxBlockId = Math.floor((await dynamo.get({
        TableName: 'table_info',
        Key:{
            'name': 'remittance_transactions',
        }
    }).promise()).Item.current_id_sequence / 1000);

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

    return history;
}

async function getAllAccounts() {
    let users = await cognito.listUsers({
        UserPoolId: poolId,
    }).promise();

    return users.Users;
}

exports.handler = async(event, context, callback) => {
    try {
        let account = event.pathParameters.account;

        if(!event.requestContext) {
            throw new Error("ログインしてください");
        }

        let claims = event.requestContext.authorizer.claims;
        let adminMode = claims['cognito:groups'] && (claims['cognito:groups'].indexOf('admin') !== -1);

        if (!account) {
            throw new Error("アカウントの取得に失敗しました");
        }

        if(!adminMode && account !== claims['cognito:username']) {
            throw new Error("アクセス権限がありません");
        }

        if(adminMode && reservedAccounts.indexOf(account) === -1) {
            let fromUser = await cognito.adminGetUser({
                UserPoolId: poolId,
                Username: account
            }).promise();

            if (!fromUser.Enabled) {
                throw new Error("アカウントが無効です");
            }
        }

        let history = await getHistory(account, adminMode);

        let retData = {
            history: history,
            carried: 0
        };

        if(adminMode) {
            let allAccounts = await getAllAccounts();

            retData.bank = {
                published: 0,
                currency: 0,
                account: {}
            };

            allAccounts.forEach(userAccount => {
                retData.bank.account[userAccount.Username] = 0;
            }, retData);
        }

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
