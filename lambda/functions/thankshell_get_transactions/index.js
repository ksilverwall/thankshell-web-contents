let AWS = require("aws-sdk");

let getAccountInfo = async(event) => {
    let lambda = new AWS.Lambda();

    let response = await lambda.invoke({
        FunctionName: 'thankshell_get_user_info',
        InvocationType: "RequestResponse",
        Payload: JSON.stringify(event)
    }).promise();

    return JSON.parse(JSON.parse(response.Payload).body);
};

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

let getTransactions = async(event, account) => {
    let cognito = new AWS.CognitoIdentityServiceProvider({
        apiVersion: '2016-04-18',
        region: 'ap-northeast-1'
    });
    let dynamo = new AWS.DynamoDB.DocumentClient();

    if(!event.requestContext) {
        throw new Error("ログインしてください");
    }

    let claims = event.requestContext.authorizer.claims;
    let adminMode = (account === 'sla_bank' && claims['cognito:groups'] && claims['cognito:groups'].indexOf('admin') !== -1);

    if (!account) {
        throw new Error("アカウントの取得に失敗しました");
    }

    if(!adminMode && account !== claims['cognito:username']) {
        throw new Error("アクセス権限がありません");
    }

    const publishAccount = "--";
    const reservedAccounts = ['sla_bank', publishAccount];
    if(adminMode && reservedAccounts.indexOf(account) === -1) {
        let fromUser = await cognito.adminGetUser({
            UserPoolId: poolId,
            Username: account
        }).promise();

        if (!fromUser.Enabled) {
            throw new Error("アカウントが無効です");
        }
    }

    let history = await getHistory(dynamo, account, adminMode);

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
}

exports.handler = async(event, context, callback) => {
    try {
        let account = await getAccountInfo(event);
        let data = await getTransactions(event, account.name);

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
}
