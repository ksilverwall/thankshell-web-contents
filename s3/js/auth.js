'use strict'

class SessionController {
    constructor() {
        if (document.domain == 'thankshell.com') {
            this.auth = new AmazonCognitoIdentity.CognitoAuth({
                ClientId : '1opllluc6ruh50h0qc74395k1i',
                AppWebDomain : 'auth.thankshell.com',
                TokenScopesArray : ['profile', 'email', 'openid', 'aws.cognito.signin.user.admin', 'phone'],
                RedirectUriSignIn : 'https://thankshell.com/login/callback',
                RedirectUriSignOut : 'https://thankshell.com/',
            });
        } else {
            this.auth = new AmazonCognitoIdentity.CognitoAuth({
                ClientId : '2kbm6ejg25gk7q3r681nci4b2h',
                AppWebDomain : 'auth.thankshell.com',
                TokenScopesArray : ['profile', 'email', 'openid', 'aws.cognito.signin.user.admin', 'phone'],
                RedirectUriSignIn : 'https://develop.thankshell.com/login/callback',
                RedirectUriSignOut : 'https://develop.thankshell.com/',
            });
        }
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
}
