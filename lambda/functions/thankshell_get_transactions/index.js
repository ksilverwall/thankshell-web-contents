let Auth = require('thankshell-libs/auth.js');
let AWS = require("aws-sdk");

async function getHistory(dynamo, account, adminMode) {
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

async function getAllAccounts(cognito, poolId) {
    let accountInfo = await cognito.listUsers({
        UserPoolId: poolId,
    }).promise();

    let allAccounts = accountInfo.Users;

    let paginationToken = accountInfo.PaginationToken;
    while (paginationToken) {
        let users2 = await cognito.listUsers({
            UserPoolId: poolId,
            PaginationToken: paginationToken,
        }).promise();
        allAccounts = allAccounts.concat(users2.Users);
        paginationToken = users2.PaginationToken;
    }

    return allAccounts;
}

let getTransactions = async(userId, event) => {
    let cognito = new AWS.CognitoIdentityServiceProvider({
        apiVersion: '2016-04-18',
        region: 'ap-northeast-1'
    });
    let dynamo = new AWS.DynamoDB.DocumentClient();

    if(!event.requestContext) {
        throw new Error("ログインしてください");
    }

    let claims = event.requestContext.authorizer.claims;
    let adminMode = (userId === 'sla_bank' && claims['cognito:groups'] && claims['cognito:groups'].indexOf('admin') !== -1);

    if (!userId) {
        throw new Error("アカウントの取得に失敗しました");
    }

    if(!adminMode && userId !== claims['cognito:username']) {
        throw new Error("アクセス権限がありません");
    }

    const publishAccount = "--";
    const reservedAccounts = ['sla_bank', publishAccount];
    if(adminMode && reservedAccounts.indexOf(userId) === -1) {
        let fromUser = await cognito.adminGetUser({
            UserPoolId: poolId,
            Username: userId
        }).promise();

        if (!fromUser.Enabled) {
            throw new Error("アカウントが無効です");
        }
    }

    let history = await getHistory(dynamo, userId, adminMode);

    let retData = {
        history: history,
        carried: 0
    };

    const poolId = 'ap-northeast-1_WEGpvJz9M';
    if(adminMode) {
        let allAccounts = await getAllAccounts(cognito, poolId);

        retData.bank = {
            published: 0,
            currency: 0,
            account: {}
        };

        allAccounts.forEach(userAccount => {
            retData.bank.account[userAccount.Username] = {
                amount: 0,
                accountStatus: userAccount.Enabled ? userAccount.UserStatus : 'DISABLED'
            };
        }, retData);
        retData.bank.accountNum = allAccounts.length;
    }

    history.Items.forEach((item) => {
        if(isFinite(item.amount)) {
            if(item.from_account == userId) {
                retData.carried -= item.amount;
            }
            if(item.to_account == userId) {
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
                        retData.bank.account[item.from_account].amount -= item.amount;
                        break;
                }

                switch(item.to_account) {
                    case 'sla_bank':
                        break;
                    case publishAccount:
                        retData.bank.published -= item.amount;
                        break;
                    default:
                        retData.bank.account[item.to_account].amount += item.amount;
                        break;
                }
            }
        }
    });

    return retData;
};

let getHandler = mainProcess => {
    return async(event, context, callback) => {
        let statusCode = 200;
        let data;

        try {
            let userId = await Auth.getUserId(event.requestContext.authorizer.claims);
            if (userId) {
                statusCode = 200;
                data = await mainProcess(userId, event);
            } else {
                statusCode = 403;
                data = {
                    "message": "user id not found",
                };
            }
        } catch(err) {
            console.log(err);

            statusCode = 500;
            data = {
                'message': err.message,
            };
        }

        return {
            statusCode: statusCode,
            headers: {"Access-Control-Allow-Origin": "*"},
            body: JSON.stringify(data),
        };
    };
};

exports.handler = getHandler(getTransactions);
