"use strict";

function getTimeString(timestamp) {
    let d = new Date(timestamp);
    let year  = d.getFullYear();
    let month = d.getMonth() + 1;
    let day   = d.getDate();
    let hour  = ( d.getHours()   < 10 ) ? '0' + d.getHours()   : d.getHours();
    let min   = ( d.getMinutes() < 10 ) ? '0' + d.getMinutes() : d.getMinutes();
    let sec   = ( d.getSeconds() < 10 ) ? '0' + d.getSeconds() : d.getSeconds();

    return ( year + '年' + month + '月' + day + '日' + hour + ':' + min + ':' + sec );
}

function getErrorMessage(xhr) {
    if(xhr.responseJSON && xhr.responseJSON.message) {
        switch (xhr.responseJSON.message) {
        case 'Unauthorized':
            return '認証エラー';
        case 'The incoming token has expired':
            return 'ログインセッションがタイムアウトしました。再ログインしてください。';
        default:
            return xhr.responseJSON.message;
        }
    } else {
        return '取得中に不明なエラーが発生しました！';
    }
}


let controller = {
    account: null,
    session: null, 
};

function getAccountStatusString(s) {
    if(!s) { return '取得失敗' }

    switch(s) {
    case 'CONFIRMED': return '有効';
    case 'DISABLED': return '停止中';
    case 'FORCE_CHANGE_PASSWORD': return '仮パスワードの入力待ち';
    case 'RESET_REQUIRED': return 'パスワード変更待ち（一括登録）';
    default: return '不明な状態:' + s;
    }
}

controller.loadTransactions = function(token) {
    $.ajax({
        url: '../account/' + this.account,
        type: 'get',
        headers: {
            Authorization: this.session.idToken.jwtToken
        }
    }).done(data => {
        $("#carried").text(data.carried.toLocaleString());
        $('#history').empty();
        data.history.Items.forEach(record => {
            $('<tr>')
                .append($('<th scope="row" class="text-right">').text(record.transaction_id))
                .append($('<td>').text(getTimeString(record.timestamp)))
                .append($('<td>').text(record.from_account))
                .append($('<td>').text(record.to_account))
                .append($('<td class="text-right">').text(record.amount.toLocaleString()))
                .append($('<td class="text-left">').text(record.comment ? record.comment : ''))
                .appendTo('#history');
        });

        if(data.bank) {
            $("#published").text(data.bank.published.toLocaleString());
            $("#currency").text((data.bank.published - data.carried).toLocaleString());
            $('#carried-list').empty();

            let table = $('#account-info').DataTable();
            for(let key in data.bank.account) {
                if(data.bank.account[key].amount) {
                    table.row.add( [
                        key,
                        getAccountStatusString(data.bank.account[key].accountStatus),
                        data.bank.account[key].amount ? data.bank.account[key].amount.toLocaleString() : 'ERROR',
                    ]).draw();
                }
            };
        }
    }).fail((xhr, textStatus, errorThrown) => {
        $('#history-message').text('ERROR: ' + getErrorMessage(xhr));
    })
};


controller.createTransaction = function(data, callback) {
    $.ajax({
        url: '../transaction',
        type: 'post',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify(data),
        timeout: 10000,
        headers: {
            Authorization: this.session.idToken.jwtToken
        }
    }).done(data => {
        this.loadTransactions();
        callback(null);
    }).fail((xhr, textStatus, errorThrown) => {
        callback(getErrorMessage(xhr));
    })

}

controller.publish = function() {
    let data = {};
    $('#publish').find('input').each((index, input) => {
        if(input.name){
            data[input.name] = input.value;
        }
    });
    data['from_account'] = '--';
    data['to_account'] = 'sla_bank';
    
    $('#publish-message').text('発行中');
    this.createTransaction(data, (err, data) => {
        if(err) {
            $('#publish-message').text('ERROR: ' + err);
        } else {
            $('#publish-message').text('発行しました');
        }
    });
}

controller.sendSelan = function() {
    if($('#send-selan-button').prop("disabled")) {
        return;
    }

    let data = {};
    $('#send-selan').find('input').each((index, input) => {
        if(input.name){
            data[input.name] = input.value;
        }
    });
    data['from_account'] = this.account;
    
    $('#send-selan-button').prop("disabled", true);
    $('#send-selan-button').addClass("disabled");
    $('#send-selan-message').text('送金中');
    this.createTransaction(data, (err, data) => {
        $('#send-selan-button').prop("disabled", false);
        $('#send-selan-button').removeClass("disabled");
        if(err) {
            $('#send-selan-message').text('ERROR: ' + err);
        } else {
            $('#send-selan-message').text('送金が完了しました');
        }
    });
}

controller.importTransaction = function(csvFile) {
    $('#send-selan-message').text('インポート中');

    Promise.all(csvFile.split('\n').map(record => {
        return new Promise((resolve, reject) => { 
            let csv = record.split(',');
            if (!csv || csv.length !== 3) {
                resolve();
            }

            let data = {
                'from_account': csv[0],
                'to_account': csv[1],
                'amount': csv[2],
            }

            this.createTransaction(data, (err, data) => {
                if(err) {
                    console.log('ERROR: ' + err);
                    resolve();
                } else {
                    resolve();
                }
            });
        });
    }))
    .then(function() {
        $('#send-selan-message').text('送金が完了しました');
    });
}
