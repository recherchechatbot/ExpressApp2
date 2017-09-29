const express = require('express');
const bodyParser = require('body-parser');
const JSONbig = require('json-bigint');
const app = express();
const request = require('request');
var http = require("http");
const apiaiApp = require('apiai')('30dfeddc13344176b6cefa6c09056e73');
const PAGE_ACCESS_TOKEN = 'EAAMkZAtH8lc4BADZBikUDtmMPVjJUE2Ybf601hzdI3TboCoEfg9EKPUYjUa56XRcSaZCZA1UbFyS4CdAk7ntspT3Nhw3WGLv5AxJSf24biLXreuSaR8YIDFcZArVK7HQ8bTtRZA6SlNLoMMZCLZBNjOJDHqfK47oJKTl60rnZAgnpwQZDZD';
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

        setTimeout(function () {
            doSubscribeRequest();
        }, 3000);
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
                    sendMessage2(event);
                }
            });
        });
        res.status(200).end();
    }
    console.log("FIN POST WEBHOOK");
});

function sendMessage2(event) {
    let sender = event.sender.id;

    userInfoRequest(sender)
        .then((r) => {
            var profil = JSONbig.parse(r);
            console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr :" + r);
            console.log("profil :" + profil);
            console.log("profil stringify :" + JSON.stringify(profil));

            request({
                url: 'https://graph.facebook.com/v2.10/me/messages',
                qs: { access_token: PAGE_ACCESS_TOKEN },
                method: 'POST',
                json: {
                    recipient: { id: sender },
                    message: { text: profil.first_name }
                }
            }, (error, response) => {
                if (error) {
                    console.log('Error sending message: ', error);
                } else if (response.body.error) {
                    console.log('Error: ', response.body.error);
                }
            });
        })
        .catch(err => {

            console.log("/sendMessage2 : on est dans le catch (err = " + err + ")");
           
        });
}


function sendMessage(event) {
    let sender = event.sender.id;
    let text = event.message.text;

    console.log("ENVOI A API.AI text = " + text);

    let apiai = apiaiApp.textRequest(text, {
        sessionId: 'Wesh_Wesh_Wesh' // use any arbitrary id
    });

    apiai.on('response', (response) => {
        console.log("REPONSE API AI SUCCES");
        console.log("response : " + JSON.stringify(response));

        console.log("response.result.fulfillment.speech = " + response.result.fulfillment.speech);
        let aiText = response.result.fulfillment.speech;

        request({
            url: 'https://graph.facebook.com/v2.10/me/messages',
            qs: { access_token: PAGE_ACCESS_TOKEN },
            method: 'POST',
            json: {
                recipient: { id: sender },
                message: aiText 
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
    //let myjson = JSONbig.parse(req.body);
    //console.log(myjson);
    //console.log(req.body);
    //let sender = myjson.originalRequest.data.sender.id;
    //console.log(sender);
    console.log("DEBUT POST AI");
    console.log("req : " + JSON.stringify(req.body.result));
    if (req.body.result.action === 'recherche_libre_recette') {

        getRecette(req.body.result.parameters)
            .then((r) => {
                var listeRecette = JSONbig.parse(r);

                console.log("/ai : on est dans le then (listeRecette = " + listeRecette + ")");

                let messagedata = JSON.stringify({
                    "attachment": {
                        "type": "template",
                        "payload": {
                            "template_type": "generic",
                            "elements": [
                                {
                                    "title": listeRecette[0].Titre,
                                    "image_url": listeRecette[0].ImageUrl,
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
                });

                return res.json({
                    speech: messagedata,
                    message: messagedata,
                    source: 'recherche_libre_recette'
                });
            })
            .catch(err => {

                console.log("/ai : on est dans le catch (err = " + err + ")");

                return res.json({
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

function getRecette(param) {
    console.log("getRecette : DEBUT (param = " + param + ")");

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

    console.log("getRecette : resultat = " + resultat);

    //http://wsmcommerce.intermarche.com/api/v1/recherche/recette?mot=${resultat},

    var options = {
        method: 'GET',
        uri: `http://wsmcommerce.intermarche.com/api/v1/recette`,
        headers: {
            'TokenAuthentification': '53c054d2-eb10-4890-a963-59de901a43ae'
        }
    };

    return new Promise((resolve, reject) => {
        request(options, (error, response) => {
            if (!error && response.statusCode == 200) {
                console.log("getRecette : SUCCES RECUP RECETTES");
                resolve(response.body);
            }
            else {
                console.log("getRecette : ERREUR RECUP RECETTES");
                reject(error);
            }
        })
    })
}


function userInfoRequest(userId) {
    let mon_url = "https://graph.facebook.com/v2.10/" + userId + "?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=" + PAGE_ACCESS_TOKEN;
    console.log("mon_url = " + mon_url);

    return new Promise((resolve, reject) => {
        request({
            uri: mon_url,
            method: 'GET'
        }, (error, response) => {
            if (error) {
                console.log('Error while userInfoRequest: ', error);
                reject(error);
            } else {
                console.log('userInfoRequest result : ', response.body);
                resolve(response.body);
            }
        });
    })
}


function doSubscribeRequest() {
    request({
        method: 'POST',
        uri: `https://graph.facebook.com/v2.10/me/subscribed_apps?access_token=${PAGE_ACCESS_TOKEN}`
    },
    (error, response, body) => {
        if (error) {
            console.error('Error while subscription: ', error);
        } else {
            console.log('Subscription result: ', response.body);
        }
    });
}

doSubscribeRequest();





