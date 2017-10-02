'use strict';

const apiai = require('apiai');
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const request = require('request');
const JSONbig = require('json-bigint');
const async = require('async');

const REST_PORT = (process.env.PORT || 5000);
const APIAI_ACCESS_TOKEN = "30dfeddc13344176b6cefa6c09056e73";
const APIAI_LANG = 'fr';
const FB_VERIFY_TOKEN = "tuxedo_cat";
const FB_PAGE_ACCESS_TOKEN = "EAAMkZAtH8lc4BADZBikUDtmMPVjJUE2Ybf601hzdI3TboCoEfg9EKPUYjUa56XRcSaZCZA1UbFyS4CdAk7ntspT3Nhw3WGLv5AxJSf24biLXreuSaR8YIDFcZArVK7HQ8bTtRZA6SlNLoMMZCLZBNjOJDHqfK47oJKTl60rnZAgnpwQZDZD";
const FB_TEXT_LIMIT = 640;

const FACEBOOK_LOCATION = "FACEBOOK_LOCATION";
const FACEBOOK_WELCOME = "FACEBOOK_WELCOME";

class FacebookBot {
    constructor() {
        this.apiAiService = apiai(APIAI_ACCESS_TOKEN, { language: APIAI_LANG, requestSource: "fb" });
        this.sessionIds = new Map();
        this.messagesDelay = 200;
    }


