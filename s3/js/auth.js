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

    newPassword: function(username, password, redirect, newPassword1, newPassword2, callback) {
        try {
            if (!username || !password) { return false; }
            if (newPassword1 !== newPassword2) {
                callback(null, '確認パスワードが一致しません');
                return false;
            }

            let authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails({
                Username: username,
                Password: password
            });

            var message_text;
            let cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser({
                Username: username,
                Pool: UserPool
            });
            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: function(result) {
                    console.log('access token + ' + result.getAccessToken().getJwtToken());

                    AWS.config.region = 'ap-northeast-1';
                    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                        IdentityPoolId: 'ap-northeast-1:8dc6d009-5c99-41fd-8119-e734643b2e21',
                        Logins: {
                            'cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_WEGpvJz9M': result.getIdToken().getJwtToken()
                        }
                    });

                    AWS.config.credentials.refresh(function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("success");
                            console.log("id:" + AWS.config.credentials.identityId);
                        }

                        $(location).attr('href', redirect);
                    });
                },

                onFailure: function(err) {
                    console.log(err);
                    switch(err.code) {
                    case 'PasswordResetRequiredException':
                        callback('SendResetCode', 'Error: パスワードを初期化してください');
                        break;
                    case 'UserNotFoundException':
                    case 'NotAuthorizedException':
                        callback(null, 'Error: アカウント名もしくはパスワードが誤っています');
                        break;
                    default:
                        callback(null, 'Error: ' + err.message);
                        break;
                    }
                },

                mfaRequired: function(codeDeliveryDetails) {
                    console.log(codeDeliveryDetails);
                    callback(null, 'Error: MFA機能は非対応です');
                },

                newPasswordRequired: function(userAttributes, requiredAttributes) {
                    cognitoUser.completeNewPasswordChallenge(newPassword1, {}, this);
                    callback('Login', 'パスワードを再設定しました');
                }
            });
        } catch(e) {
            console.log(e);
            callback(null, 'Error: 想定外のエラーが発生しました(' + e.message + ')');
        }
    },

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
