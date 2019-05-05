$('#logoutButton').click(()=>(new SessionController()).close());

let publish = async() => {
    (new SessionController()).get(async(session) => {
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
            let response = await fetch('https://api.thankshell.com/dev/token/selan/published', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    Authorization: session.idToken.jwtToken
                },
                body: JSON.stringify({
                    to: 'sla_bank',
                    amount: data['amount'],
                }),
            });
            $('#publish-message').text('発行しました');
        } catch(e) {
            $('#publish-message').text('ERROR: ' + e.message);
        }
    });
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
        data['from'] = 'sla_bank';

        $('#send-selan-button').prop("disabled", true);
        $('#send-selan-button').addClass("disabled");
        $('#send-selan-message').text('送金中');

        try {
            await createTransaction(data, session);
            // FIXME
            await loadTransactions(session);
            $('#send-selan-message').text('送金が完了しました');
        } catch(e) {
            $('#send-selan-message').text('ERROR: ' + e.message);
        }

        $('#send-selan-button').prop("disabled", false);
        $('#send-selan-button').removeClass("disabled");
    });
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
    let response = await fetch('https://api.thankshell.com/dev/token/selan/holders', {
        method: "GET",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: session.idToken.jwtToken
        },
    });

    return await response.json();
};

let getPublished = async(session) => {
    let response1 = await fetch('https://api.thankshell.com/dev/token/selan/published', {
        method: "GET",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: session.idToken.jwtToken
        },
    });

    return published = await response1.json();
};

let getCarriedList = async(userId, session) => {
    let response2 = await fetch('https://api.thankshell.com/dev/token/selan/transactions', {
        method: "GET",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: session.idToken.jwtToken
        },
    });
    let data = await response2.json();

    //return data.bank.account;
    return null;

};

let loadTransactions = async(userId, session) => {
    let response = await fetch('https://api.thankshell.com/dev/token/selan/transactions', {
        method: "GET",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: session.idToken.jwtToken
        },
    });

    let data = await response.json();

    if (response.status != 200) {
        throw new Error(response.status + ":" + data.message);
    }

    return data.history.Items;
};


class GroupInfo {
    constructor(data) {
        this.data = data;
    }

    getAdmins() {
        if (!this.data.admins) {
            return [];
        }

        return this.data.admins.values;
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
    }

    async acceptGroupJoinRequest(groupName, userId) {
        let response = await fetch('https://api.thankshell.com/dev/groups/' + groupName + '/members/' + userId, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: this.session.idToken.jwtToken
            },
        });
        let data = await response.json();
        console.log(data);
    }
}

let acceptRequest = async(userId) => {
    let session = await (new SessionController()).getSession();
    await (new ThankshellApi(session)).acceptGroupJoinRequest('sla', userId);
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
        let jscode = "acceptRequest('" + userId + "')";
        return '<button class="btn btn-primary" type="button" onclick="' + jscode + '">承認する</button>';
    }
}


(async()=>{
    let session = await (new SessionController()).getSession();
    let response = await fetch('https://api.thankshell.com/dev/user/', {
        method: "GET",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: session.idToken.jwtToken
        },
    });

    let userInfo = await response.json();
    if(userInfo.status == 'UNREGISTERED') {
        location.href = '/user/register';
        return;
    }

    $("#user-name").text(userInfo.user_id ? userInfo.user_id : '---');

    let groupInfo = await (new ThankshellApi(session)).getGroup('sla');
    if (groupInfo.getAdmins().includes(userInfo.user_id)) {
        $("#loading-view").hide();
        $("#admin-view").show();

        let published = await getPublished(session);
        let holdersInfo = await getHolding(userInfo.user_id, session);
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
            let history = await loadTransactions('sla_bank', session);

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
