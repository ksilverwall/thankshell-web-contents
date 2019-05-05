$('#groupManagerButton').click(()=>{location.href='/groups/sla/admin';});

let sendRequest = () => {
    alert("本機能は未実装です");
};

let cancelRequest = () => {
    alert("本機能は未実装です");
};

let createTransaction = async(data, session) => {
    let response = await fetch('https://api.thankshell.com/dev/token/selan/transactions', {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: session.idToken.jwtToken
        },
        body: JSON.stringify(data),
    });

    if (response.status !== 200) {
        let data = await response.json();
        throw new Error(data.message);
    }
};

let getHolding = async(userId, session) => {
    let response = await fetch('https://api.thankshell.com/dev/token/selan/holders/' + userId, {
        method: "GET",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: session.idToken.jwtToken
        },
    });

    return await response.json();
};

let loadTransactions = async(userId, session) => {
    let response2 = await fetch('https://api.thankshell.com/dev/token/selan/transactions?user_id=' + userId, {
        method: "GET",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: session.idToken.jwtToken
        },
    });

    let data = await response2.json();
    let history = data.history.Items;

    return history;
};

let sendSelan = async() => {
    // TODO should be promise
    (new SessionController()).get(async(session) => {
        if($('#send-selan-button').prop("disabled")) {
            return;
        }

        let response = await fetch('https://api.thankshell.com/dev/user/', {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: session.idToken.jwtToken
            },
        });
        let userInfo = await response.json();

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
            await createTransaction(data, session);
            // FIXME
            await loadTransactions(userInfo.user_id, session);
            $('#send-selan-message').text('送金が完了しました');
        } catch(e) {
            $('#send-selan-message').text('ERROR: ' + e.message);
        }

        $('#send-selan-button').prop("disabled", false);
        $('#send-selan-button').removeClass("disabled");
    });
};

let getUserInfo = async(session) => {
    let response = await fetch('https://api.thankshell.com/dev/user/', {
        method: "GET",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: session.idToken.jwtToken
        },
    });

    return await response.json();
};

let isMember = async(session, userId) => {
    let response = await fetch('https://api.thankshell.com/dev/groups/sla', {
        method: "GET",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: session.idToken.jwtToken
        },
    });

    let data = await response.json();

    return data.member.values.includes(userId);
};


class GroupInfo {
    constructor(data) {
        this.data = data;
    }

    getMembers() {
        if (!this.data.members) {
            return [];
        }

        return this.data.members.values;
    }

    getRequests() {
        if (!this.data.requests) {
            return [];
        }

        return this.data.requests.values;
    }
}


class ThankshellApi {
    constructor(session) {
        this.session = session;
    }

    async getGroup(groupName) {
        let response = await fetch('https://api.thankshell.com/dev/groups/' + groupName, {
            method: "GET",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: this.session.idToken.jwtToken
            },
        });

        return new GroupInfo(await response.json());
    }

    async sendGroupJoinRequest(groupName, userId) {
        let response = await fetch('https://api.thankshell.com/dev/groups/' + groupName + '/requests/' + userId, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: this.session.idToken.jwtToken
            },
        });
        let data = await response.json();
    }

    async cancelGroupJoinRequest(groupName, userId) {
        let response = await fetch('https://api.thankshell.com/dev/groups/' + groupName + '/requests/' + userId, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: this.session.idToken.jwtToken
            },
        });
        let data = await response.json();
        console.log(data);
    }
}


(async() => {
    let session = await (new SessionController()).getSession();

    let userInfo = await getUserInfo(session);
    if(userInfo.status == 'UNREGISTERED') {
        location.href = '/user/register';
        return;
    }

    $("#user-name").text(userInfo.user_id ? userInfo.user_id : '---');

    let groupInfo = await (new ThankshellApi(session)).getGroup('sla');
    if (groupInfo.getMembers().includes(userInfo.user_id)) {
        $("#loading-view").hide();
        $("#member-view").show();

        let holding = await getHolding(userInfo.user_id, session);
        $("#carried").text(holding.toLocaleString());

        try {
            let history = await loadTransactions(userInfo.user_id, session);

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
