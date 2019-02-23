'use strict'

let UserPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool({
    UserPoolId: 'ap-northeast-1_A6SNCzbmM',
    ClientId: '1opllluc6ruh50h0qc74395k1i'
});

let upsample = {
//    resend: function(username, callback) {
//        if (!username) { return false; }
//
//        let cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser({
//            Username: username,
//            Pool: UserPool
//        });
//
//        cognitoUser.resendConfirmationCode(function(err, result) {
//            if (err) {
//                console.log(err);
//                callback(null, err);
//            } else {
//                console.log('call result ' + result);
//                callback(null, '確認コードを再送信しました');
//            }
//        });
//    }

    checkSession: function (callback) {
        var cognitoUser = UserPool.getCurrentUser();
        if (cognitoUser != null) {
            cognitoUser.getSession(function (err, session) {
                if (session) {
                    cognitoUser.getUserAttributes(function (err, attrs) {
                        if (err) {
                            callback(err, null);
                        } else {
                            const data = {
                                user: cognitoUser.getUsername(),
                                attributes: attrs,
                                session: session
                            }
                            callback(null, data);
                        }
                    });
                } else {
                    callback('session is invalid', null);
                }
            });
        } else {
            callback('no user', null);
        }
    },

    logout: function() {
        let cognitoUser = UserPool.getCurrentUser();
        if (cognitoUser != null) {
            cognitoUser.signOut();
            location.reload();
        }
    },
};
