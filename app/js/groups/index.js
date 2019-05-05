$('#groupManagerButton').click(()=>{location.href='/groups/sla/admin';});

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
    data['from'] = userInfo.user_id;
    
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

(async() => {
    let session = await (new SessionController()).getSession();
    let api = new ThankshellApi(session);
    let userInfo = await api.getUser();

    if(userInfo.status == 'UNREGISTERED') {
        location.href = '/user/register';
        return;
    }

    $("#user-name").text(userInfo.user_id ? userInfo.user_id : '---');

    let groupInfo = await (new ThankshellApi(session)).getGroup('sla');
    if (groupInfo.getMembers().includes(userInfo.user_id)) {
        $("#loading-view").hide();
        $("#member-view").show();

        let holding = await api.getHolding(userInfo.user_id);
        $("#carried").text(holding.toLocaleString());

        try {
            let history = await api.loadTransactions(userInfo.user_id);

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
            $('#history-message').text('ERROR: ' + getErrorMessage(e));
        }
        $('#send-selan-button').click(() => { sendSelan(); });
    } else {
        $("#loading-view").hide();
        $("#visitor-view").show();
        if (groupInfo.getRequests().includes(userInfo.user_id)) {
            $("#visitor-text").text("参加リクエスト中です");
            $("#request-button").text("参加リクエストを取り消す");
            $("#request-button").click(async() => {
                $("#request-button").prop("disabled",true);
                let session = await (new SessionController()).getSession();
                let groupInfo = await (new ThankshellApi(session)).cancelGroupJoinRequest('sla', userInfo.user_id);
                location.reload();
            });
        } else {
            $("#visitor-text").text("このグループに参加していません");
            $("#request-button").text("参加リクエストを送る");
            $("#request-button").click(async() => {
                $("#request-button").prop("disabled",true);
                let session = await (new SessionController()).getSession();
                let groupInfo = await (new ThankshellApi(session)).sendGroupJoinRequest('sla', userInfo.user_id);
                location.reload();
            });
        }
    }

    console.log(userInfo);
})();
