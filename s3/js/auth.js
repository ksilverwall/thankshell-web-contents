'use strict'

class SessionController {
    constructor() {
        this.auth = new AmazonCognitoIdentity.CognitoAuth({
            ClientId : '1opllluc6ruh50h0qc74395k1i',
            AppWebDomain : 'auth.thankshell.com',
            TokenScopesArray : ['profile', 'email', 'openid', 'aws.cognito.signin.user.admin', 'phone'],
            RedirectUriSignIn : 'https://develop.thankshell.com/login/callback',
            RedirectUriSignOut : 'https://develop.thankshell.com/login/logout',
        });
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
}
