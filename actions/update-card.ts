import { IssueData, sendIssue } from "../pmtool/sendissue";
import { 
    getTranslationKey, 
    getListAfterText, 
    getListBeforeText,
    getCardId,
    getListBeforeId,
    getMemberCreatorUsername,
    getCardAttachments,
    getCardLabels,
    getCardShortId,
    getBoardShortUrl
} from "../utils/action-json";

export function handleUpdateCard(json: any) {
    const translationKey = getTranslationKey(json);
    switch (translationKey) {
        case "action_move_card_from_list_to_list":
            if (getListAfterText(json) === "Completed" && getListBeforeText(json) !== "Testing") {
                const issueData: IssueData = {
                    action: "logCompletedWithoutTesting",
                    trelloUsername: json["action"]["memberCreator"]["username"],
                    shortCardNumber: json["action"]["data"]["card"]["idShort"],
                    boardShortUrl: json["model"]["shortUrl"],
                }
                sendIssue(issueData);
            }
            checkUserStoryRequirements(json);
            checkCloseCardRequirements(json);
            verifyTaskIsBlocking(json);
            break;
        default:
            console.log("Translation key not recognized: " + translationKey);
    }
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
                    const issueData : IssueData = {
                        action: "logUnblockedUserStory",
                        trelloUsername: getMemberCreatorUsername(json),
                        shortCardNumber: getCardShortId(json),
                        boardShortUrl: getBoardShortUrl(json),
                    }
                    sendIssue(issueData);
                }
            }
        );
    }
}