export async function handleGetBoard(req: Request) {
    const stream = req.body;

    if (stream != null) {
        /* Since the body of the request is a stream, we can't just
         * call .json() on it. Instead, we need to convert it to a
         * JSON object using the Bun.readableStreamToJSON() function. */
        const json = await Bun.readableStreamToJSON(stream);
        Bun.write('logs/getBoard.json', JSON.stringify(json));
        const actionType = getActionType(json);
        switch (actionType) {
            case "updateCard":
                handleUpdateCard(json);
                break;
            case "removeLabelFromCard":
                handleRemoveLabelFromCard(json);
                break;
            default:
                console.log("Action type not recognized: " + actionType);
        }
    }
    return new Response(req.body);
}

function handleUpdateCard(json: any) {
    const translationKey = getTranslationKey(json);
    switch (translationKey) {
        case "action_move_card_from_list_to_list":
            if (getListAfter(json) === "Completed" && getListBefore(json) !== "Testing") {
                console.log(
                    json["action"]["date"],
                    "WARNING:", 
                    "Card moved to Completed without going through testing first.",
                    "\nCard #:", json["action"]["data"]["card"]["idShort"],
                    "\nViolator:", json["action"]["memberCreator"]["fullName"],
                )
            }
            break;
        default:
            console.log("Translation key not recognized: " + translationKey);
    }
}

function handleRemoveLabelFromCard(json: any) {
    const translationKey = getTranslationKey(json);
    switch (translationKey) {
        case "action_remove_label_from_card":
            console.log("in remove label");
            if (getLabelText(json).toUpperCase().startsWith("SPRINT")) {
                console.log(
                    json["action"]["date"],
                    "WARNING:", 
                    "Card removed from a sprint: " + getLabelText(json),
                    "\nCard #:", json["action"]["data"]["card"]["idShort"],
                    "\nViolator:", json["action"]["memberCreator"]["fullName"],
                )
            }
            break;
        default:
            console.log("Translation key not recognized: " + translationKey);
    }
}

/* This should be moved somewhere more global later because this will
 * be useful for any webhook response, not just the getBoard webhook. */
function getActionType(json: any): string {
    /* Every post request from the webhook will have an "action" field:
     * https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/#example-webhook-response */
    return json["action"]["type"]
}

function getTranslationKey(json: any): string {
    return json["action"]["display"]["translationKey"]
}

function getListBefore(json: any): string {
    return json["action"]["display"]["entities"]["listBefore"]["text"]
}

function getListAfter(json: any): string {
    return json["action"]["display"]["entities"]["listAfter"]["text"]
}

function getLabelText(json: any): string {
    return json["action"]["display"]["entities"]["label"]["text"]
}