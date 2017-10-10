const isEmpty = require("lodash/isEmpty");
const Store = require("./store");
const User = require("../models/user");

class UserStore extends Store {
    insert(email, mcoId, fbId, idPdv, foSession,prenom, nomFamille,namePdvFavori) {
        const user = new User(
            email,
            mcoId,
            fbId,
            idPdv,
            prenom,
            nomFamille,
            namePdvFavori,
            foSession
        );
        this.set(email, user);
        return user;
    }

    update(email, updateObject) {
        const currentUser = this.get(email);
        if (!currentUser) { return {}; }

        const updatedUser = Object.assign({}, currentUser, updateObject);
        this.set(email, updatedUser);
        return updatedUser;
    }

    getByMcoId(mcoId) {
        console.log("DEBUT getByMcoId mcoId = " + mcoId);
        let currentUser = {};
        this.data.forEach((userData) => {
            if (userData.mcoId === mcoId) {
                currentUser = userData;
                console.log("TROUVEEEEEEEEEEEEEEEEEEEEEEE");
            }
        });
        console.log("FIN getByMcoId");
        return currentUser;
    }

    getByFbId(fbId) {
        console.log("DEBUT getByFbId fbId = " + fbId);
        let currentUser = {};
        this.data.forEach((userData) => {
            console.log("userData = " + JSON.stringify(userData));
            console.log("on compare " + userData.fbId + " avec " + fbId);
            if (userData.fbId === fbId) {
                console.log("TROUVEEEEEEEEEEEEEEEEEEEEEEE");
                currentUser = userData;
            }
        });
        console.log("FIN getByFbId");
        return currentUser;
    }

    linkMcoAccount(email, mcoId) {
        return this.update(email, { mcoId });
    }

    linkFoSession(email, foSession) {
        return this.update(email, { foSession });
    }

    linkFbAccount(mcoId, fbId) {
        console.log("DEBUT linkFbAccount fbId = " + fbId + " mcoId = " + mcoId);
        const currentUser = this.getByMcoId(mcoId);
        if (isEmpty(currentUser))
        {
            console.log("TROUVEEEEEEEEEEEEEEEEEEEEEEE");
            return currentUser;
        }

        console.log("FIN linkFbAccount");
        return this.update(currentUser.email, { fbId });
    }

    linkPdv(mcoId, idPdv) {
        const currentUser = this.getByMcoId(mcoId);
        if (isEmpty(currentUser)) {
            return currentUser;
        }

        return this.update(currentUser.email, { idPdv });
    }

    linkFirstName(mcoId, prenom) {
        const currentUser = this.getByMcoId(mcoId);
        console.log("Current user dans linkFirst Name:  " + currentUser)
        return this.update(currentUser.email, { prenom });
    }

    linkLastName(mcoId, nomFamille) {
        const currentUser = this.getByMcoId(mcoId);
        if (isEmpty(currentUser)) {
            return currentUser;
        }

        return this.update(currentUser.email, { nomFamille });
    }

    linkNamePdvFavori(mcoId, namePdvFavori) {
        const currentUser = this.getByMcoId(mcoId);
        if (isEmpty(currentUser)) {
            return currentUser;
        }

        return this.update(currentUser.email, { namePdvFavori });
    }

    unlinkWithFbId(fbId) {
        const currentUser = this.getByFbId(fbId);
        if (isEmpty(currentUser)) { return currentUser; }

        return this.delete(currentUser.email);
    }
}

const USER_STORE = new UserStore();

module.exports = USER_STORE;