const isEmpty = require("lodash/isEmpty");
const Store = require("./store");
const User = require("../models/user");

class UserStore extends Store {
    insert(email, mcoId, fbId) {
        const user = new User(
            email,
            mcoId,
            fbId
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
        let currentUser = {};
        this.data.forEach((userData) => {
            if (userData.mcoId === mcoId) {
                currentUser = userData;
            }
        });
        return currentUser;
    }

    getByFbId(fbId) {
        let currentUser = {};
        this.data.forEach((userData) => {
            if (userData.fbId === fbId) {
                currentUser = userData;
            }
        });
        return currentUser;
    }

    linkMcoAccount(email, mcoId) {
        return this.update(email, { mcoId });
    }

    linkFbAccount(mcoId, fbId) {
        const currentUser = this.getByMcoId(mcoId);
        if (isEmpty(currentUser)) { return currentUser; }

        return this.update(email, { fbId });
    }

    unlinkWithFbId(fbId) {
        const currentUser = this.getByFbId(fbId);
        if (isEmpty(currentUser)) { return currentUser; }

        return this.delete(currentUser.email);
    }
}

const USER_STORE = new UserStore();

module.exports = USER_STORE;