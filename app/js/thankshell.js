'use strict'

let getConfig = () => {
    let mode = (document.domain == 'thankshell.com') ? 'production' : 'develop';
    if (mode == 'production') {
        let cognitoInfo = {
            ClientId : 'dodes0n9dnt7llvaq2od4mif4',
            AppWebDomain : 'auth2.thankshell.com',
            TokenScopesArray : ['profile', 'email', 'openid', 'aws.cognito.signin.user.admin', 'phone'],
            RedirectUriSignIn : 'https://thankshell.com/login/callback',
            RedirectUriSignOut : 'https://thankshell.com/',
        };

        return {
            apiVersion: 'v1',
            cognitoInfo: cognitoInfo,
            loginUrl: "https://" + cognitoInfo.AppWebDomain + "/login?response_type=code&client_id=" + cognitoInfo.ClientId + "&redirect_uri=" + cognitoInfo.RedirectUriSignIn,
        };
    } else {
        let cognitoInfo = {
            ClientId : '1rq85hp3c2pii4k294297b28ef',
            AppWebDomain : 'auth2.thankshell.com',
            TokenScopesArray : ['profile', 'email', 'openid', 'aws.cognito.signin.user.admin', 'phone'],
            RedirectUriSignIn : 'https://develop.thankshell.com/login/callback',
            RedirectUriSignOut : 'https://develop.thankshell.com/',
        };

        return {
            apiVersion: 'dev',
            cognitoInfo: cognitoInfo,
            loginUrl: "https://" + cognitoInfo.AppWebDomain + "/login?response_type=code&client_id=" + cognitoInfo.ClientId + "&redirect_uri=" + cognitoInfo.RedirectUriSignIn,
        };
    }
}

