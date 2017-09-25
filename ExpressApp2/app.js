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

//function processEvent(event) {
//    var sender = event.sender.id.toString();

//    if ((event.message && event.message.text) || (event.postback && event.postback.payload)) {
//        var text = event.message ? event.message.text : event.postback.payload;
//        // Handle a text message from this sender

//        if (!sessionIds.has(sender)) {
//            sessionIds.set(sender, uuid.v1());
//        }

//        console.log("Text", text);


//        apiaiRequest.on('response', (response) => {
//            if (isDefined(response.result)) {
//                let responseText = response.result.fulfillment.speech;
//                let responseData = response.result.fulfillment.data;
//                let action = response.result.action;

//                if (isDefined(responseData) && isDefined(responseData.facebook)) {
//                    if (!Array.isArray(responseData.facebook)) {
//                        try {
//                            console.log('Response as formatted message');
//                            sendFBMessage(sender, responseData.facebook);
//                        } catch (err) {
//                            sendFBMessage(sender, { text: err.message });
//                        }
//                    } else {
//                        responseData.facebook.forEach((facebookMessage) => {
//                            try {
//                                if (facebookMessage.sender_action) {
//                                    console.log('Response as sender action');
//                                    sendFBSenderAction(sender, facebookMessage.sender_action);
//                                }
//                                else {
//                                    console.log('Response as formatted message');
//                                    sendFBMessage(sender, facebookMessage);
//                                }
//                            } catch (err) {
//                                sendFBMessage(sender, { text: err.message });
//                            }
//                        });
//                    }
//                } else if (isDefined(responseText)) {
//                    console.log('Response as text message');
//                    // facebook API limit for text length is 320,
//                    // so we must split message if needed
//                    var splittedText = splitResponse(responseText);

//                    async.eachSeries(splittedText, (textPart, callback) => {
//                        sendFBMessage(sender, { text: textPart }, callback);
//                    });
//                }

//            }
//        });

//        apiaiRequest.on('error', (error) => console.error(error));
//        apiaiRequest.end();
//    }
//}



//class FacebookBot {
//    constructor() {
//        console.log("constructeur");
//        this.apiAiService = apiai(APIAI_ACCESS_TOKEN, { language: APIAI_LANG, requestSource: "fb" });
//        this.sessionIds = new Map();
//        this.messagesDelay = 200;
//    }


//    doDataResponse(sender, facebookResponseData) {
//        console.log("doDataResponse");
//        if (!Array.isArray(facebookResponseData)) {
//            console.log('Response as formatted message');
//            this.sendFBMessage(sender, facebookResponseData)
//                .catch(err => console.error(err));
//        } else {
//            async.eachSeries(facebookResponseData, (facebookMessage, callback) => {
//                if (facebookMessage.sender_action) {
//                    console.log('Response as sender action');
//                    this.sendFBSenderAction(sender, facebookMessage.sender_action)
//                        .then(() => callback())
//                        .catch(err => callback(err));
//                }
//                else {
//                    console.log('Response as formatted message');
//                    this.sendFBMessage(sender, facebookMessage)
//                        .then(() => callback())
//                        .catch(err => callback(err));
//                }
//            }, (err) => {
//                if (err) {
//                    console.error(err);
//                } else {
//                    console.log('Data response completed');
//                }
//            });
//        }
//    }

//    doRichContentResponse(sender, messages) {
//        console.log("doRichContentResponse");
//        let facebookMessages = []; // array with result messages

//        for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
//            let message = messages[messageIndex];

//            switch (message.type) {
//                //message.type 0 means text message
//                case 0:
//                    // speech: ["hi"]
//                    // we have to get value from fulfillment.speech, because of here is raw speech
//                    if (message.speech) {

//                        let splittedText = this.splitResponse(message.speech);

//                        splittedText.forEach(s => {
//                            facebookMessages.push({ text: s });
//                        });
//                    }

//                    break;
//                //message.type 1 means card message
//                case 1: {
//                    let carousel = [message];

//                    for (messageIndex++; messageIndex < messages.length; messageIndex++) {
//                        if (messages[messageIndex].type == 1) {
//                            carousel.push(messages[messageIndex]);
//                        } else {
//                            messageIndex--;
//                            break;
//                        }
//                    }