    doDataResponse(sender, facebookResponseData) {
        if (!Array.isArray(facebookResponseData)) {
            console.log('Response as formatted message');
            this.sendFBMessage(sender, facebookResponseData)
                .catch(err => console.error(err));
        } else {
            async.eachSeries(facebookResponseData, (facebookMessage, callback) => {
                if (facebookMessage.sender_action) {
                    console.log('Response as sender action');
                    this.sendFBSenderAction(sender, facebookMessage.sender_action)
                        .then(() => callback())
                        .catch(err => callback(err));
                }
                else {
                    console.log('Response as formatted message');
                    this.sendFBMessage(sender, facebookMessage)
                        .then(() => callback())
                        .catch(err => callback(err));
                }
            }, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log('Data response completed');
                }
            });
        }
    }

    doRichContentResponse(sender, messages) {
        let facebookMessages = []; // array with result messages

        for (let messageIndex = 0; messageIndex < messages.length; messageIndex++) {
            let message = messages[messageIndex];

            switch (message.type) {
                //message.type 0 means text message
                case 0:
                    // speech: ["hi"]
                    // we have to get value from fulfillment.speech, because of here is raw speech
                    if (message.speech) {

                        let splittedText = this.splitResponse(message.speech);

                        splittedText.forEach(s => {
                            facebookMessages.push({ text: s });
                        });
                    }

                    break;
                //message.type 1 means card message
                case 1: {
                    let carousel = [message];

                    for (messageIndex++; messageIndex < messages.length; messageIndex++) {
                        if (messages[messageIndex].type == 1) {
                            carousel.push(messages[messageIndex]);
                        } else {
                            messageIndex--;
                            break;
                        }
                    }

                    let facebookMessage = {};
                    carousel.forEach((c) => {
                        // buttons: [ {text: "hi", postback: "postback"} ], imageUrl: "", title: "", subtitle: ""

                        let card = {};

                        card.title = c.title;
                        card.image_url = c.imageUrl;
                        if (this.isDefined(c.subtitle)) {
                            card.subtitle = c.subtitle;
                        }
                        //If button is involved in.
                        if (c.buttons.length > 0) {
                            let buttons = [];
                            for (let buttonIndex = 0; buttonIndex < c.buttons.length; buttonIndex++) {
                                let button = c.buttons[buttonIndex];

                                if (button.text) {
                                    let postback = button.postback;
                                    if (!postback) {
                                        postback = button.text;
                                    }

                                    let buttonDescription = {
                                        title: button.text
                                    };

                                    if (postback.startsWith("http")) {
                                        buttonDescription.type = "web_url";
                                        buttonDescription.url = postback;
                                    } else {
                                        buttonDescription.type = "postback";
                                        buttonDescription.payload = postback;
                                    }

                                    buttons.push(buttonDescription);
                                }
                            }

                            if (buttons.length > 0) {
                                card.buttons = buttons;
                            }
                        }

                        if (!facebookMessage.attachment) {
                            facebookMessage.attachment = { type: "template" };
                        }

                        if (!facebookMessage.attachment.payload) {
                            facebookMessage.attachment.payload = { template_type: "generic", elements: [] };
                        }

                        facebookMessage.attachment.payload.elements.push(card);
                    });

                    facebookMessages.push(facebookMessage);
                }

                    break;
                //message.type 2 means quick replies message
                case 2: {
                    if (message.replies && message.replies.length > 0) {
                        let facebookMessage = {};

                        facebookMessage.text = message.title ? message.title : 'Choose an item';
                        facebookMessage.quick_replies = [];

                        message.replies.forEach((r) => {
                            facebookMessage.quick_replies.push({
                                content_type: "text",
                                title: r,
                                payload: r
                            });
                        });

                        facebookMessages.push(facebookMessage);
                    }
                }

                    break;
                //message.type 3 means image message
                case 3:

                    if (message.imageUrl) {
                        let facebookMessage = {};

                        // "imageUrl": "http://example.com/image.jpg"
                        facebookMessage.attachment = { type: "image" };
                        facebookMessage.attachment.payload = { url: message.imageUrl };

                        facebookMessages.push(facebookMessage);
                    }

                    break;
                //message.type 4 means custom payload message
                case 4:
                    if (message.payload && message.payload.facebook) {
                        facebookMessages.push(message.payload.facebook);
                    }
                    break;

                default:
                    break;
            }
        }

        return new Promise((resolve, reject) => {
            async.eachSeries(facebookMessages, (msg, callback) => {
                this.sendFBSenderAction(sender, "typing_on")
                    .then(() => this.sleep(this.messagesDelay))
                    .then(() => this.sendFBMessage(sender, msg))
                    .then(() => callback())
                    .catch(callback);
            },
                (err) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        console.log('Messages sent');
                        resolve();
                    }
                });
        });

    }

    doTextResponse(sender, responseText) {
        console.log('Response as text message');
        // facebook API limit for text length is 640,
        // so we must split message if needed
        let splittedText = this.splitResponse(responseText);

        async.eachSeries(splittedText, (textPart, callback) => {
            this.sendFBMessage(sender, { text: textPart })
                .then(() => callback())
                .catch(err => callback(err));
        });
    }

    //which webhook event
    getEventText(event) {
        if (event.message) {
            if (event.message.quick_reply && event.message.quick_reply.payload) {
                return event.message.quick_reply.payload;
            }

            if (event.message.text) {
                return event.message.text;
            }
        }

        if (event.postback && event.postback.payload) {
            return event.postback.payload;
        }

        return null;
    }

    getFacebookEvent(event) {
        if (event.postback && event.postback.payload) {

            let payload = event.postback.payload;

            switch (payload) {
                case FACEBOOK_WELCOME:
                    return { name: FACEBOOK_WELCOME };

                case FACEBOOK_LOCATION:
                    return { name: FACEBOOK_LOCATION, data: event.postback.data }
            }
        }

        return null;
    }

    processFacebookEvent(event) {
        const sender = event.sender.id.toString();
        const eventObject = this.getFacebookEvent(event);

        if (eventObject) {

            // Handle a text message from this sender
            if (!this.sessionIds.has(sender)) {
                this.sessionIds.set(sender, uuid.v4());
            }

            let apiaiRequest = this.apiAiService.eventRequest(eventObject,
                {
                    sessionId: this.sessionIds.get(sender),
                    originalRequest: {
                        data: event,
                        source: "facebook"
                    }
                });
            this.doApiAiRequest(apiaiRequest, sender);
        }
    }

    processMessageEvent(event) {
        const sender = event.sender.id.toString();
        const text = this.getEventText(event);

        if (text) {

            // Handle a text message from this sender
            if (!this.sessionIds.has(sender)) {
                this.sessionIds.set(sender, uuid.v4());
            }

            console.log("Text", text);
            //send user's text to api.ai service
            let apiaiRequest = this.apiAiService.textRequest(text,
                {
                    sessionId: this.sessionIds.get(sender),
                    originalRequest: {
                        data: event,
                        source: "facebook"
                    }
                });

            this.doApiAiRequest(apiaiRequest, sender);
        }
    }

    doApiAiRequest(apiaiRequest, sender) {
        apiaiRequest.on('response', (response) => {
            console.log("api ai response : " + JSON.stringify(response));
            console.log("api ai response.result : " + JSON.stringify(response.result));

            if (this.isDefined(response.result) && this.isDefined(response.result.fulfillment)) {
                let responseText = response.result.fulfillment.speech;
                let responseData = response.result.fulfillment.data;
                let responseMessages = response.result.fulfillment.messages;

                if (this.isDefined(responseData) && this.isDefined(responseData.facebook)) {
                    let facebookResponseData = responseData.facebook;
                    this.doDataResponse(sender, facebookResponseData);
                } else if (this.isDefined(responseMessages) && responseMessages.length > 0) {
                    this.doRichContentResponse(sender, responseMessages);
                }
                else if (this.isDefined(responseText)) {
                    this.doTextResponse(sender, responseText);
                }

            }
        });

        apiaiRequest.on('error', (error) => console.error(error));
        apiaiRequest.end();
    }

    splitResponse(str) {
        if (str.length <= FB_TEXT_LIMIT) {
            return [str];
        }

        return this.chunkString(str, FB_TEXT_LIMIT);
    }

    chunkString(s, len) {
        let curr = len, prev = 0;

        let output = [];

        while (s[curr]) {
            if (s[curr++] == ' ') {
                output.push(s.substring(prev, curr));
                prev = curr;
                curr += len;
            }
            else {
                let currReverse = curr;
                do {
                    if (s.substring(currReverse - 1, currReverse) == ' ') {
                        output.push(s.substring(prev, currReverse));
                        prev = currReverse;
                        curr = currReverse + len;
                        break;
                    }
                    currReverse--;
                } while (currReverse > prev)
            }
        }
        output.push(s.substr(prev));
        return output;
    }

    sendFBMessage(sender, messageData) {
        return new Promise((resolve, reject) => {
            request({
                url: 'https://graph.facebook.com/v2.6/me/messages',
                qs: { access_token: FB_PAGE_ACCESS_TOKEN },
                method: 'POST',
                json: {
                    recipient: { id: sender },
                    message: messageData
                }
            }, (error, response) => {
                if (error) {
                    console.log('Error sending message: ', error);
                    reject(error);
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error);
                    reject(new Error(response.body.error));
                }

                resolve();
            });
        });
    }

    getFBUserInfo(sender) {
        return new Promise((resolve, reject) => {
            request({
                uri: "https://graph.facebook.com/v2.10/" + sender.id + "?fields=first_name,last_name,profile_pic,locale,user_birthday,timezone,gender&access_token=" + PAGE_ACCESS_TOKEN,
                method: 'GET'
            }, (error, response) => {
                if (error) {
                    console.log('Error while getting FB user info: ', error);
                    reject(error);
                } else {
                    console.log('FB user info result : ', response.body);
                    resolve(response.body);
                }
            });
        })
    }

    sendFBSenderAction(sender, action) {
        return new Promise((resolve, reject) => {
            request({
                url: 'https://graph.facebook.com/v2.6/me/messages',
                qs: { access_token: FB_PAGE_ACCESS_TOKEN },
                method: 'POST',
                json: {
                    recipient: { id: sender },
                    sender_action: action
                }
            }, (error, response) => {
                if (error) {
                    console.error('Error sending action: ', error);
                    reject(error);
                } else if (response.body.error) {
                    console.error('Error: ', response.body.error);
                    reject(new Error(response.body.error));
                }

                resolve();
            });
        });
    }

    doSubscribeRequest() {
        request({
            method: 'POST',
            uri: `https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=${FB_PAGE_ACCESS_TOKEN}`
        },
            (error, response, body) => {
                if (error) {
                    console.error('Error while subscription: ', error);
                } else {
                    console.log('Subscription result: ', response.body);
                }
            });
    }

    configureGetStartedEvent() {
        request({
            method: 'POST',
            uri: `https://graph.facebook.com/v2.6/me/thread_settings?access_token=${FB_PAGE_ACCESS_TOKEN}`,
            json: {
                setting_type: "call_to_actions",
                thread_state: "new_thread",
                call_to_actions: [
                    {
                        payload: FACEBOOK_WELCOME
                    }
                ]
            }
        },
            (error, response, body) => {
                if (error) {
                    console.error('Error while subscription', error);
                } else {
                    console.log('Subscription result', response.body);
                }
            });
    }

    isDefined(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }

        if (!obj) {
            return false;
        }

        return obj != null;
    }

    sleep(delay) {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(), delay);
        });
    }

}


