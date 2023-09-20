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
                await handleUpdateCard(json);
                break;
            case "removeLabelFromCard":
                handleRemoveLabelFromCard(json);
                break;
            case "addLabelToCard":
                handleAddLabelToCard(json);
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
            checkUserStoryRequirements(json);
            break;
        default:
            console.log("Translation key not recognized: " + translationKey);
    }
}

function handleAddLabelToCard(json: any) {
    const translationKey = getTranslationKey(json);
    switch (translationKey) {
        case "action_add_label_to_card":
            const labelText = getLabelText(json);
            if (labelText.toUpperCase().startsWith("SPRINT")) {
                /* Add a comment to the card, stating that a sprint label
                 * was added. */
                const comment = `added a sprint label: ${labelText}`;
                addCommentToCard(getCardId(json), comment);
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
            const labelText = getLabelText(json);
            if (labelText.toUpperCase().startsWith("SPRINT")) {
                /* Add a comment to the card, stating that a sprint label
                 * was removed. */
                const comment = `removed a sprint label: ${labelText}`;
                addCommentToCard(getCardId(json), comment);
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
function getCardId(json: any): string {
    return json["action"]["data"]["card"]["id"]
}

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

async function getCardLabels(cardId: string): Promise<string[]> {
    let labels: string[] = [];
    await fetch(
        `${Bun.env.TRELLO_API_URL}/cards/${cardId}?key=${Bun.env.TRELLO_API_KEY}&token=${Bun.env.TRELLO_API_TOKEN}&fields=labels`,
        {
            method: "GET",
            headers: {
                'Content-Type': 'application/json'
            },
        }
    ).then( response => {
        response.json().then( json => {
            console.log(json);
            json["labels"].forEach( (label: any) => {
                labels.push(label["name"]);
            })
        })
    })
    return labels;
}

function addCommentToCard(cardId: string, comment: string) {
    /* Bun's environment variables are stored in the Bun.env object. 
     * They are accessed the same way as the usual process.env method. */
    const queryParams = `?key=${Bun.env.TRELLO_API_KEY}&token=${Bun.env.TRELLO_API_TOKEN}&text=${comment}`;
    /* Make the POST request that adds a comment to the card. */
    fetch(
        `https://api.trello.com/1/cards/${cardId}/actions/comments` + queryParams, 
        { 
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
        }
    ).then( response => {
        if (response.ok) {
            console.log("Comment added to card #" + cardId);
        } else {
            console.log("Error adding comment to card #" + cardId);
        }
    })
}

async function checkUserStoryRequirements(json: any) {
    /* If the following are true:
     * - card has a label "User Story"
     * - card has been moved to Planned
     * - card is not blocked by anything (tasks)
     * then, log this as a warning. */
    const cardId = getCardId(json);
    const labels = await getCardLabels(cardId);
    console.log(labels);
}