//                    let facebookMessage = {};
//                    carousel.forEach((c) => {
//                        // buttons: [ {text: "hi", postback: "postback"} ], imageUrl: "", title: "", subtitle: ""

//                        let card = {};

//                        card.title = c.title;
//                        card.image_url = c.imageUrl;
//                        if (this.isDefined(c.subtitle)) {
//                            card.subtitle = c.subtitle;
//                        }
//                        //If button is involved in.
//                        if (c.buttons.length > 0) {
//                            let buttons = [];
//                            for (let buttonIndex = 0; buttonIndex < c.buttons.length; buttonIndex++) {
//                                let button = c.buttons[buttonIndex];

//                                if (button.text) {
//                                    let postback = button.postback;
//                                    if (!postback) {
//                                        postback = button.text;
//                                    }

//                                    let buttonDescription = {
//                                        title: button.text
//                                    };

//                                    if (postback.startsWith("http")) {
//                                        buttonDescription.type = "web_url";
//                                        buttonDescription.url = postback;
//                                    } else {
//                                        buttonDescription.type = "postback";
//                                        buttonDescription.payload = postback;
//                                    }

//                                    buttons.push(buttonDescription);
//                                }
//                            }

//                            if (buttons.length > 0) {
//                                card.buttons = buttons;
//                            }
//                        }

//                        if (!facebookMessage.attachment) {
//                            facebookMessage.attachment = { type: "template" };
//                        }

//                        if (!facebookMessage.attachment.payload) {
//                            facebookMessage.attachment.payload = { template_type: "generic", elements: [] };
//                        }

//                        facebookMessage.attachment.payload.elements.push(card);
//                    });

//                    facebookMessages.push(facebookMessage);
//                }

//                    break;
//                //message.type 2 means quick replies message
//                case 2: {
//                    if (message.replies && message.replies.length > 0) {
//                        let facebookMessage = {};

//                        facebookMessage.text = message.title ? message.title : 'Choose an item';
//                        facebookMessage.quick_replies = [];

//                        message.replies.forEach((r) => {
//                            facebookMessage.quick_replies.push({
//                                content_type: "text",
//                                title: r,
//                                payload: r
//                            });
//                        });

//                        facebookMessages.push(facebookMessage);
//                    }
//                }

//                    break;
//                //message.type 3 means image message
//                case 3:

//                    if (message.imageUrl) {
//                        let facebookMessage = {};

//                        // "imageUrl": "http://example.com/image.jpg"
//                        facebookMessage.attachment = { type: "image" };
//                        facebookMessage.attachment.payload = { url: message.imageUrl };

//                        facebookMessages.push(facebookMessage);
//                    }

//                    break;
//                //message.type 4 means custom payload message
//                case 4:
//                    if (message.payload && message.payload.facebook) {
//                        facebookMessages.push(message.payload.facebook);
//                    }
//                    break;

//                default:
//                    break;
//            }
//        }

//        return new Promise((resolve, reject) => {
//            async.eachSeries(facebookMessages, (msg, callback) => {
//                this.sendFBSenderAction(sender, "typing_on")
//                    .then(() => this.sleep(this.messagesDelay))
//                    .then(() => this.sendFBMessage(sender, msg))
//                    .then(() => callback())
//                    .catch(callback);
//            },
//                (err) => {
//                    if (err) {
//                        console.error(err);
//                        reject(err);
//                    } else {
//                        console.log('Messages sent');
//                        resolve();
//                    }
//                });
//        });

//    }

//    doTextResponse(sender, responseText) {
//        console.log("doTextResponse");
//        console.log('Response as text message');
//        // facebook API limit for text length is 640,
//        // so we must split message if needed
//        let splittedText = this.splitResponse(responseText);

//        async.eachSeries(splittedText, (textPart, callback) => {
//            this.sendFBMessage(sender, { text: textPart })
//                .then(() => callback())
//                .catch(err => callback(err));
//        });
//    }

//    //which webhook event
//    getEventText(event) {
//        console.log("getEventText");
//        if (event.message) {
//            if (event.message.quick_reply && event.message.quick_reply.payload) {
//                return event.message.quick_reply.payload;
//            }

//            if (event.message.text) {
//                return event.message.text;
//            }
//        }

//        if (event.postback && event.postback.payload) {
//            return event.postback.payload;
//        }

//        return null;

//    }

