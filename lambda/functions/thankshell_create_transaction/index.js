let Auth = require('thankshell-libs/auth.js');
let AWS = require("aws-sdk");

async function getCarried(account, dynamo) {
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
    //FIXME Check by database info
    if (user == 'Mao' || user == 'ksilverwall') {
        return true;
    }

    return false;
}

class AccountManager {
    constructor(){
        this.poolId = 'ap-northeast-1_A6SNCzbmM';
        this.cognito = new AWS.CognitoIdentityServiceProvider({
            apiVersion: '2016-04-18',
            region: 'ap-northeast-1'
        });
    }

    async isExists(username) {
        if (!username) {
            return false;
        }

        let user = await this.cognito.adminGetUser({
            UserPoolId: this.poolId,
            Username: username
        }).promise();

        return user.Enabled;
    }
}

let createTransaction = async(username, pathParameter, event) => {
    let dynamo = new AWS.DynamoDB.DocumentClient();
    let accountManager = new AccountManager();

    const reservedAccounts = ['sla_bank', '--'];
    
    let date = +(new Date());
    let args = JSON.parse(event.body);
    let amount = parseInt(args.amount, 10);
    let comment = args.comment ? args.comment : ' ';

    if(comment.length > 200) {
        throw new Error("コメントが200文字を超えています");
    }

    if(args.from_account !== username) {
        if(!await isAdmin(username)) {
            throw new Error("この取引を発行する権限がありません");
        }

        if(reservedAccounts.indexOf(args.from_account) === -1) {
            if (!(await accountManager.isExists(args.from_account))) {
                throw new Error("送金元アカウントが無効です");
            }
        }
    }

    if(reservedAccounts.indexOf(args.to_account) === -1) {
        if (!(await accountManager.isExists(args.to_account))) {
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
        if (await getCarried(args.from_account, dynamo) < amount) {
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
};

exports.handler = Auth.getHandler(createTransaction);