let facebookBot = new FacebookBot();

const app = express();

app.use(bodyParser.text({ type: 'application/json' }));

app.get('/recherche/recette?mot=:m', (req, res) => {
    let mot = req.param('m');

    switch (mot) {
        case "poulet":
            return res.status(200).json({
                "Recettes": [
                    {
                        "IdRecette": 28,
                        "Titre": "Escalope de poulet à la crème et aux champignons",
                        "Description": "Nettoyez les champignons et faîtes-les risoler dans une poëlle avec un peu d'huile ou de beurre. Salez et poivrez à votre convenance. Puis ajoutez la ciboulette et le persil. Ajoutez la crème fraîche et laissez mijoter. Faîte rissolez les escaloppes de poulet dans un peu de d'huile ou de beurre. Puis salez et poivrez à votre convenance. Servez le poulet dans des grandes assiettes accompagné de riz ou de pâte et nappez de sauce aux champignons.",
                        "ImageUrl": "https://driveimg1.intermarche.com/fr/Ressources/images/publication/4723.jpg",
                        "Personnes": 4,
                        "Difficulte": 1,
                        "DureePreparation": 10,
                        "DureeCuisson": 10,
                        "DureeRepos": 0,
                        "DureeCongelation": 0,
                        "IngredientsPrincipaux": [
                            "1 pot de crème fraîche ",
                            "250 Gr de champignons",
                            "Sel",
                            "Ciboulette"
                        ],
                        "IngredientsPlacard": [
                            "Poivre",
                            "Persil"
                        ],
                        "ProduitsIngredients": [],
                        "ProduitsAnnexes": []
                    },
                    {
                        "IdRecette": 70,
                        "Titre": "Soupe thaï au lait de coco et émincé de poulet",
                        "Description": "Peler et couper en quatre la carotte et l'oignon. Emincer en lamelle le poulet.Plonger dans une grande casserole le poulet émincé, l'oignon et la carotte. Ajouter le bouquet garni, saler et poivrer. Couvrir et laisser cuire 30 minutes à feu doux et à couvert.  Verser le bouillon de volaille dans une casserole. Ajouter la citronnelle,      le gingembre, la pâte de curry et le lait de coco. Mélanger et porter à ébullition.Ajouter les petits pois et les champignons coupés en quatre puis laisser frémir 5 minutes. Ajouter le poulet et laisser à nouveau 5 minutes à feu doux. Ajouter les tomates cerises coupées en deux, le jus de citron et la coriandre ciselée. Servir sans plus attendre.\n",
                        "ImageUrl": "https://driveimg1.intermarche.com/fr/Ressources/images/publication/4916.jpg",
                        "Personnes": 4,
                        "Difficulte": 1,
                        "DureePreparation": 25,
                        "DureeCuisson": 45,
                        "DureeRepos": 0,
                        "DureeCongelation": 0,
                        "IngredientsPrincipaux": [
                            "100 Gr de champignons de Paris rosés ",
                            "12 tomates cerises",
                            "20 Cl de lait de coco",
                            "2 escalopes de poulet"
                        ],
                        "IngredientsPlacard": [
                            "50 Gr de petits pois frais écossés ou surgelés",
                            "1 oignon\t\t\t\t\t         ",
                            "1 carotte\t\t\t\t\t        ",
                            "1 bouquet garni\t\t\t\t        ",
                            "1/2 l de bouillon de volaille\t\t        ",
                            "1 citron vert",
                            "1 c. à soupe de pâte de curry jaune      ",
                            "Coriandre",
                            "citronnelle\t\t\t\t ",
                            "Sel",
                            "1 c. à c. de gingembre",
                            "Poivre"
                        ],
                        "ProduitsIngredients": [],
                        "ProduitsAnnexes": []
                    }
                ]

            });

            break;
        case "tomate": 

            break;
        case "concombre": 

            break;

        default:
            break;
    }















    if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(() => {
            facebookBot.doSubscribeRequest();
        }, 3000);
    } else {
        res.send('Error, wrong validation token');
    }
});