//    getFacebookEvent(event) {
//        console.log("getFacebookEvent");
//        if (event.postback && event.postback.payload) {

//            let payload = event.postback.payload;

//            switch (payload) {
//                case FACEBOOK_WELCOME:
//                    return { name: FACEBOOK_WELCOME };

//                case FACEBOOK_LOCATION:
//                    return { name: FACEBOOK_LOCATION, data: event.postback.data }
//            }
//        }

//        return null;
//    }

//    processFacebookEvent(event) {
//        console.log("processFacebookEvent");
//        const sender = event.sender.id.toString();
//        const eventObject = this.getFacebookEvent(event);

//        if (eventObject) {

//            // Handle a text message from this sender
//            if (!this.sessionIds.has(sender)) {
//                this.sessionIds.set(sender, uuid.v4());
//            }

//            let apiaiRequest = this.apiAiService.eventRequest(eventObject,
//                {
//                    sessionId: this.sessionIds.get(sender),
//                    originalRequest: {
//                        data: event,
//                        source: "facebook"
//                    }
//                });
//            this.doApiAiRequest(apiaiRequest, sender);
//        }
//    }

//    processMessageEvent(event) {
//        console.log("processMessageEvent");
//        const sender = event.sender.id.toString();
//        const text = this.getEventText(event);

//        if (text) {

//            // Handle a text message from this sender
//            if (!this.sessionIds.has(sender)) {
//                this.sessionIds.set(sender, uuid.v4());
//            }

//            console.log("Text", text);
//            //send user's text to api.ai service
//            let apiaiRequest = this.apiAiService.textRequest(text,
//                {
//                    sessionId: this.sessionIds.get(sender),
//                    originalRequest: {
//                        data: event,
//                        source: "facebook"
//                    },
//                    contexts: [
//                        {
//                            name: "generic",
//                            parameters: {
//                                facebook_user: userName
//                            },
//                            test: {

//                            }
//                        }]
//                });

//            this.doApiAiRequest(apiaiRequest, sender);
//        }
//    }

//    doApiAiRequest(apiaiRequest, sender) {
//        apiaiRequest.on('response', (response) => {
//            if (this.isDefined(response.result) && this.isDefined(response.result.fulfillment)) {
//                let responseText = response.result.fulfillment.speech;
//                let responseData = response.result.fulfillment.data;
//                let responseMessages = response.result.fulfillment.messages;

//                if (this.isDefined(responseData) && this.isDefined(responseData.facebook)) {
//                    let facebookResponseData = responseData.facebook;
//                    this.doDataResponse(sender, facebookResponseData);
//                } else if (this.isDefined(responseMessages) && responseMessages.length > 0) {
//                    this.doRichContentResponse(sender, responseMessages);
//                }
//                else if (this.isDefined(responseText)) {
//                    this.doTextResponse(sender, responseText);
//                }

//            }
//        });

//        apiaiRequest.on('error', (error) => console.error(error));
//        apiaiRequest.end();
//    }

//    splitResponse(str) {
//        if (str.length <= FB_TEXT_LIMIT) {
//            return [str];
//        }

//        return this.chunkString(str, FB_TEXT_LIMIT);
//    }

//    chunkString(s, len) {
//        let curr = len, prev = 0;

//        let output = [];

//        while (s[curr]) {
//            if (s[curr++] == ' ') {
//                output.push(s.substring(prev, curr));
//                prev = curr;
//                curr += len;
//            }
//            else {
//                let currReverse = curr;
//                do {
//                    if (s.substring(currReverse - 1, currReverse) == ' ') {
//                        output.push(s.substring(prev, currReverse));
//                        prev = currReverse;
//                        curr = currReverse + len;
//                        break;
//                    }
//                    currReverse--;
//                } while (currReverse > prev)
//            }
//        }
//        output.push(s.substr(prev));
//        return output;
//    }

//    sendFBMessage(sender, messageData) {
//        console.log("sendFBMessage");
//        return new Promise((resolve, reject) => {
//            request({
//                url: 'https://graph.facebook.com/v2.6/me/messages',
//                qs: { access_token: FB_PAGE_ACCESS_TOKEN },
//                method: 'POST',
//                json: {
//                    recipient: { id: sender },
//                    message: messageData
//                }
//            }, (error, response) => {
//                if (error) {
//                    console.log('Error sending message: ', error);
//                    reject(error);
//                } else if (response.body.error) {
//                    console.log('Error: ', response.body.error);
//                    reject(new Error(response.body.error));
//                }

