// Simple example of parsing JSON body or URL-encoded form

const querystring = require('node:querystring');
const uWS = require('../dist/uws.js');
const port = 9001;

/** @return {Promise<Buffer>} */
const parseBody = (res) => {
    // Cache parse promise
    if (res._parseBodyPromise) return res._parseBodyPromise;
    return res._parseBodyPromise = new Promise((resolve) => {
        let buffer = Buffer.alloc(0);
        // Register data callback
        res.onData((ab, isLast) => {
            buffer = Buffer.concat([buffer, Buffer.from(ab)]);
            if (isLast) resolve(buffer);
        });
    });
};

/** @return {Promise<?Object>} */
const parseJSONBody = async (res) => {
    // Cache parsed body
    if (res._parsedJSONBody) return res._parsedJSONBody;
    try { return res._parsedJSONBody = JSON.parse((await parseBody(res)).toString()); }
    catch { return res._parsedJSONBody = null; }
};

/** @return {Promise<?Object<string, string|string[]>>} */
const parseFormBody = async (res) => {
    // Cache parsed body
    if (res._parsedFormBody) return res._parsedFormBody;
    try { return res._parsedFormBody = querystring.parse((await parseBody(res)).toString()); }
    catch { return res._parsedFormBody = null; }
};

const app = uWS./*SSL*/App({
    key_file_name: 'misc/key.pem',
    cert_file_name: 'misc/cert.pem',
    passphrase: '1234'
}).get('/jsonAPI', (res, req) => {
    // Attach onAborted handler because body parsing is async
    res.onAborted(() => {
        res.aborted = true;
    });

    parseJSONBody(res).then((object) => {
        if (res.aborted) return;
        if (!object) {
            console.log('Invalid JSON or no data at all!');
            res.cork(() => { // Cork because async
                res.writeStatus('400 Bad Request').end();
            });
        } else {
            console.log('Valid JSON: ');
            console.log(object);
            res.cork(() => {
                res.end('Thanks for this json!');
            });
        }
    });
}).post('/formPost', (res, req) => {
    // Attach onAborted handler because body parsing is async
    res.onAborted(() => {
        res.aborted = true;
    });

    parseFormBody(res).then((form) => {
        if (res.aborted) return;
        if (!form || !form.myData) {
            console.log('Invalid form body or no data at all!');
            res.cork(() => { // Cork because async
                res.end('Invalid form body');
            });
        } else {
            console.log('Valid form body: ');
            console.log(form);
            res.cork(() => {
                res.end('Thanks for your data!');
            });
        }
    });
}).listen(port, (token) => {
    if (token) {
        console.log('Listening to port ' + port);
    } else {
        console.log('Failed to listen to port ' + port);
    }
});
