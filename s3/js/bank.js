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
        case 'User does not exist.':
            return '送信先アカウント名が見つかりませんでした';
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
