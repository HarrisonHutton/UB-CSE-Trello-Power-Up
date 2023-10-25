/* This should be moved somewhere more global later because this will
 * be useful for any webhook response, not just the getBoard webhook. */
function getCardId(json: any): string {
    return json["action"]["data"]["card"]["id"]
}

function getCardShortId(json: any): string {
    return json["action"]["data"]["card"]["idShort"]
}

function getActionType(json: any): string {
    /* Every post request from the webhook will have an "action" field:
     * https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#example-webhook-response */
    return json["action"]["type"]
}

function getTranslationKey(json: any): string {
    return json["action"]["display"]["translationKey"]
}

function getListBeforeText(json: any): string {
    return json["action"]["display"]["entities"]["listBefore"]["text"]
}

function getListBeforeId(json: any): string {
    return json["action"]["display"]["entities"]["listBefore"]["id"]
}

function getListAfterText(json: any): string {
    return json["action"]["display"]["entities"]["listAfter"]["text"]
}

function getListAfterId(json: any): string {
    return json["action"]["display"]["entities"]["listAfter"]["id"]
}

function getLabelText(json: any): string {
    return json["action"]["display"]["entities"]["label"]["text"]
}

function getMemberCreatorUsername(json: any): string {
    return json["action"]["memberCreator"]["username"]
}

function getBoardShortUrl(json: any): string {
    return json["model"]["shortUrl"]
}

function getCardAttachments(cardId: string) {
    const attachmentsPromise = fetch(
        `${Bun.env.TRELLO_API_URL}/cards/${cardId}/attachments?key=${Bun.env.TRELLO_API_KEY}&token=${Bun.env.TRELLO_API_TOKEN}`,
        {
            method: "GET",
            headers: {
                'Content-Type': 'application/json'
            },
        }
    ).then( response => response.json() );
    return attachmentsPromise;
}

function getCardLabels(cardId: string) {
    const labelsPromise = fetch(
        `${Bun.env.TRELLO_API_URL}/cards/${cardId}/labels?key=${Bun.env.TRELLO_API_KEY}&token=${Bun.env.TRELLO_API_TOKEN}`,
        {
            method: "GET",
            headers: {
                'Content-Type': 'application/json'
            },
        }
    ).then( response => response.json() );
    return labelsPromise;
}

export { getCardId, getCardShortId, getActionType, getTranslationKey, getListBeforeText, getListBeforeId, getListAfterText, getListAfterId, getLabelText, getMemberCreatorUsername, getCardAttachments, getCardLabels, getBoardShortUrl }