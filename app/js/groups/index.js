$('#groupManagerButton').click(()=>{location.href='/groups/sla/admin';});

$("#send-token-button").click(() => {
    $("#send-token-modal").fadeIn();
});

$('#send-token-commit-button').click(async() => {
    $("#send-token-modal").fadeOut();

    let session = await (new SessionController()).getSession();
    if($('#send-token-commit-button').prop("disabled")) {
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
    
    $('#send-token-button').prop("disabled", true);
    $('#send-token-button').addClass("disabled");
    $('#send-selan-message').text('送金中');

    try {
        await api.createTransaction(data);
        $('#send-selan-message').text('送金が完了しました');
    } catch(e) {
        $('#send-selan-message').text('ERROR: ' + e.message);
    }

    $('#send-token-button').prop("disabled", false);
    $('#send-token-button').removeClass("disabled");
});

$('#send-token-cancel-button').click(() => {
    $("#send-selan")[0].reset();
    $("#send-token-modal").fadeOut();
});

class HistoryListTag {
    constructor(history, userId) {
        this.tableTag = $('<dl>').addClass('transaction-history-list');
        history.sort((a, b) => { return b.timestamp - a.timestamp; }).forEach(record => {
            let partner;
            let amount;
            let amountClass;

            if (record.to_account == userId) {
                partner = record.from_account;
                amount = '+' + record.amount.toLocaleString()
                amountClass = 'transaction-amount-in';
            } else {
                partner = record.to_account;
                amount = '-' + record.amount.toLocaleString();
                amountClass = 'transaction-amount-out';
            }

            let tableBody = $('<tbody>').append(
                $('<tr>').append($('<td colspan="2">').addClass('transaction-datetime').text(getTimeString(record.timestamp)))
            ).append(
                $('<tr>')
                    .append($('<td>').addClass('transaction-partner').text(partner))
                    .append($('<td>').addClass(amountClass).text(amount))
            );

            if (record.comment) {
                tableBody.append($('<tr>').append($('<td colspan="2">').addClass('transaction-message').text(record.comment)))
            }

            this.tableTag.append(
                $('<dt>').append(
                    $('<table>').append(tableBody)
                )
            );
        });
    }

    renderTo(target) {
        this.tableTag.appendTo(target);
    }
}

class HistoryTableTag {
    constructor(history, userId) {
        let tableHeadTag = $('<thead>')
            .append($('<th scope="col">').text('取引日時'))
            .append($('<th scope="col">').text('FROM'))
            .append($('<th scope="col">').text('TO'))
            .append($('<th scope="col" class="text-right">').text('金額(selan)'))
            .append($('<th scope="col" class="text-left">').text('コメント'))
            ;

        let tableBodyTag = $('<tbody>');
        history.sort((a, b) => { return b.timestamp - a.timestamp; }).forEach(record => {
            $('<tr>')
                .append($('<td>').text(getTimeString(record.timestamp)))
                .append($('<td>').text(record.from_account))
                .append($('<td>').text(record.to_account))
                .append($('<td class="text-right">').text(record.amount.toLocaleString()))
                .append($('<td class="text-left">').text(record.comment ? record.comment : ''))
                .appendTo(tableBodyTag);
        });

        this.tableTag= $('<table>').addClass('table');
        this.tableTag.append(tableHeadTag);
        this.tableTag.append(tableBodyTag);
    }

    renderTo(target) {
        this.tableTag.appendTo(target);
    }
}

class TransactionLogSectionTag {
    async render(api, userInfo) {
        try {
            let history = await api.loadTransactions(userInfo.user_id);
            if($(window).width() > 600) {
                (new HistoryTableTag(history, userInfo.user_id)).renderTo($('.transaction-log'));
            } else {
                (new HistoryListTag(history, userInfo.user_id)).renderTo($('.transaction-log'));
            }
        } catch(e) {
            $('#history-message').text('ERROR: ' + e.message);
        }
    }
}

class MainTag {
    async render() {
        let session = await (new SessionController()).getSession();
        if (!session) {
            $("#load-message").text("セッションの読み込みに失敗しました。再読込してください")
            return;
        }

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

            let section = new TransactionLogSectionTag();
            section.render(api, userInfo);
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
    }
}

(new MainTag()).render();
