import { getCardId, getLabelText, getTranslationKey } from "../utils/action-json";
import { addCommentToCard } from "../utils/trello-api";

export function handleAddLabelToCard(json: any) {
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