$("#send-token-button").click(() => {
    $("#send-token-modal").fadeIn();
});

class UserSendTokenModal {
    render(userId) {
        $("#send-token-from").text(userId);
        $('#send-token-commit-button').click(async() => {
            $("#send-token-modal").fadeOut();

            let session = await (new SessionController()).getSession();
            if($('#send-token-commit-button').prop("disabled")) {
                return;
            }

            let api = new ThankshellApi(session, getConfig().apiVersion);
            let userInfo = await api.getUser();

            let data = {};
            $('#send-selan').find('input').each((index, input) => {
                if(input.name){
                    data[input.name] = input.value;
                }
            });
            data['from'] = $("#send-token-from").text();
            
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
    }
}

class AdminSendTokenModal {
    render(userId) {
        $("#send-token-from").val(userId);
        $('#send-token-commit-button').click(async() => {
            $("#send-token-modal").fadeOut();

            let session = await (new SessionController()).getSession();
            if($('#send-token-commit-button').prop("disabled")) {
                return;
            }

            let api = new ThankshellApi(session, getConfig().apiVersion);
            let userInfo = await api.getUser();

            let data = {};
            $('#send-selan').find('input').each((index, input) => {
                if(input.name){
                    data[input.name] = input.value;
                }
            });
            data['from'] = $("#send-token-from").val();
            
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
    }
}

$('#groupManagerButton').click(()=>{location.href='/groups/sla/admin';});

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
        await (new ThankshellApi(session, getConfig().apiVersion)).publish('sla_bank', data['amount']);
        $('#publish-message').text('発行しました');
        location.reload();
    } catch(e) {
        $('#publish-message').text('ERROR: ' + e.message);
    }
};

let acceptRequest = async(userId, amount) => {
    let session = await (new SessionController()).getSession();
    let api = new ThankshellApi(session, getConfig().apiVersion);

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
};

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

class AllTransactionLogSectionTag {
    async render(api) {
        try {
            let history = await api.loadAllTransactions();
            (new HistoryTableTag(history, 'sla_bank')).renderTo($('.transaction-log'));
        } catch(e) {
            $('#history-message').text('ERROR: ' + e.message);
        }
    }
}

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

class MainTag {
    async renderIndexPage(api, userInfo) {
        await (new UserSendTokenModal()).render(userInfo.user_id)

        let groupInfo = await api.getGroup('sla');
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
                    let groupInfo = await (new ThankshellApi(session, getConfig().apiVersion)).cancelGroupJoinRequest('sla', userInfo.user_id);
                    location.reload();
                });
            } else {
                $("#visitor-text").text("このグループに参加していません");
                $("#request-button").text("参加リクエストを送る");
                $("#request-button").click(async() => {
                    $("#request-button").prop("disabled",true);
                    let session = await (new SessionController()).getSession();
                    let groupInfo = await (new ThankshellApi(session, getConfig().apiVersion)).sendGroupJoinRequest('sla', userInfo.user_id);
                    location.reload();
                });
            }
        }
    }

    async renderAdminPage(api, userInfo) {
        await (new AdminSendTokenModal()).render('sla_bank')

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

            let section = new AllTransactionLogSectionTag();
            section.render(api);

            $('#publish-button').click(function(){ publish(); });
        } else {
            $("#loading-view").hide();
            $("#visitor-view").show();
        }
    }

    async render(path) {
        try {
            let session = await (new SessionController()).getSession();
            if (!session) {
                $("#load-message").text("セッションの読み込みに失敗しました。再読込してください")
                return;
            }

            let api = new ThankshellApi(session, getConfig().apiVersion);
            let userInfo = await api.getUser();

            if(userInfo.status == 'UNREGISTERED') {
                location.href = '/user/register';
                return;
            }

            let pathInfo = path.split('/');
            if (pathInfo[1] == 'groups' && pathInfo[3] == 'admin') {
                this.renderAdminPage(api, userInfo);
            } else {
                this.renderIndexPage(api, userInfo);
            }
        } catch(e) {
            $("#load-message").text("ERROR:" + e.message);
        }
    }
}

(new MainTag()).render(location.pathname);
