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
            if (getListAfterText(json) === "Completed" && getListBeforeText(json) !== "Testing") {
                console.log(
                    json["action"]["date"],
                    "WARNING:", 
                    "Card moved to Completed without going through testing first.",
                    "\nCard #:", json["action"]["data"]["card"]["idShort"],
                    "\nViolator:", json["action"]["memberCreator"]["fullName"],
                )
            }
            checkUserStoryRequirements(json);
            checkCloseCardRequirements(json);
            verifyTaskIsBlocking(json);
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

async function logPossibleIssue(cardId: string) {
    let label_promise = fetch(
        `${Bun.env.TRELLO_API_URL}/cards/${cardId}?key=${Bun.env.TRELLO_API_KEY}&token=${Bun.env.TRELLO_API_TOKEN}&fields=labels`,
        {
            method: "GET",
            headers: {
                'Content-Type': 'application/json'
            },
        }
    ).then( response => response.json()
    ).then( json => {
            let flag: boolean = false;
            json["labels"].forEach( (label: any) => {
                if (label["name"] === "User Story") {
                    flag = true;
                }
            })
            return flag;
        }
    );
    if (await label_promise) {
        console.log("Card #" + cardId + " has a User Story label and was moved to planned.\nGetting its attachments now.");
        fetch(
            `${Bun.env.TRELLO_API_URL}/cards/${cardId}/attachments?key=${Bun.env.TRELLO_API_KEY}&token=${Bun.env.TRELLO_API_TOKEN}`,
            {
                method: "GET",
                headers: {
                    'Content-Type': 'application/json'
                },
            }
        ).then( response => response.json()
        ).then( json => {
                let flag: boolean = false;
                json.forEach( (attachment: any) => {
                    if (attachment["name"].startsWith("Is blocked by")) {
                        flag = true;
                    }
                })
                if (!flag) {
                    console.log("WARNING: Card #" + cardId + " has a User Story label and was moved to planned, but is not blocked by anything.");
                }
            }
        );
    }
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

function checkUserStoryRequirements(json: any) {
    if (getListAfterText(json) !== "Planned") {
        return;
    }
    const cardId = getCardId(json);
    /* If the following are true:
     * - card has a label "User Story"
     * - card has been moved to Planned
     * - card is not blocked by anything (tasks)
     * then, log this as a warning. */
    logPossibleIssue(cardId);
}

/* Temporary solution for storing PM usernames. */
const pmUsernames = [
    "harrisonhutton1"
]

function checkCloseCardRequirements(json: any) {
    if (getListAfterText(json) !== "Closed") {
        return;
    }
    const cardId = getCardId(json);
    /* Only PMs can close cards. */
    if (!(getMemberCreatorUsername(json) in pmUsernames)) {
        /* If a non-PM tried to close the card, move the card back to where
         * it came from. */
        const listBeforeId = getListBeforeId(json);
        fetch(
            `${Bun.env.TRELLO_API_URL}/cards/${cardId}?key=${Bun.env.TRELLO_API_KEY}&token=${Bun.env.TRELLO_API_TOKEN}&idList=${listBeforeId}`,
            {
                method: "PUT",
                headers: {
                    'Accept': 'application/json'
                }
            }
        ).then ( response => {
            if (response.ok) {
                console.log("Card #" + cardId + " moved back to " + getListBeforeText(json));
            } else {
                console.log("Error moving card #" + cardId + " back to " + getListBeforeText(json));
            }
        })
    }
}

async function verifyTaskIsBlocking(json: any) {
    if (getListAfterText(json) !== "Planned") {
        return;
    }
    const cardId = getCardId(json);
    const labelsPromise = getCardLabels(cardId);
    const isTaskPromise = labelsPromise.then( labels => {
        let flag = false;
        labels.forEach( (label: any) => {
            if (label["name"].toUpperCase().startsWith("TASK")) {
                flag = true;
            }
        });
        return flag;
    });
    /* If the card is not a task, then we don't need to check if it is
     * blocking anything. */
    if (!(await isTaskPromise)) {
        return;
    }
    /* Tasks must be blocking something by the time they are moved 
     * to Planned. */
    const attachmentsPromise = getCardAttachments(cardId);
    attachmentsPromise.then( attachments => {
        let flag: boolean = false;
        attachments.forEach( (attachment: any) => {
            if (attachment["name"].startsWith("Blocks")) {
                flag = true;
            }
        })
        if (!flag) {
            console.log("WARNING: Card #" + cardId + " has a Task label and was moved to planned, but is not blocking anything.");
        }
    });
}