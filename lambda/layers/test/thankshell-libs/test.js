let assert = require('assert');
let Auth = require('../../thankshell-libs/nodejs/node8/node_modules/thankshell-libs/auth.js');

let xxx = Auth.getHandler(null);
console.log(xxx);


describe('Auth', () => {
    describe('getHandler', () => {
        it('typeof return is function', () => {
            assert.equal(typeof Auth.getHandler(null), 'function');
        });
        it('return format', (done) => {
            let handler = Auth.getHandler(async(userId) => { return userId;})
            let event = {
                requestContext: {
                    authorizer: {
                        claims: "xxx",
                    }
                },
                body: JSON.stringify({}),
            };
            let context = {};
            let callback = null;

            Auth.getUserId = claims => 'dummy';

            handler(event, context, callback).then(value => {
                assert.equal(value.statusCode, 200);
                assert.equal(value.headers["Access-Control-Allow-Origin"], "*");
                assert.equal(value.body, JSON.stringify('dummy'));
            }).catch(error => {
                assert.fail(error);
            }).then(done, done);
        });
    });
});
