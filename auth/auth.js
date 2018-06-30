'use strict'
var upsample = {};

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

upsample.login = function() {
    var username = $('#inputUserName').val();
    var password = $('#inputPassword').val();
    var redirect = $('#redirectPath').val();
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
                IdentityPoolId: 'Identity Pool の ID',
                Logins: {
                    'cognito-idp.リージョン名.amazonaws.com/ユーザープールID': result.getIdToken().getJwtToken()
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
            alert(err);
        }
    });

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
