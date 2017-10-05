module.exports = class User {
    constructor(email, mcoId, fbId) {
        this.email = email;
        this.mcoId = mcoId;
        this.fbId = fbId;
    }
}