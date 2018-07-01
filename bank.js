"use strict";

function getTimeString(timestamp) {
    let d = new Date(1529478245926);
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
        case 'Unauthorized': '認証エラー'
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

controller.loadTransactions = function(token) {
    $.ajax({
        url: '../account/' + this.account,
        type: 'get',
        headers: {
            Authorization: this.session.idToken.jwtToken
        }
    }).done(data => {
        $("#carried").text(data.carried);
        $('#history').empty()
        data.history.Items.forEach(record => {
            $('<tr>')
                .append($('<th scope="row" class="text-right">').text(record.transaction_id))
                .append($('<td>').text(getTimeString(record.timestamp)))
                .append($('<td>').text(record.from_account))
                .append($('<td>').text(record.to_account))
                .append($('<td class="text-right">').text(record.amount.toLocaleString()))
                .appendTo('#history')
        });
    }).fail((xhr, textStatus, errorThrown) => {
        $('#history-message').text('ERROR: ' + getErrorMessage(xhr));
    })
};

controller.sendSelan = function() {
    let data = {};
    $('#send-selan').find('input').each((index, input) => {
        if(input.name){
            data[input.name] = input.value;
        }
    });
    data['from_account'] = this.account;
    
    $('#send-selan-message').text('送金中');
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
        $('#send-selan-message').text('送金が完了しました');
    }).fail((xhr, textStatus, errorThrown) => {
        $('#send-selan-message').text('ERROR: ' + getErrorMessage(xhr));
    })
}