app.post('/webhook/', (req, res) => {
    try {
        const data = JSONbig.parse(req.body);

        if (data.entry) {
            let entries = data.entry;
            entries.forEach((entry) => {
                let messaging_events = entry.messaging;
                if (messaging_events) {
                    messaging_events.forEach((event) => {
                        if (event.message && !event.message.is_echo) {

                            if (event.message.attachments) {
                                let locations = event.message.attachments.filter(a => a.type === "location");

                                // delete all locations from original message
                                event.message.attachments = event.message.attachments.filter(a => a.type !== "location");

                                if (locations.length > 0) {
                                    locations.forEach(l => {
                                        let locationEvent = {
                                            sender: event.sender,
                                            postback: {
                                                payload: "FACEBOOK_LOCATION",
                                                data: l.payload.coordinates
                                            }
                                        };

                                        facebookBot.processFacebookEvent(locationEvent);
                                    });
                                }
                            }

                            facebookBot.processMessageEvent(event);
                        } else if (event.postback && event.postback.payload) {
                            if (event.postback.payload === "FACEBOOK_WELCOME") {
                                facebookBot.processFacebookEvent(event);
                            } else {
                                facebookBot.processMessageEvent(event);
                            }
                        }
                    });
                }
            });
        }

        return res.status(200).json({
            status: "ok"
        });
    } catch (err) {
        return res.status(400).json({
            status: "error",
            error: err
        });
    }

});

