export default class Store {
    constructor() {
        this.data = new Map();
    }

    get(id) {
        return this.data.get(id.toLowerCase());
    }

    set(id, value) {
        return this.data.set(id.toLowerCase(), value);
    }

    has(id) {
        return this.data.has(id.toLowerCase());
    }

    delete(id) {
        const deleted = this.get(id);
        this.data.delete(id);
        return { deleted };
    }

    reset() {
        this.data.clear();
        return this;
    }
}