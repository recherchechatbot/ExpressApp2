module.exports = class User {
    constructor(email, mcoId, fbId, idPdv, foSession) {
        this.email = email;
        this.mcoId = mcoId;
        this.fbId = fbId;
        this.idPdv = idPdv;
        this.foSession = foSession;
    }
}