'use strict'
var upsample = {};

upsample.state = 'login';

upsample.poolData = {
    UserPoolId: 'ap-northeast-1_WEGpvJz9M',
    ClientId: 'dnjrhu35ok1pren744jvjq28e'
};

upsample.UserPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(upsample.poolData);

upsample.signup = function() {
    var email = $('#inputEmail').val();
    var username = $('#inputUserName').val();
    var password = $('#inputPassword').val();
    if (!email | !username | !password) { return false; }

    var attributeEmail = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({Name: 'email', Value: email});
    var attributeList = [];
    attributeList.push(attributeEmail);

    var message_text;
    upsample.UserPool.signUp(username, password, attributeList, null, function(err, result){
        if (err) {
            console.log(err);
            message_text = err;
        } else {
            var cognitoUser = result.user;
            console.log('user name is ' + cognitoUser.getUsername());

            message_text = cognitoUser.getUsername() + ' が作成されました';
        }
        $('#message').text(message_text);
        $('#message').show();
    });
}

upsample.verify = function() {
    var username = $('#inputUserName').val();
    var vericode = $('#inputVerificationCode').val();
    if (!username | !vericode) { return false; }

    var userData = {
        Username: username,
        Pool: upsample.UserPool
    };

    var message_text;
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.confirmRegistration(vericode, true, function(err, result) {
        if (err) {
            console.log(err);
            message_text = err;
            $('#message').text(message_text);
            $('#message').append($('<a href="resend.html">再送信</a>')); // 再送信リンクの表示
        } else {
            console.log('call result ' + result);

            message_text = cognitoUser.getUsername() + ' が確認されました';
            $('#message').text(message_text);
        }
        $('#message').show();
    });
}


upsample.resend = function() {
    var username = $('#inputUserName').val();
    if (!username) { return false; }

    var userData = {
        Username: username,
        Pool: upsample.UserPool
    };

    var message_text;
    var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
    cognitoUser.resendConfirmationCode(function(err, result) {
        if (err) {
            console.log(err);
            message_text = err;
        } else {
            console.log('call result ' + result);

            message_text = '確認コードを再送信しました';
        }
        $('#message').text(message_text);
        $('#message').show();
    });
}

upsample.sendResetCode = function() {
    try {
        var username = $('#reset-user-name').val();

        var userData = {
            Username: username,
            Pool: upsample.UserPool
        };

        var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
        cognitoUser.forgotPassword({
            getResetCode: function(continuation) {
                alert(continuation);
            },
            onFailure: function(err) {
                switch(err.code){
                case 'UserNotFoundException':
                    $('#message').text('指定のユーザーは登録されていません');
                    break;
                case "LimitExceededException":
                    $('#message').text('ロックされました。しばらく待ってやり直してください');
                    break;
                default:
                    console.log(err);
                    alert(err);
                }
            },
            onSuccess: function() {
                upsample.setState('Login');
            },
        });
    } catch(e) {
        console.log(e);
        alert(e);
        $('#message').text('ERROR: 異常終了しました');
    }
}

upsample.resetPassword = function() {
    try {
        var username = $('#reset-user-name').val();
        var authCode = $('#auth-code').val();
        var newPassword1 = $('#inputNewPassword1').val();
        var newPassword2 = $('#inputNewPassword2').val();

        if(newPassword1 !== newPassword2) {
            $('#message').text('同じパスワードが一致しません');
            return;
        }

        var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser({
            Username: username,
            Pool: upsample.UserPool
        });

        cognitoUser.confirmPassword(authCode, newPassword1, {
            getResetCode: function(continuation) {
                alert(continuation);
            },
            onFailure: function(err) {
                console.log(err);
                switch(err.code){
                case 'CodeMismatchException':
                    alert('認証コードが一致しません');
                    break;
                case 'MultipleValidationErrors':
                    alert(err.errors);
                    break;
                default:
                    $('#message').text('指定のユーザーは登録されていません');
                    alert(err);
                }
            },
            onSuccess: function() {
                upsample.setState('ResetPassword');
            },
        });
    } catch(e) {
        console.log(e);
        alert(e);
        $('#message').text('ERROR: 異常終了しました');
    }
}

upsample.setState = function(state) {
    var formList = {
        'Login': '#login-form-body',
        'SendResetCode': '#send-reset-code-body',
        'ResetPassword': '#new-password-form-body',
    };
    for(let key in formList) {
        $(formList[key]).hide();
    }

    $(formList[state]).show();
    upsample.state = state;
}

upsample.login = function() {
    try {
        var username = $('#inputUserName').val();
        var password = $('#inputPassword').val();
        var redirect = $('#redirectPath').val();
        var newPassword1 = $('#inputNewPassword1').val();
        var newPassword2 = $('#inputNewPassword2').val();
        if (!username | !password) { return false; }

        var authenticationData = {
            Username: username,
            Password: password
        };
        var authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);

        var userData = {
            Username: username,
            Pool: upsample.UserPool
        };

        var message_text;
        var cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);
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
                    $('#message').text('Error: パスワードを初期化してください');
                    upsample.setState('SendResetCode');
                    break;
                case 'UserNotFoundException':
                case 'NotAuthorizedException':
                    $('#message').text('Error: アカウント名もしくはパスワードが誤っています');
                    break;
                default:
                    $('#message').text('Error: ' + err.message);
                    break;
                }
            },

            mfaRequired: function(codeDeliveryDetails) {
                console.log(codeDeliveryDetails);
                $('#message').text('Error: MFA機能は非対応です');
            },

            newPasswordRequired: function(userAttributes, requiredAttributes) {
                if ($('#new-password-form-body').is(':visible')) {
                    if(newPassword1 === newPassword2) {
                        cognitoUser.completeNewPasswordChallenge(newPassword1, {}, this);
                    } else {
                        alert('同じパスワードを入力してください');
                    }
                } else {
                    $('#login-form-body').hide();
                    $('#new-password-form-body').show();
                    $('#message').text('パスワードを設定してください');
                }
            }
        });
    } catch(e) {
        console.log(e);
        alert(e);
        $('#message').text('ERROR: 異常終了しました');
    }
}

upsample.checkSession = function (callback) {

    var cognitoUser = upsample.UserPool.getCurrentUser();
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
}

upsample.logout = function() {

    var cognitoUser = upsample.UserPool.getCurrentUser();
    if (cognitoUser != null) {
        cognitoUser.signOut();
        location.reload();
    }

}
