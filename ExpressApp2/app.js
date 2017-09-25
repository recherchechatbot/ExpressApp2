// JavaScript source code


const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const request = require('request');
const apiai = require('apiai');
const JSONbig = require('json-bigint');
const async = require('async');
const uuid = require('uuid');

const REST_PORT = (process.env.PORT || 5000);
const FB_PAGE_ACCESS_TOKEN = 'EAABqC6Y1J7cBAAgKjQrZCVwYYERO5vA8NJNMlZBZAN3sZAVOTZCP6BxkQWTcc2V9xaDuuRuLQTioHGdWD7uvZANX3WZCBa2JYuwG7DJYSon2JRE162t3ZBZAk6cbsFdKEOukAPtQ7hu0mxS4FFKCa9JjHQtVGyAlStBoRobJhHaHkEgZDZD';
const APIAI_LANG = process.env.APIAI_LANG || 'fr';
const FB_VERIFY_TOKEN = 'test';
const APIAI_ACCESS_TOKEN = 'b1791ee1ebc14aa88140d78699ed0d93';
const FB_TEXT_LIMIT = 640;
const FACEBOOK_LOCATION = "FACEBOOK_LOCATION";
const FACEBOOK_WELCOME = "FACEBOOK_WELCOME";
const token = FB_PAGE_ACCESS_TOKEN;
const FBMessenger = require('fb-messenger');
const messenger = new FBMessenger(FB_PAGE_ACCESS_TOKEN);







app.use(bodyParser.text({ type: 'application/json' }));
app.get('/test', (req, res) => {
    res.send('eeee');
});
app.get('/', (req, res) => {
    if (req.query['hub.mode'] == 'subscribed') {
        if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
            res.status(200).send(req.query['hub.challenge']);

            //setTimeout(() => {
            //    facebookBot.doSubscribeRequest();
            //}, 3000);
        }
        else {
            res.send('Wrong verification token');
        }
    }
    else {
        res.send('okokok');
    }
});



function sendTextMessage(sender, text) {
    let messageData = { text: text }

    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function (error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

app.post('/webhooktesttestetest/', function (req, res) {
    console.log("..................................................");
    var myJSON = JSONbig.parse(req.body);
    console.log(req.body);
    console.log(myJSON);

    let messaging_events = myJSON.originalRequest.data;

    //facebookBot.processMessageEvent(messaging_events);

    console.log(messaging_events);
    let sender = messaging_events.sender.id;
    let username = myJSON.result.contexts[0].parameters.facebook_user;
    console.log(myJSON.result.contexts[0]);
    console.log(username);
    if (messaging_events.message && messaging_events.message.text) {
        let text = messaging_events.message.text;
        console.log("Utilisateur: " + sender + ", Texte reçu: " + text.substring(0, 200));
    }
    if (messaging_events.postback) {
        console.log(myJSON);
        let text = messaging_events.postback.data;
        console.log(text);
        sendTextMessage(sender, "réponseeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");// pour l'instant pas défini
    }
    res.sendStatus(200);
});





app.listen(REST_PORT, () => {
    console.log('Rest service ready on port ' + REST_PORT);
});




