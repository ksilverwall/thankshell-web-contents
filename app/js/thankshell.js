class ThankshellApi {
    constructor(session) {
        this.session = session;
        this.headers = {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: this.session.idToken.jwtToken
        };
    }

    getUri(path) {
        return 'https://api.thankshell.com/dev' + path;
    }

    async getUser() {
        let response = await fetch(this.getUri('/user/'), {
            method: "GET",
            headers: this.headers,
        });
        return await response.json();
    }

    //-------------------------------------------------
    // Groups

    async getGroup(groupName) {
        let response = await fetch(this.getUri('/groups/' + groupName), {
            method: "GET",
            headers: this.headers,
        });

        return new GroupInfo(await response.json());
    }

    async sendGroupJoinRequest(groupName, userId) {
        let response = await fetch(this.getUri('/groups/' + groupName + '/requests/' + userId), {
            method: "PUT",
            headers: this.headers,
        });
        let data = await response.json();
    }

    async cancelGroupJoinRequest(groupName, userId) {
        let response = await fetch(this.getUri('/groups/' + groupName + '/requests/' + userId), {
            method: "DELETE",
            headers: this.headers,
        });
        let data = await response.json();
    }

    async acceptGroupJoinRequest(groupName, userId) {
        let response = await fetch(this.getUri('/groups/' + groupName + '/members/' + userId), {
            method: "PUT",
            headers: this.headers,
        });
        let data = await response.json();
        console.log(data);
    }

    //-------------------------------------------------
    // Transactions

    async createTransaction(data) {
        let response = await fetch(this.getUri('/token/selan/transactions'), {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(data),
        });

        if (response.status !== 200) {
            let data = await response.json();
            throw new Error(data.message);
        }
    }

    async loadTransactions(userId) {
        let response = await fetch(this.getUri('/token/selan/transactions'), {
            method: "GET",
            headers: this.headers,
        });

        let data = await response.json();

        if (response.status != 200) {
            throw new Error(response.status + ":" + data.message);
        }

        return data.history.Items;
    }

    //-------------------------------------------------
    // Publish

    async getPublished() {
        let response = await fetch(this.getUri('/token/selan/published'), {
            method: "GET",
            headers: this.headers,
        });

        return await response.json();
    }

    async publish(to, amount) {
        let response = await fetch(this.getUri('/token/selan/published'), {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
                to: to,
                amount: amount,
            }),
        });

        let data = await response.json();

        if (response.status != 200) {
            throw new Error(response.status + ":" + data.message);
        }
    }

    //-------------------------------------------------
    // Holdings

    async getHoldings() {
        let response = await fetch(this.getUri('/token/selan/holders'), {
            method: "GET",
            headers: this.headers,
        });

        return await response.json();
    };

    async getHolding(userId) {
        let response = await fetch(this.getUri('/token/selan/holders'), {
            method: "GET",
            headers: this.headers,
        });

        return (await response.json())[userId];
    };
}

class GroupInfo {
    constructor(data) {
        this.data = data;
    }

    getAdmins() {
        if (!this.data.admins) {
            return [];
        }

        return this.data.admins.values;
    }

    getMembers() {
        if (!this.data.members) {
            return [];
        }

        return this.data.members.values;
    }

    getRequests() {
        if (!this.data.requests) {
            return [];
        }

        return this.data.requests.values;
    }
}
