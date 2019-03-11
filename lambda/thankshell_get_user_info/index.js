function getParentUser() {
    return null;
}

exports.handler = async (event, context, callback) => {
    let claims = event.requestContext.authorizer.claims;

    let data;
    if(claims.identities) {
        // Facebook
        let parent = getParentUser(claims.identities);
        if (parent) {
            data = {
                'code': 'SUCCESS',
                'name': claims['cognito:username'],
            };
        } else {
            data = {
                'code': 'NO_PARENT',
            };
        }
    } else {
        data = {
            'code': 'SUCCESS',
            'name': claims['cognito:username'],
        };
    }

    return {
        statusCode: 200,
        headers: {"Access-Control-Allow-Origin": "*"},
        body: JSON.stringify(data),
    };
};
