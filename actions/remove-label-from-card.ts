import { getCardId, getLabelText, getTranslationKey } from "../utils/action-json";
import { addCommentToCard } from "../utils/trello-api";

export function handleRemoveLabelFromCard(json: any) {
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