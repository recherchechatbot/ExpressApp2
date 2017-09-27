const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const apiaiApp = require('apiai')('b1791ee1ebc14aa88140d78699ed0d93');
const PAGE_ACCESS_TOKEN = 'EAAMkZAtH8lc4BAFZA7aVSHMp1JRANNRNe2tNnxWZCw0kX90l9Jons7nBzVaDI0fBjJOCLFMhq7AUJvOyjdO4OdpS6QrClDCYAob03KFpNkUZCyhhvDEDZA9tD3BvF0Jrad95DQJgGvV2d44T1EPZAzGFGJOWtHZADeMMcq02zYchAZDZD';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 5000, () => {
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

/* For Facebook Validation */
app.get('/webhook', (req, res) => {
    console.log(req);
    if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'tuxedo_cat') {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.status(403).end();
    }
});

/* Handling all messenges */
app.post('/webhook', (req, res) => {
    console.log("DEBUT POST WEBHOOK");
    if (req.body.object === 'page') {
        req.body.entry.forEach((entry) => {
            entry.messaging.forEach((event) => {
                if (event.message && event.message.text) {
                    sendMessage(event);
                }
            });
        });
        res.status(200).end();
    }
    console.log("FIN POST WEBHOOK");
});

function sendMessage(event) {
    let sender = event.sender.id;
    let text = event.message.text;

    let apiai = apiaiApp.textRequest(text, {
        sessionId: 'tabby_cat' // use any arbitrary id
    });

    apiai.on('response', (response) => {
        console.log("REPONSE API AI SUCCES");
        console.log("response : " + response);

        let aiText = response.result.fulfillment.speech;

        request({
            url: 'https://graph.facebook.com/v2.10/me/messages',
            qs: { access_token: PAGE_ACCESS_TOKEN },
            method: 'POST',
            json: {
                recipient: { id: sender },
                message: { text: aiText }
            }
        }, (error, response) => {
            if (error) {
                console.log('Error sending message: ', error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
            }
        });
    });

    apiai.on('error', (error) => {
        console.log("REPONSE API AI ERREUR");
        console.log(error);
    });

    apiai.end();
}


app.post('/ai', (req, res) => {
    let sender = event.sender.id;
    console.log("DEBUT POST AI");
    console.log("req : " + req);
    if (req.body.result.action === 'recherche_libre_recette') {
        let nourriture1 = req.body.result.parameters['Nourriture'];
        let nourriture2 = req.body.result.parameters['Nourriture1'];
        let nourriture3 = req.body.result.parameters['Nourriture2'];
        let nourriture4 = req.body.result.parameters['Nourriture21'];

        console.log("Nourriture : " + nourriture1);

        //let msg = 'Resultats des recettes avec:' + nourriture1 + ',' + nourriture2 + ',' + nourriture3 + ', et ' + nourriture4;
        let messagedata = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [
                        {
                            "title": "Résultats de votre recherche",
                            "image_url": "http://eganhospitality.ie/wp-content/uploads/2014/11/11.png",
                            "subtitle": "Vous serez redirigé vers notre site web",
                            "default_action": {
                                "type": "web_url",
                                "url": "https://www.intermarche.com/home/canal-intermarche/recettes/liste-recette.searchRecette.do?keyword=$Nourriture&type-plat=&redirectUrl=%2Fcms%2Frender%2Flive%2Ffr_FR%2Fsites%2Fintermarche%2Fhome%2Fcanal-intermarche%2Frecettes%2Fliste-recette.html&chercher-recettes=Chercher",
                                "webview_height_ratio": "tall"
                            },
                            "buttons": [
                                {
                                    "title": "Cliquez ici",
                                    "type": "web_url",
                                    "url": "https://www.intermarche.com/home/canal-intermarche/recettes/liste-recette.searchRecette.do?keyword=$Nourriture&type-plat=&redirectUrl=%2Fcms%2Frender%2Flive%2Ffr_FR%2Fsites%2Fintermarche%2Fhome%2Fcanal-intermarche%2Frecettes%2Fliste-recette.html&chercher-recettes=Chercher",
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
        }
           
        return res.json({
            //speech: messagedata,
            recipient: { id: sender },
            displayText: messagedata
            //source: 'recherche_libre_recette'
        });


        //let restUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID=' + WEATHER_API_KEY + '&q=' + city;

        //request.get(restUrl, (err, response, body) => {
        //    if (!err && response.statusCode == 200) {
        //        let json = JSON.parse(body);
        //        let msg = json.weather[0].description + ' and the temperature is ' + json.main.temp + ' ℉';
        //        return res.json({
        //            speech: msg,
        //            displayText: msg,
        //            source: 'weather'
        //        });
        //    } else {
        //        return res.status(400).json({
        //            status: {
        //                code: 400,
        //                errorType: 'I failed to look up the city name.'
        //            }
        //        });
        //    }
        //})
    }
    console.log("FIN POST AI");
})


//function sendGenericMessage(sender) {
//    let messageData = {
//        "attachment": {
//            "type": "template",
//            "payload": {
//                "template_type": "generic",
//                "elements": [{
//                    "title": "First card",
//                    "subtitle": "Element #1 of an hscroll",
//                    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
//                    "buttons": [{
//                        "type": "web_url",
//                        "url": "https://www.messenger.com",
//                        "title": "web url"
//                    }, {
//                        "type": "postback",
//                        "title": "Postback",
//                        "payload": "Payload for first element in a generic bubble",
//                    }],
//                }, {
//                    "title": "Second card",
//                    "subtitle": "Element #2 of an hscroll",
//                    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
//                    "buttons": [{
//                        "type": "postback",
//                        "title": "Postback",
//                        "payload": "Payload for second element in a generic bubble",
//                    }],
//                }]
//            }
//        }
//    }
//    request({
//        url: 'https://graph.facebook.com/v2.6/me/messages',
//        qs: { access_token: token },
//        method: 'POST',
//        json: {
//            recipient: { id: sender },
//            message: messageData,
//        }
//    }, function (error, response, body) {
//        if (error) {
//            console.log('Error sending messages: ', error)
//        } else if (response.body.error) {
//            console.log('Error: ', response.body.error)
//        }
//    })
//}