app.post('/ai', (req, res) => {

    var body = JSONbig.parse(req.body);

    if (body.result.action === 'recherche_libre_recette') {

        console.log("ACTION RECONNUE : recherche_libre_recette")
        console.log("DEBUT appel WS recettes");
        getRecette(body.result.parameters)
            .then((r) => {
                var listeRecette = JSONbig.parse(r);

                console.log("retour WS recettes OK : " + JSON.stringify(listeRecette));
                console.log("première recette : " + JSON.stringify(listeRecette.Recettes[0]));

                let messagedata = {
                    "attachment": {
                        "type": "template",
                        "payload": {
                            "template_type": "generic",
                            "elements": [
                                {
                                    "title": listeRecette.Recettes[0].Titre,
                                    "image_url": listeRecette.Recettes[0].ImageUrl,
                                    "subtitle": "Vous serez redirigé vers notre site web",
                                    "default_action": {
                                        "type": "web_url",
                                        "url": "http://google.fr",
                                        "webview_height_ratio": "tall"
                                    },
                                    "buttons": [
                                        {
                                            "title": "Cliquez ici",
                                            "type": "web_url",
                                            "url": "http://google.fr",
                                            "webview_height_ratio": "tall"
                                        }
                                    ]
                                }
                            ]
                        }
                    },
                    "quick_replies": [
                        {
                            "content_type": "text",
                            "title": "Autres recettes",
                            "payload": "Autres recettes"
                        },
                        {
                            "content_type": "text",
                            "title": "Menu Principal",
                            "payload": "Menu Principal"
                        }
                    ]
                };

                return res.json({
                    speech: "Titre première recette : " + listeRecette.Recettes[0].Titre,
                    data: { "facebook" : messagedata },
                    source: 'recherche_libre_recette'
                });
            })
            .catch(err => {
                return res.status(400).json({
                    speech: "ERREUR : " + err,
                    message: "ERREUR : " + err,
                    source: 'recherche_libre_recette'
                });
            });

    }
    else if (req.body.result.action === 'input.unknown') {
        console.log(req.body.result.action);

        let messagedata = JSON.stringify({
            "text": "Je suis désolé mais je ne comprends pas encore votre requête. Souhaitez vous que je vous redirige vers un interlocuteur humain?"
        });

        return res.json({
            speech: messagedata,
            message: messagedata,
            source: 'input.unknown'
        });
    }
});

app.get('/recette/', (req, res) => {
    if (req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(() => {
            facebookBot.doSubscribeRequest();
        }, 3000);
    } else {
        res.send('Error, wrong validation token');
    }
});

function getRecette(param) {
    let nourriture1 = param['Nourriture'];
    let nourriture2 = param['Nourriture1'];
    let nourriture3 = param['Nourriture2'];
    let nourriture4 = param['Nourriture21'];

    let my_array = [nourriture1, nourriture2, nourriture3, nourriture4];

    let resultat = '';
    let estPremier = true;

    for (var i = 0; i < my_array.length; i++) {
        if (my_array[i] != null && my_array != '') {
            resultat += (estPremier ? '' : ' ') + my_array[i];
            estPremier = false;
        }
    }

    resultat = encodeURIComponent(resultat);
    let url = `http://wsmcommerce.intermarche.com/api/v1/recherche/recette?mot=${resultat}`;

    console.log("URRRRRRRRRRRRRRRRRRRRRRLLLLL : " + url);

    var options = {
        method: 'GET',
        uri: url,
        headers: {
            'TokenAuthentification': '1deaaf3c-0850-47c6-bbcf-c817da686dff'
        }
    };

    
    return new Promise((resolve, reject) => {
        request(options, (error, response) => {
            if (!error && response.statusCode == 200) {
                resolve(response.body);
            }
            else {
                reject(error);
            }
        })
    })
}

app.listen(REST_PORT, () => {
    console.log('Rest service ready on port ' + REST_PORT);
});

facebookBot.doSubscribeRequest();