function getTimeString(timestamp) {
    let d = new Date(timestamp);
    let year  = d.getFullYear();
    let month = d.getMonth() + 1;
    let day   = d.getDate();
    let hour  = ( d.getHours()   < 10 ) ? '0' + d.getHours()   : d.getHours();
    let min   = ( d.getMinutes() < 10 ) ? '0' + d.getMinutes() : d.getMinutes();
    let sec   = ( d.getSeconds() < 10 ) ? '0' + d.getSeconds() : d.getSeconds();

    return ( year + '/' + month + '/' + day + ' ' + hour + ':' + min + ':' + sec );
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

class SessionController {
    constructor() {
        this.auth = new AmazonCognitoIdentity.CognitoAuth(getConfig().cognitoInfo);
    }

    close() {
        this.auth.signOut();
    }

    get(callback) {
        if(this.auth.isUserSignedIn()) {
            console.log(this.auth.getCurrentUser());
            this.auth.userhandler = {
              onSuccess: callback,
              onFailure: function(err) {
                console.log("Error!");
                console.log(err);
              }
            };

            this.auth.getSession();
        } else {
            console.log("User is not signed in");
            location.href='/';
        }
    }

    getSession() {
        return new Promise((resolve, reject) => {
            if(!this.auth.isUserSignedIn()) {
                resolve(null);
            }

            this.auth.userhandler = {
                onSuccess: resolve,
                onFailure: reject,
            };

            this.auth.getSession();
        });
    }

    commitLogin(path) {
        return new Promise((resolve, reject) => {
            if(this.auth.isUserSignedIn()) {
                resolve(null);
                return;
            }

            this.auth.userhandler = {
                onSuccess: resolve,
                onFailure: (json) => {
                    let data = JSON.parse(json);
                    reject({
                        message: "認証リクエストに失敗しました(" + data.error + ")",
                    });
                },
            };

            this.auth.useCodeGrantFlow();
            this.auth.parseCognitoWebResponse(path);
        });
    }
}
class ThankshellApi {
    constructor(session, version) {
        this.session = session;
        this.headers = {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: this.session.idToken.jwtToken
        };
        this.basePath = 'https://api.thankshell.com/' + version;
    }

    getUri(path) {
        return this.basePath + path;
    }

    async getUser() {
        let response = await fetch(this.basePath + '/user/', {
            method: "GET",
            headers: this.headers,
        });
        return await response.json();
    }

    async createUser(userId) {
        let response = await fetch(this.basePath + '/user/', {
            method: "PUT",
            headers: this.headers,
            body: JSON.stringify({
                id: userId,
            }),
        });

        return {
            status: response.status,
            body: await response.json(),
        };
    }

    //-------------------------------------------------
    // Groups

    async getGroup(groupName) {
        let response = await fetch(this.basePath + '/groups/' + groupName, {
            method: "GET",
            headers: this.headers,
        });

        return new GroupInfo(await response.json());
    }

    async sendGroupJoinRequest(groupName, userId) {
        let response = await fetch(this.basePath + '/groups/' + groupName + '/requests/' + userId, {
            method: "PUT",
            headers: this.headers,
        });
        let data = await response.json();
    }

    async cancelGroupJoinRequest(groupName, userId) {
        let response = await fetch(this.basePath + '/groups/' + groupName + '/requests/' + userId, {
            method: "DELETE",
            headers: this.headers,
        });
        let data = await response.json();
    }

    async acceptGroupJoinRequest(groupName, userId) {
        let response = await fetch(this.basePath + '/groups/' + groupName + '/members/' + userId, {
            method: "PUT",
            headers: this.headers,
        });
        let data = await response.json();
        console.log(data);
    }

    async invitation(groupName, email) {
        let response = await fetch(this.basePath + '/groups/' + groupName + '/invitation', {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({'email': email}),
        });

        let json = await response.json();

        if (response.status != 200) {
            throw new Error(json.message)
        }
    };

    //-------------------------------------------------
    // Transactions

    async createTransaction(data) {
        let response = await fetch(this.basePath + '/token/selan/transactions', {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(data),
        });

        if (response.status !== 200) {
            let data = await response.json();
            throw new Error(data.message);
        }
    }

    async loadTransactions(userId) {
        let response = await fetch(this.basePath + '/token/selan/transactions?user_id=' + userId, {
            method: "GET",
            headers: this.headers,
        });

        let data = await response.json();

        if (response.status != 200) {
            throw new Error(response.status + ":" + data.message);
        }

        return data.history.Items;
    }

    async loadAllTransactions() {
        let response = await fetch(this.basePath + '/token/selan/transactions', {
            method: "GET",
            headers: this.headers,
        });

        let data = await response.json();

        if (response.status != 200) {
            throw new Error(response.status + ":" + data.message);
        }

        return data.history.Items;
    }

    //-------------------------------------------------
    // Publish

    async getPublished() {
        let response = await fetch(this.basePath + '/token/selan/published', {
            method: "GET",
            headers: this.headers,
        });

        return await response.json();
    }

    async publish(to, amount) {
        let response = await fetch(this.basePath + '/token/selan/published', {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
                to: to,
                amount: amount,
            }),
        });

        let data = await response.json();

        if (response.status != 200) {
            throw new Error(response.status + ":" + data.message);
        }
    }

    //-------------------------------------------------
    // Holdings

    async getHoldings() {
        let response = await fetch(this.basePath + '/token/selan/holders', {
            method: "GET",
            headers: this.headers,
        });

        let json = await response.json();

        if (response.status != 200) {
            throw new Error(json.message)
        }

        return json;
    };

    async getHolding(userId) {
        let response = await fetch(this.basePath + '/token/selan/holders', {
            method: "GET",
            headers: this.headers,
        });

        let json = await response.json();

        if (response.status != 200) {
            throw new Error(json.message)
        }

        return json[userId];
    };

    //-------------------------------------------------
    // Holdings

    async getLinks() {
        let response = await fetch(this.basePath + '/user/link', {
            method: "GET",
            headers: this.headers,
        });

        if (response.status !== 200) {
            let result = await response.json();
            throw new Error(result.message);
        }

        return await response.json();
    }

    async linkFacebook(fbLoginInfo) {
        let response = await fetch(this.basePath + '/user/link/Facebook', {
            method: "PUT",
            headers: this.headers,
            body: JSON.stringify({
                'id': fbLoginInfo.authResponse.userID,
                'token': fbLoginInfo.authResponse.accessToken,
            }),
        });

        if (response.status !== 200) {
            let result = await response.json();
            throw new Error(result.message);
        }

        return await response.json();
    }

    async unlinkFacebook(fbLoginInfo) {
        let response = await fetch(this.basePath + '/user/link/Facebook', {
            method: "DELETE",
            headers: this.headers,
            body: JSON.stringify({
                'id': fbLoginInfo.authResponse.userID,
                'token': fbLoginInfo.authResponse.accessToken,
            }),
        });

        if (response.status !== 200) {
            let result = await response.json();
            throw new Error(result.message);
        }
    }
}

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
