let Auth = require('thankshell-libs/auth.js');
let AWS = require("aws-sdk");

async function getHistory(dynamo, account, stage) {
    let tableName = {
        'production': {
            'info': 'table_info',
            'data': 'remittance_transactions',
        },
        'develop': {
            'info': 'dev_table_info',
            'data': 'dev_remittance_transactions',
        },
    };

    let adminMode = account == null;

    let history = {
        Count: 0,
        Items: []
    };

    let tableInfo = await dynamo.get({
        TableName: tableName[stage]['info'],
        Key:{
            'name': tableName[stage]['data'],
        }
    }).promise();

    let maxBlockId = tableInfo.Item ? Math.floor(tableInfo.Item.current_id_sequence / 1000) : 0;

    for (let blockId=maxBlockId; blockId >= 0; --blockId) {
        let params;
        if(adminMode) {
            params = {
                TableName: tableName[stage]['data'],
                KeyConditionExpression: "block_id = :block",
                ExpressionAttributeValues: {
                    ":block": blockId
                }
            };
        } else {
            params = {
                TableName: tableName[stage]['data'],
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

let getTargetUserId = (event) => {
    if (event.multiValueQueryStringParameters && event.multiValueQueryStringParameters['user_id']) {
        return event.multiValueQueryStringParameters['user_id'][0];
    } else {
        return null;
    }
}

let getTransactions = async(userId, event) => {
    let dynamo = new AWS.DynamoDB.DocumentClient();

    let stage = event.requestContext.stage;

    let targetUser = getTargetUserId(event);
    let history = await getHistory(dynamo, targetUser, stage);

    let carried = 0;

    history.Items.forEach((item) => {
        if(isFinite(item.amount)) {
            if(item.from_account == userId) {
                carried -= item.amount;
            }
            if(item.to_account == userId) {
                carried += item.amount;
            }
        }
    });

    return {
        history: history,
        carried: carried
    };
};

exports.handler = Auth.getHandler(getTransactions);