//                resolve();
//            });
//        });
//    }

//    sendFBSenderAction(sender, action) {
//        console.log("sendFBSenderAction");
//        return new Promise((resolve, reject) => {
//            request({
//                url: 'https://graph.facebook.com/v2.6/me/messages',
//                qs: { access_token: FB_PAGE_ACCESS_TOKEN },
//                method: 'POST',
//                json: {
//                    recipient: { id: sender },
//                    sender_action: action
//                }
//            }, (error, response) => {
//                if (error) {
//                    console.error('Error sending action: ', error);
//                    reject(error);
//                } else if (response.body.error) {
//                    console.error('Error: ', response.body.error);
//                    reject(new Error(response.body.error));
//                }

//                resolve();
//            });
//        });
//    }

//    doSubscribeRequest() {
//        request({
//            method: 'POST',
//            uri: `https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=${FB_PAGE_ACCESS_TOKEN}`
//        },
//            (error, response, body) => {
//                if (error) {
//                    console.error('Error while subscription: ', error);
//                } else {
//                    console.log('Subscription result: ', response.body);
//                }
//            });
//    }

//    configureGetStartedEvent() {
//        request({
//            method: 'POST',
//            uri: `https://graph.facebook.com/v2.6/me/thread_settings?access_token=${FB_PAGE_ACCESS_TOKEN}`,
//            json: {
//                setting_type: "call_to_actions",
//                thread_state: "new_thread",
//                call_to_actions: [
//                    {
//                        payload: FACEBOOK_WELCOME
//                    }
//                ]
//            }
//        },
//            (error, response, body) => {
//                if (error) {
//                    console.error('Error while subscription', error);
//                } else {
//                    console.log('Subscription result', response.body);
//                }
//            });
//    }

//    isDefined(obj) {
//        if (typeof obj == 'undefined') {
//            return false;
//        }

//        if (!obj) {
//            return false;
//        }

//        return obj != null;
//    }

//    sleep(delay) {
//        return new Promise((resolve, reject) => {
//            setTimeout(() => resolve(), delay);
//        });
//    }

//}

//let facebookBot = new FacebookBot();





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


/*Recuperation des éléments du body
app.post('/webhook/', function (req, res) {

    var myJSON = JSONbig.parse(req.body);
    let messaging_events = myJSON.originalRequest[1].data;
    for (let i = 0; i < messaging_events.length; i++) {
        let event = myJSON.originalRequest[1].data[i];
        console.log(event);
        let sender = event.sender.id;
        if (event.message && event.message.text) {
            let text = event.message.text
            if (text === 'Generic') {
                console.log("welcome to chatbot")
                //sendGenericMessage(sender)
                continue
            }
            sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
        }
        if (event.postback) {
            let text = JSON.stringify(event.postback)
            sendTextMessage(sender, "Postback received: " + text.substring(0, 200), token)
            continue
        }
    }
    res.sendStatus(200)
})
*/

app.post('/webhook/', function (req, res) {

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
        sendTextMessage(sender, text, token);// pour l'instant pas défini
    }
    res.sendStatus(200);
});





app.listen(REST_PORT, () => {
    console.log('Rest service ready on port ' + REST_PORT);
});

//facebookBot.doSubscribeRequest();



//Webhook for API.ai to get response from 3rd party API
//app.post('/ai', (req, res) => {
//    console.log('*** Webhook for api.ai query ***');
//    console.log(req.body.result);
//    //Localisation
//    for (i = 0; i < messagingEvent.message.attachments.length; i++) {
//        console.log("Attachment inside: " + JSON.stringify(messagingEvent.message.attachments[i]));

//        var text = messagingEvent.message.attachments[i].payload.url;

//        //If no URL, then it is a location

//        if (text == undefined || text == "") {
//            let msg = 'latitude:'
//                + messagingEvent.message.attachments[i].payload.coordinates.lat
//                + ',longitude:'
//                + messagingEvent.message.attachments[i].payload.coordinates.long;


//            return res.json({
//                speech: msg,
//                displayText: msg,
//                source: 'weather'
//            });
//        }
//    }
//});



