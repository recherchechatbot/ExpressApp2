'use strict';

const apiai = require('apiai');
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const request = require('request');
const JSONbig = require('json-bigint');
const async = require('async');
const https = require('https');

const REST_PORT = (process.env.PORT || 5000);
const APIAI_ACCESS_TOKEN = "30dfeddc13344176b6cefa6c09056e73";
const APIAI_LANG = 'fr';
const FB_VERIFY_TOKEN = "tuxedo_cat";
const FB_PAGE_ACCESS_TOKEN = "EAACCYV5YLVEBACNZC62bmnLHJLK6HlZCTSHnGYsbXsjCZA76bReVFQQ2jNnHgWuk4wFWjr3DOxhpvOMso2c1bySZAiDSENV7LfYNVvmUPEXzSaUbrc8n7hG1UCCVsSgqwPCduHbxDpqg5EtqhitzQTHvnkcsBn0wZCYfTTYF37QZDZD";
const FB_TEXT_LIMIT = 640;

const FACEBOOK_LOCATION = "FACEBOOK_LOCATION";
const FACEBOOK_WELCOME = "FACEBOOK_WELCOME";
const SERVER_URL = "https://converseauto3.herokuapp.com/";

const app = express();

app.use(bodyParser.text({ type: 'application/json' }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

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
        console.log('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');

        if (text) {

            console.log("ON VIENT DE TAPER LE MOT : " + text);

            if (text == "account linking")
            {
                this.sendAccountLinking(sender);
            }
            else
            {
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
    }

    sendAccountLinking(recipientId) {

        var messageData = {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "Welcome. Link your account.",
                    buttons: [{
                        type: "account_link",
                        url: SERVER_URL + "/authorize"
                    }]
                }
            }
        };

        this.sendFBMessage(recipientId, messageData);
    }

    receivedAccountLink(event) {
        var senderID = event.sender.id;
        var recipientID = event.recipient.id;

        var status = event.account_linking.status;
        var authCode = event.account_linking.authorization_code;

        console.log("Received account link event with for user %d with status %s " +
            "and auth code %s ", senderID, status, authCode);
    }

    receivedAuthentication(event) {
        var senderID = event.sender.id;
        var recipientID = event.recipient.id;
        var timeOfAuth = event.timestamp;


        var passThroughParam = event.optin.ref;

        console.log("Received authentication for user %d and page %d with pass " +
            "through param '%s' at %d", senderID, recipientID, passThroughParam,
            timeOfAuth);


        this.doTextResponse(senderID, "Authentication successful");
    }

    doApiAiRequest(apiaiRequest, sender) {
        apiaiRequest.on('response', (response) => {

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



app.get('/recherche/recette/:m', (req, res) => {
    let mot = req.param('m');

    switch (mot.toLowerCase()) {
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
            return res.status(200).json({
                "Recettes": [
                    {
                        "IdRecette": 23,
                        "Titre": "Salade de billes de melon, tomates cerises et mozzarella",
                        "Description": "Détaillé le melon en petites billes, otez le pédoncule des tomates cerises et bien les laver.Dans un saladier, melangez les billes de melon, de mozzarella et les tomates cerises.Versez le vinaigre balsamique et l'huile d'olive puis le sel et le poivre.Melangez et rajoutez le basilic et les feuilles de menthe.Mettre au frais 1h avant de servir.",
                        "ImageUrl": "https://driveimg1.intermarche.com/fr/Ressources/images/publication/4668.jpg",
                        "Personnes": 4,
                        "Difficulte": 1,
                        "DureePreparation": 10,
                        "DureeCuisson": 0,
                        "DureeRepos": 0,
                        "DureeCongelation": 0,
                        "IngredientsPrincipaux": [
                            "1 melon bien mûr",
                            "500 g de tomates-cerises",
                            "500 g de cerisettes de mozzarella",
                            "1 cs vinaigre Balsamique"
                        ],
                        "IngredientsPlacard": [
                            "Menthe fraîche",
                            "basilic frais",
                            "2 cs d'huile d'olive",
                            "sel",
                            "poivre"
                        ],
                        "ProduitsIngredients": [],
                        "ProduitsAnnexes": []
                    },
                    {
                        "IdRecette": 39,
                        "Titre": "Clafoutis aux tomates cerises",
                        "Description": "Utilisez 1 cs d'huile d'olive pour huiler le plat à gratin, puis frottez le avec la gousse d'aïl. Préchauffez le four à 210°C (th 8). Lavez et séchez les tomates, puis passez les 5 minutes à la poêle dans l'huile restante, avec les herbes de Provence. Otez du feu.Hachez la mozzarella. Fouettez dans un saladier les oeufs, la crème, la mozzarella et la gousse écrasée. Ajoutez aux tomates dans la poele refroidie. Salez et poivrez, puis remuez doucement.\nVersez dans le plat à gratin, et enfournez pour un quart d'heure. Au moment de servir, parsemez de feuilles de basilic.\n",
                        "ImageUrl": "https://driveimg1.intermarche.com/fr/Ressources/images/publication/4911.jpg",
                        "Personnes": 4,
                        "Difficulte": 1,
                        "DureePreparation": 10,
                        "DureeCuisson": 15,
                        "DureeRepos": 0,
                        "DureeCongelation": 0,
                        "IngredientsPrincipaux": [
                            "500 Gr de tomates cerises",
                            "16 feuilles de basilic",
                            "1 gousse d'ail",
                            "mozzarella"
                        ],
                        "IngredientsPlacard": [
                            "crème fraiche",
                            "3 oeufs",
                            "1 cc d'herbes de provence",
                            "5 cs d'huile d'olive",
                            "sel",
                            "poivre"
                        ],
                        "ProduitsIngredients": [],
                        "ProduitsAnnexes": []
                    }
                ]

            });
            break;
        case "concombre":
            return res.status(200).json({
                "Recettes": [
                    {
                        "IdRecette": 196,
                        "Titre": "Tartelettes de concombre comme un montblanc   ",
                        "Description": "Eplucher le concombre et prélever des lanières à l'aide d'un économe. Saupoudrer de gros sel et les laisser lanières dégorger une quinzaine de minutes. Les rincer longuement et les sécher sur du papier absorbant. Mélanger le fromage blanc, les lanières de concombre et la menthe finement ciselée. Rectifier l'assaisonnement.\nDéposer des couches successives de ricotta émiettée et de fromage blanc au concombre sur les fonds de tartelettes précuites et terminer par la ricotta. Servir aussitôt. Les trucs et astuces de Sonia Ezgulian : Gagnez du temps en râpant le concombre et en le mélangeant avec le fromage blanc sans le faire dégorger et dégustez les tartelettes rapidement pour qu'elles ne détrempent pas.\n",
                        "ImageUrl": "https://driveimg1.intermarche.com/fr/Ressources/images/publication/5543.jpg",
                        "Personnes": 4,
                        "Difficulte": 1,
                        "DureePreparation": 10,
                        "DureeCuisson": 20,
                        "DureeRepos": 0,
                        "DureeCongelation": 0,
                        "IngredientsPrincipaux": [
                            "1 concombre",
                            "100 gr de fromage blanc",
                            "100 gr de ricotta",
                            " pâte brisée"
                        ],
                        "IngredientsPlacard": [
                            "1 cuillerée à soupe de gros sel",
                            "4 feuilles de menthe"
                        ],
                        "ProduitsIngredients": [],
                        "ProduitsAnnexes": []
                    },
                    {
                        "IdRecette": 441,
                        "Titre": "Rillettes de thon au concombre",
                        "Description": "Mettre le thon dans un saladier. Ajouter le demi-concombre coupé en dés fins (on aura pris soin d'évider les graines au centre).Ajouter de la mayonnaise jusqu'à obtenir la consistance souhaitée. Saler, poivrer.",
                        "ImageUrl": "https://driveimg1.intermarche.com/fr/Ressources/images/publication/5260.jpg",
                        "Personnes": 4,
                        "Difficulte": 0,
                        "DureePreparation": 10,
                        "DureeCuisson": 0,
                        "DureeRepos": 0,
                        "DureeCongelation": 0,
                        "IngredientsPrincipaux": [
                            "1 boite de thon",
                            "1/2 concombre",
                            "Mayonnaise"
                        ],
                        "IngredientsPlacard": [
                            "sel",
                            "poivre"
                        ],
                        "ProduitsIngredients": [],
                        "ProduitsAnnexes": []
                    }
                ]

            });
            break;

        default:
            return res.status(200).json({
                "Recettes": [{
                    "Titre": "Veuillez rentrer quelque chose d'autre",
                    "ImageUrl": "https://www.formassembly.com/images/illustrations/robot-msg-error.png"
                }
                ]

            });
            break;
    }
});

app.post('/webhook/', (req, res) => {
    try {
        const data = JSONbig.parse(req.body);
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

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
                        else if (event.account_linking)
                        {
                            console.log('ON RENNNNNNNTRE DANS ACCCOUUUUUNT LINKIIIIIIIIIIIIIIIIIIIING')
                            facebookBot.receivedAccountLink(event);
                        }
                        else if (event.optin)
                        {
                            facebookBot.receivedAuthentication(event);
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



app.get('/authorize', function (req, res) {
    var accountLinkingToken = req.query.account_linking_token;
    var redirectURI = req.query.redirect_uri;

    // Authorization Code should be generated per user by the developer. This will 
    // be passed to the Account Linking callback.
    var authCode = "1234567890";

    // Redirect users to this URI on successful login

    res.render('authorize', {
        accountLinkingToken: accountLinkingToken,
        redirectURI: redirectURI
    });
});

function loginMCommerce(email, mdp) {
    console.log("Email : " + email);
    console.log("Mdp : " + mdp);

    return new Promise((resolve, reject) => {
        request({
            url: 'http://wsmcommerce.intermarche.com/api/v1/loginRc',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                "email": email,
                "motdepasse": mdp,
                "veutcartefid": false,
                "idrc": "E6D86BF5-FAE6-4F41-8978-07B04AC6DF63"
            }
        }, (error, response) => {
            if (error) {
                console.log('Erreur login mcommerce: ', error);
                reject(error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
                reject(new Error(response.body.error));
            }

            resolve();
        });
    });
}

/**
 * User login route is used to authorize account_link actions
 */
app.post('/login', function (req, res) {

    var resultat = JSONbig.parse(req.body);


    console.log("VALEUR DE BODY : " + JSON.stringify(req.body));

    //const userLogin = UserStore.get(username);
    //if (!userLogin || userLogin.password !== password) {
    //    res.render('authorize', {
    //        redirectURI,
    //        username,
    //        password,
    //        errorMessage: !userLogin
    //            ? 'Uh oh. That username doesn’t exist. Please use the demo account or try again.' // eslint-disable-line max-len
    //            : 'Oops. Incorrect password',
    //        errorInput: !userLogin ? 'username' : 'password',
    //    });
    //} else {
    //    linkAccountToMessenger(res, userLogin.username, redirectURI);
    //}

    var authCode = null;

    

    loginMCommerce(resultat.email, resultat.mdp)
        .then((r) => {
            var retour = JSONbig.parse(r);

            if (retour.TokenAuthentification) {
                authCode = retour.TokenAuthentification
                console.log("le token a bien été récupéré");
                const redirectURISuccess = `${resultat.redirectURI}&authorization_code=${authCode}`;
                console.log("URL DE REDIRECTION: " + redirectURISuccess);

                return res.json({
                    EstEnErreur: false,
                    urlRedirection: redirectURISuccess
                });
            }
            else {
                console.log("le token n'a pas été récupéré mais la réponse est ok");
                return res.json({
                    EstEnErreur: true,
                    urlRedirection: ""
                });
            }
        })
        .catch(err => {
            console.log("ERREUR recup token : " + JSON.stringify(err));
            console.log("le token n'a pas été récupéré à cause d'une erreur");
            return res.json({
                EstEnErreur: true,
                urlRedirection: ""
            });
        });

    /*
      The auth code can be any thing you can use to uniquely identify a user.
      Once the redirect below happens, this bot will receive an account link
      message containing this auth code allowing us to identify the user.
      NOTE: It is considered best practice to use a unique id instead of
      something guessable like a users username so that malicious
      users cannot spoof a link.
     */
    //const authCode = uuid();

    // set the messenger id of the user to the authCode.
    // this will be replaced on successful account link
    // with the users id.

    //UserStore.linkMessengerAccount(username, authCode);

    // Redirect users to this URI on successful login

});

app.post('/ai', (req, res) => {

    var body = JSONbig.parse(req.body);

    if (body.result.action === 'recherche_libre_recette') {

        console.log("ACTION RECONNUE : recherche_libre_recette")
        console.log("DEBUT appel WS recettes");
        getRecette(body.result.parameters)
            .then((r) => {
                var listeRecette = JSONbig.parse(r);

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
                                },
                                {
                                    "title": listeRecette.Recettes[1].Titre,
                                    "image_url": listeRecette.Recettes[1].ImageUrl,
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
                    speech: "Recettes",
                    data: { "facebook": messagedata },
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
    else if (body.result.action === 'Localisation.Recue') {
        console.log("body.result = " + JSON.stringify(body.result));

        let context = getContextByName(body.result.contexts, "facebook_location");

        if (context) {
            let long = context.parameters.long;
            let lat = context.parameters.lat;

            getMagasin(lat, long)
                .then((m) => {
                    var listeMagasins = JSONbig.parse(m);

                    if (listeMagasins[0]) {
                        console.log("ID premier Magasin : " + JSON.stringify(listeMagasins[0].IdPdv));

                        return res.json({
                            speech: "Id premier magasin: " + listeMagasins[0].IdPdv,
                            source: 'Localisation.Recue'
                        });
                    }

                    return res.json({
                        speech: "Aucun magasin",
                        source: 'Localisation.Recue'
                    });
                })
                .catch(err => {
                    return res.status(400).json({
                        speech: "ERREUR : " + err,
                        message: "ERREUR : " + err,
                        source: 'Localisation.Recue'
                    });
                });
        }
        else {
            return res.json({
                speech: "Localisation non recue",
                source: 'Localisation.Recue'
            });
        }
    }
    else if (body.result.action === 'input.unknown') {

        return res.json({
            speech: "Je suis désolé mais je ne comprends pas encore votre requête. Souhaitez vous que je vous redirige vers un interlocuteur humain?",
            source: 'input.unknown'
        });
    }
});


function getMagasin(lat, long) {

    return new Promise((resolve, reject) => {

        request({
            uri: `http://ecorct2-fr-wsmcommerce.mousquetaires.com/api/v1/pdv/distance?latitude=${lat}&longitude=${long}`,
            method: 'GET'
        }, (error, response) => {
            if (error) {
                console.log('Error while getting shop list: ', error);
                reject(error);
            } else {
                console.log('shop list result : ', response.body);
                resolve(response.body);
            }
        });
    })
}

function getContextByName(contexts, name) {
    return contexts.filter(
        function (c) { return c.name == name }
    )[0];
}

app.get('/webhook/', (req, res) => {
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
    let url = `https://converseauto3.herokuapp.com/recherche/recette/${nourriture1}`;
    //let url = `http://ecorct2-fr-wsmcommerce.mousquetaires.com/api/v1/recherche/recette?mot=${resultat}`;
    //let url = `http://wsmcommerce.intermarche.com/api/v1/recherche/recette?mot=${resultat}`;
    console.log("URRRRRRRRRRRRRRRRRRRRRRLLLLL : " + url);

    var options = {
        method: 'GET',
        uri: url,
        headers: {
            'TokenAuthentification': '3399a7d5-c015-441d-a509-afe582b0c51d'
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

module.exports = app;