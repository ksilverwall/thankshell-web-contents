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

let getTransactions = async(userId, pathParameters, requestBody) => {
    let dynamo = new AWS.DynamoDB.DocumentClient();

    let history = await getHistory(dynamo, userId, false);
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
