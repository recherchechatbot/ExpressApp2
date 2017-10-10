module.exports = class User {
    constructor(email, mcoId, fbId, idPdv, foSession, prenom, nomFamille, namePdvFavori) {
        this.email = email;
        this.mcoId = mcoId;
        this.fbId = fbId;
        this.idPdv = idPdv;
        this.prenom = prenom;
        this.nomFamille = nomFamille;
        this.namePdvFavori = namePdvFavori;
        this.foSession = foSession;
    }
}