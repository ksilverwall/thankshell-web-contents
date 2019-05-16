$('#logoutButton').click(()=>(new SessionController()).close());

let publish = async() => {
    let session = await (new SessionController()).getSession();

    let data = {};
    $('#publish').find('input').each((index, input) => {
        if(input.name){
            data[input.name] = input.value;
        }
    });
    data['from_account'] = '--';
    data['to_account'] = 'sla_bank';

    $('#publish-message').text('発行中');

    try {
        await (new ThankshellApi(session)).publish('sla_bank', data['amount']);
        $('#publish-message').text('発行しました');
        location.reload();
    } catch(e) {
        $('#publish-message').text('ERROR: ' + e.message);
    }
};

let sendSelan = async() => {
    let session = await (new SessionController()).getSession();
    if($('#send-selan-button').prop("disabled")) {
        return;
    }

    let api = new ThankshellApi(session);
    let userInfo = await api.getUser();

    let data = {};
    $('#send-selan').find('input').each((index, input) => {
        if(input.name){
            data[input.name] = input.value;
        }
    });
    data['from'] = 'sla_bank';

    $('#send-selan-button').prop("disabled", true);
    $('#send-selan-button').addClass("disabled");
    $('#send-selan-message').text('送金中');

    try {
        await api.createTransaction(data);
        $('#send-selan-message').text('送金が完了しました');
    } catch(e) {
        $('#send-selan-message').text('ERROR: ' + e.message);
    }

    $('#send-selan-button').prop("disabled", false);
    $('#send-selan-button').removeClass("disabled");
};

let acceptRequest = async(userId, amount) => {
    let session = await (new SessionController()).getSession();
    let api = new ThankshellApi(session);

    let holdersInfo = await api.getHoldings();
    let holding = holdersInfo['sla_bank'];
    if (holding < amount) {
        $('#request-message').text("銀行残高が不足しています");
        return;
    }

    await api.acceptGroupJoinRequest('sla', userId);
    await api.createTransaction({
        from: 'sla_bank',
        to: userId,
        amount: amount,
    });
    location.reload();
}

class RequestTable {
    constructor(requests) {
        console.log(requests);
        $('#request-list').empty();
        let table = $('#request-info').DataTable();
        for (let index=0; index < requests.length; index++) {
            table.row.add( [
                requests[index],
                this.getButtonTag(requests[index]),
            ]).draw();
        };
    }
    getButtonTag(userId) {
        let jscode = "acceptRequest('" + userId + "', 10000)";
        return '<button class="btn btn-primary" type="button" onclick="' + jscode + '">承認する</button>';
    }
}

(async()=>{
    let session = await (new SessionController()).getSession();
    let api = new ThankshellApi(session);
    let userInfo = await api.getUser();

    if(userInfo.status == 'UNREGISTERED') {
        location.href = '/user/register';
        return;
    }

    $("#user-name").text(userInfo.user_id ? userInfo.user_id : '---');

    let groupInfo = await api.getGroup('sla');
    if (groupInfo.getAdmins().includes(userInfo.user_id)) {
        $("#loading-view").hide();
        $("#admin-view").show();

        let published = await api.getPublished();
        let holdersInfo = await api.getHoldings();
        let holding = holdersInfo['sla_bank'];

        $("#published").text(published.toLocaleString());
        $("#carried").text(holding.toLocaleString());
        $("#currency").text((published - holding).toLocaleString());

        // carried list
        $('#carried-list').empty();
        let table = $('#account-info').DataTable();
        for(let holder in holdersInfo) {
            if(holdersInfo[holder]) {
                table.row.add( [
                    holder,
                    '--',
                    holdersInfo[holder],
                ]).draw();
            }
        };

        let requestTable = new RequestTable(groupInfo.getRequests());

        // history list
        try {
            let history = await api.loadAllTransactions();

            $('#history').empty();
            history.forEach(record => {
                $('<tr>')
                    .append($('<th scope="row" class="text-right">').text(record.transaction_id))
                    .append($('<td>').text(getTimeString(record.timestamp)))
                    .append($('<td>').text(record.from_account))
                    .append($('<td>').text(record.to_account))
                    .append($('<td class="text-right">').text(record.amount.toLocaleString()))
                    .append($('<td class="text-left">').text(record.comment ? record.comment : ''))
                    .appendTo('#history');
            });
        } catch(e) {
            $('#history-message').text('ERROR: ' + e.message);
        }

        $('#publish-button').click(function(){ publish(); });
        $('#send-selan-button').click(function() { sendSelan(); });
    } else {
        $("#loading-view").hide();
        $("#visitor-view").show();
    }

    console.log(userInfo);
})();
